from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client
from app.core.supabase import get_supabase
from app.core.auth import get_current_user
from datetime import datetime
from pathlib import Path
import csv
import re

router = APIRouter()


def _to_iso(value) -> str:
    if value is None:
        return ""
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except Exception:
            pass
    return str(value)

def _repo_root() -> Path:
    return Path(__file__).resolve().parents[4]

def _normalize_name(name: str) -> str:
    name = re.sub(r'(?i)\b(?:COD|SKU|PLU|INT)\b.*?(?=\s|$)', '', name or '')
    name = re.sub(r'\(\s*\d+[\s\d]*\)', '', name)
    name = re.sub(r'\b\d{4,}\b', '', name)
    name = " ".join(name.split())
    name = name.title()
    name = re.sub(r'[^A-Za-z0-9\sáéíóúÁÉÍÓÚñÑ\%\.-]', '', name)
    return name.strip()


def _dedupe_key(name: str) -> str:
    base = _normalize_name(name or "")
    base = re.sub(r"\s+", "", base).lower()
    return base

def _parse_price_value(value) -> float:
    if value is None:
        return 0.0
    cleaned = re.sub(r"[^0-9]", "", str(value))
    if not cleaned:
        return 0.0
    try:
        return float(cleaned)
    except Exception:
        return 0.0

def _parse_product_ref(value: str) -> str:
    if not value:
        return ""
    return value.split(" (")[0].strip()

def _is_cleaning(name: str) -> bool:
    n = (name or "").lower()
    keywords = [
        "detergente", "poett", "jabón", "jabon", "lavaloza", "lavalozas",
        "cloro", "desinfectante", "limp", "papel", "toalla", "servilleta",
        "bolsa basura", "basura", "higiénico", "higienico", "toallas higien",
        "pasta de dientes", "cepillo", "suavizante"
    ]
    return any(k in n for k in keywords)

