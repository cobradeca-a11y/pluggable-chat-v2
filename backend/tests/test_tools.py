import pytest
from core.tools import get_all_tools, get_tool
from plugins.tools.web_search import WebSearchTool
from app.config import settings

@pytest.fixture
def mock_httpx_post(monkeypatch):
    class MockResponse:
        def __init__(self, json_data, status_code=200):
            self._json_data = json_data
            self.status_code = status_code

        def json(self):
            return self._json_data

        def raise_for_status(self):
            if self.status_code >= 400:
                raise Exception("HTTP Error")

    async def mock_post(*args, **kwargs):
        return MockResponse({
            "results": [
                {
                    "title": "Title 1",
                    "content": "Content 1",
                    "url": "http://example.com/1"
                },
                {
                    "title": "Title 2",
                    "content": "Content 2",
                    "url": "http://example.com/2"
                }
            ]
        })

    monkeypatch.setattr("httpx.AsyncClient.post", mock_post)


@pytest.mark.anyio
async def test_tool_registration():
    tools = get_all_tools()
    assert "web_search" in tools
    
    tool_cls = get_tool("web_search")
    assert tool_cls is not None
    assert tool_cls == WebSearchTool


@pytest.mark.anyio
async def test_web_search_success(mock_httpx_post, monkeypatch):
    monkeypatch.setattr(settings, "TAVILY_API_KEY", "test_key")
    tool = WebSearchTool()
    
    result = await tool.run(query="test query")
    
    assert "1. Title 1" in result
    assert "Content 1" in result
    assert "Fonte: http://example.com/1" in result
    
    assert "2. Title 2" in result
    assert "Content 2" in result
    assert "Fonte: http://example.com/2" in result


@pytest.mark.anyio
async def test_web_search_missing_key(monkeypatch):
    monkeypatch.setattr(settings, "TAVILY_API_KEY", "")
    tool = WebSearchTool()
    
    result = await tool.run(query="test query")
    
    assert result == "Erro: TAVILY_API_KEY não configurada no servidor."

