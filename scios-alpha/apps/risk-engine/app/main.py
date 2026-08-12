"""SCI OS ×10 Risk Engine – Gate A FastAPI service."""

from __future__ import annotations

from typing import Any

import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="SCI OS Risk Engine", version="0.1.0")

LIMITS = {
    "maxPositionSize": 1_000_000.0,
    "maxLeverage": 3.0,
    "maxDrawdown": 0.15,
    "concentrationLimit": 0.25,
}


class Position(BaseModel):
    positionId: str
    instrumentId: str
    size: float
    price: float = 1.0


class OrderProposal(BaseModel):
    side: str
    size: float = Field(gt=0)
    instrumentId: str
    price: float | None = None


class RiskCheckRequest(BaseModel):
    positions: list[Position] = Field(default_factory=list)
    newOrderProposal: OrderProposal
    marketDataSnapshot: dict[str, Any] = Field(default_factory=dict)


class RiskCheckResponse(BaseModel):
    var: float
    es: float
    drawdown: float
    allowed: bool
    reasons: list[str]


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/risk/limits")
def risk_limits() -> dict[str, float]:
    return dict(LIMITS)


@app.post("/risk/check", response_model=RiskCheckResponse)
def risk_check(req: RiskCheckRequest) -> RiskCheckResponse:
    reasons: list[str] = []
    proposal = req.newOrderProposal

    if proposal.size > LIMITS["maxPositionSize"]:
        reasons.append(
            f"proposed size {proposal.size} exceeds maxPositionSize {LIMITS['maxPositionSize']}"
        )

    exposures = [abs(p.size * p.price) for p in req.positions]
    gross = float(sum(exposures)) + float(proposal.size * (proposal.price or 1.0))
    equity = float(req.marketDataSnapshot.get("equity", max(gross, 1.0)))
    leverage = gross / equity if equity > 0 else 0.0
    if leverage > LIMITS["maxLeverage"]:
        reasons.append(f"leverage {leverage:.2f} exceeds maxLeverage {LIMITS['maxLeverage']}")

    vol = float(req.marketDataSnapshot.get("volatility", 0.02))
    var = float(1.65 * vol * gross)
    es = float(2.06 * vol * gross)
    peak = float(req.marketDataSnapshot.get("peakEquity", equity))
    drawdown = max(0.0, (peak - equity) / peak) if peak > 0 else 0.0
    if drawdown > LIMITS["maxDrawdown"]:
        reasons.append(f"drawdown {drawdown:.4f} exceeds maxDrawdown {LIMITS['maxDrawdown']}")

    if gross > 0:
        proposed_exposure = float(proposal.size * (proposal.price or 1.0))
        concentration = proposed_exposure / gross
        if concentration > LIMITS["concentrationLimit"]:
            reasons.append(
                f"concentration {concentration:.4f} exceeds concentrationLimit {LIMITS['concentrationLimit']}"
            )

    # Keep numpy touch for Gate A dependency surface
    _ = float(np.mean([var, es]))

    return RiskCheckResponse(
        var=var,
        es=es,
        drawdown=drawdown,
        allowed=len(reasons) == 0,
        reasons=reasons,
    )
