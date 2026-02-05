#!/usr/bin/env python3
"""
Seed script to create initial household, categories, and account

Usage:
    python scripts/seed_data.py
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.firebase import initialize_firebase, get_firestore
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def seed_data():
    """Create initial household data"""
    
    logger.info("Initializing Firebase...")
    initialize_firebase()
    db = get_firestore()
    
    # Create household
    logger.info("Creating household...")
    household_data = {
        'name': 'Familia Demo',
        'created_at': datetime.now()
    }
    
    _, household_ref = db.collection('households').add(household_data)
    household_id = household_ref.id
    
    logger.info(f"✅ Household created: {household_id}")
    
    # Create categories
    logger.info("Creating categories...")
    categories = [
        {'name': 'Súper', 'kind': 'expense', 'essential': True},
        {'name': 'Casa', 'kind': 'expense', 'essential': True},
        {'name': 'Transporte', 'kind': 'expense', 'essential': True},
        {'name': 'Salud', 'kind': 'expense', 'essential': True},
        {'name': 'Educación', 'kind': 'expense', 'essential': True},
        {'name': 'Entretenimiento', 'kind': 'expense', 'essential': False},
        {'name': 'Servicios', 'kind': 'expense', 'essential': True},
        {'name': 'Sueldo', 'kind': 'income', 'essential': False},
        {'name': 'Otro Ingreso', 'kind': 'income', 'essential': False},
    ]
    
    categories_ref = db.collection('households').document(household_id).collection('categories')
    
    for cat in categories:
        cat_data = {**cat, 'created_at': datetime.now()}
        categories_ref.add(cat_data)
    
    logger.info(f"✅ Created {len(categories)} categories")
    
    # Create default account
    logger.info("Creating default account...")
    account_data = {
        'name': 'Cuenta Principal',
        'type': 'bank',
        'currency': 'CLP',
        'is_active': True,
        'created_at': datetime.now()
    }
    
    db.collection('households').document(household_id)\
        .collection('accounts').add(account_data)
    
    logger.info("✅ Default account created")
    
    # Create demo user for Telegram linking test
    logger.info("Creating demo user...")
    user_data = {
        'email': 'demo@example.com',
        'name': 'Usuario Demo',
        'household_id': household_id,
        'role': 'admin',
        'created_at': datetime.now()
    }
    db.collection('users').document('demo-user').set(user_data)
    logger.info("✅ Demo user created: demo@example.com")

    # Print summary
    print("\n" + "="*60)
    print("🎉 SEED DATA CREATED SUCCESSFULLY")
    print("="*60)
    print(f"\nHousehold ID: {household_id}")
    print(f"Demo Email: demo@example.com")
    print("\nNext steps:")
    print("1. En el bot de Telegram escribe: /start demo@example.com")
    print("\n" + "="*60)


if __name__ == '__main__':
    try:
        seed_data()
    except Exception as e:
        logger.error(f"Seed failed: {e}")
        sys.exit(1)
