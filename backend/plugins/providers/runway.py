import httpx
import logging
from typing import List
from core.protocol import LLMProvider
from core.registry import register_provider
from app.config import settings

logger = logging.getLogger(__name__)

@register_provider("runway")
class RunwayProvider(LLMProvider):
    def __init__(self):
        self.api_key = settings.RUNWAY_API_KEY
        self.base_url = "https://api.runwayml.com/v1"
        self.timeout = 60.0
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-Runway-Version": "2024-11-06"
        }

    @property
    def supported_attachments(self) -> List[str]:
        return []

    async def health(self) -> bool:
        # Runway doesn't have a public health endpoint without hitting models
        # Let's hit tasks or models. Let's do models.
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/models", headers=self.headers, timeout=5.0)
                if response.status_code in [200, 401, 404]: # If 404, it might mean the endpoint doesn't exist but host is up
                    return True
                return False
        except Exception:
            return False

    async def generate_video(self, prompt: str) -> dict:
        payload = {
            "model": "gen3a-turbo",
            "promptText": prompt,
            "duration": 5
        }
        # Runway POST /image_to_video or tasks
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/image_to_video",
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

    async def check_video_status(self, job_id: str) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/tasks/{job_id}",
                headers=self.headers,
                timeout=self.timeout
            )
            response.raise_for_status()
            data = response.json()
            
            status = data.get("status", "PROCESSING")
            if status == "SUCCEEDED":
                output = data.get("output", [])
                url = output[0] if output else ""
                return {
                    "status": "completed",
                    "progress": 100,
                    "url": url
                }
            elif status == "FAILED":
                return {
                    "status": "error",
                    "progress": 0,
                    "url": ""
                }
            else:
                progress = data.get("progress", 0.5) * 100
                return {
                    "status": "processing",
                    "progress": progress,
                    "url": ""
                }
