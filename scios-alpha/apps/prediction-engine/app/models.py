"""Prediction models for SCI OS ×10 Gate A."""

from __future__ import annotations

from typing import Any

import numpy as np
from sklearn.ensemble import RandomForestRegressor


class BaselineModel:
    """EMA-like baseline: exponential smoothing over feature means."""

    def __init__(self, alpha: float = 0.3) -> None:
        self.alpha = alpha
        self._ema: float | None = None
        self.model_id = "baseline-ema-v1"

    def predict(self, feature_vector: dict[str, float]) -> dict[str, Any]:
        values = list(feature_vector.values()) or [0.5]
        obs = float(np.clip(np.mean(values), 0.0, 1.0))
        if self._ema is None:
            self._ema = obs
        else:
            self._ema = self.alpha * obs + (1.0 - self.alpha) * self._ema

        mean = float(np.clip(self._ema, 0.0, 1.0))
        variance = 0.02
        return {
            "mean": mean,
            "variance": variance,
            "quantiles": {
                "0.1": max(0.0, mean - 1.28 * variance**0.5),
                "0.5": mean,
                "0.9": min(1.0, mean + 1.28 * variance**0.5),
            },
            "modelId": self.model_id,
            "calibrationInfo": {"method": "ema", "alpha": self.alpha},
        }


class MLModel:
    """RandomForest trained on synthetic features at init."""

    def __init__(self, n_estimators: int = 32, seed: int = 42) -> None:
        self.model_id = "ml-rf-v1"
        rng = np.random.default_rng(seed)
        x = rng.random((200, 3))
        # Target in [0,1]: soft function of priceNorm, vol, momentum
        y = np.clip(0.4 * x[:, 0] + 0.3 * (1 - x[:, 1]) + 0.2 * (x[:, 2] + 0.5), 0, 1)
        self._model = RandomForestRegressor(n_estimators=n_estimators, random_state=seed)
        self._model.fit(x, y)
        self._feature_keys = ("priceNorm", "vol", "momentum")

    def _vectorize(self, feature_vector: dict[str, float]) -> np.ndarray:
        return np.array(
            [[float(feature_vector.get(k, 0.5)) for k in self._feature_keys]],
            dtype=float,
        )

    def predict(self, feature_vector: dict[str, float]) -> dict[str, Any]:
        x = self._vectorize(feature_vector)
        preds = np.array([est.predict(x)[0] for est in self._model.estimators_])
        mean = float(np.clip(np.mean(preds), 0.0, 1.0))
        variance = float(max(np.var(preds), 1e-6))
        return {
            "mean": mean,
            "variance": variance,
            "quantiles": {
                "0.1": float(np.clip(np.quantile(preds, 0.1), 0, 1)),
                "0.5": float(np.clip(np.quantile(preds, 0.5), 0, 1)),
                "0.9": float(np.clip(np.quantile(preds, 0.9), 0, 1)),
            },
            "modelId": self.model_id,
            "calibrationInfo": {"method": "rf_tree_ensemble", "n_estimators": len(preds)},
        }


class EnsembleModel:
    """Average of BaselineModel and MLModel outputs."""

    def __init__(self) -> None:
        self.baseline = BaselineModel()
        self.ml = MLModel()
        self.model_id = "ensemble-avg-v1"

    def predict(self, feature_vector: dict[str, float]) -> dict[str, Any]:
        a = self.baseline.predict(feature_vector)
        b = self.ml.predict(feature_vector)
        mean = float((a["mean"] + b["mean"]) / 2)
        variance = float((a["variance"] + b["variance"]) / 2)
        quantiles = {
            k: float((a["quantiles"][k] + b["quantiles"][k]) / 2)
            for k in ("0.1", "0.5", "0.9")
        }
        return {
            "mean": mean,
            "variance": variance,
            "quantiles": quantiles,
            "modelId": self.model_id,
            "calibrationInfo": {
                "method": "average",
                "components": [a["modelId"], b["modelId"]],
            },
        }
