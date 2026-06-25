import json
import httpx
from typing import AsyncIterator, List

from core.protocol import LLMProvider, Message
from core.registry import register_provider
from app.config import settings

@register_provider("openrouter")
class OpenRouterProvider(LLMProvider):
    def __init__(self) -> None:
        self.api_key = settings.OPENROUTER_API_KEY
        self.model = settings.OPENROUTER_MODEL
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": settings.ALLOWED_ORIGIN,
            "X-Title": "Pluggable Chat",
            "Content-Type": "application/json"
        }

    async def complete(self, messages: List[Message]) -> str:
        payload = {
            "model": self.model,
            "messages": [m.model_dump() for m in messages],
            "stream": False
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.base_url,
                headers=self.headers,
                json=payload,
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]

    async def stream(self, messages: List[Message]) -> AsyncIterator[str]:
        payload = {
            "model": self.model,
            "messages": [m.model_dump() for m in messages],
            "stream": True
        }
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                self.base_url,
                headers=self.headers,
                json=payload,
                timeout=60.0
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str.strip() == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            if "choices" in data and len(data["choices"]) > 0:
                                delta = data["choices"][0].get("delta", {})
                                if "content" in delta:
                                    content = delta["content"]
                                    if content:
                                        yield content
                        except json.JSONDecodeError:
                            continue

    async def health(self) -> bool:
        if not self.api_key:
            return False
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    "https://openrouter.ai/api/v1/auth/key",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    timeout=10.0
                )
                return response.status_code == 200
            except httpx.RequestError:
                return False
