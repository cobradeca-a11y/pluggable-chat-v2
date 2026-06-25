import time
from typing import Dict, List, Callable, Awaitable, Any
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from core.registry import register_middleware
from app.config import settings

@register_middleware("rate_limit")
def setup(app: FastAPI) -> None:
    clients: Dict[str, List[float]] = {}

    @app.middleware("http")
    async def rate_limit_middleware(request: Request, call_next: Callable[[Request], Awaitable[Any]]) -> Any:
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        
        if client_ip not in clients:
            clients[client_ip] = []
            
        clients[client_ip] = [req_time for req_time in clients[client_ip] if now - req_time < 60.0]
        
        if len(clients[client_ip]) >= settings.RATE_LIMIT_RPM:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests"}
            )
            
        clients[client_ip].append(now)
        return await call_next(request)
