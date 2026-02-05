
import json
import asyncio
import os
# Ensure we use the correct Python environment's site-packages if needed, 
# but usually 'py' runs with the default environment.
from notebooklm.client import NotebookLMClient
from notebooklm.auth import AuthTokens, fetch_tokens

async def main():
    try:
        # Load from standard storage location
        print("Loading auth from storage...")
        # Since we ran the auth tool, it saves to ~/.notebooklm-mcp/auth.json usually
        # The client library knows where to look.
        
        print("Loading auth from storage (direct parse)...")
        storage_path = os.path.expanduser("~/.notebooklm-mcp/auth.json")
        
        with open(storage_path, "r") as f:
            data = json.load(f)
            
        cookies = data.get("cookies", {})
        csrf_token = data.get("csrf_token")
        session_id = data.get("session_id")
        
        if not cookies or not csrf_token or not session_id:
             raise ValueError("Missing essential auth data in auth.json")
             
        # Create AuthTokens directly
        auth = AuthTokens(cookies=cookies, csrf_token=csrf_token, session_id=session_id)
        print("Auth tokens loaded successfully.")
        
        # Initialize client
        async with NotebookLMClient(auth) as client:
            print("Client connected.")
            notebooks = await client.notebooks.list()
            print(f"Found {len(notebooks)} notebooks:")
            for nb in notebooks:
                print(f"- {nb.title} (ID: {nb.id})")
                
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
