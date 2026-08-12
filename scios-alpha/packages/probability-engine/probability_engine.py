# GPR / ensembles / uncertainty (ALPHA skeleton)

def ensemble_mean(means: list[float], weights: list[float] | None = None) -> dict:
    if not means:
        return {"mean": 0.5, "variance": 0.01}
    w = weights or [1 / len(means)] * len(means)
    m = sum(a * b for a, b in zip(means, w))
    return {"mean": m, "variance": 0.01, "note": "ALPHA stub"}
