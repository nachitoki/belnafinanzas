from app.core.supabase import get_supabase
import json

def check_tx():
    supabase = get_supabase()
    resp = supabase.table('transactions').select('*').limit(5).execute()
    print("Transactions Sample:", resp.data)

if __name__ == "__main__":
    check_tx()
