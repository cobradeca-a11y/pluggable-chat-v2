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
    Endpoint: https://ollama.com/v1/chat/completions
    Models: llama3.2, deepseek, mistral, etc
    """
    
    def __init__(self) -> None:
        self.base_url = "https://ollama.com/v1"
        self.model = settings.OLLAMA_CLOUD_MODEL

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
                f"{self.base_url}/chat/completions",
                json=payload,
                timeout=120.0,
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]

    async def stream(self, messages: List[Message], attachment: Optional[Attachment] = None) -> AsyncIterator[str]:
        payload = {
            "model": self.model,
            "messages": [m.model_dump() for m in messages],
            "stream": True,
        }
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                json=payload,
                timeout=120.0,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    line = line.strip()
                    if not line:
                        continue
                    if line == "data: [DONE]":
                        break
                    if line.startswith("data: "):
                        try:
                            data = json.loads(line[6:])
                            choices = data.get("choices", [])
                            if choices:
                                delta = choices[0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    yield content
                        except json.JSONDecodeError:
                            continue

    async def health(self) -> bool:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/models",
                    timeout=5.0,
                )
                return response.status_code == 200
            except httpx.RequestError:
                return False
