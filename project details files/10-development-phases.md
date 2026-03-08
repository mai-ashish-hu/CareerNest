# 10 – Development Phases

## Project: CareerNest – TP Cell Management Platform

---

## Phase Overview

| Phase | Name | Duration (Est.) | Focus |
|-------|------|-----------------|-------|
| Phase 0 | Project Setup | 1 week | Monorepo, tooling, CI/CD, Appwrite setup |
| Phase 1 | Core Backend | 3 weeks | Auth, tenants, RBAC, middleware pipeline |
| Phase 2 | Drive & Application | 3 weeks | Companies, drives, applications, eligibility |
| Phase 3 | Frontend Portals | 4 weeks | All 4 portals (Admin, TPO, Student, Company) |
| Phase 4 | Analytics & Polish | 2 weeks | Dashboard analytics, announcements, audit UI |
| Phase 5 | Testing & Hardening | 2 weeks | Integration tests, load tests, security review |
| Phase 6 | Deployment & Launch | 1 week | Production deploy, monitoring, documentation |

**Total Estimated Duration: ~16 weeks**

---

## Phase 0: Project Setup (Week 1)

### Goals
- Monorepo initialized with proper structure
- All tooling configured and running
- Appwrite Cloud Pro provisioned

### Deliverables
- [ ] Initialize monorepo (Turborepo or npm workspaces)
- [ ] Setup `apps/web` (Remix.js + Tailwind CSS)
- [ ] Setup `apps/server` (Express.js + TypeScript)
- [ ] Setup `packages/shared` (types, constants, enums)
- [ ] Configure ESLint, Prettier, TypeScript across workspace
- [ ] Provision Appwrite Cloud Pro project
- [ ] Create Appwrite collections (all 10 collections)
- [ ] Setup Appwrite Auth with email/password provider
- [ ] Configure environment variables (`.env.example`)
- [ ] Setup GitHub Actions CI pipeline (lint, type-check, test)
- [ ] Write `README.md` with setup instructions

---

## Phase 1: Core Backend (Weeks 2–4)

### Goals
- Authentication flow working end-to-end
- Multi-tenant middleware fully operational
- RBAC enforced on all routes

### Deliverables
- [ ] Implement auth routes (login, logout)
- [ ] Build middleware stack:
  - [ ] Auth verification middleware
  - [ ] Tenant resolution middleware (subdomain + token)
  - [ ] Role enforcement middleware
  - [ ] Permission check middleware
  - [ ] Audit logging middleware
  - [ ] Zod validation middleware
- [ ] Implement tenant CRUD (Super Admin only)
- [ ] Implement user management routes
- [ ] Setup background job queue
- [ ] Implement email notification service (basic)
- [ ] Write unit tests for middleware and auth

---

## Phase 2: Drive & Application (Weeks 5–7)

### Goals
- Full drive lifecycle working
- Application workflow with stage management
- Eligibility engine operational

### Deliverables
- [ ] Implement company CRUD routes
- [ ] Implement drive CRUD routes with eligibility rules
- [ ] Build eligibility scoring engine (`scoring.service.ts`)
- [ ] Implement application routes (create, list, update stage)
- [ ] Implement stage transition validation (state machine)
- [ ] Implement student profile CRUD with resume upload
- [ ] Implement course management routes
- [ ] Write integration tests for drive and application flows

---

## Phase 3: Frontend Portals (Weeks 8–11)

### Goals
- All 4 portals functional with role-based routing
- Connected to backend APIs

### Deliverables

#### Week 8 – Foundation & Auth UI
- [ ] Setup Remix.js routing structure (all portal layouts)
- [ ] Build shared UI component library (Button, Card, Table, Modal, Input, Badge)
- [ ] Build layout components (Sidebar, Header, Footer)
- [ ] Implement login page
- [ ] Implement role-based redirect after login

#### Week 9 – Super Admin & TPO Portal
- [ ] Super Admin dashboard (tenant list, create tenant)
- [ ] TPO dashboard (overview stats)
- [ ] Company management pages (list, create, detail)
- [ ] Drive management pages (list, create, detail, applications)

#### Week 10 – Student & Company Portal
- [ ] Student dashboard (applications overview, announcements)
- [ ] Student profile page (edit, resume upload)
- [ ] Student drive browsing (eligible drives, apply)
- [ ] Student application tracking
- [ ] Company dashboard (active drives)
- [ ] Company drive detail with application review

#### Week 11 – Polish & Integration
- [ ] Announcement management (TPO) and display (Student)
- [ ] Error boundaries and loading states
- [ ] Responsive design verification
- [ ] API integration testing (all portals)

---

## Phase 4: Analytics & Polish (Weeks 12–13)

### Goals
- Placement analytics dashboard live
- Audit log viewer for TPO
- UI polish and UX improvements

### Deliverables
- [ ] Implement analytics API endpoints
- [ ] Build analytics dashboard (placement %, dept stats, conversion)
- [ ] Audit log viewer for TPO portal
- [ ] Notification improvements (stage change emails)
- [ ] UI polish: loading states, empty states, error messages
- [ ] Pagination across all list views
- [ ] Rate limiting on sensitive endpoints

---

## Phase 5: Testing & Hardening (Weeks 14–15)

### Goals
- Comprehensive test coverage
- Security verified
- Performance validated

### Deliverables
- [ ] Unit tests for all services and middleware (> 80% coverage)
- [ ] Integration tests for critical flows:
  - [ ] Tenant isolation verification
  - [ ] Cross-tenant access prevention
  - [ ] Application stage transitions
  - [ ] Eligibility enforcement
- [ ] Load testing: 500 concurrent users per tenant
- [ ] Stress test: 5,000 applications/hour simulation
- [ ] Security review:
  - [ ] HTTPS enforcement
  - [ ] Token validation
  - [ ] Resume encryption verification
  - [ ] RBAC edge cases
- [ ] Performance profiling: all core APIs < 2s response

---

## Phase 6: Deployment & Launch (Week 16)

### Goals
- Production environment live
- Monitoring and alerting configured
- Documentation complete

### Deliverables
- [ ] Deploy Express.js server to managed hosting
- [ ] Configure production Appwrite database and storage
- [ ] Setup domain and SSL certificates
- [ ] Configure subdomain routing for tenants
- [ ] Setup monitoring and alerting (uptime, error rates)
- [ ] Create first tenant (pilot college)
- [ ] Final documentation update
- [ ] Launch checklist verified

---

## Milestone Summary

| Milestone | Completion | Key Evidence |
|-----------|------------|-------------|
| M1: Backend Core | End of Week 4 | Auth + tenancy + RBAC working |
| M2: Drive Lifecycle | End of Week 7 | Full drive-to-application flow |
| M3: All Portals Live | End of Week 11 | All 4 portals functional |
| M4: Production Ready | End of Week 15 | Tests passing, load test green |
| M5: Launch | End of Week 16 | First tenant live |
