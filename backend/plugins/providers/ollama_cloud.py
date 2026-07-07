import json
import httpx
from typing import AsyncIterator, List, Optional

from core.protocol import LLMProvider, Message, Attachment
from core.registry import register_provider
from app.config import settings


@register_provider("ollama-cloud")
class OllamaCloud(LLMProvider):
    """
    Ollama Cloud Inference API
    Endpoint: https://ollama.com/api/chat (doc: docs.ollama.com/cloud)
    Models: llama3.2, deepseek, mistral, etc
    """

    def __init__(self) -> None:
        self.base_url = "https://ollama.com/api"
        self.model = settings.OLLAMA_CLOUD_MODEL
        self.api_key = settings.OLLAMA_API_KEY
        self.headers = {"Authorization": f"Bearer {self.api_key}"}

    @property
    def supported_attachments(self) -> list[str]:
        return []

    async def complete(self, messages: List[Message], attachment: Optional[Attachment] = None) -> str:
        payload = {
            "model": self.model,
            "messages": [m.model_dump() for m in messages],
            "stream": False,
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/chat",
                json=payload,
                headers=self.headers,
                timeout=120.0,
            )
            response.raise_for_status()
            data = response.json()
            return data["message"]["content"]

    async def stream(self, messages: List[Message], attachment: Optional[Attachment] = None) -> AsyncIterator[str]:
        payload = {
            "model": self.model,
            "messages": [m.model_dump() for m in messages],
            "stream": True,
        }
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/chat",
                json=payload,
                headers=self.headers,
                timeout=120.0,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                        content = data.get("message", {}).get("content", "")
                        if content:
                            yield content
                        if data.get("done"):
                            break
                    except json.JSONDecodeError:
                        continue

    async def health(self) -> bool:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/tags",
                    headers=self.headers,
                    timeout=5.0,
                )
                return response.status_code == 200
            except httpx.RequestError:
                return False

    async def stream_with_tools(self, messages: List[Message], tools: list, attachment: Optional[Attachment] = None) -> AsyncIterator[str]:
        from core.tools import get_tool

        ollama_tools = []
        for t in tools:
            ollama_tools.append({
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": t.parameters
                }
            })

        base_messages = [m.model_dump() for m in messages]

        payload = {
            "model": self.model,
            "messages": base_messages,
            "stream": True,
        }
        if ollama_tools:
            payload["tools"] = ollama_tools

        collected_tool_calls = []

        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/chat",
                json=payload,
                headers=self.headers,
                timeout=120.0,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    message = data.get("message", {})

                    # Defensivo: tool_calls pode vir em qualquer chunk,
                    # não necessariamente só no último (comportamento
                    # inconsistente documentado em
                    # github.com/ollama/ollama/issues/12557).
                    tc = message.get("tool_calls")
                    if tc:
                        collected_tool_calls.extend(tc)

                    content = message.get("content", "")
                    if content:
                        yield content

                    if data.get("done"):
                        break

        if not collected_tool_calls:
            return

        # Só a primeira tool call é executada nesta versão (mesma
        # limitação já documentada para o Gemini em
        # PENDENCIAS_TECNICAS.md).
        first_call = collected_tool_calls[0]
        func = first_call.get("function", {})
        tool_name = func.get("name")
        tool_args = func.get("arguments", {})

        # Defensivo: a doc oficial diz que vem como dict nativo, mas
        # cobrimos o caso de vir como string JSON também.
        if isinstance(tool_args, str):
            try:
                tool_args = json.loads(tool_args)
            except Exception:
                tool_args = {}

        tool_instance = get_tool(tool_name)
        if tool_instance:
            try:
                tool_result = await tool_instance().run(**tool_args)
            except Exception as e:
                tool_result = str(e)
        else:
            tool_result = f"Ferramenta {tool_name} não encontrada."

        assistant_msg = {
            "role": "assistant",
            "content": "",
            "tool_calls": collected_tool_calls,
        }
        tool_msg = {
            "role": "tool",
            "tool_name": tool_name,
            "content": str(tool_result),
        }

        subsequent_payload = {
            "model": self.model,
            "messages": base_messages + [assistant_msg, tool_msg],
            "stream": True,
        }

        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/chat",
                json=subsequent_payload,
                headers=self.headers,
                timeout=120.0,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    message = data.get("message", {})
                    content = message.get("content", "")
                    if content:
                        yield content
                    if data.get("done"):
                        break
