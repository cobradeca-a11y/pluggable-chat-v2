from typing import Type, Callable, Dict, Any, Protocol

class Tool(Protocol):
    name: str
    description: str
    parameters: dict

    async def run(self, **kwargs) -> str:
        ...

_TOOLS: Dict[str, Type[Tool]] = {}

def register_tool(name: str) -> Callable[[Type[Tool]], Type[Tool]]:
    def decorator(cls: Type[Tool]) -> Type[Tool]:
        _TOOLS[name] = cls
        return cls
    return decorator

def get_tool(name: str) -> Type[Tool] | None:
    return _TOOLS.get(name)

def get_all_tools() -> Dict[str, Type[Tool]]:
    return dict(_TOOLS)
