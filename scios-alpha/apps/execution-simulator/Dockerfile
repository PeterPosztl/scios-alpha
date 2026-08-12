FROM node:20-alpine
WORKDIR /app

# Monorepo context: repo root
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/data-fabric/package.json ./packages/data-fabric/
COPY packages/observability/package.json ./packages/observability/
COPY apps/execution-simulator/package.json ./apps/execution-simulator/

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate \
  && pnpm install --filter @scios/execution-simulator... --frozen-lockfile=false

COPY packages/data-fabric ./packages/data-fabric
COPY packages/observability ./packages/observability
COPY apps/execution-simulator ./apps/execution-simulator

RUN pnpm --filter @scios/data-fabric build \
  && pnpm --filter @scios/observability build

WORKDIR /app/apps/execution-simulator
ENV PORT=5210
EXPOSE 5210
CMD ["pnpm", "start"]
