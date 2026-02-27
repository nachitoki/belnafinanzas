import os
import json
from typing import Dict, Any, List
import httpx
from loguru import logger
from dotenv import load_dotenv

load_dotenv()

class AIAdvisorService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
        
    async def categorize_text(self, text: str, categories: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Interpreta un texto de gasto natural y sugiere categoría y buckets financieros.
        """
        cat_context = "\n".join([f"- {c['name']} (ID: {c['id']})" for c in categories])
        
        prompt = f"""
        Eres un Asesor Financiero experto para una familia chilena. 
        Tu tarea es recibir una descripción de un gasto y clasificarla según las categorías disponibles.
        
        TEXTO DEL USUARIO: "{text}"
        
        CATEGORÍAS DISPONIBLES:
        {cat_context}
        
        REGLAS DE BUCKETS (Criterio del P. Ravasi / ERP Familiar):
        - OXÍGENO: Gastos vitales (Super, cuentas, arriendo, salud básica, educación hijas).
        - VIDA: Gastos que dan gusto (Salidas, hobbies, regalos, ropa no esencial).
        - BLINDAJE: Ahorros, inversiones o pago de deudas.
        
        INSTRUCCIÓN: Devuelve un JSON con:
        1. category_id: El ID de la categoría que mejor calce.
        2. bucket: "oxigeno", "vida" o "blindaje".
        3. normalized_description: Una versión limpia del gasto (ej: "Supermercado Lider" en vez de "lider express 123").
        4. amount_hint: Si el texto menciona un monto, extráelo como número, si no null.
        5. advice: Un consejo micro (1 frase) sobre este gasto.
        
        RESPUESTA SOLO EN JSON:
        """
        
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "response_mime_type": "application/json"
            }
        }
        
        headers = {"Content-Type": "application/json"}
        params = {"key": self.api_key}
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(self.endpoint, json=payload, headers=headers, params=params)
                response.raise_for_status()
                result = response.json()
                
                content = result['candidates'][0]['content']['parts'][0]['text']
                return json.loads(content)
        except Exception as e:
            logger.error(f"Error in AI categorization: {e}")
            return None
