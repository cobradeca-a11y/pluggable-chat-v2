import json
import httpx
from typing import AsyncIterator, List, Optional

from core.protocol import LLMProvider, Message, Attachment
from core.registry import register_provider
from app.config import settings

@register_provider("gpt4o")
class GPT4OProvider(LLMProvider):
    def __init__(self) -> None:
        self.api_key = settings.OPENAI_API_KEY
        self.model = settings.OPENAI_MODEL
        self.base_url = "https://api.openai.com/v1/chat/completions"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    @property
    def supported_attachments(self) -> list[str]:
        return ["image/png", "image/jpeg", "image/webp", "image/gif"]

    def _build_messages(self, messages: List[Message], attachment: Optional[Attachment] = None) -> list:
        payload_messages = [m.model_dump() for m in messages]

        if attachment and attachment.type.startswith("image/") and payload_messages:
            last_msg = payload_messages[-1]
            if last_msg.get("role") == "user":
                payload_messages[-1] = {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": last_msg["content"]},
                        {"type": "image_url", "image_url": {"url": f"data:{attachment.type};base64,{attachment.data}"}}
                    ]
                }

        return payload_messages

    async def complete(self, messages: List[Message], attachment: Optional[Attachment] = None) -> str:
        payload = {
            "model": self.model,
            "messages": self._build_messages(messages, attachment),
            "stream": False
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.base_url,
                headers=self.headers,
                json=payload,
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]

    async def stream(self, messages: List[Message], attachment: Optional[Attachment] = None) -> AsyncIterator[str]:
        payload = {
            "model": self.model,
            "messages": self._build_messages(messages, attachment),
            "stream": True
        }
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
                            if "choices" in data and len(data["choices"]) > 0:
                                delta = data["choices"][0].get("delta", {})
                                if "content" in delta:
                                    content = delta["content"]
                                    if content:
                                        yield content
                        except json.JSONDecodeError:
                            continue

    async def health(self) -> bool:
        if not self.api_key:
            return False
        # Minimal request to check if API key is valid
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

        openai_tools = []
        for t in tools:
            openai_tools.append({
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": t.parameters
                }
            })

        payload = {
            "model": self.model,
            "messages": self._build_messages(messages, attachment),
            "stream": True
        }
        if openai_tools:
            payload["tools"] = openai_tools

        tool_calls_dict = {}
        finish_reason = None

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
                            if "choices" in data and len(data["choices"]) > 0:
                                choice = data["choices"][0]
                                delta = choice.get("delta", {})
                                
                                if "tool_calls" in delta:
                                    for tc in delta["tool_calls"]:
                                        idx = tc["index"]
                                        if idx not in tool_calls_dict:
                                            tool_calls_dict[idx] = {
                                                "id": tc.get("id"),
                                                "name": tc.get("function", {}).get("name", ""),
                                                "arguments": tc.get("function", {}).get("arguments", "")
                                            }
                                        else:
                                            tool_calls_dict[idx]["arguments"] += tc.get("function", {}).get("arguments", "")
                                
                                if "content" in delta and delta["content"]:
                                    yield delta["content"]
                                    
                                if "finish_reason" in choice and choice["finish_reason"]:
                                    finish_reason = choice["finish_reason"]
                        except json.JSONDecodeError:
                            continue

        if finish_reason == "tool_calls" and tool_calls_dict:
            # Pegar só o primeiro tool call (índice 0 ou o primeiro existente)
            first_tool = tool_calls_dict.get(0) or next(iter(tool_calls_dict.values()))
            tool_name = first_tool["name"]
            tool_call_id = first_tool["id"]
            tool_input_json = first_tool["arguments"]

            try:
                tool_args = json.loads(tool_input_json)
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

            payload_messages = self._build_messages(messages, attachment)
            
            assistant_msg = {
                "role": "assistant",
                "content": None,
                "tool_calls": [
                    {
                        "id": tool_call_id,
                        "type": "function",
                        "function": {
                            "name": tool_name,
                            "arguments": tool_input_json
                        }
                    }
                ]
            }
            payload_messages.append(assistant_msg)
            
            tool_msg = {
                "role": "tool",
                "tool_call_id": tool_call_id,
                "content": tool_result
            }
            payload_messages.append(tool_msg)

            subsequent_payload = {
                "model": self.model,
                "messages": payload_messages,
                "stream": True
            }
            
            # Nova chamada usando stream comum
            async with httpx.AsyncClient() as client:
                async with client.stream("POST", self.base_url, headers=self.headers, json=subsequent_payload, timeout=60.0) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data_str = line[6:]
                            if data_str.strip() == "[DONE]":
                                break
                            try:
                                data = json.loads(data_str)
                                if "choices" in data and len(data["choices"]) > 0:
                                    delta = data["choices"][0].get("delta", {})
                                    if "content" in delta and delta["content"]:
                                        yield delta["content"]
                            except json.JSONDecodeError:
                                continue
