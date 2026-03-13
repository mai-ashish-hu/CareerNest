# CareerNest Project Info (Detailed)

This document captures everything currently implemented and present in the `CareerNest` repository as of **2026-03-13**, based on source code, project docs, and configuration files.

## 1. Project Identity

- Project name: `CareerNest`
- Product type: Multi-tenant SaaS platform for college Training and Placement (T&P) management
- Core objective: Handle the complete campus hiring lifecycle across colleges, students, companies, and admins
- Repository style: npm workspaces monorepo

## 2. High-Level Architecture Implemented

CareerNest is implemented as a multi-app monorepo with:

- 1 shared backend API: `apps/server` (Express + TypeScript)
- 4 role-based web portals (Remix + React + TypeScript):
- `apps/web-admin` (Super Admin)
- `apps/web-college` (College/TPO)
- `apps/web-student` (Student)
- `apps/web-company` (Company)
- 3 shared packages:
- `packages/shared` (types/constants)
- `packages/lib` (API client + server auth helpers)
- `packages/ui` (reusable UI components)

### Runtime topology

- API service on port `4000`
- Web apps served individually on `3001/3002/3003/3004`
- Nginx reverse proxy on `80`
- URL path-based routing in Nginx:
- `/admin/` -> `web-admin`
- `/college/` -> `web-college`
- `/student/` -> `web-student`
- `/company/` -> `web-company`
- `/api/` -> `server`

## 3. Technology Stack Actually Used

### Languages and core formats used in codebase

- TypeScript (`.ts`)
- TypeScript React (`.tsx`)
- CSS (`.css`)
- JSON (`.json`)
- MJS (`.mjs`) for PostCSS configs

### File type counts (apps + packages, excluding build/dist/node_modules)

- `.ts`: 96 files
- `.tsx`: 84 files
- `.css`: 5 files
- `.json`: 17 files
- `.mjs`: 4 files

### Code footprint snapshot

- Total lines across selected source/config types: `22560`
- `apps/server`: `6367` lines
- `apps/web-admin`: `5389` lines
- `apps/web-college`: `2628` lines
- `apps/web-student`: `5177` lines
- `apps/web-company`: `1457` lines
- `packages/shared`: `610` lines
- `packages/lib`: `219` lines
- `packages/ui`: `693` lines

## 4. Backend (apps/server) - What is implemented

### Framework and dependencies in use

- Express 4
- Appwrite Node SDK
- JWT (`jsonwebtoken`)
- Validation with Zod
- Security middleware: Helmet, CORS
- Rate limiting: `express-rate-limit`
- Logging: Morgan
- Email: Nodemailer
- Image handling: Sharp
- Env loading: Dotenv

### Server architecture layers present

- `src/config`: appwrite/env/constants
- `src/middleware`: auth/role/tenant/permission/validation/audit/rate-limit
- `src/validators`: Zod schemas for auth/tenant/student/company/drive/application
- `src/controllers`: request handling
- `src/services`: business logic + Appwrite interaction
- `src/routes`: API route registration
- `src/utils`: response/errors/pagination/label-role mapping
- `src/jobs`: queue/email/analytics jobs
- `src/types`: Express request type extensions

### Backend route modules present

- `auth.routes.ts`
- `tenant.routes.ts`
- `company.routes.ts`
- `student.routes.ts`
- `drive.routes.ts`
- `application.routes.ts`
- `course.routes.ts`
- `announcement.routes.ts`
- `analytics.routes.ts`
- `admin.routes.ts`
- `campus-chat.routes.ts`

### Backend controllers present

- `auth.controller.ts`
- `tenant.controller.ts`
- `company.controller.ts`
- `student.controller.ts`
- `drive.controller.ts`
- `application.controller.ts`
- `course.controller.ts`
- `announcement.controller.ts`
- `analytics.controller.ts`
- `admin.controller.ts`
- `campus-chat.controller.ts`

### Backend services present

- `auth.service.ts`
- `tenant.service.ts`
- `company.service.ts`
- `student.service.ts`
- `student-profile.service.ts`
- `drive.service.ts`
- `application.service.ts`
- `analytics.service.ts`
- `admin.service.ts`
- `campus-chat.service.ts`
- `email.service.ts`
- `scoring.service.ts`

## 5. Frontend Portals - What is implemented

All 4 portals are Remix-based SSR apps, with route-level separation.

### Admin portal (`apps/web-admin`)

- 21 route files currently present
- Includes: login/logout, tenant management, users, companies, drives, analytics, audit logs, reports, settings, security, subscriptions, announcements
- Dynamic tenant routes are present (`dashboard.tenants.$id...`)

### College portal (`apps/web-college`)

- 13 route files currently present
- Includes: login/logout, dashboard, students, companies, drives, courses, announcements, analytics, settings
- Uses authenticated `_app` route layout structure

### Student portal (`apps/web-student`)

- 15 route files currently present
- Includes: login/logout, dashboard, drives, drive detail, applications, profile, settings, announcements, network, individual student profile, chat
- Uses authenticated `_app` route layout structure

### Company portal (`apps/web-company`)

- 8 route files currently present
- Includes: login/logout, dashboard, drives, settings
- Uses authenticated `_app` route layout structure
- Placeholder pages have been replaced by data-backed routes

## 6. Shared Packages - What is implemented

### `packages/shared`

- Shared constants modules:
- `roles.ts`
- `stages.ts`
- `status.ts`
- Shared types modules:
- `user.types.ts`
- `tenant.types.ts`
- `drive.types.ts`
- `application.types.ts`
- `student-profile.types.ts`
- `common.types.ts`

