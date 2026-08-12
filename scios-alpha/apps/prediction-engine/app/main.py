"""SCI OS ×10 Prediction Engine – Gate A FastAPI service."""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

from app.models import EnsembleModel

app = FastAPI(title="SCI OS Prediction Engine", version="0.1.0")
_ensemble = EnsembleModel()


class PredictRequest(BaseModel):
    instrumentId: str
    horizonSec: int = Field(gt=0)
    featureVector: dict[str, float]


class PredictResponse(BaseModel):
    mean: float
    variance: float
    quantiles: dict[str, float]
    modelId: str
    calibrationInfo: dict[str, Any]


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest) -> PredictResponse:
    result = _ensemble.predict(req.featureVector)
    return PredictResponse(**result)
