from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TelegramLink(BaseModel):
    user_id: str
    telegram_chat_id: int
    telegram_username: Optional[str] = None
    verification_code: str
    linked_at: Optional[datetime] = None
    is_verified: bool = False
    created_at: Optional[datetime] = None