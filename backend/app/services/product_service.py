from datetime import datetime, timedelta
from typing import List, Dict, Any
from google.cloud.firestore import Client
from app.domain.models import ProductPrice, Status
from app.domain.logic import compute_product_status

class ProductService:
    def __init__(self, db: Client):
        self.db = db

    def get_strategic_products(self, household_id: str, category: str = None) -> List[Dict[str, Any]]:
        # 1. Fetch Products
        products_ref = self.db.collection('households').document(household_id).collection('products')
        if category:
            query = products_ref.where('category', '==', category)
        else:
            query = products_ref
        
        products_docs = list(query.stream())
        results = []

        # 2. Fetch Prices (Transactions) for context
        # Ideally we'd do a big query, but for MVP we loop (careful with N+1)
        # Optimization: Fetch all transactions with a product_id once?
        # For now, let's just return the static data + Green status.
        
        for doc in products_docs:
            p_data = doc.to_dict()
            product_id = doc.id
            
            # TODO: Fetch real price history
            prices: List[ProductPrice] = [] 
            
            status = compute_product_status(prices)
            
            summary = "Estable"
            if status == Status.YELLOW:
                summary = "Subiendo"
            elif status == Status.RED:
                summary = "Caro"
                
            results.append({
                "product_id": product_id,
                "name": p_data.get('name_raw', 'Sin nombre'),
                "icon": self._get_icon_for_category(p_data.get('category')),
                "status": status.value,
                "summary": summary
            })
            
        return results

    def _get_icon_for_category(self, category: str) -> str:
        icons = {
            'esenciales': '🍚',
            'despensa': '🥫',
            'limpieza': '🧹',
            'frutas': '🍎',
            'carnes': '🥩'
        }
        return icons.get(category, '📦')

    def get_product_insight(self, household_id: str, product_id: str) -> Dict[str, Any]:
        # Return mock detail for now
        return {
            "product_id": product_id,
            "name": "Producto Ejemplo",
            "unit_price": 1200,
            "unit": "kg",
            "best_store": "Jumbo",
            "comparison": "+$150 en Líder",
            "trend": "stable",
            "cat_message": "Este suele estar más barato en Jumbo"
        }
