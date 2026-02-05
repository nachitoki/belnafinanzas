#!/usr/bin/env python3
"""
Seed script to create MVP data: Stores, Strategic Products, and Spending Events.
"""
import sys
import os
import re
import logging
from datetime import datetime

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from app.core.firebase import initialize_firebase, get_firestore

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- DATA LISTS ---

STORES = [
    # Farmacias
    {"name": "Farmacias Ahumada", "aliases": ["FASA"], "legal_names": ["Farmacias Ahumada S.A."]},
    {"name": "Salcobrand", "aliases": [], "legal_names": ["Salcobrand S.A."]},
    {"name": "Cruz Verde", "aliases": [], "legal_names": ["Farmacias Cruz Verde S.A."]},
    {"name": "Doctor Simi", "aliases": ["Dr. Simi", "Farmacias del Dr. Simi"], "legal_names": ["Farmacias Similares Chile S.A."]},

    # Supermercados
    {"name": "Unimarc", "aliases": ["Unimarc Express", "Mayorista 10"], "legal_names": ["Rendic Hermanos S.A."]},
    {"name": "Hiperpatagónico", "aliases": ["Hiper Patagónico", "Patagonico"], "legal_names": []},

    # Almacenes / Pequeños
    {"name": "Macutito", "aliases": [], "legal_names": [], "tags": {"category": "Fruta y Verdura"}},
    {"name": "Emmanuel", "aliases": [], "legal_names": []},
    {"name": "Supermercado Kosten", "aliases": ["Kosten"], "legal_names": []},
    {"name": "La Panchy", "aliases": [], "legal_names": []},

    # Carnicerías
    {"name": "Los Corrales", "aliases": [], "legal_names": []},
    {"name": "El Arriero", "aliases": [], "legal_names": []},
    {"name": "El Campero", "aliases": [], "legal_names": []},

    # Hogar
    {"name": "Homecenter Sodimac", "aliases": ["Sodimac", "Homecenter"], "legal_names": ["Sodimac S.A."]},
]

EVENTS = [
    # Q1-Q2 Chile
    {"name": "Permiso de Circulación", "amount_estimate": 150000, "date": "2026-03-31", "event_type": "annual", "flow_category": "provision"},
    {"name": "Seguro SOAP", "amount_estimate": 6000, "date": "2026-03-31", "event_type": "annual", "flow_category": "provision"},
    {"name": "Uniformes/Útiles Escolares", "amount_estimate": 200000, "date": "2026-03-05", "event_type": "annual", "flow_category": "provision"},
    {"name": "Contribuciones (Cuota 1)", "amount_estimate": 80000, "date": "2026-04-30", "event_type": "annual", "flow_category": "provision"},
    {"name": "Día de la Madre", "amount_estimate": 40000, "date": "2026-05-10", "event_type": "annual", "flow_category": "wish"},
]

PRODUCTS = [
    {"name": "Leche Entera", "unit_base": "l", "category": "Lácteos"},
    {"name": "Pan Hallulla", "unit_base": "kg", "category": "Panadería"},
    {"name": "Huevos", "unit_base": "unit", "category": "Huevos"},
    {"name": "Arroz Grado 2", "unit_base": "kg", "category": "Despensa"},
    {"name": "Aceite Maravilla", "unit_base": "l", "category": "Despensa"},
    {"name": "Pechuga de Pollo", "unit_base": "kg", "category": "Carnes"},
    {"name": "Carne Molida", "unit_base": "kg", "category": "Carnes"},
    {"name": "Tomate", "unit_base": "kg", "category": "Frutas y Verduras"},
    {"name": "Palta Hass", "unit_base": "kg", "category": "Frutas y Verduras"},
    {"name": "Papel Higiénico", "unit_base": "unit", "category": "Aseo y Limpieza"},
    {"name": "Detergente Ropa", "unit_base": "l", "category": "Aseo y Limpieza"},
    {"name": "Queso Gauda", "unit_base": "kg", "category": "Lácteos"},
    {"name": "Jamón Pierna", "unit_base": "kg", "category": "Fiambrería"},
    {"name": "Bebida Gaseosa", "unit_base": "l", "category": "Bebidas"},
    {"name": "Yogurt Batido", "unit_base": "unit", "category": "Lácteos"},
]

def _normalize_name(name):
    # Simple normalization for dedupe
    return re.sub(r'[^a-zA-Z0-9]', '', name).lower()

def seed_mvp_data():
    logger.info("Initializing Firebase...")
    initialize_firebase()
    db = get_firestore()

    # Find households
    households = list(db.collection('households').stream())
    if not households:
        logger.error("No households found.")
        return

    for household_doc in households:
        household_id = household_doc.id
        logger.info(f"Seeding data for household: {household_id}")

        # --- SEED STORES ---
        logger.info("  Seeding Stores...")
        stores_ref = db.collection('households').document(household_id).collection('stores')
        existing_stores = {doc.to_dict().get('name'): doc.id for doc in stores_ref.stream()}
        
        for store in STORES:
            if store['name'] in existing_stores:
                # Update aliases/legals if needed, but for now we skip to avoid overwrite logic complexity
                logger.debug(f"    Skipping existing store: {store['name']}")
                continue
            
            stores_ref.add({
                **store,
                "city": "Santiago",
                "created_at": datetime.now()
            })
            logger.info(f"    ✅ Added Store: {store['name']}")

        # --- SEED EVENTS ---
        logger.info("  Seeding Events...")
        events_ref = db.collection('households').document(household_id).collection('events')
        existing_events = {doc.to_dict().get('name'): doc.id for doc in events_ref.stream()}
        
        for evt in EVENTS:
            if evt['name'] in existing_events:
                logger.debug(f"    Skipping existing event: {evt['name']}")
                continue
            
            events_ref.add({
                **evt,
                "is_mandatory": True,
                "created_at": datetime.now()
            })
            logger.info(f"    ✅ Added Event: {evt['name']}")

        # --- SEED PRODUCTS ---
        logger.info("  Seeding Strategic Products...")
        products_ref = db.collection('households').document(household_id).collection('products')
        # Check by normalized name
        existing_products = {}
        for doc in products_ref.stream():
            d = doc.to_dict()
            norm = d.get('name_norm') or _normalize_name(d.get('name_raw') or "")
            existing_products[norm] = doc.id
            
        for prod in PRODUCTS:
            norm = _normalize_name(prod['name'])
            if norm in existing_products:
                logger.debug(f"    Skipping existing product: {prod['name']}")
                continue
                
            products_ref.add({
                "name_raw": prod['name'],
                "name_norm": norm,
                "unit_base": prod['unit_base'],
                "category": prod['category'],
                "created_at": datetime.now()
            })
            logger.info(f"    ✅ Added Product: {prod['name']}")

    logger.info("MVP Data seeding completed.")

if __name__ == '__main__':
    seed_mvp_data()
