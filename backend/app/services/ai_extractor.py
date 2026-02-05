from abc import ABC, abstractmethod
import google.generativeai as genai
import json
import logging
from typing import Optional

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
    
    This enables pluggable AI backends (Gemini, GPT-4 Vision, Claude, etc.)
    without changing business logic
    """
    
    @abstractmethod
    def extract(self, image_url: str) -> ReceiptExtractionResult:
        """
        Extract receipt data from image
        
        Args:
            image_url: Public URL of the receipt image
            
        Returns:
            ReceiptExtractionResult with structured data or error
        """
        pass


class GeminiVisionExtractor(ReceiptExtractor):
    """Gemini Vision API implementation of receipt extraction"""
    
    # Extraction prompt v3 - optimized for Chilean receipts with store and quantity/unit detection
    # Extraction prompt v4 - optimized for Chilean receipts with store and quantity/unit detection
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
3) RUT + address only if the store can be inferred with high confidence

Known Chilean stores to recognize:
- Unimarc, Lider, Jumbo, Santa Isabel, Tottus, Acuenta
- Falabella, Ripley, Paris, La Polar
- Sodimac, Easy, Construmart
- Farmacias Ahumada, Cruz Verde, Salcobrand
- Copec, Shell, Petrobras
- Pronto Copec, Ok Market, Oxxo
- McDonalds, Starbucks, Juan Valdez

If the store is inferred (not explicitly written), mark it as method: "inferred" and reduce confidence.

DATE & TOTAL
- Extract the transaction date (YYYY-MM-DD).
- Extract the final total paid in CLP integer (not subtotal, not tax).

ITEMS (VERY IMPORTANT)
For each purchased item:
- Extract the product name exactly as written
- Detect quantity and unit ONLY if clearly stated or mathematically evident
- Allowed units: "kg", "g", "l", "ml", "unit"

Quantity rules:
- If the receipt shows weight-based pricing (fruits, vegetables, meat), extract the weight as qty and unit "kg" or "g".
- If multiple units are bought (e.g. "2 x yogurt"), extract qty = 2, unit = "unit".
- If quantity or unit is ambiguous, set both to null.

Prefer null over guessing.

BLUR DETECTION
If the image is too blurry to read item details reliably:
- Set "is_blurry": true
- Extract what is legible (e.g. Total, Date)
- If nothing is legible, return items: [] and very low confidence.

OUTPUT FORMAT (STRICT JSON)
{
  "store": {
    "name": "string | null",
    "method": "exact | inferred | unknown",
    "confidence": number
  },
  "date": "YYYY-MM-DD | null",
  "total": number | null,
  "is_blurry": boolean,
  "items": [
    {
      "name": "string",
      "qty": number | null,
      "unit": "kg | g | l | ml | unit | null",
      "line_total": number | null
    }
  ],
  "confidence_overall": number
}

CONFIDENCE SCALE
- 1.0 = very high certainty
- 0.7-0.9 = high confidence
- 0.4-0.6 = medium confidence
- < 0.4 = low confidence

If store name is not visible or inferable with high confidence:
- name: null
- method: "unknown"
- confidence: < 0.4

Remember:
- One receipt = one extraction
- Prefer accuracy and nulls over completeness
- Output JSON only"""

    # Fallback prompt when items are empty
    EXTRACTION_PROMPT_FALLBACK = """You are doing a best-effort OCR extraction.
Return ONLY valid JSON in the same schema as before.
If any line looks like a product, include it as an item name even if qty/unit are unknown.
If the receipt is readable but details are partial, still return items with null qty/unit.
If nothing is legible, return items: [] and set is_blurry = true."""

    EXTRACTION_PROMPT_ULTRA = """Best-effort OCR for receipts.
Return ONLY valid JSON in the same schema.
If you can read any product names, list them as items.
Use null for unknown fields. Do not return an empty items list unless nothing is legible."""

    def __init__(self, api_key: str, model_name: str | None = None, fallback_model_name: str | None = None):
        """Initialize Gemini Vision API"""
        genai.configure(api_key=api_key)
        model_to_use = model_name or "gemini-1.5-flash"
        self.model = genai.GenerativeModel(model_to_use)
        self.model_name = model_to_use
        self.fallback_model_name = fallback_model_name
        self.fallback_model = None
        if fallback_model_name and fallback_model_name != model_to_use:
            try:
                self.fallback_model = genai.GenerativeModel(fallback_model_name)
                logger.info(f"GeminiVisionExtractor fallback model: {fallback_model_name}")
            except Exception as e:
                logger.warning(f"Failed to init fallback model {fallback_model_name}: {e}")
        logger.info(f"GeminiVisionExtractor initialized with model: {model_to_use}")
    
    def extract(self, image_url: str) -> ReceiptExtractionResult:
        """
        Extract receipt data using Gemini Vision
        
        Single call, no retries (as per specification)
        """
        try:
            logger.info(f"Starting extraction for image: {image_url}")
            
            # Download image for processing
            import requests
            response = requests.get(image_url, timeout=30)
            response.raise_for_status()
            image_bytes = response.content
            mime_type = response.headers.get("Content-Type", "image/jpeg").split(";")[0].strip()
            if not mime_type.startswith("image/"):
                mime_type = "image/jpeg"
            
            # Call Gemini Vision
            result = self.model.generate_content([
                self.EXTRACTION_PROMPT,
                {
                    "mime_type": mime_type,
                    "data": image_bytes
                }
            ])
            
            # Parse response
            response_text = result.text.strip()
            logger.debug(f"Raw Gemini response: {response_text}")
            
            # Clean markdown formatting if present
            json_text = self._extract_json(response_text)
            
            # Parse JSON
            data = json.loads(json_text)
            
            # Validate required fields
            self._validate_schema(data)

            # If extraction is empty, retry with fallback prompt
            if not data.get('items') and not data.get('total') and not data.get('store', {}).get('name'):
                logger.info("Empty extraction. Retrying with fallback prompt.")
                retry_model = self.fallback_model or self.model
                retry = retry_model.generate_content([
                    self.EXTRACTION_PROMPT_FALLBACK,
                    {
                        "mime_type": mime_type,
                        "data": image_bytes
                    }
                ])
                retry_text = retry.text.strip()
                retry_json = self._extract_json(retry_text)
                retry_data = json.loads(retry_json)
                self._validate_schema(retry_data)
                data = retry_data

            if not data.get('items'):
                logger.info("Still empty after fallback. Retrying with ultra prompt.")
                retry_model = self.fallback_model or self.model
                retry = retry_model.generate_content([
                    self.EXTRACTION_PROMPT_ULTRA,
                    {
                        "mime_type": mime_type,
                        "data": image_bytes
                    }
                ])
                retry_text = retry.text.strip()
                retry_json = self._extract_json(retry_text)
                retry_data = json.loads(retry_json)
                self._validate_schema(retry_data)
                data = retry_data

            # Backward-compat mapping for older consumers
            store_info = data.get('store', {})
            data.setdefault('store_name', store_info.get('name'))
            data.setdefault('confidence', data.get('confidence_overall'))
            
            # Log extraction result with new schema
            store_info = data.get('store', {})
            store_name = store_info.get('name', 'Unknown')
            store_confidence = store_info.get('confidence', 0)
            logger.info(f"Extraction successful. Store: {store_name} ({store_confidence:.1%}), Items: {len(data.get('items', []))}")
            
            return ReceiptExtractionResult(
                success=True,
                data=data
            )
            
        except json.JSONDecodeError as e:
            error_msg = f"Invalid JSON from Gemini: {e}"
            logger.error(error_msg)
            return ReceiptExtractionResult(
                success=False,
                error=error_msg
            )
        
        except Exception as e:
            error_msg = f"Extraction failed: {str(e)}"
            logger.error(error_msg)
            return ReceiptExtractionResult(
                success=False,
                error=error_msg
            )
    
    def _extract_json(self, text: str) -> str:
        """Extract JSON from response (handle markdown formatting)"""
        # Remove markdown code blocks if present
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
        
        return text.strip()
    
    def _validate_schema(self, data: dict) -> None:
        """Validate that required fields are present (new schema)"""
        if 'items' not in data:
            raise ValueError("Missing 'items' field in extraction result")
        
        if 'confidence_overall' not in data:
            raise ValueError("Missing 'confidence_overall' field in extraction result")
        
        if 'store' not in data:
            raise ValueError("Missing 'store' field in extraction result")
        
        if not isinstance(data['items'], list):
            raise ValueError("'items' must be a list")
        
        # Validate each item has name
        for i, item in enumerate(data['items']):
            if 'name' not in item:
                raise ValueError(f"Item {i} missing 'name' field")

