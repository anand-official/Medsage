# ── Stage 1: install production dependencies ──────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Stage 2: production image ─────────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

# Copy only what the server needs at runtime
COPY --from=deps /app/node_modules ./node_modules
COPY server/ ./server/
COPY package.json ./

# Non-root user for security
RUN addgroup -S cortex && adduser -S cortex -G cortex
USER cortex

ENV NODE_ENV=production
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/healthz || exit 1

CMD ["node", "server/index.js"]
