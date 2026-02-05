from google.cloud.firestore import Client
from difflib import SequenceMatcher
import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Fuzzy match threshold (85% similarity)
MATCH_THRESHOLD = 0.85


class ProductMatcher:
    """
    Service for finding or creating products with fuzzy matching
    
    Prevents duplicate products while allowing new ones to be created
    """
    
    def __init__(self, db: Client):
        self.db = db
        self.index_collection = "products_index"
    
    def find_or_create_product(
        self,
        name_raw: str,
        household_id: str
    ) -> str:
        """
        Find existing product by fuzzy match or create new one
        
        Args:
            name_raw: Raw product name from receipt
            household_id: Household ID
            
        Returns:
            product_id: ID of found or created product
        """
        # Normalize the name
        name_norm = self._normalize_name(name_raw)
        
        logger.info(f"Finding or creating product: '{name_raw}' → '{name_norm}'")
        
        # Try exact match via index first
        existing_id = self._exact_match_index(name_norm, household_id)
        if existing_id:
            logger.info(f"Exact match found: {existing_id}")
            return existing_id

        # Try to find existing product by fuzzy match (index-backed)
        existing_id = self._fuzzy_match(name_norm, household_id)
        
        if existing_id:
            logger.info(f"Found existing product: {existing_id}")
            return existing_id
        
        # Create new product
        product_id = self._create_product(name_raw, name_norm, household_id)
        logger.info(f"Created new product: {product_id} ('{name_norm}')")
        
        return product_id
    
    def _normalize_name(self, name: str) -> str:
        """
        Normalize product name for matching
        
        - Remove codes like "COD (12345)", "SKU 123", "PLU 999"
        - Remove isolated numbers (likely codes)
        - Remove extra whitespace
        - Title case
        """
        # 1. Remove common code patterns
        # Matches "COD (123)", "COD 123", "SKU: 123", "PLU 1234"
        name = re.sub(r'(?i)\b(?:COD|SKU|PLU|INT)\b.*?(?=\s|$)', '', name)
        
        # 2. Remove parenthesized numbers typically associated with codes e.g. "(12345)"
        name = re.sub(r'\(\s*\d+[\s\d]*\)', '', name)
        
        # 3. Remove isolated large numbers (often PLU codes without prefix)
        # Assuming product names rarely have >3 digit isolated numbers (like "Arroz 1kg" is fine, "Arroz 12345" is code)
        name = re.sub(r'\b\d{4,}\b', '', name)

        # 4. Remove extra whitespace
        name = " ".join(name.split())
        
        # 5. Title case
        name = name.title()
        
        # 6. Remove special chars (mostly) but allow basic ones
        name = re.sub(r'[^A-Za-z0-9\sáéíóúÁÉÍÓÚñÑ\%\.-]', '', name)
        
        return name.strip()
    
    def _fuzzy_match(
        self,
        name_norm: str,
        household_id: str
    ) -> Optional[str]:
        """
        Find product by fuzzy string matching
        
        Returns product_id if match found above threshold, else None
        """
        # Ensure index exists (lazy build)
        self._ensure_index(household_id)

        prefix = (name_norm[:3].lower() if name_norm else "")
        index_ref = self.db.collection('households').document(household_id)\
            .collection(self.index_collection)
        candidates = list(index_ref.where('prefix', '==', prefix).limit(200).stream())
        if not candidates:
            logger.info(f"No index candidates for prefix '{prefix}'")
            return None
        
        best_match_id = None
        best_ratio = 0.0
        
        for product_doc in candidates:
            product_data = product_doc.to_dict()
            existing_norm = product_data.get('name_norm', '')
            
            # Calculate similarity ratio
            ratio = SequenceMatcher(None, name_norm.lower(), existing_norm.lower()).ratio()
            
            if ratio > best_ratio:
                best_ratio = ratio
                best_match_id = product_data.get('product_id') or product_doc.id
        
        # Return if above threshold
        if best_ratio >= MATCH_THRESHOLD:
            logger.info(f"Fuzzy match found: '{name_norm}' ≈ (ratio: {best_ratio:.2f})")
            return best_match_id
        
        logger.info(f"No fuzzy match found for '{name_norm}' (best ratio: {best_ratio:.2f})")
        return None
    
    def _create_product(
        self,
        name_raw: str,
        name_norm: str,
        household_id: str
    ) -> str:
        """Create new product document"""
        from datetime import datetime
        
        product_data = {
            'name_raw': name_raw,
            'name_norm': name_norm,
            'unit_base': 'unit',  # Default, can be improved later
            'category': None,
            'created_at': datetime.now()
        }
        
        # Add to Firestore
        update_time, product_ref = self.db.collection('households').document(household_id)\
            .collection('products').add(product_data)
        self._index_product(household_id, product_ref.id, name_norm)
        return product_ref.id

    def _index_product(self, household_id: str, product_id: str, name_norm: str) -> None:
        prefix = (name_norm[:3].lower() if name_norm else "")
        index_ref = self.db.collection('households').document(household_id)\
            .collection(self.index_collection).document(product_id)
        index_ref.set({
            'product_id': product_id,
            'name_norm': name_norm,
            'prefix': prefix
        }, merge=True)

    def _ensure_index(self, household_id: str) -> None:
        index_ref = self.db.collection('households').document(household_id)\
            .collection(self.index_collection)
        existing = list(index_ref.limit(1).stream())
        if existing:
            return

        logger.info("Product index not found; building index from existing products...")
        products_ref = self.db.collection('households').document(household_id)\
            .collection('products')
        products = list(products_ref.stream())
        if not products:
            return

        batch = self.db.batch()
        ops = 0
        for doc in products:
            data = doc.to_dict()
            name_norm = data.get('name_norm') or ''
            prefix = (name_norm[:3].lower() if name_norm else "")
            idx_doc = index_ref.document(doc.id)
            batch.set(idx_doc, {
                'product_id': doc.id,
                'name_norm': name_norm,
                'prefix': prefix
            }, merge=True)
            ops += 1
            if ops >= 400:
                batch.commit()
                batch = self.db.batch()
                ops = 0
        if ops:
            batch.commit()

    def _exact_match_index(self, name_norm: str, household_id: str) -> Optional[str]:
        if not name_norm:
            return None
        index_ref = self.db.collection('households').document(household_id)\
            .collection(self.index_collection)
        matches = list(index_ref.where('name_norm', '==', name_norm).limit(1).stream())
        if not matches:
            return None
        data = matches[0].to_dict()
        return data.get('product_id') or matches[0].id
