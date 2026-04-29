FROM node:24-alpine AS base
RUN npm install -g pnpm turbo
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS pruner
COPY . .
RUN turbo prune api --docker

FROM base AS builder
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .
COPY turbo.json turbo.json
RUN pnpm turbo run build --filter=api...

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup --system -gid 1001 nodejs
RUN adduser --system -uid 1001 nodejs
USER nodejs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/package.json ./packages/database/

EXPOSE 3000

CMD ["node", "apps/api/dist/index.js"]