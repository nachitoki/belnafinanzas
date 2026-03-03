import os
import sys
from datetime import datetime

# Setup path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.supabase import get_supabase
from loguru import logger

def main():
    supabase = get_supabase()
    if not supabase:
        logger.error("No Supabase connection")
        return

    # Check meal_plans
    resp = supabase.table("meal_plans").select("*").execute()
    logger.info(f"Encontrados {len(resp.data)} entradas en meal_plans")
    for m in resp.data[:10]:
        logger.info(f" - {m.get('date')}: {m.get('recipe_name')} (${m.get('recipe_cost')})")

    # Check shopping_list
    resp_s = supabase.table("shopping_list").select("*").execute()
    logger.info(f"Encontrados {len(resp_s.data)} entradas en shopping_list")
    for s in resp_s.data[:10]:
        logger.info(f" - {s.get('month')}: {s.get('name')} (${s.get('estimated_cost')})")

if __name__ == "__main__":
    main()
