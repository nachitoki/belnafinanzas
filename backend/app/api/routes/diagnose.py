from fastapi import APIRouter, Depends, HTTPException
from app.core.config import settings
from app.core.firebase import get_storage_bucket
from google.cloud.storage import Bucket
import google.generativeai as genai
import logging
import requests
import uuid
from datetime import timedelta

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/diagnose")
def run_diagnostics(
    bucket: Bucket = Depends(get_storage_bucket)
):
    """
    Run self-diagnostics for Production Environment
    Checks:
    1. Gemini API Key presence and validity (Generation test)
    2. Google Cloud Storage Signing capability (Signed URL test)
    """
    results = {
        "env": settings.environment,
        "checks": {}
    }

    # 1. Check Gemini
    gemini_status = "unknown"
    try:
        if not settings.gemini_api_key:
            gemini_status = "missing_key"
        else:
            genai.configure(api_key=settings.gemini_api_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content("Ping")
            if response and response.text:
                gemini_status = "ok"
            else:
                gemini_status = "empty_response"
    except Exception as e:
        gemini_status = f"error: {str(e)}"
    
    results["checks"]["gemini_api"] = gemini_status

    # 2. Check GCS Signing
    gcs_status = "unknown"
    signed_url_test = "skipped"
    try:
        # Create a dummy file
        blob_name = f"diagnose_{uuid.uuid4()}.txt"
        blob = bucket.blob(blob_name)
        blob.upload_from_string("test")
        
        # Try to sign it
        try:
            url = blob.generate_signed_url(
                version="v4",
                expiration=timedelta(minutes=5),
                method="GET"
            )
            # Try to fetch it
            res = requests.get(url, timeout=5)
            if res.status_code == 200 and res.text == "test":
                signed_url_test = "accessible"
                gcs_status = "ok"
            else:
                signed_url_test = f"unreachable (status {res.status_code})"
                gcs_status = "network_error"
        except Exception as e:
            signed_url_test = f"signing_failed: {str(e)}"
            gcs_status = "signing_error"
            
        # Cleanup
        try:
            blob.delete()
        except:
            pass

    except Exception as e:
        gcs_status = f"bucket_error: {str(e)}"

    results["checks"]["gcs_signing"] = gcs_status
    results["checks"]["gcs_url_test"] = signed_url_test
    
    return results
