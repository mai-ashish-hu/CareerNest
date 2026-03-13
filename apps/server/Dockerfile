# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/ ./packages/config/
COPY apps/server/package.json ./apps/server/

# Install dependencies
RUN npm install --workspace=@careernest/server --include-workspace-root

# Copy source code
COPY packages/shared/ ./packages/shared/
COPY apps/server/ ./apps/server/

# Compile shared package first, then server
RUN npm run build --workspace=@careernest/shared
RUN npm run build --workspace=@careernest/server

# ─── Production stage ───
FROM node:20-alpine AS runner

WORKDIR /app

# Copy from builder
COPY --from=builder /app/ ./

# Install explicit production dependencies (which now includes tsx)
RUN npm install --workspace=@careernest/server --include-workspace-root --omit=dev

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["node", "apps/server/dist/apps/server/src/index.js"]
