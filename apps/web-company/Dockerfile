FROM node:20-alpine AS builder
WORKDIR /app

# Copy everything (monorepo-wide)
COPY . .

# Install all workspace dependencies
RUN npm install

# Build the specific app
RUN npm run build --workspace=@careernest/web-company

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/ ./
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
WORKDIR /app/apps/web-company
CMD ["npx", "remix-serve", "build/server/index.js"]
