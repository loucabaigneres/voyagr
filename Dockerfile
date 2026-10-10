FROM node:24-alpine AS base
RUN npm install -g pnpm@10.33.2 turbo
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS pruner
COPY . .
RUN turbo prune @voyagr/api --docker

FROM base AS builder
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --no-frozen-lockfile

COPY --from=pruner /app/out/full/ .
COPY turbo.json turbo.json
RUN pnpm turbo run build --filter=@voyagr/api...

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup -g 1001 -S nodejs
RUN adduser -S -u 1001 -G nodejs nodejs

COPY --from=builder --chown=nodejs:nodejs /app /app

USER nodejs

EXPOSE 3000

CMD ["node", "apps/api/dist/index.js"]