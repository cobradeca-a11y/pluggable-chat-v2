from pydantic import BaseModel
from typing import List, Optional
from core.protocol import Message

class ChatRequest(BaseModel):
    messages: List[Message]
    provider: Optional[str] = None
    model: Optional[str] = None
    api_key: Optional[str] = None

class ChatResponse(BaseModel):
    content: str
