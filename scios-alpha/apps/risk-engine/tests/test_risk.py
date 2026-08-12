from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_healthz() -> None:
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_oversized_order_rejected() -> None:
    limits = client.get("/risk/limits").json()
    oversized = limits["maxPositionSize"] + 1
    payload = {
        "positions": [],
        "newOrderProposal": {
            "side": "buy",
            "size": oversized,
            "instrumentId": "EQ-AAPL",
            "price": 100.0,
        },
        "marketDataSnapshot": {"equity": 5_000_000, "volatility": 0.02, "peakEquity": 5_000_000},
    }
    r = client.post("/risk/check", json=payload)
    assert r.status_code == 200
    body = r.json()
    assert body["allowed"] is False
    assert any("maxPositionSize" in reason for reason in body["reasons"])
