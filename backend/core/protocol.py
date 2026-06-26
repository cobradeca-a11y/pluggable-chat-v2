from typing import AsyncIterator, List, Optional, Protocol
from pydantic import BaseModel

class Message(BaseModel):
    role: str
    content: str

class Attachment(BaseModel):
    name: str
    type: str   # MIME type
    data: str   # base64

class LLMProvider(Protocol):
    @property
    def supported_attachments(self) -> List[str]:
        """MIME types suportados. Lista vazia = não suporta anexos."""
        return []

    async def complete(self, messages: List[Message], attachment: Optional[Attachment] = None) -> str:
        ...

    def stream(self, messages: List[Message], attachment: Optional[Attachment] = None) -> AsyncIterator[str]:
        ...

    async def health(self) -> bool:
        ...

    async def generate_image(self, prompt: str) -> str:
        raise NotImplementedError

    async def generate_video(self, prompt: str) -> dict:
        raise NotImplementedError

    async def check_video_status(self, job_id: str) -> dict:
        raise NotImplementedError
