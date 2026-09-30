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
def healthz() -> dict[str, Any]:
    """Measurable liveness — not a constant success badge.

    Optional FastAPI engine (first-release GW1 uses embedded vertical-slice).
    Never claim READY/PASS here; only process + model load predicates.
    """
    model_loaded = _ensemble is not None and hasattr(_ensemble, "predict")
    return {
        "ok": True,
        "service": "prediction-engine",
        "alive": True,
        "modelLoaded": model_loaded,
        "label": "ALPHA_NON_PRODUCTION",
        "firstReleasePath": "OPTIONAL_OFF_PATH",
        "note": "ok means process up + ensemble constructible — not calibrated/production READY",
    }


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest) -> PredictResponse:
    result = _ensemble.predict(req.featureVector)
    return PredictResponse(**result)
