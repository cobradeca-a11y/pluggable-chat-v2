from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx
from core.loader import load_plugins
from core.registry import get_all_providers, get_all_middlewares
from app.config import settings
from app.routers.chat import router as chat_router
from app.routers.personas import router as personas_router
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
app.include_router(personas_router)

@app.get("/api/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}

@app.get("/api/version")
async def version() -> dict[str, str]:
    import os
    return {
        "git_sha": os.environ.get("RAILWAY_GIT_COMMIT_SHA", "unknown")[:7],
        "deployed_at": os.environ.get("RAILWAY_DEPLOYMENT_ID", "unknown"),
    }

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
                "can_audio": is_implemented("generate_audio"),
                "supported_attachments": supported
            })
        except Exception:
            provider_list.append({
                "name": name,
                "can_text": False,
                "can_image": False,
                "can_video": False,
                "can_audio": False,
                "supported_attachments": []
            })
            
    _default_models = {
        "claude": settings.CLAUDE_MODEL,
        "gemini": settings.GOOGLE_MODEL,
        "gpt4o": settings.OPENAI_MODEL,
        "ollama": settings.OLLAMA_MODEL,
        "ollama-cloud": settings.OLLAMA_CLOUD_MODEL,
        "mock": "mock",
    }
    return {
        "providers": provider_list,
        "active_provider": settings.LLM_PROVIDER,
        "default_models": _default_models
    }

@app.get("/api/plugins/{provider}/models")
async def get_provider_models(provider: str) -> dict:
    """
    Retorna modelos disponíveis para cada provider.
    
    Casos:
    - ollama: REQUEST dinâmico a OllamaFreeAPI ou OLLAMA_BASE_URL
    - claude, gpt4o, gemini, etc: Lista hardcoded
    """
    
    PROVIDER_MODELS = {
        "claude": ["claude-3-5-sonnet-20241022", "claude-3-opus-20250219", "claude-3-haiku-20240307"],
        "gpt4o": ["gpt-4o", "gpt-4o-mini"],
        "gemini": ["gemini-3.5-flash"],
        "openrouter": [
            "openai/gpt-oss-120b:free",
            "nvidia/nemotron-3-super-120b-a12b:free",
            "poolside/laguna-m.1:free",
        ],
        "mock": ["mock"],
    }
    
    # OLLAMA CLOUD - REQUEST DINÂMICO
    OLLAMA_CLOUD_WHITELIST = [
        "minimax-m2.5", "gemma3:27b", "nemotron-3-super", "glm-4.7",
        "minimax-m2.1", "gpt-oss:20b", "gemma3:12b", "qwen3-coder-next",
        "gemma3:4b", "gpt-oss:120b", "nemotron-3-ultra", "qwen3-coder:480b",
        "nemotron-3-nano:30b", "minimax-m3", "gemma4:31b",
    ]
    if provider == "ollama-cloud":
        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(
                    "https://ollama.com/api/tags",
                    headers={"Authorization": f"Bearer {settings.OLLAMA_API_KEY}"},
                    timeout=5,
                )
                if res.status_code == 200:
                    data = res.json()
                    live_models = {m["name"] for m in data.get("models", [])}
                    filtered = [m for m in OLLAMA_CLOUD_WHITELIST if m in live_models]
                    if filtered:
                        return {"models": filtered}
        except Exception:
            pass
        # Fallback: whitelist completa (sem checar disponibilidade ao vivo)
        return {"models": OLLAMA_CLOUD_WHITELIST}

    # OLLAMA LOCAL - REQUEST DINÂMICO
    if provider == "ollama":
        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=5)
                if res.status_code == 200:
                    data = res.json()
                    models = [m["name"] for m in data.get("models", [])]
                    return {"models": models}
        except Exception:
            pass
        
        # Fallback final: lista padrão
        return {"models": ["llama3.2", "deepseek-r1:latest", "mistral:latest"]}
    
    # Providers conhecidos
    if provider in PROVIDER_MODELS:
        return {"models": PROVIDER_MODELS[provider]}
    
    # Desconhecido
    return {"models": [], "error": f"Provider {provider} não encontrado"}