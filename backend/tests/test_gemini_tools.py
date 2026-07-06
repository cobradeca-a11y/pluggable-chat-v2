import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
import json
from unittest.mock import patch, MagicMock
from core.protocol import Message
from plugins.providers.gemini import GeminiProvider
from app.config import settings


def create_mock_stream_fixture(use_alternative_format=False):
    class MockResponse:
        def __init__(self, is_tool=True):
            self.status_code = 200
            self.is_tool = is_tool

        def raise_for_status(self):
            pass

        async def aiter_lines(self):
            if self.is_tool:
                # 1st chunk: interaction created
                yield 'data: {"event_type": "interaction.created", "interaction": {"id": "inter_123"}}'
                # 2nd chunk: function call start
                yield 'data: {"event_type": "step.start", "step": {"id": "call_123", "type": "function_call", "name": "web_search"}}'
                
                # 3rd and 4th chunks: arguments
                if use_alternative_format:
                    yield 'data: {"event_type": "step.delta", "delta": {"type": "arguments", "partial_arguments": "{\\"qu"}}'
                    yield 'data: {"event_type": "step.delta", "delta": {"type": "arguments", "partial_arguments": "ery\\": \\"test\\"}}"}}'
                else:
                    yield 'data: {"event_type": "step.delta", "delta": {"type": "arguments_delta", "arguments": "{\\"qu"}}'
                    yield 'data: {"event_type": "step.delta", "delta": {"type": "arguments_delta", "arguments": "ery\\": \\"test\\"}}"}}'
                
                # 5th chunk: stop
                yield 'data: {"event_type": "step.stop"}'
                yield 'data: {"event_type": "interaction.completed"}'
                yield 'data: [DONE]'
            else:
                yield 'data: {"event_type": "step.delta", "delta": {"type": "text", "text": "Resultado "}}'
                yield 'data: {"event_type": "step.delta", "delta": {"type": "text", "text": "mockado do Gemini"}}'
                yield 'data: {"event_type": "step.stop"}'
                yield 'data: [DONE]'

    class MockStreamContext:
        def __init__(self, is_tool):
            self.is_tool = is_tool

        async def __aenter__(self):
            return MockResponse(self.is_tool)

        async def __aexit__(self, *args):
            pass

    call_count = 0
    def mock_stream(self_obj, method, url, *args, **kwargs):
        nonlocal call_count
        is_tool = (call_count == 0)
        call_count += 1
        return MockStreamContext(is_tool)

    return mock_stream

@pytest.fixture
def mock_gemini_tool_stream_standard(monkeypatch):
    monkeypatch.setattr("httpx.AsyncClient.stream", create_mock_stream_fixture(False))

@pytest.fixture
def mock_gemini_tool_stream_alternative(monkeypatch):
    monkeypatch.setattr("httpx.AsyncClient.stream", create_mock_stream_fixture(True))

async def run_tool_calling_test(monkeypatch):
    monkeypatch.setattr(settings, "TAVILY_API_KEY", "mock")
    
    async def mock_tool_run(*args, **kwargs):
        assert kwargs.get("query") == "test"
        return "1. Resultado fake\nDescrição\nFonte: test.com"
        
    monkeypatch.setattr("plugins.tools.web_search.WebSearchTool.run", mock_tool_run)

    provider = GeminiProvider()
    provider.api_key = "mock"

    messages = [Message(role="user", content="Busque sobre test")]
    
    from core.tools import get_all_tools
    tools = list(get_all_tools().values())

    chunks = []
    async for chunk in provider.stream_with_tools(messages, tools):
        chunks.append(chunk)

    final_text = "".join(chunks)
    assert "Resultado mockado do Gemini" in final_text

@pytest.mark.anyio
async def test_gemini_tool_calling_standard(mock_gemini_tool_stream_standard, monkeypatch):
    await run_tool_calling_test(monkeypatch)

@pytest.mark.anyio
async def test_gemini_tool_calling_alternative(mock_gemini_tool_stream_alternative, monkeypatch):
    await run_tool_calling_test(monkeypatch)
