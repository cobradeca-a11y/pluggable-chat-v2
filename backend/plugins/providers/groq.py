import json
import httpx
from typing import AsyncIterator, List, Optional

from core.protocol import LLMProvider, Message, Attachment
from core.registry import register_provider
from app.config import settings


@register_provider("groq")
class GroqProvider(LLMProvider):
    """
    Groq API (compatível com o formato OpenAI Chat Completions)
    Endpoint: https://api.groq.com/openai/v1/chat/completions
    Doc: https://console.groq.com/docs/overview
    Busca na web: ferramenta nativa "browser_search", suportada pelos
    modelos openai/gpt-oss-20b, openai/gpt-oss-120b e
    openai/gpt-oss-safeguard-20b (doc: console.groq.com/docs/tool-use/built-in-tools/browser-search).
    Não usa a ferramenta genérica web_search/Tavily do resto do projeto.
    """

    def __init__(self) -> None:
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"
        self.model = settings.GROQ_MODEL
        self.api_key = settings.GROQ_API_KEY
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    @property
    def supported_attachments(self) -> list[str]:
        return []

    def _build_messages(self, messages: List[Message], attachment: Optional[Attachment] = None) -> List[dict]:
        result = []
        for m in messages:
            result.append({"role": m.role, "content": m.content})
        return result

    async def complete(self, messages: List[Message], attachment: Optional[Attachment] = None) -> str:
        payload = {
            "model": self.model,
            "messages": self._build_messages(messages, attachment),
            "stream": False,
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.base_url,
                json=payload,
                headers=self.headers,
                timeout=90.0,
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]

    async def stream(self, messages: List[Message], attachment: Optional[Attachment] = None) -> AsyncIterator[str]:
        payload = {
            "model": self.model,
            "messages": self._build_messages(messages, attachment),
            "stream": True,
        }
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                self.base_url,
                json=payload,
                headers=self.headers,
                timeout=90.0,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    line = line.strip()
                    if not line or not line.startswith("data: "):
                        continue
                    data_str = line[6:]
                    if data_str.strip() == "[DONE]":
                        break
                    try:
                        data = json.loads(data_str)
                    except json.JSONDecodeError:
                        continue
                    if "choices" in data and len(data["choices"]) > 0:
                        delta = data["choices"][0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield content

    async def health(self) -> bool:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.groq.com/openai/v1/models",
                    headers=self.headers,
                    timeout=5.0,
                )
                return response.status_code == 200
        except httpx.RequestError:
            return False

    async def stream_with_tools(self, messages: List[Message], tools: list, attachment: Optional[Attachment] = None) -> AsyncIterator[str]:
        # O parâmetro "tools" (lista genérica vinda do resto do projeto,
        # ex: web_search via Tavily) não é usado aqui de propósito.
        # O Groq tem busca na web nativa embutida no servidor deles
        # ("browser_search"), suportada pelos modelos da família gpt-oss.
        # Isso substitui completamente o fluxo de 2 chamadas + parsing de
        # tool_calls que os outros providers precisam fazer.
        payload = {
            "model": self.model,
            "messages": self._build_messages(messages, attachment),
            "stream": True,
            "tools": [{"type": "browser_search"}],
            "tool_choice": "auto",
            "reasoning_effort": "low",
        }

        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                self.base_url,
                json=payload,
                headers=self.headers,
                timeout=90.0,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    line = line.strip()
                    if not line or not line.startswith("data: "):
                        continue
                    data_str = line[6:]
                    if data_str.strip() == "[DONE]":
                        break
                    try:
                        data = json.loads(data_str)
                    except json.JSONDecodeError:
                        continue
                    if "choices" in data and len(data["choices"]) > 0:
                        delta = data["choices"][0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield content
