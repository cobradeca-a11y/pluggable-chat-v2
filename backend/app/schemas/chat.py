from pydantic import BaseModel
from typing import List, Optional, Literal
from core.protocol import Message, Attachment

class ChatRequest(BaseModel):
    messages: List[Message]
    provider: Optional[str] = None
    model: Optional[str] = None
    api_key: Optional[str] = None
    attachment: Optional[Attachment] = None

class ChatResponse(BaseModel):
    content: str
    type: Literal["text", "image_url", "image_base64", "video_url", "audio_url"] = "text"

class ImageRequest(BaseModel):
    prompt: str
    provider: Optional[str] = None
    model: Optional[str] = None
    api_key: Optional[str] = None