### `packages/lib`

- `api.ts`: cross-app API client wrappers
- `auth.server.ts`: server-side session/auth helpers
- `index.ts`: shared exports

### `packages/ui`

Reusable component library currently includes:

- `Avatar`
- `Badge`
- `Button`
- `Card`
- `EmptyState`
- `Header`
- `Input`
- `Modal`
- `Pagination`
- `ProgressSteps`
- `Sidebar`
- `Table`
- `Tabs`
- `utils.ts`

## 7. Feature Scope Delivered So Far (from docs + code)

### Multi-tenant platform capabilities

- Tenant-based college isolation model is implemented
- Tenant-scoped API patterns are implemented in middleware/services
- Role-aware access model is present (Super Admin, TPO, TPO Assistant, Student, Company)

### Student lifecycle

- Student onboarding and management routes/services implemented
- Application flow implemented (apply + stage progression)
- Student-facing dashboards, profile, settings, network, and chat routes implemented

### Company lifecycle

- Company onboarding and management routes/services implemented
- Company dashboard/drives/settings are data-backed
- Company scoping and ownership restrictions have been tightened

### Drive and application lifecycle

- Drive creation/list/update modules are implemented
- Eligibility-driven drive model is documented and used
- Application stage pipeline exists in shared constants + backend logic:
- `applied`
- `under_review`
- `shortlisted`
- `interview_scheduled`
- `selected`
- `rejected`

### Course, announcement, analytics, admin

- Course management modules exist
- Announcement modules exist for tenant broadcasting
- Analytics service/controller/route modules exist
- Admin routes for global supervision are present
- Audit logging infrastructure exists in middleware + DB model docs

### Student network and campus chat expansion

- Dedicated backend modules for campus chat exist
- Student profile normalization work is documented with separate profile sub-collections
- Data model planning includes relationships + scalar IDs for compatibility

## 8. Company Module Hardening Done (Documented Change Log)

The following changes are explicitly documented and reflected in structure:

- Company portal rewritten from placeholders to authenticated, real-data pages
- Company login/session context fixed to include `companyId`
- Backend request typing expanded to carry `companyId`
- Company endpoints restricted to company-owned context
- Company drive list/create restricted to logged-in company
- Company application operations validate drive ownership
- Company document persistence now includes `tenantId` and `status`

## 9. Database and Appwrite Setup Status (as designed)

### Core collection model documented and used

- `colleges`
- `users`
- `students`
- `companies`
- `drives`
- `applications`
- `courses`
- `announcements`
- `placement_records`
- `audit_logs`

### Additional student network/chat collections documented

- `student_profiles`
- `student_profile_skills`
- `student_profile_achievements`
- `student_profile_education`
- `student_profile_experience`
- `student_profile_projects`
- `campus_chat_channels`
- `campus_chat_messages`

### DB operational guidance already documented

- Strict field-name casing requirements
- Required indexes for queryability
- Backfill strategy for old records (`drives.status`, company `tenantId`/`status`, etc.)
- Relationship plus scalar-ID hybrid approach for Appwrite compatibility

## 10. Environment and Configuration Implemented

### Root `.env` is structured for

- App runtime (`NODE_ENV`, `PORT`, `APP_URL`)
- Appwrite endpoint/project/API key/database
- Collection IDs for all key modules
- Storage bucket IDs
- SMTP/email settings
- Rate limit settings
- JWT secret

### Containerization and operations

- `docker-compose.yml` orchestrates:
- server
- web-admin
- web-college
- web-student
- web-company
- nginx
- Nginx path proxying configured in `nginx.conf`
- Healthcheck configured for server API

## 11. Build/Run/Typecheck Tooling

### Workspace-level scripts

- `dev:server`
- `dev:admin`
- `dev:college`
- `dev:student`
- `dev:company`
- `build`
- `type-check`
- `clean`

### App-level scripts

- Backend: `dev`, `build`, `start`, `type-check`, `lint`
- Each web app: `dev`, `build`, `start`, `type-check`

## 12. Engineering Documentation Present in Repository

The repository contains comprehensive technical and planning docs, including:

- `README.md`
- `PROJECT-DOCS.md`
- `DATABASE-SETUP.md`
- `PROJECT_CHANGES_AND_DB_ACTIONS.md`
- `STUDENT_NETWORK_AND_CHAT_DB_ACTIONS.md`
- Detailed product/system docs under `project details files/`:
- product requirements
- user stories/acceptance criteria
- information architecture
- system architecture
- database schema
- API contracts
- monorepo structure
- scoring engine spec
- engineering scope
- development phases
- environment/devops
- testing strategy

## 13. What This Means in Practical Terms

CareerNest is no longer just scaffolded. It currently has:

- Full monorepo architecture in place
- Multi-portal frontend implementation with role-focused routing
- Shared backend API with modular service/controller design
- Shared type/library/UI packages to reduce duplication
- Appwrite-based data/auth/storage integration model
- Docker + Nginx deployment topology
- Ongoing hardening and DB migration guidance documented

In short, this is an actively implemented multi-tenant placement platform codebase with production-oriented structure, not a basic starter template.

## 14. Accuracy Note

This file reflects the **current repository state and documented change logs**. It is the most complete practical summary available from code + docs in this workspace.

## 15. Git Milestones (Current Repository)

Recent commit history currently shows:

- `eaa6bb6`: Initial commit: CareerNest project
- `27a2706`: Project sync: student apply flow and full workspace updates

This indicates the repository has progressed from initial platform setup to a broader synchronized implementation pass covering student application flow and related workspace updates.
