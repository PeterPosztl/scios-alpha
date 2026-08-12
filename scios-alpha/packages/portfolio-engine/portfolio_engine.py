# Mean-variance + risk-parity skeleton (ALPHA)

def equal_weight(n: int) -> list[float]:
    if n <= 0:
        return []
    return [1 / n] * n


def risk_parity_stub(vols: list[float]) -> list[float]:
    inv = [1 / max(v, 1e-6) for v in vols]
    s = sum(inv) or 1.0
    return [x / s for x in inv]
