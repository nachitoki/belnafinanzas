
import asyncio
import os
import json
from notebooklm.client import NotebookLMClient
from notebooklm.auth import AuthTokens

async def main():
    try:
        storage_path = os.path.expanduser("~/.notebooklm-mcp/auth.json")
        with open(storage_path, "r") as f:
            data = json.load(f)
        
        auth = AuthTokens(
            cookies=data.get("cookies", {}),
            csrf_token=data.get("csrf_token"),
            session_id=data.get("session_id")
        )
        
        async with NotebookLMClient(auth) as client:
            print("--- Listing Notebooks ---")
            notebooks = await client.notebooks.list()
            
            fitness_id = None
            misalud_id = "fef849fc-0260-48eb-bada-b083207e4fdf" 
            
            for nb in notebooks:
                if "FITNESS" in nb.title.upper():
                    fitness_id = nb.id
                    print(f"Found FITNESS: {nb.id}")

            print("\n--- Querying 'FITNESS' ---")
            if fitness_id:
                print(f"Asking FITNESS ({fitness_id})...")
                # Need to use ask()
                resp = await client.chat.ask(fitness_id, "Summarize the key scientific principles for muscle training, specifically regarding metabolic health and menopause.")
                print("FITNESS RESPONSE TYPE:", type(resp))
                # It might be an object
                if hasattr(resp, 'text'):
                     print("FITNESS SUMMARY:\n", resp.text)
                else:
                     print("FITNESS SUMMARY:\n", resp)
            else:
                print("FITNESS notebook not found.")

            print("\n--- Querying 'Mi Salud' ---")
            if misalud_id:
                print(f"Asking Mi Salud ({misalud_id})...")
                resp2 = await client.chat.ask(misalud_id, "List specific health conditions, allergies, and restrictions found in this notebook. Include details on hypothyroidism, vertigo, mucosa inflammation, and intermittent fasting protocols.")
                if hasattr(resp2, 'text'):
                     print("MI SALUD SUMMARY:\n", resp2.text)
                else:
                     print("MI SALUD SUMMARY:\n", resp2)
            else:
                print("Mi Salud notebook ID not configured.")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
