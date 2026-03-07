from app.core.supabase import get_supabase
import json

def check_march_tx():
    supabase = get_supabase()
    resp = supabase.table('transactions').select('*').gte('occurred_on', '2026-03-01').execute()
    print("March Transactions:", resp.data if resp.data else "None")

if __name__ == "__main__":
    check_march_tx()
