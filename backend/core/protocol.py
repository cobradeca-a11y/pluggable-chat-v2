from typing import AsyncIterator, List, Protocol
from pydantic import BaseModel

class Message(BaseModel):
    role: str
    content: str

class LLMProvider(Protocol):
    async def complete(self, messages: List[Message]) -> str:
        ...

    def stream(self, messages: List[Message]) -> AsyncIterator[str]:
        ...

    async def health(self) -> bool:
        ...
