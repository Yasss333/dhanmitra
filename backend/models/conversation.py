from pydantic import BaseModel
from typing import Optional, List

class Message(BaseModel):
    role: str        # "user" or "assistant"
    content: str

class ConversationSession(BaseModel):
    session_id: str
    user_id: str
    mode: str
    messages: List[Message] = []
    created_at: Optional[str] = None
    updated_at: Optional[str] = None