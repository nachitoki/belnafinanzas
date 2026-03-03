import os
import sys
from datetime import datetime, timezone

# Setup path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.supabase import get_supabase
from loguru import logger

def main():
    supabase = get_supabase()
    if not supabase:
        logger.error("No Supabase connection")
        return

    # Using the ID found in debug: Familia Demo
    hh_id = "51e7a0a0-6de5-52a5-be37-b9cad7e49257"
    
    commitments = [
        {"name": "Arriendo", "amount": 600000},
        {"name": "Luz", "amount": 259300},
        {"name": "Agua", "amount": 79850},
        {"name": "Internet", "amount": 47000},
        {"name": "Unipay", "amount": 317817},
        {"name": "Cencosud 1", "amount": 120000},
        {"name": "Cencosud 2", "amount": 70000},
        {"name": "Youtube", "amount": 11000},
        {"name": "Ale", "amount": 26690},
        {"name": "Sacros 1", "amount": 11534},
        {"name": "Sacros 2", "amount": 8854},
        {"name": "Entel", "amount": 42330},
        {"name": "Wom", "amount": 36449},
        {"name": "Agustín", "amount": 300000},
        {"name": "Google", "amount": 21700},
        {"name": "Joaquín", "amount": 109923},
        {"name": "Bencina", "amount": 100000},
        {"name": "Veritas", "amount": 29289},
        {"name": "Mercadolibre Carlos", "amount": 26411},
        {"name": "Mercadolibre Ana", "amount": 13330},
    ]

    logger.info(f"Inyectando {len(commitments)} compromisos en Supabase para {hh_id}...")
    
    payload = []
    for c in commitments:
        payload.append({
            "household_id": hh_id,
            "name": c["name"],
            "amount": float(c["amount"]),
            "frequency": "monthly",
            "flow_category": "structural",
            "next_date": "2026-03-05"
        })
    
    try:
        supabase.table("commitments").insert(payload).execute()
        logger.success("Compromisos inyectados correctamente.")
    except Exception as e:
        logger.error(f"Error inyectando compromisos: {e}")

    # Incomes (Values gathered from previous conversation context)
    incomes = [
        {"name": "Sueldo 1", "amount": 1800000},
        {"name": "Sueldo 2", "amount": 350000}
    ]
    
    inc_payload = []
    for i in incomes:
        inc_payload.append({
            "household_id": hh_id,
            "name": i["name"],
            "amount": float(i["amount"]),
            "frequency": "monthly",
            "is_variable": False,
            "next_date": "2026-03-01"
        })
    
    try:
        supabase.table("incomes").insert(inc_payload).execute()
        logger.success("Ingresos inyectados correctamente.")
    except Exception as e:
        logger.error(f"Error inyectando ingresos: {e}")

if __name__ == "__main__":
    main()
