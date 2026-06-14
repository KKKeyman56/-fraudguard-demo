import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

AUTHZ = {"authorized": True, "owner_attestation": "CTO Acme", "engagement_id": "ENG-1"}


def test_health():
    assert client.get("/health").status_code == 200


def test_info_reports_stub_provider_without_keys(monkeypatch):
    # No API keys in test env -> resolves to offline heuristic engine.
    body = client.get("/info").json()
    assert body["provider"] == "stub"
    assert "advisor" in body["modes"]


def test_advisor_requires_authorization():
    resp = client.post(
        "/analyze/advisor",
        json={
            "authorization": {**AUTHZ, "authorized": False},
            "artifacts": [{"name": "a.py", "type": "code", "content": "eval(x)"}],
        },
    )
    assert resp.status_code == 403


def test_advisor_happy_path():
    resp = client.post(
        "/analyze/advisor",
        json={
            "authorization": AUTHZ,
            "artifacts": [{"name": "a.py", "type": "code", "content": "token = \"supersecret\""}],
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["engagement_id"] == "ENG-1"
    assert data["mode"] == "advisor"
    assert len(data["findings"]) >= 1


def test_scan_endpoint():
    resp = client.post(
        "/analyze/scan",
        json={"authorization": AUTHZ, "tool": "nmap", "raw_output": "21/tcp open ftp"},
    )
    assert resp.status_code == 200
    assert resp.json()["findings"]


def test_validation_error_on_empty_artifacts():
    resp = client.post(
        "/analyze/advisor", json={"authorization": AUTHZ, "artifacts": []}
    )
    assert resp.status_code == 422
