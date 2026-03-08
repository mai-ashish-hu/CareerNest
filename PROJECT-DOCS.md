# CareerNest — Complete Project Documentation

> Multi-Tenant Training & Placement Cell Management Platform  
> Built with Express.js, Remix, Appwrite, and Docker

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Tech Stack & Dependencies](#4-tech-stack--dependencies)
5. [Environment Variables](#5-environment-variables)
6. [Database Schema](#6-database-schema)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [API Reference](#8-api-reference)
9. [Backend — Server Architecture](#9-backend--server-architecture)
10. [Frontend — Portal Architecture](#10-frontend--portal-architecture)
11. [Shared Packages](#11-shared-packages)
12. [Multi-Tenancy Design](#12-multi-tenancy-design)
13. [Application Stage Pipeline](#13-application-stage-pipeline)
14. [Deployment](#14-deployment)
15. [User Roles & Permissions](#15-user-roles--permissions)
16. [Data Flow Examples](#16-data-flow-examples)

---

## 1. Project Overview

**CareerNest** is a production-ready, multi-tenant SaaS platform designed for college Training & Placement (T&P) cells. It digitizes the entire campus hiring lifecycle:

- **Colleges** register as tenants and get an isolated workspace
- **TPOs** (Training & Placement Officers) manage students, companies, drives, and announcements
- **Students** browse drives, apply, and track their application status
- **Companies** are onboarded per-college and linked to placement drives
- **Super Admins** oversee all tenants, users, and platform-wide analytics

### Key Capabilities

| Feature | Description |
|---|---|
| Multi-Tenant Isolation | Each college's data is fully isolated via `tenantId` scoping |
| Student Management | Single + bulk CSV upload, auto-created Appwrite auth accounts |
| Company Onboarding | Companies per tenant, auth accounts, status tracking |
| Drive Management | Eligibility criteria (CGPA, Backlogs, Department, Year), deadlines, vacancies |
| Application Tracking | Stage pipeline: applied → under_review → shortlisted → interview → selected/rejected |
| Announcements | TPO broadcasts visible to all students in the tenant |
| Placement Analytics | Department-wise stats, drive conversion rates, placement percentages |
| Audit Logging | Every CUD operation logged with user, action, resource, timestamp |
| Email Notifications | SMTP-based emails for onboarding, drive alerts, status updates |

---

## 2. Architecture

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Nginx Reverse Proxy (:80)                   │
├──────────┬──────────┬──────────┬──────────┬─────────────────────────┤
│ /admin/  │/college/ │/student/ │/company/ │ /api/                   │
│ :3001    │ :3002    │ :3003    │ :3004    │ :4000                   │
├──────────┴──────────┴──────────┴──────────┼─────────────────────────┤
│        4× Remix (React Router v7) Apps    │  Express.js REST API    │
│        Server-Side Rendered               │  JWT Auth + Zod         │
│        @careernest/ui components          │  10 Route groups        │
│        @careernest/lib API client         │  10 Services            │
└───────────────────────────────────────────┼─────────────────────────┤
                                            │   Appwrite (BaaS)       │
                                            │ ┌─────────────────────┐ │
                                            │ │ Auth (Email/Pass)   │ │
                                            │ │ Database (10 colls) │ │
                                            │ │ Teams               │ │
                                            │ │ Storage (Resumes)   │ │
                                            │ └─────────────────────┘ │
                                            └─────────────────────────┘
```

### Request Flow

```
Browser → Nginx (:80) → Remix App (SSR) ──loader──→ Express API (:4000) → Appwrite
                                         ←json──    ←response──          ←documents──
```

1. User visits `http://localhost/student/dashboard`
2. Nginx proxies to `web-student:3000/dashboard`
3. Remix `loader()` runs server-side, calls `api.drives.list(token)` 
4. Express API validates JWT, resolves tenant, queries Appwrite
5. Response flows back through the chain to render the page

---

## 3. Monorepo Structure

```
careernest/
│
├── apps/                          # Deployable applications
│   ├── server/                    # Express.js REST API
│   │   ├── Dockerfile
│   │   ├── src/
│   │   │   ├── index.ts           # App entry, middleware chain, route mounting
│   │   │   ├── config/
│   │   │   │   ├── appwrite.ts    # Appwrite SDK client init
│   │   │   │   ├── constants.ts   # Pagination limits, app constants
│   │   │   │   └── env.ts         # Environment variable config
│   │   │   ├── controllers/       # 10 controllers (request → response)
│   │   │   ├── services/          # 10 services (business logic → Appwrite)
│   │   │   ├── middleware/        # 7 middlewares (auth, tenant, role, rate-limit, audit, validate, permission)
│   │   │   ├── routes/            # 10 route files (endpoint registration)
│   │   │   ├── validators/        # 6 Zod schemas (request body validation)
│   │   │   ├── utils/             # Response helpers, pagination, errors, label-role mapping
│   │   │   ├── jobs/              # Background jobs (email, analytics)
│   │   │   └── types/             # Express request type extensions
│   │   └── package.json
│   │
│   ├── web-admin/                 # Super Admin Portal (:3001)
│   │   ├── Dockerfile
│   │   └── app/
│   │       ├── root.tsx
│   │       ├── routes/            # 19 route files
│   │       └── components/
│   │
│   ├── web-college/               # College TPO Portal (:3002)
│   │   ├── Dockerfile
│   │   └── app/
│   │       ├── root.tsx
│   │       ├── routes/            # 12 route files
│   │       └── components/
│   │
│   ├── web-student/               # Student Portal (:3003)
│   │   ├── Dockerfile
│   │   └── app/
│   │       ├── root.tsx
│   │       ├── routes/            # 10 route files
│   │       └── components/
│   │
│   └── web-company/               # Company Portal (:3004)
│       ├── Dockerfile
│       └── app/
│           ├── root.tsx
│           ├── routes/            # 7 route files
│           └── components/
│
├── packages/                      # Shared packages
│   ├── shared/                    # @careernest/shared
│   │   └── src/
│   │       ├── constants/         # roles, stages, statuses
│   │       └── types/             # TypeScript interfaces (5 files)
│   │
│   ├── lib/                       # @careernest/lib
│   │   └── src/
│   │       ├── api.ts             # API client (37+ endpoints)
│   │       ├── auth.server.ts     # Cookie session helpers (Remix)
│   │       └── index.ts
│   │
│   ├── ui/                        # @careernest/ui
│   │   └── src/
│   │       ├── Avatar.tsx         # Initials-based avatar
│   │       ├── Badge.tsx          # Status/label badge
│   │       ├── Button.tsx         # Button with variants
│   │       ├── Card.tsx           # Glassmorphism card
│   │       ├── EmptyState.tsx     # Empty state placeholder
│   │       ├── Header.tsx         # Top header bar
│   │       ├── Input.tsx          # Form input with label
│   │       ├── Modal.tsx          # Dialog overlay
│   │       ├── Pagination.tsx     # Page controls
│   │       ├── ProgressSteps.tsx  # Step indicator
│   │       ├── Sidebar.tsx        # Navigation sidebar
│   │       ├── Table.tsx          # Data table
│   │       ├── Tabs.tsx           # Tab switcher
│   │       └── Textarea.tsx       # Multiline input
│   │
│   └── config/                    # @careernest/config
│       └── typescript/
│           └── base.json          # Shared tsconfig
│
├── docker-compose.yml             # 6 service definitions
├── nginx.conf                     # Reverse proxy routing
├── package.json                   # Workspace root
├── MANUAL-SETUP.md                # Appwrite setup guide
└── PROJECT-DOCS.md                # This file
```

---

## 4. Tech Stack & Dependencies

### Backend (`apps/server`)

| Package | Version | Purpose |
|---|---|---|
| `express` | ^4.21.0 | HTTP framework |
| `node-appwrite` | ^13.0.0 | Appwrite Admin SDK |
| `jsonwebtoken` | ^9.0.2 | JWT signing/verification |
| `zod` | ^3.23.0 | Request body validation |
| `cors` | ^2.8.5 | Cross-origin requests |
| `helmet` | ^7.1.0 | Security headers |
| `express-rate-limit` | ^7.4.0 | Rate limiting |
| `nodemailer` | ^6.9.0 | SMTP email |
| `morgan` | ^1.10.0 | HTTP request logging |
| `dotenv` | ^16.4.0 | Environment variable loading |
| `tsx` | ^4.7.0 | TypeScript execution (dev) |

### Frontend (all 4 web apps)

| Package | Purpose |
|---|---|
| `@remix-run/node` + `@remix-run/react` | Remix framework (SSR) |
| `tailwindcss` | Utility-first CSS |
| `lucide-react` | Icon library |
| `@careernest/ui` | Shared component library |
| `@careernest/lib` | API client + auth helpers |
| `@careernest/shared` | Shared types & constants |

---

## 5. Environment Variables

All variables are configured in a single `.env` file at the project root.

### Required

| Variable | Description | Example |
|---|---|---|
| `APPWRITE_ENDPOINT` | Appwrite API endpoint | `https://cloud.appwrite.io/v1` |
| `APPWRITE_PROJECT_ID` | Appwrite project ID | `6612a...` |
| `APPWRITE_API_KEY` | Appwrite server API key | `standard_abc...` |
| `JWT_SECRET` | Secret for signing JWTs | `a-long-random-string` |

### Optional (with defaults)

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `4000` | API server port |
| `APP_URL` | `http://localhost:5173` | Frontend URL (CORS) |
| `APPWRITE_DATABASE_ID` | `careernest_db` | Database name |
| `COLLECTION_TENANTS` | `colleges` | Tenants/colleges collection |
| `COLLECTION_ADMINS` | `users` | Admin/TPO users collection |
| `COLLECTION_STUDENTS` | `students` | Students collection |
| `COLLECTION_COMPANIES` | `companies` | Companies collection |
| `COLLECTION_DRIVES` | `drives` | Drives collection |
| `COLLECTION_APPLICATIONS` | `applications` | Applications collection |
| `COLLECTION_COURSES` | `courses` | Courses collection |
| `COLLECTION_ANNOUNCEMENTS` | `announcements` | Announcements collection |
| `COLLECTION_PLACEMENT_RECORDS` | `placement_records` | Placement records collection |
| `COLLECTION_AUDIT_LOGS` | `audit_logs` | Audit log collection |
| `APPWRITE_BUCKET_RESUMES` | `resumes` | Resume storage bucket |
| `SMTP_HOST` | _(empty)_ | SMTP server host |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | _(empty)_ | SMTP username |
| `SMTP_PASS` | _(empty)_ | SMTP password |
| `SMTP_FROM` | `CareerNest <noreply@careernest.com>` | From address |
| `RATE_LIMIT_WINDOW_MS` | `900000` (15 min) | Rate limit window |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |

---

## 6. Database Schema

All data is stored in Appwrite's document database across **10 collections**.

### Collections Overview

```
careernest_db/
├── colleges          # Tenants (one per college)
├── users             # Admin/TPO/Assistant accounts
├── students          # Student records
├── companies         # Company records (per tenant)
├── drives            # Placement drives
├── applications      # Student applications to drives
├── courses           # Courses/departments
├── announcements     # TPO announcements
├── placement_records # Final placement outcomes
└── audit_logs        # Action audit trail
```

### Collection Schemas

#### `colleges` (Tenants)

| Field | Type | Description |
|---|---|---|
| `$id` | string | Auto-generated document ID |
| `collegeId` | string | Unique college identifier |
| `collegeName` | string | College name |
| `address` | string | Full address |
| `city` | string | City |
| `state` | string | State |
| `pincode` | string | PIN code |
| `phone` | string | Contact phone |
| `email` | string | Contact email |
| `website` | string | College website URL |
| `establishedYear` | number | Year of establishment |

#### `users` (Admins / TPOs)

| Field | Type | Description |
|---|---|---|
| `$id` | string | Document ID |
| `email` | string | User email |
| `name` | string | Full name |
| `role` | string | `tpo` / `tpo_assistant` |
| `department` | string | Department (optional) |
| `status` | string | `active` / `inactive` / `blocked` |
| `colleges` | relationship | Link to `colleges` collection (tenant) |

#### `students`

| Field | Type | Description |
|---|---|---|
| `$id` | string | Document ID |
| `userid` | string | Appwrite auth user ID |
| `name` | string | Student name |
| `email` | string | Student email |
| `department` | string | Department (e.g., CSE, ECE) |
| `enrollmentYear` | number | Year of enrollment/batch |
| `phoneNumber` | number | Phone number |
| `address` | string | Full address |
| `colleges` | relationship | Link to `colleges` collection (tenant) |

#### `companies`

| Field | Type | Description |
|---|---|---|
| `$id` | string | Document ID |
| `tenantId` | string | Tenant (college) ID |
| `name` | string | Company name |
| `contactEmail` | string | Company contact email |
| `contactPhone` | string | Contact phone |
| `contactPerson` | string | Contact person name |
| `status` | string | `active` / `inactive` |

#### `drives`

| Field | Type | Description |
|---|---|---|
| `$id` | string | Document ID |
| `companies` | relationship | Link to `companies` collection |
| `title` | string | Drive/job title |
| `jobLevel` | string | Job level (entry, mid, senior) |
| `jobType` | string | Full-time, internship, contract |
| `experience` | string | Experience required |
| `ctcPeriod` | string | CTC period (annual, monthly) |
| `location` | string | Job location |
| `vacancies` | number | Number of openings |
| `description` | string | Job description |
| `salary` | number | CTC/salary amount |
| `deadline` | string | Application deadline (ISO date) |
| `department` | string[] | Eligible departments (multi-select) |
| `studyingYear` | string | Eligible year (1st–5th, graduate) |
| `externalLink` | string | External application URL |
| `CGPA` | number | Minimum CGPA required |
| `Backlogs` | number | Maximum backlogs allowed |

#### `applications`

| Field | Type | Description |
|---|---|---|
| `$id` | string | Document ID |
| `tenantId` | string | Tenant ID |
| `driveId` | string | Reference to drive |
| `studentId` | string | Appwrite auth user ID of student |
| `stage` | string | Current stage (see pipeline below) |
| `appliedAt` | string | Application timestamp (ISO) |

#### `courses`

| Field | Type | Description |
|---|---|---|
| `$id` | string | Document ID |
| `tenantId` | string | Tenant ID |
| `name` | string | Course name |
| `department` | string | Department |

#### `announcements`

| Field | Type | Description |
|---|---|---|
| `$id` | string | Document ID |
| `tenantId` | string | Tenant ID |
| `title` | string | Announcement title |
| `body` | string | Announcement content |
| `createdBy` | string | User ID of the author |

#### `placement_records`

| Field | Type | Description |
|---|---|---|
| `$id` | string | Document ID |
| `tenantId` | string | Tenant ID |
| `studentId` | string | Student user ID |
| `driveId` | string | Drive ID |
| `companyId` | string | Company ID |
| `ctcOffered` | number | CTC offered |
| `placedAt` | string | Placement timestamp |

#### `audit_logs`

| Field | Type | Description |
|---|---|---|
| `$id` | string | Document ID |
| `tenantId` | string | Tenant ID |
| `userId` | string | User who performed the action |
| `action` | string | Action type (e.g., `DRIVE_CREATE`) |
| `resourceType` | string | Resource type (e.g., `drive`) |
| `resourceId` | string | Resource document ID |
| `metadata` | string | Additional JSON data (optional) |
| `timestamp` | string | Action timestamp |

### Relationships

```
colleges ←──── users.colleges         (TPOs belong to colleges)
colleges ←──── students.colleges      (Students belong to colleges)
companies ←─── drives.companies       (Drives are linked to companies)
companies ────→ tenantId → colleges   (Companies scoped by tenant)
drives ←────── applications.driveId   (Applications reference drives)
students ←──── applications.studentId (Applications reference students)
```

---

## 7. Authentication & Authorization

### Auth Flow

```
1. User submits email + password on login page
2. Remix action() POSTs to Express API: POST /api/v1/auth/login
3. Express uses Appwrite Admin SDK to verify credentials
4. Express reads Appwrite user labels to determine role
5. Express looks up tenantId from users/students collection
6. Express signs a JWT: { userId, email, name, role, tenantId }
7. JWT returned to Remix, stored in encrypted session cookie
8. All subsequent API calls include JWT in Authorization header
```

### JWT Payload

```json
{
  "userId": "6612a...",
  "email": "tpo@college.edu",
  "name": "Dr. Sharma",
  "role": "tpo",
  "tenantId": "abc123"
}
```

### Appwrite User Labels → Roles

Labels are set on Appwrite auth users and mapped to CareerNest roles:

| Appwrite Label | CareerNest Role | Description |
|---|---|---|
| `SuperAdmin` | `super_admin` | Platform super administrator |
| `TPO` | `tpo` | Training & Placement Officer |
| `TPOAssistant` | `tpo_assistant` | TPO assistant |
| `Student` | `student` | Student |
| `Company` | `company` | Company representative |

Label matching is **case-insensitive**. Priority order: SuperAdmin > TPO > TPOAssistant > Student > Company.

### Middleware Chain

Every API request passes through this middleware pipeline:

```
Request → authMiddleware → tenantMiddleware → requireTenantMatch → [roleGuard] → [validate] → [auditLog] → controller
```

| Middleware | Purpose |
|---|---|
| `authMiddleware` | Verifies JWT, attaches `req.user` |
| `tenantMiddleware` | Resolves `req.tenantId` from JWT (super admin can target via query param) |
| `requireTenantMatch` | Ensures non-super-admin users have a valid tenantId |
| `requireTPO` / `requireStudent` / etc. | Role-based access guards |
| `validate(zodSchema)` | Validates request body against Zod schema |
| `auditLog(action, resource)` | Logs the action to audit_logs collection |

---

## 8. API Reference

Base URL: `http://localhost:4000/api/v1`

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/login` | None (rate-limited) | Login with email + password → returns JWT + user |
| `POST` | `/auth/logout` | JWT | Logout (invalidate session) |
| `GET` | `/auth/me` | JWT | Get current user info |

### Tenants (Colleges)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/tenants` | Super Admin | Create new tenant (college) |
| `GET` | `/tenants` | Super Admin | List all tenants |
| `GET` | `/tenants/:id` | TPO (own tenant) | Get tenant details |
| `PATCH` | `/tenants/:id` | Super Admin | Update tenant |
| `GET` | `/tenants/:id/team` | TPO (own tenant) | Get tenant team members |

### Companies

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/companies` | TPO | Create company (+ auth account) |
| `GET` | `/companies` | TPO | List tenant's companies |
| `GET` | `/companies/:id` | TPO / Company | Get company details |
| `PATCH` | `/companies/:id` | TPO | Update company |

### Drives

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/drives` | TPO / Company | Create placement drive |
| `GET` | `/drives` | Authenticated | List drives (tenant-scoped) |
| `GET` | `/drives/:id` | Authenticated | Get drive details |
| `PATCH` | `/drives/:id` | TPO / Company | Update drive |

### Applications

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/applications` | Student | Apply to a drive |
| `GET` | `/applications` | Authenticated | List applications (students see own, TPO sees all) |
| `PATCH` | `/applications/:id/stage` | TPO / Company | Update application stage |

### Students

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/students` | TPO / Assistant | Create single student |
| `POST` | `/students/bulk` | TPO / Assistant | Bulk create from array/CSV |
| `GET` | `/students/me` | Student | Get own profile |
| `GET` | `/students` | TPO / Assistant | List all tenant students |
| `GET` | `/students/:id` | Self access | Get student by ID |
| `PATCH` | `/students/:id` | Student (self) | Update own profile |

### Courses

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/courses` | TPO | Create course/department |
| `GET` | `/courses` | Authenticated | List courses |
| `DELETE` | `/courses/:id` | TPO | Delete course |

### Announcements

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/announcements` | TPO | Create announcement |
| `GET` | `/announcements` | SA/TPO/Asst/Student | List announcements |
| `DELETE` | `/announcements/:id` | TPO | Delete announcement |

### Analytics

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/analytics/placement` | TPO | Get placement analytics |

### Admin (Super Admin Only)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/stats` | Platform-wide statistics |
| `GET` | `/admin/stats/tenants` | Per-tenant statistics |
| `GET` | `/admin/users` | List all users |
| `GET` | `/admin/users/:id` | Get user by ID |
| `POST` | `/admin/users` | Create user (any role) |
| `PATCH` | `/admin/users/:id/status` | Update user status |
| `GET` | `/admin/companies` | List all companies |
| `PATCH` | `/admin/companies/:id/status` | Update company status |
| `GET` | `/admin/drives` | List all drives |
| `GET` | `/admin/audit-logs` | List audit logs |
| `GET` | `/admin/placements` | List placement records |

---

## 9. Backend — Server Architecture

### Layer Architecture

```
Routes → Controllers → Services → Appwrite SDK → Appwrite DB
  │           │             │
  │           │             └── Business logic, queries, in-memory filtering
  │           └── Request parsing, response formatting
  └── Endpoint registration, middleware chaining
```

### Server Files

#### Controllers (10)
| File | Manages |
|---|---|
| `auth.controller.ts` | Login, logout, me |
| `tenant.controller.ts` | Tenant CRUD |
| `company.controller.ts` | Company CRUD |
| `drive.controller.ts` | Drive CRUD + listing |
| `application.controller.ts` | Application create, list, stage update |
| `student.controller.ts` | Student CRUD, bulk create, getMyProfile |
| `course.controller.ts` | Course CRUD |
| `announcement.controller.ts` | Announcement CRUD |
| `analytics.controller.ts` | Placement analytics |
| `admin.controller.ts` | Super admin operations |

#### Services (10)
| File | Key Logic |
|---|---|
| `auth.service.ts` | Appwrite auth verify, label → role mapping, JWT signing, tenantId resolution |
| `tenant.service.ts` | College CRUD via Appwrite DB |
| `company.service.ts` | Company CRUD + Appwrite auth user creation |
| `drive.service.ts` | Drive CRUD, in-memory tenant filtering via company→tenant link |
| `application.service.ts` | Apply (with eligibility check), list, stage transitions, auto-create placement record on selection |
| `student.service.ts` | Student CRUD + Appwrite auth user + global "Students" team membership |
| `email.service.ts` | SMTP email sending via Nodemailer |
| `scoring.service.ts` | Eligibility enforcement (CGPA, backlogs, department check), stage transition validation |
| `analytics.service.ts` | Placement percentage, department stats, drive conversion rates |
| `admin.service.ts` | Cross-tenant stats, user management, global queries |

#### Middleware (7)
| File | Purpose |
|---|---|
| `auth.middleware.ts` | JWT verification, attaches `req.user` |
| `tenant.middleware.ts` | Resolves `req.tenantId` from JWT; super admin can specify `?targetTenantId=` |
| `permission.middleware.ts` | `requireTenantMatch` — blocks non-super-admin without tenantId |
| `role.middleware.ts` | `requireTPO`, `requireStudent`, `requireTPOOrCompany`, `requireAuthenticated`, etc. |
| `validate.middleware.ts` | Zod schema validation on `req.body` |
| `audit.middleware.ts` | Logs CUD actions to `audit_logs` collection |
| `rateLimit.middleware.ts` | Express rate limiter (100 req / 15 min default) |

#### Validators (6 Zod Schemas)
| File | Validates |
|---|---|
| `auth.schema.ts` | Login body (email, password) |
| `tenant.schema.ts` | Create/update tenant |
| `company.schema.ts` | Create/update company |
| `drive.schema.ts` | Create/update drive |
| `student.schema.ts` | Create/bulk student |
| `application.schema.ts` | Create application, update stage |

---

## 10. Frontend — Portal Architecture

All 4 frontends use the same pattern:

- **Remix (React Router v7)** for SSR
- **`loader()` functions** fetch data server-side via `api.*` calls with JWT
- **`action()` functions** handle form submissions (create, update, delete)
- **`@careernest/ui`** shared components for consistent design
- **Cookie session** stores JWT token + user info

### Admin Portal (`:3001`) — 19 Routes

| Route | Page |
|---|---|
| `login.tsx` | Admin login |
| `dashboard._index.tsx` | Dashboard with platform stats |
| `dashboard.tenants._index.tsx` | List/create tenants |
| `dashboard.tenants.$id.tsx` | Tenant detail view |
| `dashboard.companies.tsx` | All companies across tenants |
| `dashboard.drives.tsx` | All drives across tenants |
| `dashboard.users.tsx` | User management |
| `dashboard.analytics.tsx` | Platform analytics |
| `dashboard.announcements.tsx` | Announcements management |
| `dashboard.audit-logs.tsx` | Audit log viewer |
| `dashboard.reports.tsx` | Reports |
| `dashboard.security.tsx` | Security settings |
| `dashboard.settings.tsx` | Platform settings |
| `dashboard.subscriptions.tsx` | Subscription management |

### College Portal (`:3002`) — 12 Routes

| Route | Page |
|---|---|
| `login.tsx` | TPO login |
| `_app.dashboard.tsx` | Dashboard with college stats |
| `_app.students.tsx` | Student management (add single/bulk, list, search) |
| `_app.companies.tsx` | Company management (add, list) |
| `_app.drives.tsx` | Drive management (create, list, edit) |
| `_app.courses.tsx` | Course/department management |
| `_app.announcements.tsx` | Create/manage announcements |
| `_app.analytics.tsx` | Placement analytics |
| `_app.settings.tsx` | College settings |

### Student Portal (`:3003`) — 10 Routes

| Route | Page |
|---|---|
| `login.tsx` | Student login |
| `_app.dashboard.tsx` | Dashboard (recent drives, announcements, profile summary) |
| `_app.drives.tsx` | Browse placement drives (search, filter by department) |
| `_app.applications.tsx` | Track application status with progress steps |
| `_app.announcements.tsx` | View placement cell announcements |
| `_app.profile.tsx` | View student profile (name, dept, contact, college) |
| `_app.settings.tsx` | Account settings (email, password, notifications, privacy) |

### Company Portal (`:3004`) — 7 Routes

| Route | Page |
|---|---|
| `login.tsx` | Company login |
| `dashboard._index.tsx` | Dashboard |
| `drives.tsx` | View assigned drives |
| `settings.tsx` | Company settings |

---

## 11. Shared Packages

### `@careernest/shared`

**Constants:**

```typescript
// Roles
ROLES = { SUPER_ADMIN, TPO, TPO_ASSISTANT, STUDENT, COMPANY }

// Application Stages
APPLICATION_STAGES = { APPLIED, UNDER_REVIEW, SHORTLISTED, INTERVIEW_SCHEDULED, SELECTED, REJECTED }

// Statuses
TenantStatus  = 'active' | 'inactive' | 'suspended'
UserStatus    = 'active' | 'inactive' | 'blocked'
CompanyStatus = 'active' | 'inactive'
DriveStatus   = 'draft' | 'active' | 'closed'
```

**Types:** `Tenant`, `User`, `Student`, `Company`, `Drive`, `Application`, `Course`, `Announcement`, `PlacementRecord`, `AuditLog`, `ApiResponse<T>`, `PaginatedResponse<T>`, `EligibilityCheckResult`, `PlacementAnalytics` (+ Create/Update input types for each)

### `@careernest/lib`

**`api.ts`** — HTTP client wrapping `fetch()`:
```typescript
api.auth.login(email, password)
api.drives.list(token, params?)
api.students.getMyProfile(token)
api.applications.list(token, params?)
api.announcements.list(token, params?)
// ... 37+ methods total
```

**`auth.server.ts`** — Remix session helpers:
```typescript
createUserSession(request, token, user, redirectTo)
requireUserSession(request)  // → { token, user } or redirect to /login
getUserSession(request)
logout(request)
```

### `@careernest/ui`

14 reusable components with consistent glassmorphism styling:

| Component | Props | Description |
|---|---|---|
| `Avatar` | `name`, `size`, `src?` | Initials-based avatar with gradient |
| `Badge` | `variant`, `children` | Colored label/status badge |
| `Button` | `variant`, `size`, `disabled` | Primary, outline, ghost, danger variants |
| `Card` | `hover?`, `className?` | Glassmorphism card container |
| `EmptyState` | `icon`, `title`, `description` | Placeholder for empty data |
| `Header` | `user`, `onLogout` | Top navigation bar |
| `Input` | `name`, `label`, `type`, `icon?` | Form input with label |
| `Modal` | `isOpen`, `onClose`, `title`, `size` | Dialog overlay |
| `Pagination` | `page`, `total`, `limit`, `onChange` | Page controls |
| `ProgressSteps` | `steps`, `currentStep` | Step progress indicator |
| `Sidebar` | `links`, `activeLink` | Navigation sidebar |
| `Table` | `columns`, `data`, `onRowClick?` | Sortable data table |
| `Tabs` | `tabs`, `activeTab`, `onChange` | Tab switcher with counts |
| `Textarea` | `name`, `label`, `rows?` | Multiline text input |

---

## 12. Multi-Tenancy Design

### How It Works

1. **Tenant = College** — Each college registered in the `colleges` collection is a tenant
2. **TenantId Scoping** — Most collections have a `tenantId` field. All queries filter by it.
3. **Relationship-Based** — `users` and `students` use Appwrite relationship fields (`colleges`) to link to their tenant
4. **Drive Scoping** — Drives don't have a direct `tenantId`; they're scoped via their linked company's `tenantId` (in-memory filtering)
5. **JWT-Based** — `tenantId` is embedded in the JWT during login and extracted by `tenantMiddleware`

### Tenant Resolution by Role

| Role | How tenantId is Found |
|---|---|
| **Super Admin** | No tenantId (global access). Can target via `?targetTenantId=` |
| **TPO / TPO Assistant** | From `users` collection: user doc → `colleges` relationship → `$id` |
| **Student** | From `students` collection: student doc → `colleges` relationship → `$id` |
| **Company** | From `companies` collection: company doc → `tenantId` field |

### Data Isolation

```
College A (tenant: abc123)              College B (tenant: xyz789)
├── TPO users with colleges=[abc123]    ├── TPO users with colleges=[xyz789]
├── Students with colleges=[abc123]     ├── Students with colleges=[xyz789]
├── Companies with tenantId=abc123      ├── Companies with tenantId=xyz789
├── Drives linked to abc123 companies   ├── Drives linked to xyz789 companies
├── Applications with tenantId=abc123   ├── Applications with tenantId=xyz789
└── Announcements with tenantId=abc123  └── Announcements with tenantId=xyz789
```

---

## 13. Application Stage Pipeline

```
   ┌──────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────────────┐    ┌──────────┐
   │ Applied  │───→│ Under Review │───→│ Shortlisted │───→│ Interview Scheduled │───→│ Selected │
   └──────────┘    └──────────────┘    └─────────────┘    └─────────────────────┘    └──────────┘
        │                │                    │                     │
        └────────────────┴────────────────────┴─────────────────────┘
                                    │
                              ┌──────────┐
                              │ Rejected │
                              └──────────┘
```

### Valid Stage Transitions

| Current Stage | Can Transition To |
|---|---|
| `applied` | `under_review`, `rejected` |
| `under_review` | `shortlisted`, `rejected` |
| `shortlisted` | `interview_scheduled`, `rejected` |
| `interview_scheduled` | `selected`, `rejected` |
| `selected` | _(final state)_ |
| `rejected` | _(final state)_ |

### Auto-Actions

- When stage moves to `selected` → a `placement_record` is automatically created
- Eligibility is checked at application time (CGPA, backlogs, department)

---

## 14. Deployment

### Docker Compose (Recommended)

```bash
# Build and start all 6 containers
docker compose up --build -d

# View logs
docker compose logs -f

# Rebuild specific service
docker compose up --build server web-student -d

# Stop everything
docker compose down
```

### Container Map

| Service | Container | Internal Port | External Port | URL Path |
|---|---|---|---|---|
| `server` | `careernest-server` | 4000 | 4000 | `/api/` |
| `web-admin` | `careernest-admin` | 3000 | 3001 | `/admin/` |
| `web-college` | `careernest-college` | 3000 | 3002 | `/college/` |
| `web-student` | `careernest-student` | 3000 | 3003 | `/student/` |
| `web-company` | `careernest-company` | 3000 | 3004 | `/company/` |
| `nginx` | `careernest-nginx` | 80 | 80 | `/` (proxy) |

### Nginx Routing

```
http://localhost/          → 302 redirect to /student/
http://localhost/admin/    → web-admin:3000
http://localhost/college/  → web-college:3000
http://localhost/student/  → web-student:3000
http://localhost/company/  → web-company:3000
http://localhost/api/      → server:4000
```

### Health Check

```bash
curl http://localhost:4000/api/v1/health
# → { "status": "ok", "timestamp": "..." }
```

---

## 15. User Roles & Permissions

### Role Hierarchy (low → high)

```
Student → Company → TPO Assistant → TPO → Super Admin
```

### Permission Matrix

| Action | Super Admin | TPO | TPO Assistant | Student | Company |
|---|---|---|---|---|---|
| Manage tenants | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage all users | ✅ | ❌ | ❌ | ❌ | ❌ |
| View all tenants' data | ✅ | ❌ | ❌ | ❌ | ❌ |
| Add students | ❌ | ✅ | ✅ | ❌ | ❌ |
| Add companies | ❌ | ✅ | ❌ | ❌ | ❌ |
| Create drives | ❌ | ✅ | ❌ | ❌ | ✅ |
| Update drive | ❌ | ✅ | ❌ | ❌ | ✅ |
| Apply to drives | ❌ | ❌ | ❌ | ✅ | ❌ |
| Update app stage | ❌ | ✅ | ❌ | ❌ | ✅ |
| Create announcements | ❌ | ✅ | ❌ | ❌ | ❌ |
| View announcements | ✅ | ✅ | ✅ | ✅ | ❌ |
| View analytics | ✅ | ✅ | ❌ | ❌ | ❌ |
| View audit logs | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 16. Data Flow Examples

### Creating a New Student (TPO → Student Account)

```
1. TPO fills "Add Student" form on College Portal
2. Remix action() calls POST /api/v1/students
3. Express: authMiddleware → tenantMiddleware → requireTenantMatch → requireTPOOrAssistant → validate → controller
4. student.service.ts:
   a. Creates Appwrite auth user (email + password)
   b. Assigns 'Student' label to auth user
   c. Finds/creates global "Students" team
   d. Adds student to "Students" team
   e. Creates student document in students collection with colleges=[tenantId]
5. Returns created student → shown in student list
```

### Student Applying to a Drive

```
1. Student clicks "Apply" on a drive in Student Portal
2. Remix action() calls POST /api/v1/applications { driveId }
3. Express middleware chain validates JWT + tenant
4. application.service.ts:
   a. Fetches drive document
   b. Fetches student document
   c. scoring.service.ts checks eligibility (CGPA ≥ drive.CGPA, backlogs ≤ drive.Backlogs, department match)
   d. If eligible → creates application document { stage: 'applied', appliedAt: now() }
   e. If not eligible → throws error with reason
5. Application appears in student's applications list with progress tracker
```

### Application Stage Update (TPO advances an application)

```
1. TPO selects application → changes stage to "shortlisted"
2. PATCH /api/v1/applications/:id/stage { stage: 'shortlisted' }
3. application.service.ts:
   a. Validates stage transition (under_review → shortlisted ✅)
   b. Updates application document
   c. If stage = 'selected' → auto-creates placement_record
4. Audit log entry created by audit middleware
```

---

_Last updated: March 2026_
