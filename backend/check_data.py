from app.core.supabase import get_supabase
import json

def check_data():
    supabase = get_supabase()
    # Check meal plans
    meals = supabase.table('meal_plans').select('*').limit(10).execute()
    print("Meal Plans:", meals.data if meals.data else "None")
    
    # Check shopping list
    shop = supabase.table('shopping_list').select('*').limit(10).execute()
    print("Shopping List:", shop.data if shop.data else "None")

if __name__ == "__main__":
    check_data()
