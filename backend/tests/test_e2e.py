import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

os.environ["LLM_PROVIDER"] = "mock"
os.environ["RATE_LIMIT_RPM"] = "100"
os.environ["ACTIVE_MIDDLEWARE"] = "rate_limit,request_logger"

from fastapi.testclient import TestClient
from main import app
from unittest.mock import patch, MagicMock
from app.deps import get_current_user_id

app.dependency_overrides[get_current_user_id] = lambda: "mock_user_id"

client = TestClient(app)

def test_plugins_endpoint():
    response = client.get("/api/plugins")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    assert "providers" in data
    assert any(p["name"] == "openrouter" for p in data["providers"])
    assert any(p["name"] == "ollama-cloud" for p in data["providers"])

def test_openrouter_registered():
    response = client.get("/api/plugins")
    data = response.json()
    p = next((p for p in data["providers"] if p["name"] == "openrouter"), None)
    assert p is not None
    assert p["can_text"] is True
    assert p["can_image"] is True
    assert p["can_video"] is True
    assert p["can_audio"] is True

def test_ollamacloud_registered():
    response = client.get("/api/plugins")
    data = response.json()
    p = next((p for p in data["providers"] if p["name"] == "ollama-cloud"), None)
    assert p is not None
    assert p["can_text"] is True
    
def test_generate_audio_mock():
    response = client.post(
        "/api/generate/audio",
        json={"prompt": "test audio", "provider": "openrouter"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "job_id" in data
    assert data["job_id"].startswith("openrouter_")

def test_check_audio_status():
    response = client.post(
        "/api/generate/audio",
        json={"prompt": "test audio", "provider": "openrouter"}
    )
    job_id = response.json()["job_id"]
    
    response2 = client.get(f"/api/generate/audio/{job_id}")
    assert response2.status_code == 200
    data2 = response2.json()
    assert data2["status"] in ["completed", "processing"]

# AUTH TESTS removidos: rotas /api/auth/send-link e /api/auth/verify
# foram descontinuadas após a migração para Google OAuth (Supabase Auth
# lida com o fluxo inteiro no frontend agora).





@patch("app.routers.chat.get_provider")
def test_chat_sync(mock_get_provider):
    from core.protocol import LLMProvider
    mock_provider_instance = MagicMock(spec=LLMProvider)
    mock_provider_instance.model = "mock-model"
    
    async def fake_complete(*args, **kwargs):
        return "I am a mock response."
        
    mock_provider_instance.complete = fake_complete
    mock_get_provider.return_value = MagicMock(return_value=mock_provider_instance)

    response = client.post(
        "/api/chat", 
        json={"messages": [{"role": "user", "content": "Olá"}], "provider": "ollama-cloud"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "content" in data
    assert data["content"] == "I am a mock response."

@patch("app.routers.chat.get_provider")
def test_chat_stream(mock_get_provider):
    from core.protocol import LLMProvider
    mock_provider_instance = MagicMock(spec=LLMProvider)
    mock_provider_instance.model = "mock-model"
    
    async def fake_stream(*args, **kwargs):
        yield " I"
        yield " am"
        yield " a"
        yield " mock"
        yield " response."
        
    mock_provider_instance.stream = fake_stream
    mock_get_provider.return_value = MagicMock(return_value=mock_provider_instance)

    with client.stream(
        "POST",
        "/api/chat/stream",
        json={"messages": [{"role": "user", "content": "Olá"}], "provider": "ollama-cloud"}
    ) as response:
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]
        
        content = response.read().decode("utf-8")
        assert 'data: {"delta": " I"}\n\n' in content or 'data: {"delta": "I"}\n\n' in content or 'data: {"delta": " response."}\n\n' in content
        assert "data: [DONE]\n\n" in content

def test_generate_video_mock():
    response = client.post(
        "/api/generate/video",
        json={"prompt": "test video", "provider": "openrouter"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "job_id" in data
    assert data["job_id"].startswith("openrouter_")

def test_check_video_status():
    response = client.post(
        "/api/generate/video",
        json={"prompt": "test video", "provider": "openrouter"}
    )
    job_id = response.json()["job_id"]
    
    response2 = client.get(f"/api/generate/video/{job_id}")
    assert response2.status_code == 200
    data2 = response2.json()
    assert data2["status"] in ["completed", "processing"]
    assert "progress" in data2

def test_chat_stream_error():
    from core.protocol import LLMProvider
    
    with patch("app.routers.chat.get_provider") as mock_get_provider:
        mock_provider_instance = MagicMock(spec=LLMProvider)
        mock_provider_instance.model = "mock-model"
        
        async def fake_stream(*args, **kwargs):
            yield "primeiro chunk"
            raise Exception("Erro simulado no meio do stream")
            
        mock_provider_instance.stream = fake_stream
        mock_provider_class = MagicMock(return_value=mock_provider_instance)
        mock_get_provider.return_value = mock_provider_class
        
        with client.stream(
            "POST",
            "/api/chat/stream",
            json={"messages": [{"role": "user", "content": "Olá"}], "provider": "mock"}
        ) as response:
            assert response.status_code == 200
            content = response.read().decode("utf-8")
            assert 'data: {"delta": "primeiro chunk"}' in content
            assert "data: [ERROR]" in content
            assert '"provider": "mock"' in content
            assert "Erro simulado no meio do stream" in content

def test_chat_stream_with_newline():
    from core.protocol import LLMProvider
    
    with patch("app.routers.chat.get_provider") as mock_get_provider:
        mock_provider_instance = MagicMock(spec=LLMProvider)
        mock_provider_instance.model = "mock-model"
        
        async def fake_stream(*args, **kwargs):
            yield "fim do paragrafo.\n\ninicio do proximo paragrafo"
            
        mock_provider_instance.stream = fake_stream
        mock_provider_class = MagicMock(return_value=mock_provider_instance)
        mock_get_provider.return_value = mock_provider_class
        
        with client.stream(
            "POST",
            "/api/chat/stream",
            json={"messages": [{"role": "user", "content": "Olá"}], "provider": "mock"}
        ) as response:
            assert response.status_code == 200
            content = response.read().decode("utf-8")
            assert '{"delta": "fim do paragrafo.\\n\\ninicio do proximo paragrafo"}' in content

def test_chat_unauthenticated():
    # Remover o override global apenas para este teste
    app.dependency_overrides.pop(get_current_user_id, None)
    
    response = client.post(
        "/api/chat", 
        json={"messages": [{"role": "user", "content": "Olá"}]}
    )
    assert response.status_code == 401
    
    # Restaurar o override para os demais testes (caso a ordem de execução mude)
    app.dependency_overrides[get_current_user_id] = lambda: "mock_user_id"

def test_rate_limit():
    # Rate limit was set to 100 requests per minute.
    status_codes = []
    for _ in range(105):
        resp = client.get("/api/health")
        status_codes.append(resp.status_code)
    
    assert 429 in status_codes
