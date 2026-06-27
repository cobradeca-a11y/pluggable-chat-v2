import json
import httpx
from typing import AsyncIterator, List, Optional

from core.protocol import LLMProvider, Message, Attachment
from core.registry import register_provider
from app.config import settings

@register_provider("claude")
class ClaudeProvider(LLMProvider):
    def __init__(self) -> None:
        self.api_key = settings.CLAUDE_API_KEY
        self.model = settings.CLAUDE_MODEL
        self.base_url = "https://api.anthropic.com/v1/messages"
        self.headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }

    @property
    def supported_attachments(self) -> list[str]:
        return ["image/png", "image/jpeg", "image/webp"]

    def _build_payload(self, messages: List[Message], attachment: Optional[Attachment] = None, stream: bool = False) -> dict:
        system_msgs = [m.content for m in messages if m.role == "system"]
        system_content = "\n".join(system_msgs) if system_msgs else None

        anthropic_messages = []
        for m in messages:
            if m.role == "system":
                continue
            
            role = "user" if m.role == "user" else "assistant"
            content = m.content

            if m == messages[-1] and attachment and role == "user" and attachment.type.startswith("image/"):
                content_blocks = [
                    {"type": "image", "source": {"type": "base64", "media_type": attachment.type, "data": attachment.data}},
                    {"type": "text", "text": m.content}
                ]
                anthropic_messages.append({"role": role, "content": content_blocks})
            else:
                anthropic_messages.append({"role": role, "content": content})

        payload = {
            "model": self.model,
            "messages": anthropic_messages,
            "max_tokens": 4096,
            "stream": stream
        }
        
        if system_content:
            payload["system"] = system_content

        return payload

    async def complete(self, messages: List[Message], attachment: Optional[Attachment] = None) -> str:
        payload = self._build_payload(messages, attachment, stream=False)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.base_url,
                headers=self.headers,
                json=payload,
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()
            return data["content"][0]["text"]

    async def stream(self, messages: List[Message], attachment: Optional[Attachment] = None) -> AsyncIterator[str]:
        payload = self._build_payload(messages, attachment, stream=True)
        
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
                            if data.get("type") == "content_block_delta" and "delta" in data:
                                delta = data["delta"]
                                if delta.get("type") == "text_delta" and "text" in delta:
                                    yield delta["text"]
                        except json.JSONDecodeError:
                            continue

    async def health(self) -> bool:
        if not self.api_key:
            return False
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": "ping"}],
            "max_tokens": 1
        }
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.base_url,
                    headers=self.headers,
                    json=payload,
                    timeout=10.0
                )
                return response.status_code == 200
            except httpx.RequestError:
                return False
