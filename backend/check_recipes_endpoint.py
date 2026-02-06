import requests
import json

try:
    response = requests.get("http://localhost:8080/api/recipes")
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Item Count: {len(data)}")
        if len(data) > 0:
            print("First item sample:")
            print(json.dumps(data[0], indent=2))
        else:
            print("Response is empty list []")
    else:
        print(f"Error Content: {response.text}")
except Exception as e:
    print(f"Request failed: {e}")
