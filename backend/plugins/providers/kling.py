from core.protocol import LLMProvider
from core.registry import register_provider
import uuid

@register_provider("kling")
class KlingProvider(LLMProvider):
    async def generate_video(self, prompt: str) -> dict:
        job_id = f"kling_{uuid.uuid4()}"
        return {"job_id": job_id, "status": "queued"}
    
    async def check_video_status(self, job_id: str) -> dict:
        # Mock: simula progresso
        return {"status": "completed", "progress": 100, "url": f"https://fake-video.com/{job_id}"}
    
    async def health(self) -> bool:
        return True
