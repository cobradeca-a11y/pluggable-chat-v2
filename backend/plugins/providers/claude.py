import json
import httpx
from typing import AsyncIterator, List, Optional

from core.protocol import LLMProvider, Message, Attachment
from core.registry import register_provider
from app.config import settings

@register_provider("claude")
class ClaudeProvider(LLMProvider):
    def __init__(self) -> None:
        self.api_key = settings.CLAUDE_API_KEY
        self.model = settings.CLAUDE_MODEL
        self.base_url = "https://api.anthropic.com/v1/messages"
        self.headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }

    @property
    def supported_attachments(self) -> list[str]:
        return ["image/png", "image/jpeg", "image/webp"]

    def _build_payload(self, messages: List[Message], attachment: Optional[Attachment] = None, stream: bool = False) -> dict:
        system_msgs = [m.content for m in messages if m.role == "system"]
        system_content = "\n".join(system_msgs) if system_msgs else None

        anthropic_messages = []
        for m in messages:
            if m.role == "system":
                continue
            
            role = "user" if m.role == "user" else "assistant"
            content = m.content

            if m == messages[-1] and attachment and role == "user" and attachment.type.startswith("image/"):
                content_blocks = [
                    {"type": "image", "source": {"type": "base64", "media_type": attachment.type, "data": attachment.data}},
                    {"type": "text", "text": m.content}
                ]
                anthropic_messages.append({"role": role, "content": content_blocks})
            else:
                if content.strip().startswith("[{") and content.strip().endswith("}]"):
                    try:
                        content = json.loads(content)
                    except json.JSONDecodeError:
                        pass
                anthropic_messages.append({"role": role, "content": content})

        payload = {
            "model": self.model,
            "messages": anthropic_messages,
            "max_tokens": 4096,
            "stream": stream
        }
        
        if system_content:
            payload["system"] = system_content

        return payload

    async def complete(self, messages: List[Message], attachment: Optional[Attachment] = None) -> str:
        payload = self._build_payload(messages, attachment, stream=False)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.base_url,
                headers=self.headers,
                json=payload,
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()
            return data["content"][0]["text"]

    async def stream(self, messages: List[Message], attachment: Optional[Attachment] = None) -> AsyncIterator[str]:
        payload = self._build_payload(messages, attachment, stream=True)
        
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                self.base_url,
                headers=self.headers,
                json=payload,
                timeout=60.0
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str.strip() == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            if data.get("type") == "content_block_delta" and "delta" in data:
                                delta = data["delta"]
                                if delta.get("type") == "text_delta" and "text" in delta:
                                    yield delta["text"]
                        except json.JSONDecodeError:
                            continue

    async def health(self) -> bool:
        if not self.api_key:
            return False
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": "ping"}],
            "max_tokens": 1
        }
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.base_url,
                    headers=self.headers,
                    json=payload,
                    timeout=10.0
                )
                return response.status_code == 200
            except httpx.RequestError:
                return False

    async def stream_with_tools(self, messages: List[Message], tools: list, attachment: Optional[Attachment] = None) -> AsyncIterator[str]:
        from core.tools import get_tool

        anthropic_tools = []
        for t in tools:
            anthropic_tools.append({
                "name": t.name,
                "description": t.description,
                "input_schema": t.parameters
            })

        payload = self._build_payload(messages, attachment, stream=True)
        if anthropic_tools:
            payload["tools"] = anthropic_tools

        tool_use_id = None
        tool_name = None
        tool_input_json = ""
        is_tool_use = False

        async with httpx.AsyncClient() as client:
            async with client.stream("POST", self.base_url, headers=self.headers, json=payload, timeout=60.0) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str.strip() == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            if data.get("type") == "content_block_start" and data.get("content_block", {}).get("type") == "tool_use":
                                is_tool_use = True
                                tool_use_id = data["content_block"]["id"]
                                tool_name = data["content_block"]["name"]
                            elif is_tool_use and data.get("type") == "content_block_delta" and data.get("delta", {}).get("type") == "input_json_delta":
                                tool_input_json += data["delta"]["partial_json"]
                            elif is_tool_use and data.get("type") == "content_block_stop":
                                pass
                            elif not is_tool_use and data.get("type") == "content_block_delta" and "delta" in data:
                                delta = data["delta"]
                                if delta.get("type") == "text_delta" and "text" in delta:
                                    yield delta["text"]
                        except json.JSONDecodeError:
                            continue

        if is_tool_use and tool_name and tool_use_id:
            try:
                tool_args = json.loads(tool_input_json)
            except Exception:
                tool_args = {}
            
            tool_instance = get_tool(tool_name)
            if tool_instance:
                try:
                    tool_result = await tool_instance().run(**tool_args)
                    is_error = False
                except Exception as e:
                    tool_result = str(e)
                    is_error = True
            else:
                tool_result = f"Ferramenta {tool_name} não encontrada."
                is_error = True

            # Fazer a chamada subsequente com o resultado da tool
            messages_copy = list(messages)
            
            # Adicionar a resposta do assistente invocando a tool
            assistant_msg_content = [{"type": "tool_use", "id": tool_use_id, "name": tool_name, "input": tool_args}]
            messages_copy.append(Message(role="assistant", content=json.dumps(assistant_msg_content)))
            
            # Adicionar o resultado da tool
            tool_result_content = [{"type": "tool_result", "tool_use_id": tool_use_id, "content": tool_result, "is_error": is_error}]
            messages_copy.append(Message(role="user", content=json.dumps(tool_result_content)))

            # Nova chamada usando stream() comum (sem tools para evitar loop infinito na primeira versão)
            async for chunk in self.stream(messages_copy, attachment):
                yield chunk

