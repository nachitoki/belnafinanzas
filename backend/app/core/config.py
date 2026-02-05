from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal


class Settings(BaseSettings):
    """Application configuration from environment variables"""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )
    
    # Firebase
    firebase_project_id: str
    firebase_storage_bucket: str
    google_application_credentials: str
    
    # Gemini AI
    gemini_api_key: str
    gemini_model: str | None = None
    gemini_fallback_model: str | None = None

    # Telegram
    telegram_bot_token: str
    telegram_secret_token: str = "default-secret-token"
    ngrok_authtoken: str = ""
    
    # Application
    environment: Literal["development", "staging", "production"] = "development"
    log_level: str = "INFO"
    port: int = 8080
    
    @property
    def is_production(self) -> bool:
        return self.environment == "production"
    
    @property
    def is_development(self) -> bool:
        return self.environment == "development"


# Global settings instance
settings = Settings()
