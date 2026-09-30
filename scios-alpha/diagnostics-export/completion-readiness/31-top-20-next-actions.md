# SCI OS ×10 — Top 20 Next Engineering Actions

## Immediately Safe (no founder decision needed)

1. **Generate fresh golden-path proof** on current HEAD (435f9272) — validates boot→home→shutdown on latest code
2. **Generate fresh startup proof** — current startup-proof.json is 15 days stale
3. **WHI-005 Host Performance Collector** — blueprinted, safe, extends proven WHI pattern
4. **P1 batch_001 CF11 job lifecycle** — resolve job states/idempotency/progress/evidence (28 root causes)
5. **P1 batch_001 CF28 model validation** — resolve 8 root causes
6. **P1 batch_001 CF14 policy framework** — implement PDP/PEP skeleton (14 root causes)
7. **Remove empty packages** or add minimal package.json+index (experience-compiler, probability-engine, external-intelligence, portfolio-engine)
8. **Add vitest** test framework alongside existing proof harness
9. **WHI-006 through WHI-009** — remaining host slices
10. **P2/P3 closure batches** — 230 root causes, incrementally fixable

## Requires Founder Decision First

11. **FD-003 → Build cockpit home page** — needs UI framework decision (React in scios-alpha vs sci-shell-web)
12. **FD-003 → Implement Search view** — depends on UI framework
13. **FD-003 → Implement Entity view** — depends on UI framework
14. **FD-002 → PostgreSQL integration** — needs DB strategy commitment
15. **FD-004 → First professional domain** — needs domain priority
16. **FD-001 → OIDC implementation** — needs provider selection
17. **FD-005 → AI CoPilot skeleton** — needs LLM provider decision

## Requires External Dependencies

18. **Redis integration** — install Redis, implement job queue adapter
19. **OpenTelemetry setup** — add tracing/metrics to control-plane-api
20. **TLS certificate setup** — production HTTPS configuration
