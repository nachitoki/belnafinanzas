from fastapi import APIRouter, Depends, HTTPException, Query
from google.cloud.firestore import Client
from app.core.firebase import get_firestore
from app.core.auth import get_current_user
from datetime import datetime
from pathlib import Path
import csv
import re
from app.services.product_matcher import ProductMatcher

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
    # Value format: "Nombre (Despensa Productos ...)"
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
    db: Client = Depends(get_firestore),
    limit: int = Query(100, ge=1, le=500)
):
    try:
        household_id = user["household_id"]
        stores_ref = db.collection("households").document(household_id).collection("stores")
        docs = list(stores_ref.stream())
        stores = []
        for doc in docs:
            data = doc.to_dict()
            if data.get("archived"):
                continue
            name = data.get("name")
            if not name:
                continue
            stores.append({
                "id": doc.id,
                "name": name,
                "aliases": data.get("aliases", []),
                "legal_names": data.get("legal_names", []),
                "created_at": _to_iso(data.get("created_at"))
            })
        stores = sorted(stores, key=lambda s: (s.get("name") or "").lower())[:limit]
        return stores
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stores/{store_id}/products")
def get_store_products(
    store_id: str,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore),
    limit: int = Query(50, ge=1, le=200)
):
    try:
        household_id = user["household_id"]
        prices_ref = db.collection("households").document(household_id).collection("product_prices")
        docs = prices_ref.where("store_id", "==", store_id).limit(500).stream()

        latest_by_product = {}
        for doc in docs:
            data = doc.to_dict()
            price_date = _to_iso(data.get("date"))
            product_id = data.get("product_id")
            if product_id and product_id not in latest_by_product:
                latest_by_product[product_id] = {
                    "product_id": product_id,
                    "unit_price": data.get("unit_price"),
                    "unit": data.get("unit"),
                    "qty": data.get("qty"),
                    "total_price": data.get("total_price"),
                    "date": price_date
                }
            if len(latest_by_product) >= limit:
                break

        products_map = {}
        products_ref = db.collection("households").document(household_id).collection("products")
        for product_id, price_data in latest_by_product.items():
            product_doc = products_ref.document(product_id).get()
            if product_doc.exists:
                p = product_doc.to_dict()
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
    db: Client = Depends(get_firestore),
    limit: int = Query(200, ge=1, le=1000)
):
    try:
        household_id = user["household_id"]
        products_ref = db.collection("households").document(household_id).collection("products")
        docs = list(products_ref.stream())
        products = []
        for doc in docs:
            data = doc.to_dict()
            products.append({
                "id": doc.id,
                "name": data.get("name_raw") or data.get("name_norm") or "Sin nombre",
                "name_norm": data.get("name_norm"),
                "manual_price": data.get("manual_price"),
                "manual_unit": data.get("manual_unit"),
                "group": data.get("group"),
                "category_tag": data.get("category_tag"),
                "recipe_linked": data.get("recipe_linked", False),
                "perishable": data.get("perishable", False),
                "created_at": _to_iso(data.get("created_at"))
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
    db: Client = Depends(get_firestore)
):
    try:
        household_id = user["household_id"]
        doc_ref = db.collection("households").document(household_id).collection("products").document(product_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Product not found")

        updates = {}
        matcher = None
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
                matcher = ProductMatcher(db)
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

        updates["updated_at"] = datetime.now()
        doc_ref.set(updates, merge=True)
        if matcher and "name_norm" in updates and updates["name_norm"]:
            matcher._index_product(household_id, product_id, updates["name_norm"])
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/products/import-notion")
def import_notion_products(
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore)
):
    try:
        household_id = user["household_id"]
        csv_path = _repo_root() / "Datos Notion" / "Extracted" / "Private & Shared" / "Bases de datos Familiares (Maestra Suprema)" / "Despensa Productos (Maestra) 24088a385be78020b418c4c9e75929e6_all.csv"
        if not csv_path.exists():
            return {"created": 0, "skipped": 0}

        matcher = ProductMatcher(db)
        matcher._ensure_index(household_id)
        products_ref = db.collection("households").document(household_id).collection("products")
        index_ref = db.collection("households").document(household_id).collection(matcher.index_collection)
        stores_ref = db.collection("households").document(household_id).collection("stores")
        prices_ref = db.collection("households").document(household_id).collection("product_prices")

        # Ensure Notion store exists
        store_docs = list(stores_ref.where("name", "==", "Notion").limit(1).stream())
        if store_docs:
            notion_store_id = store_docs[0].id
        else:
            _, store_ref = stores_ref.add({
                "name": "Notion",
                "legal_names": ["Notion"],
                "aliases": [],
                "city": None,
                "tags": {"source": "notion"},
                "created_at": datetime.now()
            })
            notion_store_id = store_ref.id

        created = 0
        updated = 0
        skipped = 0
        prices_seeded = 0
        extras_added = 0

        linked_set = _load_recipe_linked_set()

        def upsert_product(name_raw: str, manual_price: float, manual_unit: str | None, allow_recipe_linked: bool = True, group: str | None = None):
            nonlocal created, updated, skipped, prices_seeded, extras_added
            name_raw = (name_raw or "").strip()
            if not name_raw:
                return
            name_norm = _normalize_name(name_raw)
            if not name_norm:
                return
            if not allow_recipe_linked and name_norm in linked_set:
                skipped += 1
                return
            category_tag = None
            if group == "extras":
                category_tag = "limpieza" if _is_cleaning(name_raw) else "extras"
            elif group == "despensa":
                category_tag = "comida"
            recipe_linked = name_norm in linked_set

            existing = list(index_ref.where("name_norm", "==", name_norm).limit(1).stream())
            product_id = None
            if existing:
                product_id = existing[0].id
                doc_ref = products_ref.document(product_id)
                doc_ref.set({
                    "manual_price": manual_price if manual_price > 0 else None,
                    "manual_unit": manual_unit,
                    "group": group,
                    "category_tag": category_tag,
                    "recipe_linked": recipe_linked,
                    "updated_at": datetime.now()
                }, merge=True)
                updated += 1
            else:
                product_data = {
                    "name_raw": name_raw,
                    "name_norm": name_norm,
                    "unit_base": "unit",
                    "category": None,
                    "manual_price": manual_price if manual_price > 0 else None,
                    "manual_unit": manual_unit,
                    "group": group,
                    "category_tag": category_tag,
                    "recipe_linked": recipe_linked,
                    "created_at": datetime.now()
                }
                _, product_ref = products_ref.add(product_data)
                matcher._index_product(household_id, product_ref.id, name_norm)
                product_id = product_ref.id
                created += 1

            if product_id and manual_price > 0:
                price_doc = prices_ref.document(f"{product_id}_notion")
                price_doc.set({
                    "product_id": product_id,
                    "store_id": notion_store_id,
                    "date": datetime.now(),
                    "qty": None,
                    "unit": manual_unit or "unit",
                    "total_price": manual_price,
                    "unit_price": manual_price,
                    "source": "notion",
                    "created_at": datetime.now()
                }, merge=True)
                prices_seeded += 1
                if not allow_recipe_linked:
                    extras_added += 1

        with csv_path.open("r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                manual_price = _parse_price_value(row.get("Precio compra") or "")
                manual_unit = (row.get("Unidad de medida") or "").strip() or None
                upsert_product(row.get("Producto"), manual_price, manual_unit, allow_recipe_linked=True, group="despensa")

        # Extras despensa (only items not linked to recipes)
        extras_csv = _repo_root() / "Datos Notion" / "Extracted" / "Private & Shared" / "Bases de datos Familiares (Maestra Suprema)" / "Extras despensa 24988a385be780288e4fc4bcfc603685_all.csv"
        if extras_csv.exists():
            with extras_csv.open("r", encoding="utf-8-sig") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    manual_price = _parse_price_value(row.get("Precio compra") or row.get("Precio") or "")
                    manual_unit = (row.get("Select") or row.get("Unidad de medida") or "").strip() or None
                    upsert_product(row.get("Producto"), manual_price, manual_unit, allow_recipe_linked=False, group="extras")

        # Lista de compras (only items not linked to recipes)
        lista_csv = _repo_root() / "Datos Notion" / "Extracted" / "Private & Shared" / "Bases de datos Familiares (Maestra Suprema)" / "Lista de compras" / "Untitled 25f88a385be780fbaf31c3c9a8d2fa11.csv"
        if lista_csv.exists():
            with lista_csv.open("r", encoding="utf-8-sig") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    manual_price = _parse_price_value(row.get("Precio compra") or "")
                    upsert_product(row.get("Producto"), manual_price, None, allow_recipe_linked=False, group="extras")

        return {"created": created, "updated": updated, "skipped": skipped, "prices_seeded": prices_seeded, "extras_added": extras_added}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/products/{product_id}/prices")
def get_product_prices(
    product_id: str,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore),
    limit: int = Query(20, ge=1, le=100)
):
    try:
        household_id = user["household_id"]
        prices_ref = db.collection("households").document(household_id).collection("product_prices")
        docs = prices_ref.where("product_id", "==", product_id).limit(limit).stream()

        # cache store names
        stores_ref = db.collection("households").document(household_id).collection("stores")
        store_cache = {}

        prices = []
        for doc in docs:
            data = doc.to_dict()
            store_id = data.get("store_id")
            store_name = None
            if store_id:
                if store_id in store_cache:
                    store_name = store_cache[store_id]
                else:
                    store_doc = stores_ref.document(store_id).get()
                    store_name = store_doc.to_dict().get("name") if store_doc.exists else None
                    store_cache[store_id] = store_name

            price_date = _to_iso(data.get("date"))
            prices.append({
                "store_id": store_id,
                "store_name": store_name,
                "unit_price": data.get("unit_price"),
                "unit": data.get("unit"),
                "qty": data.get("qty"),
                "total_price": data.get("total_price"),
                "date": price_date
            })

        prices = sorted(prices, key=lambda p: p.get("date") or "", reverse=True)
        return prices
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
