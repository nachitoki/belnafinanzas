from fastapi import APIRouter, Depends, HTTPException
from google.cloud.firestore import Client
from app.core.firebase import get_firestore
from app.services.ai_extractor import GeminiVisionExtractor
from app.core.config import settings
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize AI extractor (singleton)
_extractor = None


def get_extractor():
    """Get or initialize AI extractor"""
    global _extractor
    if _extractor is None:
        _extractor = GeminiVisionExtractor(settings.gemini_api_key, settings.gemini_model)
    return _extractor


@router.post("/process-receipt-extraction")
def process_receipt_extraction(
    db: Client = Depends(get_firestore)
):
    """
    Process uploaded receipts with AI extraction
    
    This endpoint:
    1. Queries for receipts with status='uploaded'
    2. For each receipt:
       - Calls Gemini Vision API
       - Creates items subcollection
       - Updates status to 'extracted' or 'needs_review'
    3. Returns processing summary
    
    Triggered by:
    - Cloud Scheduler (periodic)
    - Directly after upload (optional)
    
    NO AUTO-RETRY: As specified, if extraction fails, status → needs_review
    """
    logger.info("Starting receipt extraction job")
    
    extractor = get_extractor()
    
    # Query all households (in real app, might need pagination)
    households = db.collection('households').stream()
    
    total_processed = 0
    total_success = 0
    total_failed = 0
    
    for household_doc in households:
        household_id = household_doc.id
        
        # Get uploaded receipts for this household
        receipts_ref = db.collection('households').document(household_id)\
            .collection('receipts')
        
        uploaded_receipts = receipts_ref.where('status', '==', 'uploaded').stream()
        
        for receipt_doc in uploaded_receipts:
            receipt_id = receipt_doc.id
            receipt_data = receipt_doc.to_dict()
            image_url = receipt_data['image_url']
            
            logger.info(f"Processing receipt {receipt_id} from household {household_id}")
            
            try:
                # Extract receipt data (single call, no retry)
                result = extractor.extract(image_url)
                
                if result.success:
                    # Create items subcollection
                    _create_items(
                        db=db,
                        household_id=household_id,
                        receipt_id=receipt_id,
                        items_data=result.data.get('items', [])
                    )
                    
                    # Update receipt with extracted data
                    receipts_ref.document(receipt_id).update({
                        'status': 'extracted',
                        'extracted_json': result.data,
                        'updated_at': datetime.now()
                    })
                    
                    total_success += 1
                    logger.info(f"Receipt {receipt_id} extracted successfully")
                    
                else:
                    # Extraction failed → needs_review (NO RETRY)
                    receipts_ref.document(receipt_id).update({
                        'status': 'needs_review',
                        'extracted_json': {'error': result.error},
                        'updated_at': datetime.now()
                    })
                    
                    total_failed += 1
                    logger.warning(f"Receipt {receipt_id} extraction failed: {result.error}")
                
                total_processed += 1
                
            except Exception as e:
                logger.error(f"Error processing receipt {receipt_id}: {e}")
                
                # Mark as needs_review
                receipts_ref.document(receipt_id).update({
                    'status': 'needs_review',
                    'extracted_json': {'error': str(e)},
                    'updated_at': datetime.now()
                })
                
                total_failed += 1
                total_processed += 1
    
    summary = {
        'total_processed': total_processed,
        'success': total_success,
        'failed': total_failed
    }
    
    logger.info(f"Extraction job completed: {summary}")
    
    return summary


def _create_items(
    db: Client,
    household_id: str,
    receipt_id: str,
    items_data: list
):
    """Create receipt items subcollection from extracted data"""
    receipt_ref = db.collection('households').document(household_id)\
        .collection('receipts').document(receipt_id)
    
    items_ref = receipt_ref.collection('items')
    
    for item in items_data:
        item_doc = {
            'name_raw': item.get('name', ''),
            'qty': item.get('qty'),
            'unit': item.get('unit'),
            'line_total': item.get('line_total'),
            'unit_price': item.get('line_total') / item.get('qty') if item.get('qty') and item.get('line_total') else None,
            'confidence': item.get('confidence', 0.5),
            'category_suggested': None,
            'created_at': datetime.now()
        }
        
        items_ref.add(item_doc)
    
    logger.info(f"Created {len(items_data)} items for receipt {receipt_id}")
