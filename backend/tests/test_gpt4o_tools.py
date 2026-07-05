import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
import json
from unittest.mock import patch, MagicMock
from core.protocol import Message
from plugins.providers.gpt4o import GPT4OProvider
from app.config import settings

@pytest.fixture
def mock_openai_tool_stream(monkeypatch):
    class MockResponse:
        def __init__(self, is_tool=True):
            self.status_code = 200
            self.is_tool = is_tool

        def raise_for_status(self):
            pass

        async def aiter_lines(self):
            if self.is_tool:
                # 1st chunk: id and name
                yield 'data: {"choices": [{"index": 0, "delta": {"tool_calls": [{"index": 0, "id": "call_123", "type": "function", "function": {"name": "web_search", "arguments": ""}}]}, "finish_reason": null}]}'
                # 2nd chunk: arguments partial
                yield 'data: {"choices": [{"index": 0, "delta": {"tool_calls": [{"index": 0, "function": {"arguments": "{\\"qu"}}]}, "finish_reason": null}]}'
                # 3rd chunk: arguments partial
                yield 'data: {"choices": [{"index": 0, "delta": {"tool_calls": [{"index": 0, "function": {"arguments": "ery\\": \\"test\\"}}]}, "finish_reason": null}]}'
                # 4th chunk: finish
                yield 'data: {"choices": [{"index": 0, "delta": {}, "finish_reason": "tool_calls"}]}'
                yield 'data: [DONE]'
            else:
                # O segundo stream() chamado após a tool executa retorna apenas texto
                yield 'data: {"choices": [{"index": 0, "delta": {"content": "Resultado "}, "finish_reason": null}]}'
                yield 'data: {"choices": [{"index": 0, "delta": {"content": "mockado da OpenAI"}, "finish_reason": "stop"}]}'
                yield 'data: [DONE]'

    class MockStreamContext:
        def __init__(self, is_tool):
            self.is_tool = is_tool

        async def __aenter__(self):
            return MockResponse(self.is_tool)

        async def __aexit__(self, *args):
            pass

    call_count = 0
    def mock_stream(*args, **kwargs):
        nonlocal call_count
        is_tool = (call_count == 0)
        call_count += 1
        return MockStreamContext(is_tool)

    monkeypatch.setattr("httpx.AsyncClient.stream", mock_stream)

@pytest.mark.anyio
async def test_gpt4o_tool_calling(mock_openai_tool_stream, monkeypatch):
    monkeypatch.setattr(settings, "TAVILY_API_KEY", "mock")
    
    # Mock para não bater na API da Tavily de verdade
    async def mock_tool_run(*args, **kwargs):
        assert kwargs.get("query") == "test"
        return "1. Resultado fake\nDescrição\nFonte: test.com"
        
    monkeypatch.setattr("plugins.tools.web_search.WebSearchTool.run", mock_tool_run)

    provider = GPT4OProvider()
    provider.api_key = "mock"

    messages = [Message(role="user", content="Busque sobre test")]
    
    from core.tools import get_all_tools
    tools = list(get_all_tools().values())

    chunks = []
    async for chunk in provider.stream_with_tools(messages, tools):
        chunks.append(chunk)

    final_text = "".join(chunks)
    assert "Resultado mockado da OpenAI" in final_text
