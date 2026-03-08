# 11 – Environment and DevOps

## Project: CareerNest – TP Cell Management Platform

---

## 1. Environment Strategy

| Environment | Purpose | URL Pattern |
|-------------|---------|-------------|
| **Local** | Developer workstation | `localhost:3000` (web), `localhost:4000` (server) |
| **Development** | Feature integration and testing | `dev.careernest.com` |
| **Staging** | Pre-production validation | `staging.careernest.com` |
| **Production** | Live user-facing environment | `{subdomain}.careernest.com` |

---

## 2. Technology Stack

| Component | Technology | Environment |
|-----------|-----------|-------------|
| Frontend | Remix.js (SSR) + Tailwind CSS | Node.js runtime |
| Backend API | Express.js + TypeScript | Node.js managed hosting |
| Database | Appwrite Cloud Pro (SQL) | Appwrite-managed |
| Authentication | Appwrite Auth | Appwrite-managed |
| File Storage | Appwrite Storage (encrypted) | Appwrite-managed |
| CI/CD | GitHub Actions | GitHub-hosted runners |
| Package Manager | npm (with workspaces) | All environments |
| Build Tool | Turborepo (optional) | CI + Local |

---

## 3. Environment Variables

### Template (`.env.example`)

```env
# ── App ──
NODE_ENV=development
PORT=4000
APP_URL=http://localhost:3000

# ── Appwrite ──
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key

# ── Database Collection IDs ──
APPWRITE_DB_ID=careernest_db
COLLECTION_TENANTS=tenants
COLLECTION_USERS=users
COLLECTION_STUDENTS=students
COLLECTION_COMPANIES=companies
COLLECTION_DRIVES=drives
COLLECTION_APPLICATIONS=applications
COLLECTION_COURSES=courses
COLLECTION_ANNOUNCEMENTS=announcements
COLLECTION_PLACEMENT_RECORDS=placement_records
COLLECTION_AUDIT_LOGS=audit_logs

# ── Storage ──
APPWRITE_BUCKET_ID=resumes

# ── Email ──
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@careernest.com
SMTP_PASS=your_smtp_password

# ── Security ──
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Environment-Specific Overrides

| Variable | Dev | Staging | Production |
|----------|-----|---------|------------|
| `NODE_ENV` | `development` | `staging` | `production` |
| `APPWRITE_PROJECT_ID` | Dev project | Staging project | Prod project |
| `APPWRITE_API_KEY` | Dev key | Staging key | Prod key (rotated) |
| `RATE_LIMIT_MAX_REQUESTS` | 1000 | 200 | 100 |

---

## 4. CI/CD Pipeline (GitHub Actions)

### 4.1 Pipeline Overview

```
Push/PR → Lint → Type Check → Unit Tests → Build → Deploy
```

### 4.2 Workflow: `ci.yml`

```yaml
name: CI Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run lint

  type-check:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run type-check

  test:
    runs-on: ubuntu-latest
    needs: type-check
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run test

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run build
```

### 4.3 Workflow: `deploy.yml`

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy-server:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run build --workspace=apps/server
      - name: Deploy to Hosting
        run: |
          # Deploy command for your managed hosting provider
          # e.g., Railway, Render, Fly.io, or Vercel

  deploy-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run build --workspace=apps/web
      - name: Deploy to Hosting
        run: |
          # Deploy Remix.js app
          # e.g., Vercel, Netlify, or Cloudflare Pages
```

---

## 5. Branching Strategy

| Branch | Purpose | Deploys To |
|--------|---------|-----------|
| `main` | Production-ready code | Production |
| `develop` | Integration branch | Development |
| `feature/*` | Feature branches | — (PR to develop) |
| `hotfix/*` | Critical production fixes | Production (via PR to main) |

### Workflow

```
feature/drive-crud → PR → develop → PR → main → Deploy
```

---

## 6. Monitoring & Logging

### 6.1 Application Logging

| Log Level | Usage |
|-----------|-------|
| `error` | Unhandled exceptions, critical failures |
| `warn` | Degraded performance, retry attempts |
| `info` | Request lifecycle, auth events, business events |
| `debug` | Detailed debugging (dev/staging only) |

### 6.2 Monitoring Targets

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API Response Time | < 2s (p95) | > 3s |
| Error Rate | < 1% | > 5% |
| Uptime | 95% SLA | < 99% (monthly) |
| Memory Usage | < 512MB per instance | > 80% |

### 6.3 Health Check Endpoint

```
GET /api/v1/health
```

**Response (200):**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-03-01T10:00:00Z",
  "services": {
    "database": "connected",
    "storage": "connected",
    "auth": "connected"
  }
}
```

---

## 7. Security in DevOps

| Control | Implementation |
|---------|----------------|
| Secret Management | GitHub Secrets for all environment variables |
| API Key Rotation | Production API keys rotated quarterly |
| Dependency Scanning | `npm audit` in CI pipeline |
| HTTPS | Enforced via hosting provider + Cloudflare |
| Access Control | Branch protection rules on `main` and `develop` |

---

## 8. Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-org/careernest.git
cd careernest

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env

# 4. Configure Appwrite credentials in .env

# 5. Start development servers
npm run dev              # Starts both web and server
# or individually:
npm run dev --workspace=apps/web      # Remix dev server (port 3000)
npm run dev --workspace=apps/server   # Express dev server (port 4000)
```
