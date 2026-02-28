
import sys
import os
import requests

def debug():
    url = "http://localhost:8080/api/commitments"
    try:
        resp = requests.get(url)
        data = resp.json()
        print("--- COMMITMENTS LIST ---")
        total = 0
        for item in data:
            if "synthetic" in str(item.get("id")): continue
            amt = item.get("amount", 0)
            total += amt
            print(f"{item['name']}: ${amt:,.0f} (ID: {item['id']})")
        print(f"TOTAL: ${total:,.0f}")
        
        print("\n--- INCOMES LIST ---")
        url_inc = "http://localhost:8080/api/incomes"
        resp_inc = requests.get(url_inc)
        data_inc = resp_inc.json()
        for item in data_inc:
            print(f"{item['name']}: ${item.get('amount', 0):,.0f} (Month: {item.get('month')}, Variable: {item.get('is_variable')})")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug()
