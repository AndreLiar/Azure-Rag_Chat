"""
Basic health check tests for the FastAPI application
"""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_endpoint():
    """Test that the health endpoint returns 200"""
    response = client.get("/health")
    assert response.status_code == 200
    assert "status" in response.json()


def test_root_endpoint():
    """Test that the root endpoint returns 200"""
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()


@pytest.mark.asyncio
async def test_app_startup():
    """Test that the app can start without errors"""
    # This is a placeholder for actual startup tests
    assert app is not None
