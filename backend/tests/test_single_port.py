import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

def test_single_port_frontend_serving():
    # 1. Root / must return the frontend index.html
    response = client.get("/")
    assert response.status_code == 200
    assert "SAP Test Case Generator" in response.text
    assert "<div id=\"root\"></div>" in response.text

    # 2. Health check endpoint must be accessible on same port
    health_res = client.get("/api/health")
    assert health_res.status_code == 200
    assert health_res.json()["status"] == "ok"

    # 3. KB API must be accessible on same port
    kb_res = client.get("/kb/list")
    assert kb_res.status_code == 200
    assert isinstance(kb_res.json(), list)
