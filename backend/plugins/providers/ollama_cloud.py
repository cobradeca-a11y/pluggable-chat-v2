import json
import httpx
from typing import AsyncIterator, List, Optional

from core.protocol import LLMProvider, Message, Attachment
from core.registry import register_provider
from app.config import settings


@register_provider("ollama-cloud")
class OllamaCloud(LLMProvider):
    """
    Ollama Cloud Inference API
    Endpoint: https://ollama.com/api/chat (doc: docs.ollama.com/cloud)
    Models: llama3.2, deepseek, mistral, etc
    """
    
    def __init__(self) -> None:
        self.base_url = "https://ollama.com/api"
        self.model = settings.OLLAMA_CLOUD_MODEL
        self.api_key = settings.OLLAMA_API_KEY
        self.headers = {"Authorization": f"Bearer {self.api_key}"}

    @property
    def supported_attachments(self) -> list[str]:
        return []

    async def complete(self, messages: List[Message], attachment: Optional[Attachment] = None) -> str:
        payload = {
            "model": self.model,
            "messages": [m.model_dump() for m in messages],
            "stream": False,
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/chat",
                json=payload,
                headers=self.headers,
                timeout=120.0,
            )
            response.raise_for_status()
            data = response.json()
            return data["message"]["content"]

    async def stream(self, messages: List[Message], attachment: Optional[Attachment] = None) -> AsyncIterator[str]:
        payload = {
            "model": self.model,
            "messages": [m.model_dump() for m in messages],
            "stream": True,
        }
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/chat",
                json=payload,
                headers=self.headers,
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
                        if data.get("done"):
                            break
                    except json.JSONDecodeError:
                        continue

    async def health(self) -> bool:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/tags",
                    headers=self.headers,
                    timeout=5.0,
                )
                return response.status_code == 200
            except httpx.RequestError:
                return False
