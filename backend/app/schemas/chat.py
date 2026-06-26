from pydantic import BaseModel
from typing import List, Optional
from core.protocol import Message, Attachment

class ChatRequest(BaseModel):
    messages: List[Message]
    provider: Optional[str] = None
    model: Optional[str] = None
    api_key: Optional[str] = None
    attachment: Optional[Attachment] = None

class ChatResponse(BaseModel):
    content: str
