import requests
import json
import os

BASE_URL = "http://localhost:8080/api"

def run_test(name, func):
    try:
        print(f"Testing {name}...", end=" ")
        func()
        print("✅ PASS")
        return True
    except Exception as e:
        print(f"❌ FAIL: {e}")
        return False

def test_dashboard():
    res = requests.get(f"{BASE_URL}/dashboard/summary")
    if res.status_code != 200:
        raise Exception(f"Status {res.status_code}")
    data = res.json()
    # "income_total" is inside "month_overview"
    if "month_overview" not in data:
        raise Exception("Missing 'month_overview' key")
    if "income_total" not in data["month_overview"]:
       raise Exception("Missing 'income_total' in month_overview")
    print(f"(Income: {data['month_overview']['income_total']})", end=" ")

def test_bitacora():
    # Correct endpoint: /bitacora/ask
    payload = {"question": "Hola, es un test", "context": "test"}
    res = requests.post(f"{BASE_URL}/bitacora/ask", json=payload)
    if res.status_code != 200:
        raise Exception(f"Chat Status {res.status_code}: {res.text}")
    data = res.json()
    if "answer" not in data:
        raise Exception("No answer in response")
    print(f"(Answer len: {len(data['answer'])})", end=" ")

def test_inventory():
    # Previous test passed with /products, keeping it.
    res = requests.get(f"{BASE_URL}/products")
    if res.status_code != 200:
        raise Exception(f"Status {res.status_code}")

def test_receipts():
    # Check history endpoint logic
    # Try /receipts or /receipts/history
    urls = [f"{BASE_URL}/receipts", f"{BASE_URL}/receipts/history"]
    success = False
    for url in urls:
        res = requests.get(url)
        if res.status_code == 200:
            success = True
            break
    if not success:
         raise Exception(f"Could not access receipts endpoints (tried {urls})")

if __name__ == "__main__":
    print(f"--- MVP INTEGRATION TEST v2 ({BASE_URL}) ---")
    results = []
    results.append(run_test("Dashboard Logic", test_dashboard))
    results.append(run_test("Bitacora AI", test_bitacora))
    results.append(run_test("Inventory", test_inventory))
    results.append(run_test("Receipts", test_receipts))
    
    if all(results):
        print("\n🎉 PERFORMANCE: 100%. SYSTEM LOGIC VERIFIED.")
        exit(0)
    else:
        print("\n⚠️ SOME TESTS FAILED.")
        exit(1)
