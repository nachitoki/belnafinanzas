import os
import sys
from supabase import create_client
from loguru import logger

def main():
    # Load env manually from backend/.env
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    url = ""
    key = ""
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                if line.startswith('SUPABASE_URL='):
                    url = line.split('=')[1].strip()
                if line.startswith('SUPABASE_KEY='):
                    key = line.split('=')[1].strip()
    
    if not url or not key:
        logger.error("No Supabase URL or Key found in .env")
        return

    supabase = create_client(url, key)
    hh_id = "51e7a0a0-6de5-52a5-be37-b9cad7e49257"
    
    logger.info("Limpiando datos previos...")
    try:
        supabase.table("meal_plans").delete().eq("household_id", hh_id).execute()
        supabase.table("shopping_list").delete().eq("household_id", hh_id).execute()
    except Exception as e:
        logger.warning(f"Error limpiando (puede que la tabla no exista): {e}")

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
    try:
        supabase.table("meal_plans").insert(meal_plans).execute()
        supabase.table("shopping_list").insert(shopping_list).execute()
        logger.success("Inyección completada exitosamente.")
    except Exception as e:
        logger.error(f"Error insertando: {e}")

if __name__ == "__main__":
    main()
