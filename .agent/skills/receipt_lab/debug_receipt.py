import sys
import os
import asyncio
import json

# Setup backend path
BACKEND_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../backend"))
sys.path.append(BACKEND_PATH)

from app.core.firebase import get_firestore, initialize_firebase
from app.services.ai_extractor import GeminiVisionExtractor
from app.core.config import settings

async def debug_receipt(receipt_id):
    if not receipt_id:
        print("Error: receipt_id is required")
        return

    print(f"🧐 Inspecting receipt: {receipt_id}")
    
    # 1. Fetch receipt data from Firestore
    initialize_firebase()
    db = get_firestore()
    # Assuming single household for now or finding it
    # Ideally should be passed or searched. For CLI dev tool, we'll search households.
    
    print("Searching for receipt in households...")
    households = db.collection('households').stream()
    target_doc = None
    target_household = None
    
    for h in households:
        doc = db.collection('households').document(h.id).collection('receipts').document(receipt_id).get()
        if doc.exists:
            target_doc = doc
            target_household = h.id
            break
            
    if not target_doc:
        print("❌ Receipt not found in any household.")
        return

    data = target_doc.to_dict()
    image_url = data.get('image_url')
    print(f"✅ Found receipt. Status: {data.get('status')}")
    print(f"   Image: {image_url[:50]}...")
    
    if not image_url:
        print("❌ No image URL found on receipt.")
        return

    # 2. Call Gemini
    print("\n🚀 Sending to Gemini Vision API...")
    extractor = GeminiVisionExtractor(settings.gemini_api_key)
    
    try:
        # We assume extract is synchronous or async? verify ai_extractor.py
        # Based on previous readings, it seemed synchronous blocking call in jobs.py but let's check.
        # jobs.py: result = extractor.extract(image_url) -> looks sync
        
        result = extractor.extract(image_url)
        
        print("-" * 60)
        if result.success:
            print("✅ EXTRACTION SUCCESS")
            print(json.dumps(result.data, indent=2, ensure_ascii=False))
        else:
            print("❌ EXTRACTION FAILED")
            print(f"Error: {result.error}")
        print("-" * 60)
        
    except Exception as e:
        print(f"💥 Exception during extraction: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python debug_receipt.py <receipt_id>")
    else:
        asyncio.run(debug_receipt(sys.argv[1]))
