from app.core.supabase import get_supabase
import json

def check_columns():
    supabase = get_supabase()
    # Try to insert a row with all fields to see what's allowed or just select one
    resp = supabase.table('shopping_list').select('*').limit(1).execute()
    if resp.data:
        print("Columns in shopping_list:", list(resp.data[0].keys()))
    else:
        print("No data in shopping_list to check columns.")

if __name__ == "__main__":
    check_columns()
