from typing import AsyncGenerator, Union
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.schemas.chat import ChatRequest, ChatResponse, ImageRequest
from core.registry import get_provider
from app.config import settings
from core.protocol import LLMProvider

router = APIRouter()

def _get_active_provider(req: Union[ChatRequest, ImageRequest]) -> LLMProvider:
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
    try:
        content = await provider.complete(request.messages, attachment=request.attachment)
        return ChatResponse(content=content)
    except NotImplementedError:
        raise HTTPException(status_code=501, detail="Provider não suporta geração de texto (complete)")

@router.post("/api/chat/stream")
async def chat_stream(request: ChatRequest) -> StreamingResponse:
    provider = _get_active_provider(request)
    
    async def sse_generator() -> AsyncGenerator[str, None]:
        try:
            async for chunk in provider.stream(request.messages, attachment=request.attachment):
                yield f"data: {chunk}\n\n"
        except NotImplementedError:
            yield "data: [ERROR] Provider não suporta geração de texto (stream)\n\n"
        yield "data: [DONE]\n\n"
        
    return StreamingResponse(sse_generator(), media_type="text/event-stream")

@router.post("/api/generate/image", response_model=ChatResponse)
async def generate_image(request: ImageRequest) -> ChatResponse:
    provider = _get_active_provider(request)
    try:
        content = await provider.generate_image(request.prompt)
        # Assumindo que o provider retorna a URL da imagem no formato str
        return ChatResponse(content=content, type="image_url")
    except NotImplementedError:
        raise HTTPException(status_code=501, detail="Provider não suporta geração de imagem")

@router.post("/api/generate/video")
async def generate_video(request: ImageRequest) -> dict:
    provider = _get_active_provider(request)
    try:
        return await provider.generate_video(request.prompt)
    except NotImplementedError:
        raise HTTPException(status_code=501, detail="Provider não suporta vídeo")

@router.get("/api/generate/video/{job_id}")
async def check_video(job_id: str) -> dict:
    parts = job_id.split("_", 1)
    if len(parts) == 2:
        provider_name = parts[0]
    else:
        provider_name = settings.LLM_PROVIDER
        
    provider_class = get_provider(provider_name)
    if not provider_class:
        raise HTTPException(status_code=404, detail="Provider não encontrado")
        
    provider = provider_class()
    try:
        return await provider.check_video_status(job_id)
    except NotImplementedError:
        raise HTTPException(status_code=501, detail="Provider não suporta vídeo")

@router.post("/api/generate/audio")
async def generate_audio(request: ImageRequest) -> dict:
    provider = _get_active_provider(request)
    try:
        return await provider.generate_audio(request.prompt)
    except NotImplementedError:
        raise HTTPException(status_code=501, detail="Provider não suporta áudio")

@router.get("/api/generate/audio/{job_id}")
async def check_audio(job_id: str) -> dict:
    parts = job_id.split("_", 1)
    if len(parts) == 2:
        provider_name = parts[0]
    else:
        provider_name = settings.LLM_PROVIDER
        
    provider_class = get_provider(provider_name)
    if not provider_class:
        raise HTTPException(status_code=404, detail="Provider não encontrado")
        
    provider = provider_class()
    try:
        return await provider.check_audio_status(job_id)
    except NotImplementedError:
        raise HTTPException(status_code=501, detail="Provider não suporta áudio")

