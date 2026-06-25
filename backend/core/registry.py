from typing import Type, Callable, Dict, Any
from .protocol import LLMProvider

_PROVIDERS: Dict[str, Type[LLMProvider]] = {}
_MIDDLEWARES: Dict[str, Callable[..., Any]] = {}

def register_provider(name: str) -> Callable[[Type[LLMProvider]], Type[LLMProvider]]:
    def decorator(cls: Type[LLMProvider]) -> Type[LLMProvider]:
        _PROVIDERS[name] = cls
        return cls
    return decorator

def register_middleware(name: str) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        _MIDDLEWARES[name] = func
        return func
    return decorator

def get_provider(name: str) -> Type[LLMProvider] | None:
    return _PROVIDERS.get(name)

def get_all_providers() -> Dict[str, Type[LLMProvider]]:
    return dict(_PROVIDERS)

def get_all_middlewares() -> Dict[str, Callable[..., Any]]:
    return dict(_MIDDLEWARES)
