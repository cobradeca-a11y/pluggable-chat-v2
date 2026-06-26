import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

os.environ["LLM_PROVIDER"] = "mock"
os.environ["RATE_LIMIT_RPM"] = "15"
os.environ["ACTIVE_MIDDLEWARE"] = "rate_limit,request_logger"

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_plugins_endpoint():
    response = client.get("/api/plugins")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    assert "providers" in data
    assert any(p["name"] == "mock" for p in data["providers"])

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
        json={"prompt": "test video", "provider": "kling"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "job_id" in data
    assert data["job_id"].startswith("kling_")

def test_check_video_status():
    response = client.post(
        "/api/generate/video",
        json={"prompt": "test video", "provider": "kling"}
    )
    job_id = response.json()["job_id"]
    
    response2 = client.get(f"/api/generate/video/{job_id}")
    assert response2.status_code == 200
    data2 = response2.json()
    assert data2["status"] == "completed"
    assert "progress" in data2
    assert "url" in data2

def test_rate_limit():
    # Rate limit was set to 15 requests per minute.
    status_codes = []
    for _ in range(15):
        resp = client.get("/api/health")
        status_codes.append(resp.status_code)
    
    assert 429 in status_codes
