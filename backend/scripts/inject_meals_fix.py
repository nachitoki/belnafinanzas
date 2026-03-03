import os
import sys
from app.core.supabase import get_supabase
from loguru import logger

def main():
    supabase = get_supabase()
    
    # Try to add a unique constraint manually via RPC if possible, 
    # but we don't have an RPC for raw SQL.
    # We can try to use the migration endpoint if it exists or just 
    # use the inject script with a different strategy.
    
    # Strategy: Delete and Re-insert
    hh_id = "51e7a0a0-6de5-52a5-be37-b9cad7e49257"
    
    logger.info("Limpiando datos previos para reinicio limpio...")
    supabase.table("meal_plans").delete().eq("household_id", hh_id).execute()
    supabase.table("shopping_list").delete().eq("household_id", hh_id).execute()
    
    meal_plans = [
        {"household_id": hh_id, "date": "2026-03-03", "type": "lunch", "recipe_name": "Lentejas", "recipe_cost": 5000},
        {"household_id": hh_id, "date": "2026-03-04", "type": "lunch", "recipe_name": "Pollo con Arroz", "recipe_cost": 8000},
        {"household_id": hh_id, "date": "2026-03-05", "type": "lunch", "recipe_name": "Pasta Boloñesa", "recipe_cost": 6000}
    ]
    
    shopping_list = [
        {"household_id": hh_id, "name": "Pan molde", "estimated_cost": 3000, "month": "2026-03"},
        {"household_id": hh_id, "name": "Leche 12pk", "estimated_cost": 12000, "month": "2026-03"},
        {"household_id": hh_id, "name": "Frutas", "estimated_cost": 15000, "month": "2026-03"}
    ]
    
    logger.info("Insertando nuevos datos...")
    supabase.table("meal_plans").insert(meal_plans).execute()
    supabase.table("shopping_list").insert(shopping_list).execute()
    
    logger.success("Inyección completada exitosamente (vía script local)")

if __name__ == "__main__":
    main()
