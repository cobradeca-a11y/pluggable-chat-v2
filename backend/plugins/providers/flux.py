from core.protocol import LLMProvider
from core.registry import register_provider

@register_provider("flux")
class FluxProvider(LLMProvider):
    async def generate_image(self, prompt: str) -> str:
        # Mock behavior
        return f"https://fake-image-url.com/generated?prompt={prompt.replace(' ', '+')}"

    async def health(self) -> bool:
        return True
