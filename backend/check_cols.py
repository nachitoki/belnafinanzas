import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.supabase import get_supabase
import json

def check_columns():
    supabase = get_supabase()
    resp = supabase.table('shopping_list').select('*').limit(1).execute()
    if resp.data:
        print("Columns in shopping_list:", list(resp.data[0].keys()))
    else:
        # Try a dummy insert if empty
        print("No data in shopping_list. Trying dummy select for schema info...")
        # Since Supabase-py doesn't expose schema easily, I'll check common ones.
        pass

if __name__ == "__main__":
    check_columns()
