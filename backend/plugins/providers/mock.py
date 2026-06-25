import asyncio
from typing import AsyncIterator, List

from core.protocol import LLMProvider, Message
from core.registry import register_provider

@register_provider("mock")
class MockProvider(LLMProvider):
    async def complete(self, messages: List[Message]) -> str:
        return "I am a mock response."

    async def stream(self, messages: List[Message]) -> AsyncIterator[str]:
        words = ["I", " am", " a", " mock", " response."]
        for word in words:
            yield word
            await asyncio.sleep(0.1)

    async def health(self) -> bool:
        return True
