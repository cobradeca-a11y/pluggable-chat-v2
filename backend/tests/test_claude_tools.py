import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
import json
from unittest.mock import patch, MagicMock
from core.protocol import Message
from plugins.providers.claude import ClaudeProvider
from app.config import settings

@pytest.fixture
def mock_anthropic_tool_stream(monkeypatch):
    class MockResponse:
        def __init__(self, is_tool=True):
            self.status_code = 200
            self.is_tool = is_tool

        def raise_for_status(self):
            pass

        async def aiter_lines(self):
            if self.is_tool:
                yield 'data: {"type": "content_block_start", "content_block": {"type": "tool_use", "id": "toolu_01", "name": "web_search"}}'
                yield 'data: {"type": "content_block_delta", "delta": {"type": "input_json_delta", "partial_json": "{\\"query\\": \\"python\\"}"}}'
                yield 'data: {"type": "content_block_stop"}'
                yield 'data: [DONE]'
            else:
                # O segundo stream() chamado após a tool executa retorna apenas texto
                yield 'data: {"type": "content_block_delta", "delta": {"type": "text_delta", "text": "Resultado mockado da busca"}}'
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
async def test_claude_tool_calling(mock_anthropic_tool_stream, monkeypatch):
    monkeypatch.setattr(settings, "TAVILY_API_KEY", "mock")
    
    # Mock para não bater na API da Tavily de verdade
    async def mock_tool_run(*args, **kwargs):
        return "1. Python site\nDescrição python\nFonte: python.org"
        
    monkeypatch.setattr("plugins.tools.web_search.WebSearchTool.run", mock_tool_run)

    provider = ClaudeProvider()
    provider.api_key = "mock"

    messages = [Message(role="user", content="Busque sobre python")]
    
    from core.tools import get_all_tools
    tools = list(get_all_tools().values())

    chunks = []
    async for chunk in provider.stream_with_tools(messages, tools):
        chunks.append(chunk)

    assert "Resultado mockado da busca" in chunks
