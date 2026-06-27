import httpx
import json
import logging
from typing import List, AsyncIterator, Optional
from core.protocol import LLMProvider, Message, Attachment
from core.registry import register_provider
from app.config import settings

logger = logging.getLogger(__name__)

@register_provider("gemini")
class GeminiProvider(LLMProvider):
    def __init__(self):
        self.api_key = settings.GOOGLE_API_KEY
        self.model = settings.GOOGLE_MODEL
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/openai"
        self.timeout = 60.0
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    @property
    def supported_attachments(self) -> List[str]:
        return ["image/png", "image/jpeg", "image/webp", "image/gif", "video/mp4", "video/mpeg"]

    def _build_messages(self, messages: List[Message], attachment: Optional[Attachment] = None) -> List[dict]:
        msgs = []
        for m in messages:
            if m.role == "user" and attachment and m == messages[-1]:
                content = [
                    {"type": "text", "text": m.content},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{attachment.type};base64,{attachment.data}"
                        }
                    }
                ]
                msgs.append({"role": m.role, "content": content})
            else:
                msgs.append({"role": m.role, "content": m.content})
        return msgs

    async def complete(self, messages: List[Message], attachment: Optional[Attachment] = None) -> str:
        payload = {
            "model": self.model,
            "messages": self._build_messages(messages, attachment),
            "stream": False
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                json=payload,
                headers=self.headers,
                timeout=self.timeout
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]

    async def stream(self, messages: List[Message], attachment: Optional[Attachment] = None) -> AsyncIterator[str]:
        payload = {
            "model": self.model,
            "messages": self._build_messages(messages, attachment),
            "stream": True
        }
        async with httpx.AsyncClient() as client:
            async with client.stream("POST", f"{self.base_url}/chat/completions", json=payload, headers=self.headers, timeout=self.timeout) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    line = line.strip()
                    if not line or line == "data: [DONE]":
                        continue
                    if line.startswith("data: "):
                        data_str = line[6:]
                        try:
                            data = json.loads(data_str)
                            chunk = data.get("choices", [{}])[0].get("delta", {}).get("content", "")
                            if chunk:
                                yield chunk
                        except Exception as e:
                            logger.warning(f"Parse error: {e}")

    async def health(self) -> bool:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/models", headers=self.headers, timeout=5.0)
                if response.status_code in [200, 401]:
                    return True
                return False
        except Exception:
            return False

    async def generate_image(self, prompt: str) -> str:
        # Use Gemini's native generateContent endpoint (not OpenAI-compatible)
        native_base = "https://generativelanguage.googleapis.com/v1beta"
        url = f"{native_base}/models/{self.model}:generateContent"
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "image/png"}
        }
        headers = {"Content-Type": "application/json"}
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                params={"key": self.api_key},
                json=payload,
                headers=headers,
                timeout=self.timeout,
            )
            response.raise_for_status()
            data = response.json()
            try:
                parts = data["candidates"][0]["content"]["parts"]
                for part in parts:
                    if "inlineData" in part:
                        # Return base64 data URI
                        mime = part["inlineData"]["mimeType"]
                        b64 = part["inlineData"]["data"]
                        return f"data:{mime};base64,{b64}"
                    if "fileData" in part:
                        return part["fileData"]["uri"]
                raise ValueError("No image data in response")
            except Exception as e:
                logger.error(f"Gemini image generation failed: {e}")
                raise


    async def generate_video(self, prompt: str) -> dict:
        return {"job_id": "gemini_mock_job_123", "status": "queued"}
        
    async def check_video_status(self, job_id: str) -> dict:
        return {"status": "completed", "progress": 100, "url": "https://www.w3schools.com/html/mov_bbb.mp4"}

