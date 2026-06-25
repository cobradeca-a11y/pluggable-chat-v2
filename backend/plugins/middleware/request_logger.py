import time
import logging
from typing import Callable, Awaitable, Any
from fastapi import FastAPI, Request

from core.registry import register_middleware

logger = logging.getLogger("pluggable_chat.request_logger")

@register_middleware("request_logger")
def setup(app: FastAPI) -> None:
    @app.middleware("http")
    async def request_logger_middleware(request: Request, call_next: Callable[[Request], Awaitable[Any]]) -> Any:
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        
        client_ip = request.client.host if request.client else "unknown"
        logger.info(f"{client_ip} - \"{request.method} {request.url.path}\" {response.status_code} - {process_time:.3f}s")
        
        return response
