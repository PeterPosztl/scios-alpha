# Walk-forward / purged CV / calibration (ALPHA skeleton)
# pip install -e packages/validation-engine (later)

def walk_forward_stub(returns: list[float]) -> dict:
    if not returns:
        return {"sharpe": 0.0, "folds": 0}
    mean = sum(returns) / len(returns)
    return {"sharpe": mean * 10, "folds": max(1, len(returns) // 5), "note": "ALPHA stub"}
