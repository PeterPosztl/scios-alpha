from __future__ import annotations

import math

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_healthz() -> None:
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_predict_mean_finite_or_unit_interval() -> None:
    payload = {
        "instrumentId": "EQ-AAPL",
        "horizonSec": 300,
        "featureVector": {"priceNorm": 0.72, "vol": 0.15, "momentum": 0.03},
    }
    r = client.post("/predict", json=payload)
    assert r.status_code == 200
    body = r.json()
    mean = body["mean"]
    assert math.isfinite(mean)
    assert 0.0 <= mean <= 1.0
    assert "variance" in body
    assert "quantiles" in body
    assert "modelId" in body
    assert "calibrationInfo" in body
