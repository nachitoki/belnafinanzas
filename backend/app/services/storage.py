from datetime import timedelta
from fastapi import UploadFile, HTTPException
from google.cloud.storage import Bucket
from PIL import Image
import io
import uuid
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Allowed image types
ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif']
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_IMAGE_WIDTH = 2048  # Resize if larger


class StorageService:
    """Firebase Storage service for receipt images"""
    
    def __init__(self, bucket: Bucket):
        self.bucket = bucket
    
    def upload_receipt_image(
        self,
        file: UploadFile,
        household_id: str,
        receipt_id: str
    ) -> tuple[str, str]:
        """
        Upload receipt image to Firebase Storage
        
        Args:
            file: Uploaded image file
            household_id: User's household ID
            receipt_id: Receipt document ID
            
        Returns:
            Tuple of (public_url, blob_path)
        """
        # Validate file type
        if file.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_MIME_TYPES)}"
            )
        
        # Read file content
        file_content = file.file.read()
        
        # Validate file size
        if len(file_content) > MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {MAX_IMAGE_SIZE / 1024 / 1024}MB"
            )
        
        # Process image (resize if needed, convert HEIC)
        processed_image, content_type = self._process_image(file_content, file.content_type)
        
        # Generate storage path
        file_extension = self._get_extension(content_type)
        filename = f"{uuid.uuid4()}{file_extension}"
        blob_path = f"households/{household_id}/receipts/{receipt_id}/{filename}"
        
        # Upload to Firebase Storage
        blob = self.bucket.blob(blob_path)
        blob.upload_from_string(
            processed_image,
            content_type=content_type
        )
        
        # Access Control: Uniform Bucket Level Access is enabled, so we cannot use make_public().
        # We generate a signed URL instead.
        
        public_url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(days=7),
            method="GET"
        )
        
        logger.info(f"Image uploaded: {blob_path} -> {public_url}")
        
        return public_url, blob_path
    
    def delete_receipt_image(self, image_url: str | None = None, blob_path: str | None = None) -> bool:
        """
        Delete receipt image from Firebase Storage
        
        Args:
            image_url: Public URL of the image (signed or public)
            blob_path: Storage path (preferred)
            
        Returns:
            True if deleted successfully
        """
        try:
            if not blob_path and image_url:
                # Try to extract blob path from URL
                # URL format: https://storage.googleapis.com/{bucket}/{path}
                # or signed URL with query params
                try:
                    from urllib.parse import urlparse
                    parsed = urlparse(image_url)
                    path = parsed.path.lstrip("/")
                    if path.startswith(self.bucket.name + "/"):
                        blob_path = path[len(self.bucket.name) + 1:]
                except Exception:
                    blob_path = None

            if not blob_path:
                return False

            blob = self.bucket.blob(blob_path)
            blob.delete()
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete image: {e}")
            return False
    
    def _process_image(self, file_content: bytes, content_type: str) -> tuple[bytes, str]:
        """
        Process image: resize if too large, convert HEIC to JPEG
        
        Returns:
            Tuple of (processed_image_bytes, content_type)
        """
        try:
            # Open image with PIL
            image = Image.open(io.BytesIO(file_content))
            
            # Convert HEIC to JPEG
            if content_type in ['image/heic', 'image/heif']:
                image = image.convert('RGB')
                content_type = 'image/jpeg'
            
            # Resize if too large (preserve aspect ratio)
            if image.width > MAX_IMAGE_WIDTH:
                ratio = MAX_IMAGE_WIDTH / image.width
                new_height = int(image.height * ratio)
                image = image.resize((MAX_IMAGE_WIDTH, new_height), Image.Resampling.LANCZOS)
                logger.info(f"Image resized to {MAX_IMAGE_WIDTH}x{new_height}")
            
            # Convert to bytes
            output = io.BytesIO()
            if content_type == 'image/jpeg':
                image.save(output, format='JPEG', quality=85, optimize=True)
            elif content_type == 'image/png':
                image.save(output, format='PNG', optimize=True)
            else:
                # Default to JPEG
                image.save(output, format='JPEG', quality=85)
                content_type = 'image/jpeg'
            
            return output.getvalue(), content_type
            
        except Exception as e:
            logger.error(f"Image processing failed: {e}")
            # Return original if processing fails
            return file_content, content_type

    def generate_signed_url(self, blob_path: str, days: int = 7) -> str:
        """Generate a signed URL for a stored blob path"""
        blob = self.bucket.blob(blob_path)
        return blob.generate_signed_url(
            version="v4",
            expiration=timedelta(days=days),
            method="GET"
        )
    
    def _get_extension(self, content_type: str) -> str:
        """Get file extension from content type"""
        extensions = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/heic': '.jpg',  # Converted to JPEG
            'image/heif': '.jpg',
        }
        return extensions.get(content_type, '.jpg')
