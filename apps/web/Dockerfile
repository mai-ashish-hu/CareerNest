FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace manifests first so dependency install can be cached.
COPY package.json package-lock.json* ./
COPY packages/config/ ./packages/config/
COPY packages/shared/package.json ./packages/shared/
COPY packages/lib/package.json ./packages/lib/
COPY packages/ui/package.json ./packages/ui/
COPY apps/web-admin/package.json ./apps/web-admin/
COPY apps/web-college/package.json ./apps/web-college/
COPY apps/web-student/package.json ./apps/web-student/
COPY apps/web-company/package.json ./apps/web-company/

RUN npm install \
    --workspace=@careernest/shared \
    --workspace=@careernest/lib \
    --workspace=@careernest/ui \
    --workspace=@careernest/web-admin \
    --workspace=@careernest/web-college \
    --workspace=@careernest/web-student \
    --workspace=@careernest/web-company \
    --include-workspace-root

# Copy only the packages/apps required by the web portals.
COPY packages/ ./packages/
COPY apps/web-admin/ ./apps/web-admin/
COPY apps/web-college/ ./apps/web-college/
COPY apps/web-student/ ./apps/web-student/
COPY apps/web-company/ ./apps/web-company/

RUN npm run build --workspace=@careernest/web-admin \
 && npm run build --workspace=@careernest/web-college \
 && npm run build --workspace=@careernest/web-student \
 && npm run build --workspace=@careernest/web-company

FROM node:20-alpine AS runner

WORKDIR /app
COPY --from=builder /app/ ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000
CMD ["node", "-e", "console.error('Use docker-compose service command for the specific web app'); process.exit(1)"]
