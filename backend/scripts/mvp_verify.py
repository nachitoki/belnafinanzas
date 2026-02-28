
import sys
import os
import requests

def verify():
    # Use the running development API 
    url = "http://localhost:8080/api/commitments"
    try:
        resp = requests.get(url)
        if resp.status_code != 200:
            print(f"ERROR: API returned {resp.status_code}")
            print(resp.text)
            return
        
        data = resp.json()
        total = 0
        names = []
        for item in data:
            if item.get("id") and "synthetic" in str(item.get("id")):
                print(f"Skipping synthetic: {item['name']}")
                continue
            total += (item.get("amount") or 0)
            names.append(item.get("name"))
        
        print(f"Total Commitments: {len(names)}")
        print(f"Total Amount: ${total:,}")
        print("Items:")
        for n in sorted(names):
            print(f" - {n}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    verify()
