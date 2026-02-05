import requests
import os
import sys

# Add parent directory to path to import app if needed, but we are just using requests
file_path = "S:/APP FINANZAS FAMILIARES/Boletas pruebas/20260121_133100.jpg"
url = "http://localhost:8000/api/receipts"

if not os.path.exists(file_path):
    print(f"File not found: {file_path}")
    sys.exit(1)

print(f"Uploading {file_path} to {url}...")
try:
    with open(file_path, 'rb') as f:
        files = {'file': ('filename.jpg', f, 'image/jpeg')}
        response = requests.post(url, files=files, timeout=60) # 60s timeout
        
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
