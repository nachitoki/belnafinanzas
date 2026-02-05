import sys
import os
import json
import logging
from datetime import datetime

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.firebase import initialize_firebase, get_firestore

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def seed_strategic_products():
    """
    Seed strategic products from JSON into the first found household.
    """
    logger.info("Initializing Firebase...")
    initialize_firebase()
    db = get_firestore()

    # 1. Load strategic products from JSON
    json_path = os.path.join(os.path.dirname(__file__), '..', 'app', 'data', 'strategic_products.json')
    if not os.path.exists(json_path):
        logger.error(f"JSON file not found at {json_path}")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        products_to_seed = data.get('products', [])

    if not products_to_seed:
        logger.warning("No products found in JSON to seed.")
        return

    # 2. Find Household (using the one from demo user or the first one)
    # For flexibility, we look for households
    households = list(db.collection('households').stream())
    if not households:
        logger.error("No households found in database. Run seed_data.py first.")
        return

    # We'll seed into all households found just to be sure (usually only one for now)
    for household_doc in households:
        household_id = household_doc.id
        logger.info(f"Seeding products into household: {household_id}")
        
        products_ref = db.collection('households').document(household_id).collection('products')
        
        # Get existing products to avoid duplicates
        existing_products = {p.to_dict().get('name_norm', '').lower(): p.id for p in products_ref.stream()}
        
        count = 0
        for p in products_to_seed:
            name_norm = p['name'].lower().strip()
            
            if name_norm in existing_products:
                logger.debug(f"Product '{p['name']}' already exists. Skipping.")
                continue
            
            product_data = {
                'name_raw': p['name'],
                'name_norm': name_norm,
                'unit_base': p['unit_base'],
                'category': p['category'],
                'created_at': datetime.now()
            }
            
            products_ref.add(product_data)
            count += 1
            logger.info(f"✅ Added product: {p['name']}")

        logger.info(f"Seed finished for {household_id}. Added {count} new products.")

if __name__ == '__main__':
    try:
        seed_strategic_products()
    except Exception as e:
        logger.error(f"Seed failed: {e}")
        sys.exit(1)
