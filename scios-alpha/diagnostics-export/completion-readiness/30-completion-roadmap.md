# SCI OS ×10 — Completion Roadmap

## Phase 1: Close Alpha (Target A) — ~2-4 weeks

### Prerequisites (Founder Decisions)
- **FD-003**: Decide cockpit UI framework

### Engineering Work
1. Implement cockpit home page (system status dashboard)
2. Generate fresh golden-path proof on current HEAD
3. WHI-005 through WHI-009 (remaining host slices)
4. Clean up empty packages (remove or implement stubs)
5. P2/P3 batch work (start with highest-impact)

### Exit Criteria
- Golden path boot→home→view→shutdown proven
- P0=0 maintained
- Fresh proofs on current build

---

## Phase 2: Beta Foundation (Target B) — ~2-3 months

### Prerequisites (Founder Decisions)
- **FD-002**: Database strategy (commit to PG)
- **FD-004**: Domain priority order

### Engineering Work
1. PostgreSQL integration + migrations
2. Implement Search and Entity views
3. First professional domain end-to-end
4. Job lifecycle (resolve CF11 P1s)
5. Policy decision/enforcement (resolve CF14 P1s)
6. Model validation (resolve CF28 P1s)
7. Add vitest, reach 50% coverage
8. Redis integration for job queues

### Exit Criteria
- P1 < 20
- 3+ UX views functional
- 1+ domain runtime-connected

---

## Phase 3: Production Hardening (Target C) — ~3-6 months

### Prerequisites (Founder Decisions)
- **FD-001**: OIDC provider
- **FD-007**: Deployment model

### Engineering Work
1. OIDC + RBAC implementation
2. TLS/CORS/CSP hardening
3. OpenTelemetry integration
4. Load testing infrastructure
5. Data classification + privacy
6. Auto-update mechanism
7. Security audit

### Exit Criteria
- P1 = 0, P0 = 0
- Security audit passed
- Load tested

---

## Phase 4: Full Vision (Target D) — ~6-12+ months

### Prerequisites (Founder Decisions)
- **FD-005**: AI/LLM scope
- **FD-006**: Market data providers

### Engineering Work
1. All professional domains
2. Experience Compiler
3. All canonical views
4. AI CoPilot + Client Assistant
5. Market/economic data
6. WebGL/WASM layer
7. Causal reasoning
8. Multi-user collaboration
9. Cost control

### Exit Criteria
- 300+ capabilities verified
- Full SCI OS ×10 vision operational
