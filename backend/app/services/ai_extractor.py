from abc import ABC, abstractmethod
from google import genai
from google.genai import types
import json
import logging
from typing import Optional
import requests

logger = logging.getLogger(__name__)


class ReceiptExtractionResult:
    """Standardized result from receipt extraction"""
    
    def __init__(
        self,
        success: bool,
        data: Optional[dict] = None,
        error: Optional[str] = None
    ):
        self.success = success
        self.data = data or {}
        self.error = error
    
    def to_dict(self) -> dict:
        return {
            'success': self.success,
            'data': self.data,
            'error': self.error
        }


class ReceiptExtractor(ABC):
    """
    Abstract base class for receipt extractors
    """
    
    @abstractmethod
    def extract(self, image_url: str) -> ReceiptExtractionResult:
        pass


class GeminiVisionExtractor(ReceiptExtractor):
    """Gemini Vision API implementation of receipt extraction"""
    
    EXTRACTION_PROMPT = """You are an OCR + structured information extraction system specialized in Chilean retail receipts.
Your task is to extract reliable, structured data from a receipt image.

STRICT RULES
- Output ONLY valid JSON
- Do NOT include explanations, comments, markdown, or extra text
- If a value cannot be determined with confidence, use null
- Never invent data

STORE DETECTION (CRITICAL)
Determine the store using this priority:
1) Exact store name explicitly written at the top/header of the receipt
2) Business name (razon social) commonly associated with a known Chilean store

Known Chilean stores to recognize:
- Unimarc, Lider, Jumbo, Santa Isabel, Tottus, Acuenta
- Falabella, Ripley, Paris, La Polar
- Sodimac, Easy, Construmart
- Farmacias Ahumada, Cruz Verde, Salcobrand
- Copec, Shell, Petrobras

DATE & TOTAL
- Extract the transaction date (YYYY-MM-DD).
- Extract the final total paid in CLP integer (not subtotal, not tax).

ITEMS (VERY IMPORTANT)
For each purchased item:
- Extract the product name exactly as written
- Detect quantity and unit ONLY if clearly stated or mathematically evident
- Allowed units: "kg", "g", "l", "ml", "unit"

OUTPUT FORMAT (STRICT JSON)
{
  "store": {
    "name": "string | null",
    "method": "exact | inferred | unknown",
    "confidence": 0.0
  },
  "date": "YYYY-MM-DD | null",
  "total": 1000,
  "is_blurry": false,
  "items": [
    {
      "name": "string",
      "qty": 1.5,
      "unit": "kg",
      "line_total": 5000
    }
  ],
  "confidence_overall": 0.0
}
"""

    EXTRACTION_PROMPT_FALLBACK = """You are doing a best-effort OCR extraction.
Return ONLY valid JSON in the same schema as before.
If any line looks like a product, include it as an item name even if qty/unit are unknown.
If the receipt is readable but details are partial, still return items with null qty/unit.
If nothing is legible, return items: [] and set is_blurry = true."""

    def __init__(self, api_key: str, model_name: str | None = None, fallback_model_name: str | None = None):
        if not api_key:
            raise ValueError("GEMINI_API_KEY is required")
        self.api_key = api_key
        self.model_name = model_name or "gemini-1.5-flash"
        self.fallback_model_name = fallback_model_name or "gemini-1.5-flash"
        logger.info(f"GeminiVisionExtractor initialized with raw REST client for model: {self.model_name}")
    
    def extract(self, image_url: str) -> ReceiptExtractionResult:
        try:
            logger.info(f"Starting extraction for image: {image_url}")
            
            # Download image
            response = requests.get(image_url, timeout=30)
            response.raise_for_status()
            image_bytes = response.content
            mime_type = response.headers.get("Content-Type", "image/jpeg").split(";")[0].strip()
            if not mime_type.startswith("image/"):
                mime_type = "image/jpeg"
                
            import base64
            encoded_image = base64.b64encode(image_bytes).decode('utf-8')
            
            # Use raw REST API v1beta
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"
            
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": self.EXTRACTION_PROMPT},
                            {"inline_data": {"mime_type": mime_type, "data": encoded_image}}
                        ]
                    }
                ]
            }
            
            headers = {"Content-Type": "application/json"}
            api_res = requests.post(url, json=payload, headers=headers, timeout=60)
            
            if api_res.status_code != 200:
                logger.error(f"Gemini API Error: {api_res.text}")
                return ReceiptExtractionResult(success=False, error=f"Gemini API returned {api_res.status_code}")
                
            res_json = api_res.json()
            response_text = ""
            if "candidates" in res_json and len(res_json["candidates"]) > 0:
                response_text = res_json["candidates"][0].get("content", {}).get("parts", [{}])[0].get("text", "")
            
            # Parse JSON
            try:
                data = json.loads(response_text)
            except json.JSONDecodeError:
                json_text = self._extract_json(response_text)
                data = json.loads(json_text)
            
            self._validate_schema(data)

            # Map legacy info
            store_info = data.get('store', {})
            data.setdefault('store_name', store_info.get('name'))
            data.setdefault('confidence', data.get('confidence_overall'))
            
            return ReceiptExtractionResult(success=True, data=data)
            
        except Exception as e:
            error_msg = f"Extraction failed: {str(e)}"
            logger.error(error_msg)
            return ReceiptExtractionResult(success=False, error=error_msg)
    
    def _extract_json(self, text: str) -> str:
        if "```json" in text:
            return text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            return text.split("```")[1].split("```")[0].strip()
        return text.strip()
    
    def _validate_schema(self, data: dict) -> None:
        if 'items' not in data:
            raise ValueError("Missing 'items' field")
        if 'confidence_overall' not in data:
            raise ValueError("Missing 'confidence_overall' field")
        if 'store' not in data:
            raise ValueError("Missing 'store' field")
        if not isinstance(data['items'], list):
            raise ValueError("'items' must be a list")
