
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
            print("Client dir:", dir(client))
            # Check likely attributes
            if hasattr(client, "notebooks"):
                print("client.notebooks dir:", dir(client.notebooks))
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
