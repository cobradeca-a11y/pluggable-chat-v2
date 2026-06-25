from fastapi import FastAPI
from core.loader import load_plugins
from core.registry import get_all_providers, get_all_middlewares
from app.config import settings

from app.routers.chat import router as chat_router

# Load all plugins before starting the app
load_plugins()

app = FastAPI(title="Pluggable Chat")

# Apply active middlewares
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
async def list_plugins() -> dict[str, list[str]]:
    providers = get_all_providers()
    return {"providers": list(providers.keys())}
