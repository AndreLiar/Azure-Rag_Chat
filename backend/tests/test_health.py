"""
Basic health check tests for the FastAPI application
"""

import os

from fastapi.testclient import TestClient

# Set testing environment variable before importing main
# This must happen before main import to avoid service initialization
os.environ["TESTING"] = "1"

import main  # noqa: E402

app = main.app
client = TestClient(app)


def test_health_endpoint():
    """Test that the health endpoint returns 200"""
    response = client.get("/health")
    assert response.status_code == 200
    assert "status" in response.json()
    assert response.json()["status"] == "healthy"


def test_root_endpoint():
    """Test that the root endpoint returns 200"""
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()
    assert response.json()["message"] == "RAG Chat API is running"


def test_app_startup():
    """Test that the app can start without errors"""
    # This is a placeholder for actual startup tests
    assert app is not None
