import asyncio
from typing import AsyncIterator, List, Optional

from core.protocol import LLMProvider, Message, Attachment
from core.registry import register_provider

@register_provider("mock")
class MockProvider(LLMProvider):
    @property
    def supported_attachments(self) -> list[str]:
        return []

    async def complete(self, messages: List[Message], attachment: Optional[Attachment] = None) -> str:
        return "I am a mock response."

    async def stream(self, messages: List[Message], attachment: Optional[Attachment] = None) -> AsyncIterator[str]:
        words = ["I", " am", " a", " mock", " response."]
        for word in words:
            yield word
            await asyncio.sleep(0.1)

    async def health(self) -> bool:
        return True
