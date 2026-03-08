# CareerNest — Multi-Tenant Training & Placement Cell Management Platform

A production-ready, multi-tenant SaaS platform for college Training & Placement (T&P) cells to manage the complete campus hiring lifecycle — from company onboarding to student placements.

Built as a monorepo with **4 role-based web portals**, a **shared Express.js API**, and **Appwrite** as the backend-as-a-service for database, auth, and file storage.

---

## Features

- **Multi-Tenant Architecture** — Each college operates in its own isolated tenant with scoped data access
- **4 Role-Based Portals** — Super Admin, College TPO, Student, and Company dashboards
- **Drive Management** — Create, manage, and track placement drives with eligibility criteria (CGPA, backlogs, department, year)
- **Application Tracking** — Students apply to drives; TPOs track applications through a defined stage pipeline (`applied → under_review → shortlisted → interview_scheduled → selected/rejected`)
- **Student Management** — Single and bulk (CSV) student onboarding with automatic Appwrite auth user + team creation
- **Company Management** — Onboard companies with auth accounts, track their status
- **Announcements** — TPOs broadcast announcements to students within their tenant
- **Analytics** — Placement analytics with department-wise stats, conversion rates
- **Audit Logging** — Every create/update action is logged for compliance
- **Shared UI Component Library** — 14+ reusable glassmorphism-styled components
- **Docker Deployment** — One-command deployment via `docker compose up --build`

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Remix (React Router v7) + Tailwind CSS |
| **Backend API** | Express.js + TypeScript |
| **Database & Auth** | Appwrite (self-hosted / cloud) |
| **Validation** | Zod |
| **Auth** | JWT (server-signed) + Appwrite Auth |
| **Email** | Nodemailer (SMTP) |
| **Package Manager** | npm workspaces (monorepo) |
| **Deployment** | Docker Compose + Nginx reverse proxy |

---

## Project Structure

```
careernest/
├── apps/
│   ├── server/           # Express.js REST API (port 4000)
│   ├── web-admin/        # Super Admin Portal (port 3001)
│   ├── web-college/      # College TPO Portal (port 3002)
│   ├── web-student/      # Student Portal (port 3003)
│   └── web-company/      # Company Portal (port 3004)
├── packages/
│   ├── shared/           # @careernest/shared — Types, constants, interfaces
│   ├── lib/              # @careernest/lib — API client, auth.server helpers
│   ├── ui/               # @careernest/ui — 14+ reusable React components
│   └── config/           # Shared TypeScript config
├── docker-compose.yml    # Full-stack Docker deployment
├── nginx.conf            # Nginx reverse proxy config
├── MANUAL-SETUP.md       # Appwrite setup instructions
└── PROJECT-DOCS.md       # Comprehensive project documentation
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- Docker & Docker Compose (for deployment)
- Appwrite instance (cloud or self-hosted)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Required `.env` variables:

```env
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key
APPWRITE_DATABASE_ID=careernest_db
JWT_SECRET=your-strong-secret
```

### 3. Set Up Appwrite

Follow [MANUAL-SETUP.md](MANUAL-SETUP.md) to create the database, 10 collections, storage bucket, and super admin user in Appwrite.

### 4. Run Development Servers

```bash
# Terminal 1 — Backend API
npm run dev:server       # http://localhost:4000

# Terminal 2 — Admin Portal
npm run dev:admin        # http://localhost:3001

# Terminal 3 — College Portal
npm run dev:college      # http://localhost:3002

# Terminal 4 — Student Portal
npm run dev:student      # http://localhost:3003

# Terminal 5 — Company Portal
npm run dev:company      # http://localhost:3004
```

### 5. Docker Deployment

```bash
docker compose up --build -d
```

This spins up 6 containers:

| Container | Port | URL Path |
|---|---|---|
| `careernest-server` | 4000 | `/api/` |
| `careernest-admin` | 3001 | `/admin/` |
| `careernest-college` | 3002 | `/college/` |
| `careernest-student` | 3003 | `/student/` |
| `careernest-company` | 3004 | `/company/` |
| `careernest-nginx` | **80** | Reverse proxy (all above) |

Access at `http://localhost` — defaults to Student Portal.

---

## API Overview

The backend exposes **37+ RESTful endpoints** at `/api/v1/`. Key groups:

| Route Group | Endpoints | Description |
|---|---|---|
| `/auth` | login, logout, me | JWT authentication |
| `/tenants` | CRUD + team | Multi-tenant management |
| `/companies` | CRUD | Company onboarding |
| `/drives` | CRUD | Placement drive management |
| `/applications` | create, list, update stage | Application tracking |
| `/students` | create, bulk, me, list, update | Student management |
| `/courses` | CRUD | Course/department management |
| `/announcements` | create, list, delete | TPO announcements |
| `/analytics` | placement stats | Placement analytics |
| `/admin` | stats, users, audit logs | Super admin operations |

See [PROJECT-DOCS.md](PROJECT-DOCS.md) for the complete API reference.

---

## User Roles

| Role | Portal | Capabilities |
|---|---|---|
| **Super Admin** | Admin Portal | Manage all tenants, users, global oversight |
| **TPO** | College Portal | Manage students, companies, drives, announcements |
| **TPO Assistant** | College Portal | Assist TPO with student/company management |
| **Student** | Student Portal | Browse drives, apply, track applications, view announcements |
| **Company** | Company Portal | View assigned drives, manage applications |

---

## Documentation

- [MANUAL-SETUP.md](MANUAL-SETUP.md) — Appwrite configuration and deployment
- [PROJECT-DOCS.md](PROJECT-DOCS.md) — Complete project documentation (architecture, schema, API, components)
