# Professional Task Grammar

Roles **compose** these verbs. Do not create a separate app per role.

| Verb | Input objects | Typical workflow | Required context | UX primitives | Risk/Gov | Outcome | Evidence |
|------|---------------|------------------|------------------|---------------|----------|---------|----------|
| FIND | Entity, Case, Alert | Search → results → open | role, permissions | Global search, results list | low | object selected | search audit optional |
| UNDERSTAND | Entity, Event | Entity360 / situation cards | object, time | L1–L2 cards | medium | mental model | citations/lineage link |
| COMPARE | Entity×N, Scenario | side-by-side / compare action | selection | comparison table/card | medium | delta understood | sources listed |
| INVESTIGATE | Case, Alert, Entity | Case workspace loop | case, evidence open | graph/timeline/evidence drawer | high | hypothesis | evidence pack |
| MONITOR | Service, Job, Risk | System / jobs / alerts | workspace | status, notifications | medium | awareness | health evidence |
| ASSESS | RiskAssessment, Entity | Risk panel | prediction, limits | risk card | high | risk verdict | risk envelope |
| PREDICT | Entity, FeatureSet | Analyze GW1 | object, horizon | prediction + uncertainty | high | estimate + abstain | model/version |
| SIMULATE | Decision, Order | Simulation panel | gov decision | sim outcome card | high | simulated fill | sim ≠ live marker |
| DECIDE | Decision | Decision / approval | risk, policy | decision card | high | decide/hold | decision id |
| APPROVE | Decision, Action | Approval card | policy, impact | proposal vs executed | high | approve/reject/NO_ACTION | audit |
| ACT | Action | Governed action | idempotency, policy | action renderer | high | effect | action execution record |
| ESCALATE | Case, Alert | Escalation path | permissions | escalate CTA | high | ownership change | audit |
| REVIEW | Report, Evidence | Evidence / lineage | runId | evidence drawer | medium | reviewed | lineage |
| REPORT | Report, Case | Report builder (future) | objects | document | medium | artifact | provenance |
| AUDIT | AuditEvent, Evidence | Technical + Evidence | role eng/audit | technical view | low | trail | immutable lineage |

## Coverage target

First-release proven verbs on GW1 path: FIND, UNDERSTAND, PREDICT, ASSESS, DECIDE, APPROVE, SIMULATE, REVIEW.

Others: ARCHITECTURALLY_SUPPORTED via grammar + role registry.
