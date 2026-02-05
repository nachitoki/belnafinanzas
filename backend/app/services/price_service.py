from google.cloud.firestore import Client
from datetime import datetime, timedelta
import logging
import re
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

class PriceService:
    def __init__(self, db: Client):
        self.db = db

    async def get_price_comparison(self, query_text: str, household_id: str) -> str:
        """
        Analyze price for a product query and return a concise summary.
        """
        # 1. Parse quantity/unit from query if present
        parsed = self._parse_query(query_text)
        search_name = parsed['name'].lower()
        target_unit = parsed['unit']
        
        # 2. Find product
        product = await self._find_product(search_name, household_id)
        if not product:
            return f"{search_name.upper()}\n\nAún no tengo suficientes compras para comparar bien.\nCon 1–2 compras más podré orientarte mejor."

        product_id = product['id']
        product_name = product['name_norm'] or product['name_raw']

        # 3. Get recent prices (last 90 days)
        cutoff_date = datetime.now() - timedelta(days=90)
        
        prices_ref = self.db.collection('households').document(household_id).collection('product_prices')
        query = prices_ref.where('product_id', '==', product_id).where('date', '>=', cutoff_date).stream()
        
        price_records = []
        for doc in query:
            price_records.append(doc.to_dict())

        if not price_records:
            return f"{product_name.upper()}\n\nNo tengo registros recientes de este producto.\nAyúdame subiendo boletas para aprender."

        # 4. Data Quality Check (Internal Thresholds)
        num_compras = len(price_records)
        confidence_label = ""
        if num_compras < 3:
            confidence_label = " (Datos limitados)"
        elif num_compras > 5:
            confidence_label = " (Comparación confiable)"

        # 5. Filter by unit or decide if to use total price
        available_units = set(p['unit'] for p in price_records)
        
        # Rule for "composite" or non-standard items: if 'unit' is the only unit and we have no weights
        is_composite = len(available_units) == 1 and 'unit' in available_units
        
        if target_unit and target_unit in available_units:
            use_unit = target_unit
        else:
            unit_counts = {}
            for p in price_records:
                unit_counts[p['unit']] = unit_counts.get(p['unit'], 0) + 1
            use_unit = max(unit_counts, key=unit_counts.get)

        filtered_prices = [p for p in price_records if p['unit'] == use_unit]
        
        # 6. Calculate stats
        unit_prices = [p['unit_price'] for p in filtered_prices]
        avg_price = sum(unit_prices) / len(unit_prices)
        min_price = min(unit_prices)
        max_price = max(unit_prices)
        
        # Find cheapest store
        cheapest_record = min(filtered_prices, key=lambda x: x['unit_price'])
        store_id = cheapest_record['store_id']
        store_name = await self._get_store_name(store_id, household_id)

        # 7. Final Formatting
        unit_display = use_unit if use_unit != 'unit' else 'un'
        tipo_comparacion = "por unidad" if use_unit == 'unit' else f"por {unit_display}"
        
        res = [
            f"<b>{product_name.upper()}</b>{confidence_label}",
            f"\n• Precio promedio: ${avg_price:,.0f}/{unit_display}",
            f"• Rango reciente: ${min_price:,.0f} – ${max_price:,.0f}/{unit_display}",
            f"• Tienda más barata: {store_name}",
            f"\n<i>Comparación basada en precio {tipo_comparacion}.</i>" if is_composite else ""
        ]
        
        return "\n".join([r for r in res if r])

    def _parse_query(self, text: str) -> Dict[str, Any]:
        """Extract name and optional qty/unit"""
        match = re.search(r'^(.+?)(?:\s+(\d+(?:\.\d+)?)\s*(kg|g|l|ml|un|u))?$', text, re.IGNORECASE)
        if match:
            return {
                'name': match.group(1).strip(),
                'qty': float(match.group(2)) if match.group(2) else None,
                'unit': self._normalize_unit(match.group(3)) if match.group(3) else None
            }
        return {'name': text.strip(), 'qty': None, 'unit': None}

    def _normalize_unit(self, unit: str) -> str:
        unit = unit.lower()
        if unit in ['u', 'un']: return 'unit'
        return unit

    async def _find_product(self, name: str, household_id: str) -> Optional[Dict[str, Any]]:
        products_ref = self.db.collection('households').document(household_id).collection('products')
        docs = products_ref.stream()
        
        best_match = None
        highest_score = 0
        import difflib
        
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            score = max(
                difflib.SequenceMatcher(None, name.lower(), data.get('name_norm', '').lower()).ratio(),
                difflib.SequenceMatcher(None, name.lower(), data.get('name_raw', '').lower()).ratio()
            )
            if score > 0.6 and score > highest_score:
                highest_score = score
                best_match = data
        return best_match

    async def _get_store_name(self, store_id: str, household_id: str) -> str:
        doc = self.db.collection('households').document(household_id).collection('stores').document(store_id).get()
        if doc.exists:
            return doc.to_dict().get('name', 'Tienda desconocida')
        return "Tienda desconocida"
