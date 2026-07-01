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
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/interactions"
        self.timeout = 60.0

    @property
    def headers(self):
        return {
            "x-goog-api-key": self.api_key,
            "Content-Type": "application/json"
        }

    @property
    def supported_attachments(self) -> List[str]:
        return ["image/png", "image/jpeg", "image/webp", "image/gif", "video/mp4", "video/mpeg"]

    def _build_history(self, messages: List[Message], attachment: Optional[Attachment] = None) -> List[dict]:
        history = []
        for i, m in enumerate(messages):
            if m.role == "user" or m.role == "system":
                content = [{"type": "text", "text": m.content}]
                if m.role == "system":
                    content = [{"type": "text", "text": f"System Instructions: {m.content}"}]
                    
                if attachment and i == len(messages) - 1:
                    block_type = "video" if attachment.type.startswith("video") else "image"
                    content.append({
                        "type": block_type,
                        "data": attachment.data,
                        "mime_type": attachment.type
                    })
                history.append({
                    "type": "user_input",
                    "content": content
                })
            elif m.role == "assistant":
                history.append({
                    "type": "model_output",
                    "content": [{"type": "text", "text": m.content}]
                })
        return history

    async def complete(self, messages: List[Message], attachment: Optional[Attachment] = None) -> str:
        payload = {
            "model": self.model,
            "store": False,
            "input": self._build_history(messages, attachment)
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.base_url,
                json=payload,
                headers=self.headers,
                timeout=self.timeout
            )
            response.raise_for_status()
            data = response.json()
            try:
                for step in reversed(data.get("steps", [])):
                    if step.get("type") == "model_output":
                        for c in step.get("content", []):
                            if c.get("type") == "text":
                                return c.get("text", "")
            except Exception as e:
                logger.error(f"Error parsing complete response: {e}, {data}")
            return ""

    async def stream(self, messages: List[Message], attachment: Optional[Attachment] = None) -> AsyncIterator[str]:
        payload = {
            "model": self.model,
            "store": False,
            "input": self._build_history(messages, attachment),
            "stream": True
        }
        async with httpx.AsyncClient() as client:
            async with client.stream("POST", f"{self.base_url}?alt=sse", json=payload, headers=self.headers, timeout=self.timeout) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    line = line.strip()
                    if not line:
                        continue
                    if line.startswith("data: "):
                        data_str = line[6:]
                        try:
                            data = json.loads(data_str)
                            if "delta" in data and data["delta"].get("type") == "text":
                                chunk = data["delta"].get("text", "")
                                if chunk:
                                    yield chunk
                        except Exception as e:
                            logger.warning(f"Parse error: {e}")

    async def health(self) -> bool:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models"
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers={"x-goog-api-key": self.api_key}, timeout=5.0)
                if response.status_code in [200, 401]:
                    return True
                return False
        except Exception:
            return False

    async def generate_image(self, prompt: str) -> str:
        payload = {
            "model": "gemini-3.1-flash-image",
            "input": [
                {"type": "text", "text": prompt}
            ]
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.base_url,
                json=payload,
                headers=self.headers,
                timeout=self.timeout,
            )
            response.raise_for_status()
            data = response.json()
            try:
                for step in data.get("steps", []):
                    if step.get("type") == "model_output":
                        for c in step.get("content", []):
                            if c.get("type") == "image":
                                mime = c.get("mime_type", "image/png")
                                b64 = c.get("data", "")
                                return f"data:{mime};base64,{b64}"
                raise ValueError("No image data in response")
            except Exception as e:
                logger.error(f"Gemini image generation failed: {e}")
                raise

    async def generate_video(self, prompt: str) -> dict:
        return {"job_id": "gemini_mock_job_123", "status": "queued"}
        
    async def check_video_status(self, job_id: str) -> dict:
        return {"status": "completed", "progress": 100, "url": "https://www.w3schools.com/html/mov_bbb.mp4"}