def _load_recipe_linked_set() -> set:
    linked = set()
    ingredients_csv = _repo_root() / "Datos Notion" / "Extracted" / "Private & Shared" / "Bases de datos Familiares (Maestra Suprema)" / "Ingredientes de Recetas 24088a385be7808d8b39e609e0b92f0e_all.csv"
    if not ingredients_csv.exists():
        return linked
    try:
        with ingredients_csv.open("r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                prod = _parse_product_ref(row.get("Producto de despensa") or "")
                if prod:
                    linked.add(_normalize_name(prod))
    except Exception:
        return linked
    return linked

@router.get("/stores")
def list_stores(
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
    limit: int = Query(100, ge=1, le=500)
):
    try:
        household_id = user["household_id"]
        resp = supabase.table("stores").select("*").eq("household_id", household_id).execute()
        stores = []
        for data in resp.data:
            if data.get("archived"):
                continue
            name = data.get("name")
            if not name:
                continue
            stores.append({
                "id": data.get("id"),
                "name": name,
                "aliases": data.get("aliases", []),
                "legal_names": data.get("legal_names", []),
                "created_at": data.get("created_at")
            })
        stores = sorted(stores, key=lambda s: (s.get("name") or "").lower())[:limit]
        return stores
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stores/{store_id}/products")
def get_store_products(
    store_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
    limit: int = Query(50, ge=1, le=200)
):
    try:
        household_id = user["household_id"]
        prices_resp = supabase.table("product_prices").select("*").eq("household_id", household_id).eq("store_id", store_id).limit(500).execute()

        latest_by_product = {}
        for data in prices_resp.data:
            product_id = data.get("product_id")
            if product_id and product_id not in latest_by_product:
                latest_by_product[product_id] = {
                    "product_id": product_id,
                    "unit_price": data.get("unit_price"),
                    "unit": data.get("unit"),
                    "qty": data.get("qty"),
                    "total_price": data.get("total_price"),
                    "date": data.get("date")
                }
            if len(latest_by_product) >= limit:
                break

        products_map = {}
        for product_id, price_data in latest_by_product.items():
            prod_resp = supabase.table("products").select("*").eq("id", product_id).execute()
            if prod_resp.data:
                p = prod_resp.data[0]
                name_raw = p.get("name_raw") or p.get("name")
                name_norm = p.get("name_norm")
                display_name = name_norm or name_raw or "Sin nombre"
                entry = {
                    "product_id": product_id,
                    "name": display_name,
                    "name_raw": name_raw,
                    "name_norm": name_norm,
                    "latest_price": price_data
                }
                key = _dedupe_key(display_name) or product_id
                if key in products_map:
                    existing = products_map[key]
                    existing_norm = bool(existing.get("name_norm"))
                    current_norm = bool(name_norm)
                    if current_norm and not existing_norm:
                        products_map[key] = entry
                    elif current_norm == existing_norm:
                        existing_date = (existing.get("latest_price") or {}).get("date") or ""
                        current_date = price_data.get("date") or ""
                        if current_date > existing_date:
                            products_map[key] = entry
                else:
                    products_map[key] = entry

        products = sorted(products_map.values(), key=lambda p: (p.get("name") or "").lower())
        return products
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/products")
def list_products(
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
    limit: int = Query(200, ge=1, le=1000)
):
    try:
        household_id = user["household_id"]
        resp = supabase.table("products").select("*").eq("household_id", household_id).execute()
        products = []
        for data in resp.data:
            products.append({
                "id": data.get("id"),
                "name": data.get("name_raw") or data.get("name_norm") or "Sin nombre",
                "name_norm": data.get("name_norm"),
                "manual_price": data.get("manual_price"),
                "manual_unit": data.get("manual_unit"),
                "group": data.get("group"),
                "category_tag": data.get("category_tag"),
                "recipe_linked": data.get("recipe_linked", False),
                "perishable": data.get("perishable", False),
                "created_at": data.get("created_at")
            })
        products = sorted(products, key=lambda p: (p.get("name") or "").lower())[:limit]
        return products
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/products/{product_id}")
def update_product(
    product_id: str,
    payload: dict,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    try:
        household_id = user["household_id"]
        existing = supabase.table("products").select("id").eq("id", product_id).eq("household_id", household_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Product not found")

        updates = {}
        if "manual_price" in payload:
            val = payload.get("manual_price")
            updates["manual_price"] = float(val) if val is not None else None
        if "manual_unit" in payload:
            updates["manual_unit"] = (payload.get("manual_unit") or "").strip() or None
        if "name_raw" in payload:
            name_raw = (payload.get("name_raw") or "").strip()
            if name_raw:
                name_norm = _normalize_name(name_raw)
                updates["name_raw"] = name_raw
                updates["name_norm"] = name_norm
            else:
                updates["name_raw"] = None
                updates["name_norm"] = None
        if "group" in payload:
            updates["group"] = (payload.get("group") or "").strip() or None
        if "category_tag" in payload:
            updates["category_tag"] = (payload.get("category_tag") or "").strip() or None
        if "perishable" in payload:
            updates["perishable"] = bool(payload.get("perishable"))

        if not updates:
            return {"success": True}

        supabase.table("products").update(updates).eq("id", product_id).execute()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/products/{product_id}/prices")
def get_product_prices(
    product_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
    limit: int = Query(20, ge=1, le=100)
):
    try:
        household_id = user["household_id"]
        prices_resp = supabase.table("product_prices").select("*").eq("household_id", household_id).eq("product_id", product_id).order("date", desc=True).limit(limit).execute()

        store_cache = {}
        prices = []
        for data in prices_resp.data:
            store_id = data.get("store_id")
            store_name = None
            if store_id:
                if store_id in store_cache:
                    store_name = store_cache[store_id]
                else:
                    store_resp = supabase.table("stores").select("name").eq("id", store_id).execute()
                    store_name = store_resp.data[0].get("name") if store_resp.data else None
                    store_cache[store_id] = store_name

            prices.append({
                "store_id": store_id,
                "store_name": store_name,
                "unit_price": data.get("unit_price"),
                "unit": data.get("unit"),
                "qty": data.get("qty"),
                "total_price": data.get("total_price"),
                "date": data.get("date")
            })

        return prices
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
