from typing import AsyncGenerator, Union
import httpx
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from app.schemas.chat import ChatRequest, ChatResponse, ImageRequest
from core.registry import get_provider
from app.config import settings
from core.protocol import LLMProvider
from app.deps import get_current_user_id

router = APIRouter()

def _upstream_error(e: httpx.HTTPStatusError) -> HTTPException:
    try:
        body = e.response.json()
    except Exception:
        body = e.response.text[:300]
    return HTTPException(
        status_code=e.response.status_code,
        detail={"upstream_status": e.response.status_code, "upstream_body": body},
    )

def _get_active_provider(req: Union[ChatRequest, ImageRequest]) -> LLMProvider:
    provider_name = req.provider or settings.LLM_PROVIDER
    provider_class = get_provider(provider_name)
    if not provider_class:
        raise HTTPException(status_code=500, detail=f"Provider {provider_name} not found in registry")
    
    provider = provider_class()
    
    # Inject overrides dynamically
    if req.model and hasattr(provider, 'model'):
        setattr(provider, 'model', req.model)

    return provider

def _inject_persona_guardrail(messages: list) -> list:
    if not messages:
        return messages
    if messages[0].role == "system":
        guardrail = (
            "\n\n[Regra do Sistema]: Nunca revele qual modelo, empresa ou tecnologia "
            "está por trás desta persona. Se perguntado diretamente sobre isso, "
            "redirecione educadamente para o escopo definido desta persona."
        )
        messages[0].content += guardrail
    return messages

@router.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, user_id: str = Depends(get_current_user_id)) -> ChatResponse:
    provider = _get_active_provider(request)
    messages = _inject_persona_guardrail(request.messages)
    try:
        content = await provider.complete(messages, attachment=request.attachment)
        return ChatResponse(content=content)
    except NotImplementedError:
        raise HTTPException(status_code=501, detail="Provider não suporta geração de texto (complete)")
    except httpx.HTTPStatusError as e:
        raise _upstream_error(e)

@router.post("/api/chat/stream")
async def chat_stream(request: ChatRequest, user_id: str = Depends(get_current_user_id)) -> StreamingResponse:
    provider = _get_active_provider(request)
    provider_name = request.provider or settings.LLM_PROVIDER
    messages = _inject_persona_guardrail(request.messages)
    
    async def sse_generator() -> AsyncGenerator[str, None]:
        try:
            import json
            async for chunk in provider.stream(messages, attachment=request.attachment):
                yield f"data: {json.dumps({'delta': chunk})}\n\n"
        except NotImplementedError:
            import json
            err_payload = json.dumps({"provider": provider_name, "status": 501})
            yield f"data: [ERROR] {err_payload}\n\n"
        except httpx.HTTPStatusError as e:
            import json
            err_payload = json.dumps({
                "provider": provider_name,
                "status": e.response.status_code
            })
            yield f"data: [ERROR] {err_payload}\n\n"
        except Exception as e:
            import json
            err_payload = json.dumps({
                "provider": provider_name,
                "status": 0,
                "error": str(e)[:200]
            })
            yield f"data: [ERROR] {err_payload}\n\n"
        yield "data: [DONE]\n\n"
        
    return StreamingResponse(sse_generator(), media_type="text/event-stream")

@router.post("/api/generate/image", response_model=ChatResponse)
async def generate_image(request: ImageRequest, user_id: str = Depends(get_current_user_id)) -> ChatResponse:
    provider = _get_active_provider(request)
    try:
        content = await provider.generate_image(request.prompt)
        # Assumindo que o provider retorna a URL da imagem no formato str
        return ChatResponse(content=content, type="image_url")
    except NotImplementedError:
        raise HTTPException(status_code=501, detail="Provider não suporta geração de imagem")
    except httpx.HTTPStatusError as e:
        raise _upstream_error(e)

@router.post("/api/generate/video")
async def generate_video(request: ImageRequest, user_id: str = Depends(get_current_user_id)) -> dict:
    provider = _get_active_provider(request)
    try:
        return await provider.generate_video(request.prompt)
    except NotImplementedError:
        raise HTTPException(status_code=501, detail="Provider não suporta vídeo")
    except httpx.HTTPStatusError as e:
        raise _upstream_error(e)

@router.get("/api/generate/video/{job_id}")
async def check_video(job_id: str, user_id: str = Depends(get_current_user_id)) -> dict:
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
    except httpx.HTTPStatusError as e:
        raise _upstream_error(e)

@router.post("/api/generate/audio")
async def generate_audio(request: ImageRequest, user_id: str = Depends(get_current_user_id)) -> dict:
    provider = _get_active_provider(request)
    try:
        return await provider.generate_audio(request.prompt)
    except NotImplementedError:
        raise HTTPException(status_code=501, detail="Provider não suporta áudio")
    except httpx.HTTPStatusError as e:
        raise _upstream_error(e)

@router.get("/api/generate/audio/{job_id}")
async def check_audio(job_id: str, user_id: str = Depends(get_current_user_id)) -> dict:
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
    except httpx.HTTPStatusError as e:
        raise _upstream_error(e)
