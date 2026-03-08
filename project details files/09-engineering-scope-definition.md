# 09 – Engineering Scope Definition

## Project: CareerNest – TP Cell Management Platform

---

## 1. Project Scope Overview

CareerNest is scoped as a **multi-tenant SaaS platform** for college Training & Placement (TP) cells. The engineering scope is divided into **MVP (Phase 1)** and **Post-MVP (Phase 2+)** to ensure focused delivery.

---

## 2. MVP Scope (Phase 1) – In Scope

### 2.1 Core Modules

| Module | Features Included |
|--------|-------------------|
| **Authentication** | Login, logout, token-based sessions via Appwrite Auth |
| **Tenant Management** | Tenant creation, subdomain setup, status management (Super Admin) |
| **User Management** | Role assignment, tenant-scoped user creation |
| **Company Management** | Company onboarding, profile management, credential generation |
| **Drive Management** | Drive creation, eligibility rules, deadline management, status lifecycle |
| **Application Workflow** | Apply, stage transitions (Applied → Selected/Rejected), backend validation |
| **Student Profiles** | Profile CRUD, resume upload (encrypted), eligibility data |
| **Course Management** | Course creation, department mapping |
| **Announcements** | Create, list, delete announcements per tenant |
| **Analytics (Basic)** | Placement %, department stats, drive conversion metrics |
| **Audit Logging** | Login attempts, stage changes, credential actions |

### 2.2 Infrastructure

| Component | Scope |
|-----------|-------|
| **Frontend** | Remix.js with SSR, Tailwind CSS, role-aware routing |
| **Backend** | Express.js REST API with middleware pipeline |
| **Database** | Appwrite Cloud Pro SQL with tenantId isolation |
| **Storage** | Appwrite Storage for encrypted resume uploads |
| **Auth** | Appwrite Auth with role + tenant metadata in tokens |
| **CI/CD** | GitHub Actions for build, test, deploy |

### 2.3 Cross-Cutting Concerns

- Multi-tenant isolation (tenantId on all collections, all queries)
- RBAC enforcement at route and query levels
- Zod schema validation on all API inputs
- Standardized error responses
- Pagination on all list endpoints
- Rate limiting

---

## 3. Out of Scope (Phase 2+)

| Feature | Phase | Notes |
|---------|-------|-------|
| AI Candidate Ranking | Phase 2 | Scoring weights, ML-based resume parsing |
| Calendar Sync | Phase 2 | Google Calendar / Outlook integration for interviews |
| Company Rating System | Phase 2 | Student feedback on companies post-drive |
| Advanced Data Exports | Phase 2 | CSV/PDF export of placement reports |
| Notification Service | Phase 2 | Push notifications, SMS |
| Billing Service | Phase 2 | Subscription management, payment integration |
| Mobile App | Phase 3 | Native/Flutter mobile client |
| Microservice Decomposition | Phase 3 | Break modular monolith into independent services |

---

## 4. Technical Boundaries

### 4.1 What the Backend Handles
- All business logic and data validation
- Tenant resolution and RBAC enforcement
- State machine enforcement for application stages
- Background job processing (emails, stat recalculation)

### 4.2 What the Frontend Handles
- Role-based portal rendering
- Optimistic UI updates
- Error boundary handling
- Client-side form validation (complementary to server-side)

### 4.3 What Appwrite Handles
- User authentication and session management
- Database storage and querying
- File storage with encryption
- Resource-level access control

---

## 5. Engineering Constraints

| Constraint | Detail |
|------------|--------|
| Max concurrency | 500 concurrent users per tenant |
| Response time | < 2 seconds for all core APIs |
| Pagination limit | Default 20, max 100 |
| File upload | Resume only (PDF), max 5MB |
| Supported browsers | Chrome, Firefox, Safari, Edge (latest 2 versions) |
| Data retention | Audit logs retained for 1 year minimum |

---

## 6. Assumptions

1. Each college is a single tenant — no multi-campus support in MVP
2. Companies are onboarded per-tenant (a company in College A is separate from College B)
3. Students belong to exactly one tenant
4. Super Admin is a platform-level role, not per-tenant
5. Appwrite Cloud Pro provides sufficient performance for MVP scale
6. Email service is configured externally (SMTP or third-party provider)

---

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Appwrite performance under load | High | Load test with 500 concurrent users before launch |
| Cross-tenant data leakage | Critical | tenantId enforcement in middleware + integration tests |
| Scope creep (Phase 2 features) | Medium | Strict scope document, feature flagging |
| Resume storage limits | Low | 5MB limit per file, Appwrite storage scaling |
