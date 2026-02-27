import os
import asyncio
from datetime import datetime
from google.cloud import firestore
from supabase import create_client, Client
from dotenv import load_dotenv
from loguru import logger

load_dotenv()

# Configuración Firebase
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "service-account-key.json"
db_fire = firestore.Client()

# Configuración Supabase
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

async def migrate_households():
    logger.info("Migrating Households...")
    docs = db_fire.collection('households').stream()
    for doc in docs:
        data = doc.to_dict()
        # Insert into Supabase
        res = supabase.table("households").upsert({
            "id": doc.id,
            "name": data.get("name", "Hogar"),
            "settings": data.get("settings", {})
        }).execute()
        
        # Migrate sub-collections
        await migrate_subcollection(doc.id, 'categories', 'categories')
        await migrate_subcollection(doc.id, 'transactions', 'transactions')
        await migrate_subcollection(doc.id, 'commitments', 'commitments')
        await migrate_subcollection(doc.id, 'events', 'events')
        await migrate_subcollection(doc.id, 'incomes', 'incomes')
        await migrate_subcollection(doc.id, 'bitacora', 'bitacora')

async def migrate_subcollection(household_id, fire_col, pg_table):
    logger.info(f"  -> Migrating {fire_col} for household {household_id}...")
    docs = db_fire.collection('households').document(household_id).collection(fire_col).stream()
    
    batch = []
    for doc in docs:
        data = doc.to_dict()
        row = {"id": doc.id, "household_id": household_id}
        
        # Mapeo específico según la tabla
        if pg_table == 'transactions':
            row.update({
                "category_id": data.get("category_id"),
                "amount": float(data.get("amount", 0)),
                "occurred_on": data.get("occurred_on").isoformat() if hasattr(data.get("occurred_on"), "isoformat") else data.get("occurred_on"),
                "description": data.get("description"),
                "store_id": data.get("store_id"),
                "product_id": data.get("product_id")
            })
        elif pg_table == 'categories':
            row.update({
                "name": data.get("name"),
                "essential": data.get("essential", False)
            })
        elif pg_table == 'commitments':
            row.update({
                "name": data.get("name"),
                "amount": float(data.get("amount", 0)),
                "frequency": data.get("frequency", "monthly"),
                "next_date": data.get("next_date"),
                "last_paid_at": data.get("last_paid_at"),
                "flow_category": data.get("flow_category")
            })
        elif pg_table == 'events':
            row.update({
                "name": data.get("name"),
                "amount_estimate": float(data.get("amount_estimate", 0)),
                "date": data.get("date"),
                "is_mandatory": data.get("is_mandatory", False),
                "flow_category": data.get("flow_category")
            })
        elif pg_table == 'incomes':
             row.update({
                "name": data.get("name"),
                "amount": float(data.get("amount", 0)),
                "frequency": data.get("frequency", "monthly"),
                "next_date": data.get("next_date"),
                "is_variable": data.get("is_variable", False),
                "min_amount": float(data.get("min_amount") or 0) if data.get("min_amount") else None
            })
        elif pg_table == 'bitacora':
            row.update({
                "text": data.get("text", ""),
                "kind": data.get("kind", "note"),
                "meta": data.get("meta", {})
            })
        
        batch.append(row)
        if len(batch) >= 50:
            supabase.table(pg_table).upsert(batch).execute()
            batch = []
            
    if batch:
        supabase.table(pg_table).upsert(batch).execute()

if __name__ == "__main__":
    asyncio.run(migrate_households())
    logger.success("Migration Finished!")
