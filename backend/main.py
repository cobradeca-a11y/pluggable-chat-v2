from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.loader import load_plugins
from core.registry import get_all_providers, get_all_middlewares
from app.config import settings
from app.routers.chat import router as chat_router

load_plugins()

app = FastAPI(title="Pluggable Chat")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.ALLOWED_ORIGIN, "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

active_middlewares = [m.strip() for m in settings.ACTIVE_MIDDLEWARE.split(",") if m.strip()]
all_middlewares = get_all_middlewares()
for name in active_middlewares:
    if name in all_middlewares:
        all_middlewares[name](app)

app.include_router(chat_router)

@app.get("/api/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}

@app.get("/api/plugins")
async def list_plugins() -> dict:
    providers = get_all_providers()
    provider_list = []
    
    from core.protocol import LLMProvider

    for name, provider_class in providers.items():
        try:
            instance = provider_class()
            supported = getattr(instance, 'supported_attachments', [])
            
            def is_implemented(method_name: str) -> bool:
                method = getattr(provider_class, method_name, None)
                if not method:
                    return False
                base_method = getattr(LLMProvider, method_name, None)
                return method is not base_method

            provider_list.append({
                "name": name,
                "can_text": is_implemented("complete") or is_implemented("stream"),
                "can_image": is_implemented("generate_image"),
                "can_video": is_implemented("generate_video"),
                "supported_attachments": supported
            })
        except Exception:
            provider_list.append({
                "name": name,
                "can_text": False,
                "can_image": False,
                "can_video": False,
                "supported_attachments": []
            })
            
    return {
        "providers": provider_list,
        "active_provider": settings.LLM_PROVIDER
    }