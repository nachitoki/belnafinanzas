import sys
import os
import argparse
import subprocess

# Setup path
BACKEND_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../backend"))

def run_seed():
    print("🌱 Seeding database...")
    seed_script = os.path.join(BACKEND_PATH, "scripts", "seed_data.py")
    
    if not os.path.exists(seed_script):
        print(f"❌ Seed script not found at {seed_script}")
        return

    # Run the seed script as a subprocess to ensure environment isolation
    # We assume 'python' is in path; might need to use venv python if specific
    try:
        # Try to find venv python
        venv_python = os.path.join(BACKEND_PATH, "venv", "Scripts", "python.exe")
        python_exe = venv_python if os.path.exists(venv_python) else sys.executable
        
        result = subprocess.run([python_exe, seed_script], cwd=BACKEND_PATH, check=True)
        print("✅ Seed completed.")
    except subprocess.CalledProcessError as e:
        print(f"❌ Seed failed with exit code {e.returncode}")
    except Exception as e:
        print(f"❌ Error running seed: {e}")

def wipe_data():
    print("⚠️  WIPE NOT IMPLEMENTED YET")
    print("To prevent accidental data loss, this is currently disabled.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["seed", "wipe"], help="Action to perform")
    args = parser.parse_args()
    
    if args.action == "seed":
        run_seed()
    elif args.action == "wipe":
        wipe_data()
