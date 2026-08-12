FROM node:20-alpine
WORKDIR /app

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/data-fabric/package.json ./packages/data-fabric/
COPY packages/feature-store/package.json ./packages/feature-store/
COPY packages/observability/package.json ./packages/observability/
COPY packages/governance-engine/package.json ./packages/governance-engine/
COPY packages/model-registry/package.json ./packages/model-registry/
COPY apps/control-plane-api/package.json ./apps/control-plane-api/

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate \
  && pnpm install --filter @scios/control-plane-api... --frozen-lockfile=false

COPY packages/data-fabric ./packages/data-fabric
COPY packages/feature-store ./packages/feature-store
COPY packages/observability ./packages/observability
COPY packages/governance-engine ./packages/governance-engine
COPY packages/model-registry ./packages/model-registry
COPY apps/control-plane-api ./apps/control-plane-api

RUN pnpm --filter @scios/data-fabric build \
  && pnpm --filter @scios/feature-store build \
  && pnpm --filter @scios/observability build \
  && pnpm --filter @scios/governance-engine build \
  && pnpm --filter @scios/model-registry build

WORKDIR /app/apps/control-plane-api
ENV PORT=5200
EXPOSE 5200
CMD ["pnpm", "start"]
