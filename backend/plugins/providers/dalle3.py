import httpx
import logging
from typing import List
from core.protocol import LLMProvider
from core.registry import register_provider
from app.config import settings

logger = logging.getLogger(__name__)

@register_provider("dalle3")
class Dalle3Provider(LLMProvider):
    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self.base_url = "https://api.openai.com/v1"
        self.timeout = 60.0
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    @property
    def supported_attachments(self) -> List[str]:
        return []

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
        payload = {
            "prompt": prompt,
            "model": "dall-e-3",
            "n": 1,
            "size": "1024x1024"
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/images/generations",
                json=payload,
                headers=self.headers,
                timeout=self.timeout
            )
            response.raise_for_status()
            data = response.json()
            return data["data"][0]["url"]
