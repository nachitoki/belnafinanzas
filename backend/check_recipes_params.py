import requests
import json

url = "http://localhost:8080/api/recipes"

tests = [
    {},
    {'limit': None},
    {'limit': ''},
    {'limit': 'undefined'},
    {'limit': 'null'},
    {'limit': 10}
]

for params in tests:
    print(f"\n--- Testing params: {params} ---")
    try:
        response = requests.get(url, params=params)
        print(f"Status: {response.status_code}")
        if response.status_code != 200:
            print(f"Response: {response.text}")
        else:
            print(f"Success, count: {len(response.json())}")
    except Exception as e:
        print(f"Error: {e}")
