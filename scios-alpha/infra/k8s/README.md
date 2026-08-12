# Kubernetes (Gate A placeholder)

Kubernetes manifests for SCI OS ×10 Alpha will land here in a later gate.

For local Gate A, use Docker Compose:

```bash
docker compose -f infra/docker/docker-compose.yml up --build
```

Planned resources (not yet defined):

- Deployments / Services for `prediction-engine`, `risk-engine`, `execution-simulator`, `control-plane-api`, `cockpit-ui`
- ConfigMap sourced from `infra/config/default.yaml`
- NetworkPolicy + ServiceAccount stubs for Swiss-grade zero-trust alignment
