import json
import httpx
from typing import AsyncIterator, List

from core.protocol import LLMProvider, Message
from core.registry import register_provider
from app.config import settings


@register_provider("ollama")
class OllamaProvider(LLMProvider):
    def __init__(self) -> None:
        self.base_url = settings.OLLAMA_BASE_URL
        self.model = settings.OLLAMA_MODEL

    async def complete(self, messages: List[Message]) -> str:
        payload = {
            "model": self.model,
            "messages": [m.model_dump() for m in messages],
            "stream": False,
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/chat",
                json=payload,
                timeout=120.0,
            )
            response.raise_for_status()
            data = response.json()
            return data["message"]["content"]

    async def stream(self, messages: List[Message]) -> AsyncIterator[str]:
        payload = {
            "model": self.model,
            "messages": [m.model_dump() for m in messages],
            "stream": True,
        }
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/api/chat",
                json=payload,
                timeout=120.0,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                        content = data.get("message", {}).get("content", "")
                        if content:
                            yield content
                    except json.JSONDecodeError:
                        continue

    async def health(self) -> bool:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    self.base_url,
                    timeout=5.0,
                )
                return response.status_code == 200
            except httpx.RequestError:
                return False
