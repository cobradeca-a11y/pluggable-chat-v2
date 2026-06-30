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

client = TestClient(app)

def test_plugins_endpoint():
    response = client.get("/api/plugins")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    assert "providers" in data
    assert any(p["name"] == "mock" for p in data["providers"])
    assert any(p["name"] == "claude" for p in data["providers"])

def test_claude_registered():
    response = client.get("/api/plugins")
    data = response.json()
    claude_plugin = next((p for p in data["providers"] if p["name"] == "claude"), None)
    assert claude_plugin is not None
    assert claude_plugin["can_text"] is True
    # Claude does not generate images, but it supports them as attachments.
    assert claude_plugin["can_image"] is False
    assert claude_plugin["can_video"] is False
    assert "image/png" in claude_plugin["supported_attachments"]

def test_gpt4o_registered():
    response = client.get("/api/plugins")
    data = response.json()
    gpt4o_plugin = next((p for p in data["providers"] if p["name"] == "gpt4o"), None)
    assert gpt4o_plugin is not None
    assert gpt4o_plugin["can_text"] is True
    assert gpt4o_plugin["can_image"] is False
    assert gpt4o_plugin["can_video"] is False
    assert "image/png" in gpt4o_plugin["supported_attachments"]

def test_gemini_registered():
    response = client.get("/api/plugins")
    data = response.json()
    p = next((p for p in data["providers"] if p["name"] == "gemini"), None)
    assert p is not None
    assert p["can_text"] is True
    assert p["can_image"] is True
    assert p["can_video"] is True

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

def test_mock_registered():
    response = client.get("/api/plugins")
    data = response.json()
    p = next((p for p in data["providers"] if p["name"] == "mock"), None)
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

# AUTH TESTS (5 testes)



@patch('app.routers.auth.get_supabase')
def test_send_magic_link_success(mock_get_supabase):
    mock_supabase = MagicMock()
    mock_supabase.auth.sign_in_with_otp.return_value = {"message": "ok"}
    mock_get_supabase.return_value = mock_supabase
    
    response = client.post("/api/auth/send-link", json={"email": "test@example.com"})
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

@patch('app.routers.auth.get_supabase')
def test_send_magic_link_error(mock_get_supabase):
    mock_supabase = MagicMock()
    mock_supabase.auth.sign_in_with_otp.side_effect = Exception("Invalid email")
    mock_get_supabase.return_value = mock_supabase
    
    response = client.post("/api/auth/send-link", json={"email": "invalid"})
    assert response.status_code == 400
    assert "Invalid email" in response.json()["detail"]

@patch('app.routers.auth.get_supabase')
def test_verify_link_success(mock_get_supabase):
    mock_supabase = MagicMock()
    mock_session = MagicMock()
    mock_session.session.access_token = "fake_token"
    mock_session.session.user.id = "user_123"
    mock_supabase.auth.verify_otp.return_value = mock_session
    mock_get_supabase.return_value = mock_supabase
    
    response = client.post("/api/auth/verify", json={"email": "test@example.com", "token": "123456"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["session"]["access_token"] == "fake_token"
    assert data["session"]["user_id"] == "user_123"

@patch('app.routers.auth.get_supabase')
def test_verify_link_invalid(mock_get_supabase):
    mock_supabase = MagicMock()
    # verify_otp returns object without session
    mock_supabase.auth.verify_otp.return_value = MagicMock(session=None)
    mock_get_supabase.return_value = mock_supabase
    
    response = client.post("/api/auth/verify", json={"email": "test@example.com", "token": "wrong"})
    assert response.status_code == 401
    assert "Invalid session" in response.json()["detail"]

@patch('app.routers.auth.get_supabase')
def test_verify_link_exception(mock_get_supabase):
    mock_supabase = MagicMock()
    mock_supabase.auth.verify_otp.side_effect = Exception("Expired token")
    mock_get_supabase.return_value = mock_supabase
    
    response = client.post("/api/auth/verify", json={"email": "test@example.com", "token": "123456"})
    assert response.status_code == 401
    assert "Expired token" in response.json()["detail"]






def test_chat_sync():
    response = client.post(
        "/api/chat", 
        json={"messages": [{"role": "user", "content": "Olá"}]}
    )
    assert response.status_code == 200
    data = response.json()
    assert "content" in data
    assert data["content"] == "I am a mock response."

def test_chat_stream():
    with client.stream(
        "POST",
        "/api/chat/stream",
        json={"messages": [{"role": "user", "content": "Olá"}]}
    ) as response:
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]
        
        content = response.read().decode("utf-8")
        assert "data: I\n\n" in content
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

def test_rate_limit():
    # Rate limit was set to 100 requests per minute.
    status_codes = []
    for _ in range(105):
        resp = client.get("/api/health")
        status_codes.append(resp.status_code)
    
    assert 429 in status_codes
