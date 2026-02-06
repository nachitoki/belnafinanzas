from pathlib import Path
import csv

def _repo_root() -> Path:
    # Mimicking the logic in recipes.py relative to where I run this script
    # I will place this script in backend/
    return Path(__file__).resolve().parent.parent

# Adjusting logic: logic in recipes.py uses parents[4] from routes/recipes.py
# If I run this in s:\APP FINANZAS FAMILIARES\backend\debug_recipes.py
# current file: backend/debug_recipes.py
# parent: backend
# parent.parent: APP FINANZAS FAMILIARES

# But let's verify what recipes.py logic produces.
# recipes.py is at backend/app/api/routes/recipes.py
# p[0] routes, p[1] api, p[2] app, p[3] backend, p[4] ROOT
# So if I run this script in ROOT/backend, I need parents[1] to get to ROOT.

REPO_ROOT = Path("s:/APP FINANZAS FAMILIARES")
CSV_PATH = REPO_ROOT / "Datos Notion" / "Extracted" / "Private & Shared" / "Bases de datos Familiares (Maestra Suprema)" / "Recetario Familiar 24088a385be780ae8514f2a7bcf9b4a2.csv"

print(f"Calculated Path: {CSV_PATH}")
if CSV_PATH.exists():
    print("File EXISTS.")
    try:
        with CSV_PATH.open("r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            print(f"Headers: {reader.fieldnames}")
            count = 0
            for row in reader:
                print(f"Row {count}: {row.get('Receta')} | {row.get('Tipo de comida')}")
                count += 1
                if count >= 3:
                    break
    except Exception as e:
        print(f"Error reading CSV: {e}")
else:
    print("File REQUESTED DOES NOT EXIST.")
