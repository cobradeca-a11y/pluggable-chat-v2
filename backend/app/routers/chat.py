from typing import AsyncGenerator
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.schemas.chat import ChatRequest, ChatResponse
from core.registry import get_provider
from app.config import settings
from core.protocol import LLMProvider

router = APIRouter()

def _get_active_provider(req: ChatRequest) -> LLMProvider:
    provider_name = req.provider or settings.LLM_PROVIDER
    provider_class = get_provider(provider_name)
    if not provider_class:
        raise HTTPException(status_code=500, detail=f"Provider {provider_name} not found in registry")
    
    provider = provider_class()
    
    # Inject overrides dynamically
    if req.model and hasattr(provider, 'model'):
        setattr(provider, 'model', req.model)
        
    if req.api_key and hasattr(provider, 'api_key'):
        setattr(provider, 'api_key', req.api_key)
        # Specific injection for OpenRouter authorization header
        if hasattr(provider, 'headers') and isinstance(provider.headers, dict):
            provider.headers["Authorization"] = f"Bearer {req.api_key}"
            
    return provider

@router.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    provider = _get_active_provider(request)
    content = await provider.complete(request.messages)
    return ChatResponse(content=content)

@router.post("/api/chat/stream")
async def chat_stream(request: ChatRequest) -> StreamingResponse:
    provider = _get_active_provider(request)
    
    async def sse_generator() -> AsyncGenerator[str, None]:
        async for chunk in provider.stream(request.messages):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"
        
    return StreamingResponse(sse_generator(), media_type="text/event-stream")
