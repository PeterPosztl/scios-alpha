# ECL + DIL risk policy

**Label:** `ALPHA_NON_PRODUCTION`  
**Non-negotiable:** human remains the decision maker. Agent cannot trade.

## How it works

Guardrails sit in ECL (`GuardrailLimits`) and are applied again at DIL sizing time.

| Limit | Default (sim book) | Breach action |
|-------|--------------------|---------------|
| Max daily loss | 2500 | `noNewRisk`; recommendation `auto_stop_no_new_risk` |
| Max position notional | 5000 | same |
| Max concentration | 35% of equity | same |
| Kelly cap | 15% | Fraction is **min(raw Kelly, cap)** — never an order |
| Session drawdown | 8% | `noNewRisk` |

DIL horizon multipliers: `5m` 1.25 (more fragile) · `24h` 1.0 · `72h` 0.85.

Decision rule (simplified): low confidence → `wait`; negative edge → `avoid`; high risk → `trim`; drawdown/daily-loss guard → `avoid`/`exit`; otherwise `enter` only with medium/large edge and risk &lt; 0.65.

Every decision, proposal, and newly detected breach is an `AuditEvent` (`kind`: `decision` | `proposal` | `rule` | `risk_event` | `session`).

## Limitations

- Limits are process-local. Restart resets the simulated book.
- No 90% win-rate. Models are uncalibrated placeholders.
- `auto_stop` is an **advisory string**, not a broker kill-switch.
- Whale detection is last-trade size flags on the simulated snapshot, not a live tape.

## Future work

- Independent risk officer matrix action on limit edits.
- Multi-session drawdown across durable ledger (P2).
- Calibration evidence before any production-eligibility discussion. Simulated ADEQUATE_ALPHA is not live proof.
