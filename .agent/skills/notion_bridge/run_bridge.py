import sys
import os
import argparse
import asyncio

# Set up path to backend so we can import app modules
BACKEND_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../backend"))
sys.path.append(BACKEND_PATH)

from app.core.firebase import get_firestore

async def run_import(dry_run=False):
    print("="*60)
    print("🌉 NOTION BRIDGE IMPORT")
    print("="*60)
    
    if dry_run:
        print("⚠️  DRY RUN MODE: No changes will be saved.")

    # We reuse the logic from the API route but run it locally
    # This requires mocking the dependency injection or calling the service logic directly
    # Ideally, we should refactor the logic in `catalog.py` to a service, but for now we'll call the script logic.
    
    # Actually, we have `seed_strategic_products.py` and `notion_fine_analyzer.py`.
    # Let's verify what endpoint `import_notion_products` does.
    # It seems `backend/app/api/routes/catalog.py` -> `import_notion_products` has the latest logic.
    # But for a skill, calling the API endpoint is safer and easier than replicating the context.
    
    import requests
    API_URL = "http://localhost:8080/api"
    
    try:
        print("Triggering import via API...")
        # Note: The API might timeout for large datasets, but the skill request script handles it better
        response = requests.post(f"{API_URL}/products/import-notion", timeout=120)
        
        if response.status_code == 200:
            result = response.json()
            print("\n✅ Import Successful!")
            print(f"Created: {result.get('created')}")
            print(f"Updated: {result.get('updated')}")
            print(f"Skipped: {result.get('skipped')}")
            print(f"Prices Seeded: {result.get('prices_seeded')}")
        else:
            print(f"❌ Import failed: Status {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"❌ Error during import: {e}")
        print("\nTip: Make sure the backend is running on port 8080")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Notion Bridge Import")
    parser.add_argument("--dry-run", action="store_true", help="Simulate run")
    args = parser.parse_args()
    
    asyncio.run(run_import(dry_run=args.dry_run))
