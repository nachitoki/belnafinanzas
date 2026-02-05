from telegram import Bot, Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class TelegramService:
    """
    Service to interact with Telegram Bot API
    """
    _instance = None
    
    def __init__(self):
        if not settings.telegram_bot_token or "reemplazar" in settings.telegram_bot_token:
            logger.warning("Telegram token not configured")
            self.bot = None
        else:
            try:
                self.bot = Bot(token=settings.telegram_bot_token)
            except Exception as e:
                logger.error(f"Failed to initialize Telegram Bot: {e}")
                self.bot = None

    @classmethod
    def get_instance(cls):
        if not cls._instance:
            cls._instance = cls()
        return cls._instance

    async def send_message(self, chat_id: int, text: str, parse_mode: str = "HTML", reply_markup = None):
        """Send a text message"""
        if not self.bot:
            logger.warning("Bot attempting to send message but token not set")
            return
            
        try:
            return await self.bot.send_message(
                chat_id=chat_id, 
                text=text, 
                parse_mode=parse_mode,
                reply_markup=reply_markup
            )
        except Exception as e:
            logger.error(f"Failed to send Telegram message: {e}")
            return None

    async def edit_message(self, chat_id: int, message_id: int, text: str, parse_mode: str = "HTML", reply_markup = None):
        """Edit an existing message"""
        if not self.bot:
            return
            
        try:
            return await self.bot.edit_message_text(
                chat_id=chat_id,
                message_id=message_id,
                text=text,
                parse_mode=parse_mode,
                reply_markup=reply_markup
            )
        except Exception as e:
            logger.error(f"Failed to edit Telegram message: {e}")
            return None

    async def get_file_url(self, file_id: str) -> str:
        """Get full URL for a file (photo)"""
        if not self.bot:
            return None
            
        try:
            file = await self.bot.get_file(file_id)
            file_path = file.file_path
            if file_path.startswith("http"):
                return file_path
            return f"https://api.telegram.org/file/bot{settings.telegram_bot_token}/{file_path}"
        except Exception as e:
            logger.error(f"Failed to get file info: {e}")
            raise

    async def verify_webhook_secret(self, secret_token: str) -> bool:
        """Verify the secret token header from Telegram"""
        return secret_token == settings.telegram_secret_token
