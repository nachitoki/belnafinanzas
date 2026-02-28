import os, sys, logging, json
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore, storage as fb_storage
from datetime import timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.services.ai_extractor import GeminiVisionExtractor

logging.basicConfig(level=logging.INFO)

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

# Init Firebase
if not firebase_admin._apps:
    cred = credentials.Certificate('service-account-key.json')
    firebase_admin.initialize_app(cred, {
        'projectId': 'belnafinanzas-c92f7',
        'storageBucket': 'belnafinanzas-c92f7.firebasestorage.app'
    })

extractor = GeminiVisionExtractor(api_key=api_key, model_name="gemini-1.5-flash")

# Find a valid receipt blob
bucket = fb_storage.bucket()
# Use a prefix that we know has receipts
blobs = list(bucket.list_blobs(prefix="households/3YrfW0araoI8So0SNepX/receipts/", max_results=10))

if not blobs:
    print("No receipt blobs found in households/3YrfW0araoI8So0SNepX/receipts/")
    sys.exit(1)

# Sort by time or just pick the first one that is a file
blob = None
for b in blobs:
    if not b.name.endswith("/"):
        blob = b
        break

if not blob:
    print("No valid file blob found")
    sys.exit(1)

# Generate fresh Signed URL
fresh_url = blob.generate_signed_url(version="v4", expiration=timedelta(minutes=10), method="GET")

print(f"Testing extraction on FRESH URL of blob: {blob.name}")
try:
    result = extractor.extract(fresh_url)
    print("\nResult Success:", result.success)
    if result.success:
        # Avoid printing massive item lists if too long, but let's see at least the store
        print(f"Store: {result.data.get('store_name')}")
        print(f"Total: {result.data.get('total')}")
        print(f"Items found: {len(result.data.get('items', []))}")
        # Print first item as sample
        if result.data.get('items'):
            print("First item sample:", result.data['items'][0])
    else:
        print("Error:", result.error)
except Exception as e:
    print(f"Exception triggered: {e}")
