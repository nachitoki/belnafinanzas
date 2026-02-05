import sys
import os
import requests
import json
from datetime import datetime

# Configuration
API_URL = "http://localhost:8080/api"
HEADERS = {"Content-Type": "application/json"}

def print_header():
    print("="*60)
    print("🧠 BITACORA CONTROLLER CLI")
    print("Interact directly with the AI Advisor logic")
    print("="*60)

def list_entries():
    try:
        response = requests.get(f"{API_URL}/bitacora?limit=20", headers=HEADERS)
        response.raise_for_status()
        entries = response.json()
        print(f"\nFound {len(entries)} entries:")
        print(f"{'ID':<22} | {'TYPE':<10} | {'STATUS':<10} | {'TEXT'}")
        print("-" * 80)
        for e in entries:
            text = (e.get('text') or '')[:40].replace('\n', ' ')
            print(f"{e['id']:<22} | {e.get('kind', 'N/A'):<10} | {e.get('status', 'active'):<10} | {text}...")
    except Exception as e:
        print(f"Error listing entries: {e}")

def create_entry(text):
    data = {
        "text": text,
        "kind": "pregunta", # Simulating a user question
        "status": "active"
    }
    try:
        print("Sending to backend...")
        response = requests.post(f"{API_URL}/bitacora", json=data, headers=HEADERS)
        response.raise_for_status()
        res_json = response.json()
        print(f"✅ Entry created! ID: {res_json.get('id')}")
        # Here we could simulate the AI responding if we had that logic hooked up immediately
    except Exception as e:
        print(f"Error creating entry: {e}")

def inspect_entry(entry_id):
    try:
        response = requests.get(f"{API_URL}/bitacora/{entry_id}", headers=HEADERS)
        response.raise_for_status()
        print(json.dumps(response.json(), indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Error inspecting entry: {e}")

def convert_entry(entry_id, target_type):
    data = {"kind": target_type}
    try:
        response = requests.patch(f"{API_URL}/bitacora/{entry_id}", json=data, headers=HEADERS)
        response.raise_for_status()
        print(f"✅ Entry {entry_id} converted to {target_type}")
    except Exception as e:
        print(f"Error converting entry: {e}")

def main():
    print_header()
    while True:
        try:
            cmd_input = input("\n[bitacora]> ").strip()
            if not cmd_input:
                continue
            
            parts = cmd_input.split(" ", 1)
            cmd = parts[0].lower()
            args = parts[1] if len(parts) > 1 else ""

            if cmd in ["exit", "quit", "q"]:
                break
            elif cmd in ["list", "ls"]:
                list_entries()
            elif cmd == "chat":
                if not args:
                    print("Usage: chat <message>")
                else:
                    create_entry(args)
            elif cmd == "inspect":
                if not args:
                    print("Usage: inspect <entry_id>")
                else:
                    inspect_entry(args.strip())
            elif cmd == "convert":
                # Expect: convert <id> <type>
                sub_parts = args.split(" ")
                if len(sub_parts) < 2:
                    print("Usage: convert <entry_id> <target_type>")
                else:
                    convert_entry(sub_parts[0], sub_parts[1])
            elif cmd == "help":
                print("Commands: list, chat <msg>, inspect <id>, convert <id> <type>, quit")
            else:
                print("Unknown command. Type 'help'.")
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Unexpected error: {e}")

if __name__ == "__main__":
    main()
