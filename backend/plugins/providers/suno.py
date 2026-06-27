import httpx
import logging
from typing import List
from core.protocol import LLMProvider
from core.registry import register_provider
from app.config import settings

logger = logging.getLogger(__name__)

@register_provider("suno")
class SunoProvider(LLMProvider):
    def __init__(self):
        self.api_key = settings.SUNO_API_KEY
        self.base_url = "https://api.suno.ai/v1"
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
                if response.status_code in [200, 401, 404]:
                    return True
                return False
        except Exception:
            return False

    async def generate_audio(self, prompt: str) -> dict:
        payload = {
            "prompt": prompt,
            "make_instrumental": False,
            "wait_audio": False
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/audio/generations",
                json=payload,
                headers=self.headers,
                timeout=self.timeout
            )
            response.raise_for_status()
            data = response.json()
            return {
                "job_id": data.get("id"),
                "status": "queued"
            }

    async def check_audio_status(self, job_id: str) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/audio/generations/{job_id}",
                headers=self.headers,
                timeout=self.timeout
            )
            response.raise_for_status()
            data = response.json()
            
            status = data.get("status", "processing")
            if status == "completed":
                return {
                    "status": "completed",
                    "progress": 100,
                    "url": data.get("audio_url", "")
                }
            elif status == "error":
                return {
                    "status": "error",
                    "progress": 0,
                    "url": ""
                }
            else:
                return {
                    "status": "processing",
                    "progress": 50,
                    "url": ""
                }
