from fastapi import APIRouter, HTTPException, Query
from pathlib import Path
import csv
import re

router = APIRouter()


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[4]


CSV_PATH = _repo_root() / "Datos Notion" / "Extracted" / "Private & Shared" / "Bases de datos Familiares (Maestra Suprema)" / "Recetario Familiar 24088a385be780ae8514f2a7bcf9b4a2.csv"


def _parse_cost(value: str) -> float:
    if not value:
        return 0.0
    cleaned = re.sub(r"[^0-9\.,]", "", str(value))
    has_dot = "." in cleaned
    has_comma = "," in cleaned
    if has_dot and has_comma:
        cleaned = cleaned.replace(".", "").replace(",", ".")
    elif has_comma and not has_dot:
        cleaned = cleaned.replace(",", ".")
    try:
        return float(cleaned)
    except Exception:
        return 0.0


def _parse_ingredients(value: str) -> list[str]:
    if not value:
        return []
    parts = [p.strip() for p in value.split(",") if p.strip()]
    result = []
    for p in parts:
        p = p.replace("@", "").strip()
        if " (" in p:
            p = p.split(" (")[0].strip()
        result.append(p)
    return result


from functools import lru_cache

@lru_cache(maxsize=1)
def _get_cached_recipes():
    if not CSV_PATH.exists():
        return []
    
    items = []
    try:
        with CSV_PATH.open("r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                name = (row.get("Receta") or "").strip()
                if not name:
                    continue
                meal_type = (row.get("Tipo de comida") or "").strip()
                ingredients = _parse_ingredients(row.get("Ingredientes (intermedio)") or row.get("Ingredientes") or "")
                cost_value = _parse_cost(row.get("Valor receta") or row.get("Costo receta") or row.get("Costo Estimado") or "")
                items.append({
                    "name": name,
                    "meal_type": meal_type,
                    "ingredients": ingredients,
                    "cost": cost_value
                })
    except Exception as e:
        print(f"Error reading recipes CSV: {e}")
        return []
    return items



@router.get("/recipes")
def list_recipes(limit: int = Query(200, ge=1, le=1000)):
    try:
        items = _get_cached_recipes()
        return items[:limit]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
