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
                "can_tools": is_implemented("stream_with_tools"),
                "supported_attachments": supported
            })
        except Exception:
            provider_list.append({
                "name": name,
                "can_text": False,
                "can_image": False,
                "can_video": False,
                "can_audio": False,
                "can_tools": False,
                "supported_attachments": []
            })
            
    _default_models = {
        "ollama-cloud": settings.OLLAMA_CLOUD_MODEL,
        "openrouter": settings.OPENROUTER_MODEL,
        "groq": settings.GROQ_MODEL,
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
    - ollama-cloud: lista fixa e restrita (só modelos validados com busca
      funcionando direito — ver PENDENCIAS_TECNICAS.md, vários modelos
      testados deram data errada ou vazaram sintaxe de tool call quebrada)
    - openrouter: lista hardcoded
    - groq: lista hardcoda restrita à família gpt-oss, única com suporte
      à ferramenta nativa "browser_search" (doc oficial do Groq)
    """
    
    PROVIDER_MODELS = {
        "openrouter": [
            "openai/gpt-oss-120b:free",
            "nvidia/nemotron-3-super-120b-a12b:free",
            "poolside/laguna-m.1:free",
        ],
        "groq": [
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b",
        ],
    }
    
    PROVIDER_CATEGORIES = {
        "openai/gpt-oss-120b:free": ["Texto Geral"],
        "nvidia/nemotron-3-super-120b-a12b:free": ["Texto Geral"],
        "poolside/laguna-m.1:free": ["Código"],
        "openai/gpt-oss-120b": ["Texto Geral", "Busca na Web"],
        "openai/gpt-oss-20b": ["Texto Geral", "Busca na Web", "Rápido"],
        "llama3.2": ["Texto Geral", "Rápido"],
        "deepseek-r1:latest": ["Código", "Matemática", "Raciocínio Complexo"],
        "mistral:latest": ["Texto Geral"],
        "gpt-oss:120b": ["Texto Geral", "Busca na Web"],
    }
    
    # OLLAMA CLOUD - lista restrita e fixa.
    # Só o gpt-oss:120b foi validado com busca na web funcionando direito
    # em testes reais (06-07/07/2026). Outros modelos testados deram data
    # errada (não chamaram a ferramenta de verdade) ou vazaram sintaxe de
    # tool call quebrada na tela. Ver PENDENCIAS_TECNICAS.md.
    OLLAMA_CLOUD_WHITELIST = ["gpt-oss:120b"]
    if provider == "ollama-cloud":
        return {"models": OLLAMA_CLOUD_WHITELIST, "categories": PROVIDER_CATEGORIES}

    # OLLAMA LOCAL - REQUEST DINÂMICO
    if provider == "ollama":
        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=5)
                if res.status_code == 200:
                    data = res.json()
                    models = [m["name"] for m in data.get("models", [])]
                    return {"models": models, "categories": PROVIDER_CATEGORIES}
        except Exception:
            pass
        
        # Fallback final: lista padrão
        return {"models": ["llama3.2", "deepseek-r1:latest", "mistral:latest"], "categories": PROVIDER_CATEGORIES}
    
    # Providers conhecidos
    if provider in PROVIDER_MODELS:
        return {"models": PROVIDER_MODELS[provider], "categories": PROVIDER_CATEGORIES}
    
    # Desconhecido
    return {"models": [], "categories": {}, "error": f"Provider {provider} não encontrado"}
