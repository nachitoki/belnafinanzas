from fastapi import APIRouter, Depends, HTTPException, Query
from google.cloud.firestore import Client
from app.core.firebase import get_firestore
from app.core.auth import get_current_user
from datetime import datetime
from pathlib import Path
import csv
import re

router = APIRouter()

_NOTION_PRICES_CACHE = {"ts": None, "data": None}
_LIST_CACHE = {"ts": None, "data": None}
_LIST_CACHE_TTL_SECONDS = 60


def _to_iso(value) -> str:
    if value is None:
        return ""
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except Exception:
            pass
    return str(value)

def _parse_date(value):
    if value is None:
        return None
    if hasattr(value, "timestamp"):
        try:
            return datetime.fromtimestamp(value.timestamp())
        except Exception:
            pass
    if hasattr(value, "date"):
        try:
            return datetime.fromisoformat(value.date().isoformat())
        except Exception:
            pass
    try:
        return datetime.fromisoformat(str(value))
    except Exception:
        return None

def _normalize_name(name: str) -> str:
    return re.sub(r"\s+", " ", (name or "").strip().lower())

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

def _repo_root() -> Path:
    return Path(__file__).resolve().parents[4]

def _load_notion_prices() -> dict:
    if _NOTION_PRICES_CACHE["data"] is not None:
        return _NOTION_PRICES_CACHE["data"]

    csv_path = _repo_root() / "Datos Notion" / "Extracted" / "Private & Shared" / "Bases de datos Familiares (Maestra Suprema)" / "Despensa Productos (Maestra) 24088a385be78020b418c4c9e75929e6_all.csv"
    if not csv_path.exists():
        _NOTION_PRICES_CACHE["data"] = {}
        return {}

    price_map = {}
    try:
        with csv_path.open("r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                name = (row.get("Producto") or "").strip()
                if not name:
                    continue
                price = _parse_price_value(row.get("Precio compra") or row.get("Precio compra ") or "")
                unit = (row.get("Unidad de medida") or "").strip()
                if price <= 0:
                    continue
                price_map[_normalize_name(name)] = {
                    "price": price,
                    "unit": unit
                }
    except Exception:
        price_map = {}

    _NOTION_PRICES_CACHE["data"] = price_map
    return price_map


@router.get("/shopping-list")
def list_shopping_list(
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore)
):
    try:
        household_id = user["household_id"]
        now = datetime.utcnow()
        if _LIST_CACHE["ts"] and _LIST_CACHE["data"]:
            if (now - _LIST_CACHE["ts"]).total_seconds() < _LIST_CACHE_TTL_SECONDS:
                return _LIST_CACHE["data"]
        items_ref = db.collection("households").document(household_id).collection("shopping_list")
        docs = items_ref.order_by("created_at", direction="DESCENDING").limit(200).stream()

        items = []
        product_ids = []
        for doc in docs:
            data = doc.to_dict()
            product_id = data.get("product_id")
            if product_id:
                product_ids.append(product_id)
            items.append({
                "id": doc.id,
                "name": data.get("name"),
                "qty": data.get("qty"),
                "unit": data.get("unit"),
                "product_id": product_id,
                "checked": data.get("checked", False),
                "bucket": data.get("bucket", "monthly"),
                "weeks": data.get("weeks") or ([1] if data.get("week1") else []),
                "created_at": _to_iso(data.get("created_at")),
                "updated_at": _to_iso(data.get("updated_at"))
            })

        # Attach product names and best price per item
        product_cache = {}
        if product_ids:
            products_ref = db.collection("households").document(household_id).collection("products")
            for pid in set(product_ids):
                p_doc = products_ref.document(pid).get()
                if p_doc.exists:
                    p = p_doc.to_dict()
                    product_cache[pid] = {
                        "name": p.get("name_raw") or p.get("name_norm") or "Sin nombre",
                        "manual_price": p.get("manual_price"),
                        "manual_unit": p.get("manual_unit")
                    }

        stores_ref = db.collection("households").document(household_id).collection("stores")
        store_cache = {}
        prices_ref = db.collection("households").document(household_id).collection("product_prices")
        notion_prices = _load_notion_prices()
        for item in items:
            pid = item.get("product_id")
            item["product_name"] = product_cache.get(pid, {}).get("name")

            best = None
            if pid:
                # Find latest prices for product and compute best (min unit_price)
                price_docs = prices_ref.where("product_id", "==", pid).limit(50).stream()
                for pdoc in price_docs:
                    pdata = pdoc.to_dict()
                    unit_price = pdata.get("unit_price")
                    if unit_price is None:
                        continue
                    store_id = pdata.get("store_id")
                    store_name = None
                    if store_id:
                        if store_id in store_cache:
                            store_name = store_cache[store_id]
                        else:
                            sdoc = stores_ref.document(store_id).get()
                            store_name = sdoc.to_dict().get("name") if sdoc.exists else None
                            store_cache[store_id] = store_name

                    candidate = {
                        "unit_price": unit_price,
                        "unit": pdata.get("unit"),
                        "qty": pdata.get("qty"),
                        "total_price": pdata.get("total_price"),
                        "date": _to_iso(pdata.get("date")),
                        "store_id": store_id,
                        "store_name": store_name
                    }
                    if best is None or unit_price < best["unit_price"]:
                        best = candidate

            if not best and pid:
                manual_price = product_cache.get(pid, {}).get("manual_price")
                if manual_price:
                    best = {
                        "unit_price": manual_price,
                        "unit": product_cache.get(pid, {}).get("manual_unit"),
                        "qty": None,
                        "total_price": manual_price,
                        "date": "",
                        "store_id": None,
                        "store_name": "Manual"
                    }

            if not best:
                name_key = _normalize_name(item.get("name") or item.get("product_name") or "")
                if name_key in notion_prices:
                    np = notion_prices[name_key]
                    best = {
                        "unit_price": np.get("price"),
                        "unit": np.get("unit"),
                        "qty": None,
                        "total_price": np.get("price"),
                        "date": "",
                        "store_id": None,
                        "store_name": "Notion"
                    }

            if best:
                item["best_price"] = best

        _LIST_CACHE["ts"] = now
        _LIST_CACHE["data"] = items
        return items
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/shopping-list/suggestions")
def list_shopping_suggestions(
    q: str = Query("", alias="q"),
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore)
):
    try:
        household_id = user["household_id"]
        query = _normalize_name(q or "")
        notion_prices = _load_notion_prices()

        # If searching, return Notion matches + recent purchases
        if query:
            if len(query) < 2:
                return []
            candidates = {query}
            if query.endswith("es") and len(query) > 4:
                candidates.add(query[:-2])
            if query.endswith("s") and len(query) > 3:
                candidates.add(query[:-1])
            matches = []
            seen = set()
            for name_key, pdata in notion_prices.items():
                if any(cand in name_key for cand in candidates):
                    if name_key in seen:
                        continue
                    seen.add(name_key)
                    matches.append({
                        "product_id": None,
                        "name": name_key.title(),
                        "latest_price": {
                            "unit_price": pdata.get("price"),
                            "unit": pdata.get("unit"),
                            "qty": None,
                            "total_price": pdata.get("price"),
                            "date": "",
                            "store_id": None,
                            "store_name": "Notion"
                        }
                    })
                if len(matches) >= 20:
                    break

            if len(matches) < 20:
                products_ref = db.collection("households").document(household_id).collection("products")
                product_docs = products_ref.limit(300).stream()
                for pdoc in product_docs:
                    pdata = pdoc.to_dict()
                    name_norm = _normalize_name(pdata.get("name_raw") or pdata.get("name_norm") or "")
                    if not name_norm:
                        continue
                    if any(cand in name_norm for cand in candidates):
                        if name_norm in seen:
                            continue
                        seen.add(name_norm)
                        manual_price = pdata.get("manual_price")
                        manual_unit = pdata.get("manual_unit")
                        latest = None
                        if manual_price:
                            latest = {
                                "unit_price": manual_price,
                                "unit": manual_unit,
                                "qty": None,
                                "total_price": manual_price,
                                "date": "",
                                "store_id": None,
                                "store_name": "Manual"
                            }
                        elif name_norm in notion_prices:
                            np = notion_prices[name_norm]
                            latest = {
                                "unit_price": np.get("price"),
                                "unit": np.get("unit"),
                                "qty": None,
                                "total_price": np.get("price"),
                                "date": "",
                                "store_id": None,
                                "store_name": "Notion"
                            }
                        matches.append({
                            "product_id": pdoc.id,
                            "name": pdata.get("name_raw") or pdata.get("name_norm") or "Sin nombre",
                            "latest_price": latest
                        })
                    if len(matches) >= 20:
                        break

            if matches:
                return matches

        prices_ref = db.collection("households").document(household_id).collection("product_prices")
        docs = prices_ref.order_by("date", direction="DESCENDING").limit(200).stream()

        latest_by_product = {}
        for doc in docs:
            data = doc.to_dict()
            product_id = data.get("product_id")
            if not product_id or product_id in latest_by_product:
                continue
            latest_by_product[product_id] = data
            if len(latest_by_product) >= 20:
                break

        products_ref = db.collection("households").document(household_id).collection("products")
        stores_ref = db.collection("households").document(household_id).collection("stores")
        store_cache = {}
        suggestions = []
        for product_id, pdata in latest_by_product.items():
            p_doc = products_ref.document(product_id).get()
            if not p_doc.exists:
                continue
            p = p_doc.to_dict()
            store_id = pdata.get("store_id")
            store_name = None
            if store_id:
                if store_id in store_cache:
                    store_name = store_cache[store_id]
                else:
                    sdoc = stores_ref.document(store_id).get()
                    store_name = sdoc.to_dict().get("name") if sdoc.exists else None
                    store_cache[store_id] = store_name
            suggestions.append({
                "product_id": product_id,
                "name": p.get("name_raw") or p.get("name_norm") or "Sin nombre",
                "latest_price": {
                    "unit_price": pdata.get("unit_price"),
                    "unit": pdata.get("unit"),
                    "qty": pdata.get("qty"),
                    "total_price": pdata.get("total_price"),
                    "date": _to_iso(pdata.get("date")),
                    "store_id": store_id,
                    "store_name": store_name
                }
            })

        suggestions = sorted(suggestions, key=lambda s: (s.get("name") or "").lower())
        return suggestions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/shopping-list")
