import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

os.environ["LLM_PROVIDER"] = "mock"
os.environ["RATE_LIMIT_RPM"] = "5"
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
    assert "mock" in data["providers"]

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

def test_rate_limit():
    # Rate limit was set to 5 requests per minute.
    # The previous tests consumed 3 requests. 
    # Let's execute 5 more to guarantee we hit the 429.
    status_codes = []
    for _ in range(5):
        resp = client.get("/api/health")
        status_codes.append(resp.status_code)
    
    assert 429 in status_codes