def create_shopping_item(
    payload: dict,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore)
):
    try:
        household_id = user["household_id"]
        name = (payload.get("name") or "").strip()
        product_id = payload.get("product_id")
        qty = payload.get("qty")
        unit = payload.get("unit")
        checked = bool(payload.get("checked", False))
        bucket = payload.get("bucket") or "monthly"
        weeks = payload.get("weeks") or []
        if isinstance(weeks, int):
            weeks = [weeks]
        weeks = [int(w) for w in weeks if str(w).isdigit()]

        if not name and not product_id:
            raise HTTPException(status_code=400, detail="name or product_id is required")

        item_data = {
            "name": name,
            "product_id": product_id,
            "qty": qty,
            "unit": unit,
            "checked": checked,
            "bucket": bucket,
            "weeks": weeks,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }

        _, ref = db.collection("households").document(household_id)\
            .collection("shopping_list").add(item_data)
        return {"id": ref.id, "success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/shopping-list/{item_id}")
def update_shopping_item(
    item_id: str,
    payload: dict,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore)
):
    try:
        household_id = user["household_id"]
        doc_ref = db.collection("households").document(household_id)\
            .collection("shopping_list").document(item_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Item not found")

        updates = {}
        if "name" in payload:
            updates["name"] = (payload.get("name") or "").strip()
        if "product_id" in payload:
            updates["product_id"] = payload.get("product_id")
        if "qty" in payload:
            updates["qty"] = payload.get("qty")
        if "unit" in payload:
            updates["unit"] = payload.get("unit")
        if "checked" in payload:
            updates["checked"] = bool(payload.get("checked"))
        if "bucket" in payload:
            updates["bucket"] = payload.get("bucket") or "monthly"
        if "weeks" in payload:
            weeks = payload.get("weeks") or []
            if isinstance(weeks, int):
                weeks = [weeks]
            updates["weeks"] = [int(w) for w in weeks if str(w).isdigit()]

        updates["updated_at"] = datetime.now()

        doc_ref.set(updates, merge=True)
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/shopping-list/{item_id}")
def delete_shopping_item(
    item_id: str,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore)
):
    try:
        household_id = user["household_id"]
        doc_ref = db.collection("households").document(household_id)\
            .collection("shopping_list").document(item_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Item not found")

        doc_ref.delete()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
