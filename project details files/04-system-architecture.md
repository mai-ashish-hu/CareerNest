# 04 – System Architecture

## Project: CareerNest – TP Cell Management Platform

---

## 1. Architectural Style

CareerNest follows a **multi-tenant SaaS architecture** with strict tenant isolation at the database query layer. Each college operates as a logically isolated tenant within a shared infrastructure.

| Aspect | Choice |
|--------|--------|
| Tenancy Model | Multi-tenant (logical isolation via `tenantId`) |
| Architecture Pattern | Modular Monolith (initially) with clear domain separation |
| API Style | API-first REST backend |
| Access Control | Role-Based Access Control (RBAC) at API + data layers |

---

## 2. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                   CLIENT LAYER                       │
│  Remix.js (SSR + Nested Routing) + Tailwind CSS     │
│  Role-aware routing:                                 │
│  Super Admin │ TPO │ Assistant │ Student │ Company   │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────┐
│                    API LAYER                          │
│  Express.js REST API                                 │
│  ┌─────────────────────────────────────────────┐     │
│  │ Middleware Stack:                            │     │
│  │  1. Auth Verification                       │     │
│  │  2. Tenant Resolution (subdomain / token)   │     │
│  │  3. Role Enforcement                        │     │
│  │  4. Permission Checks                       │     │
│  │  5. Audit Logging                           │     │
│  │  6. Zod Schema Validation                   │     │
│  └─────────────────────────────────────────────┘     │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              BACKEND SERVICES LAYER                  │
│              (Appwrite Cloud Pro)                     │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐            │
│  │ Database │ │   Auth   │ │  Storage  │            │
│  │  (SQL)   │ │          │ │(Encrypted)│            │
│  └──────────┘ └──────────┘ └───────────┘            │
│  ┌──────────────────┐ ┌───────────────────┐          │
│  │   RBAC Engine    │ │  Background Jobs  │          │
│  │                  │ │ (Queue + Email)   │          │
│  └──────────────────┘ └───────────────────┘          │
└─────────────────────────────────────────────────────┘
```

---

## 3. Layer Responsibilities

### 3.1 Presentation Layer (Remix.js)
- Server-Side Rendering (SSR) for fast initial loads
- Nested routing for portal-specific layouts
- Tailwind CSS for responsive UI
- Error boundaries for graceful failure handling
- Optimistic UI updates for better UX

### 3.2 API Layer (Express.js)
- RESTful endpoints organized by domain (auth, tenants, companies, drives, applications)
- Centralized middleware pipeline for cross-cutting concerns
- Zod schema validation on all request payloads
- Standardized error responses

### 3.3 Data Layer (Appwrite Cloud Pro)
- SQL tables with mandatory `tenantId` on every record
- Appwrite Auth for session management
- Encrypted file storage for resumes and documents
- Indexed fields for query performance

### 3.4 Background Processing Layer
- Async job queue for non-blocking operations
- Email notification dispatch
- Placement statistics recalculation

---

## 4. Request Lifecycle

```
1. User logs in → Appwrite Auth issues token
2. Token contains: role + tenantId metadata
3. Request hits Express server
4. Middleware pipeline:
   a. Extract & verify auth token
   b. Resolve tenantId (from subdomain or token)
   c. Validate role permissions for the route
   d. Validate request body (Zod schema)
5. Business logic executes
6. Query executed with mandatory tenantId filter
7. Audit log written (for sensitive actions)
8. Response returned to client
```

---

## 5. Multi-Tenant Model

### Tenant Identification
- Each record contains a **mandatory `tenantId`** field
- `tenantId` resolved from:
  - Subdomain: `college.careernest.com`
  - Auth token metadata

### Isolation Enforcement
- All database queries filtered by `tenantId`
- No cross-tenant joins permitted
- `tenantId` indexed in all collections
- Middleware rejects requests with mismatched tenant context

---

## 6. Role-Based Access Control (RBAC)

| Role | Scope | Description |
|------|-------|-------------|
| Super Admin | Global | Full platform access across all tenants |
| TPO | Tenant-wide | Full access within their college tenant |
| TPO Assistant | Department-scoped | Limited to their department within the tenant |
| Student | Self-scoped | Can only access own profile and applications |
| Company | Drive-scoped | Can only access their own drives and applications |

### Enforcement Layers
1. **Appwrite RBAC** — resource-level control
2. **Express middleware** — route-level enforcement
3. **Query-level scoping** — department and company isolation in data queries

---

## 7. Portal Separation

All portals share the same backend but use role-based routing:

| Portal | Scope | Key Features |
|--------|-------|--------------|
| Super Admin | Global access | Tenant management, platform monitoring |
| College / TPO | Tenant-scoped | Companies, drives, students, analytics |
| Student | Self-scoped | Profile, applications, announcements |
| Company | Drive-scoped | Drive management, candidate review |

> **Rule:** No shared UI states across roles.

---

## 8. Security Controls

| Control | Implementation |
|---------|----------------|
| Transport Security | HTTPS enforced on all endpoints |
| Authentication | Token-based sessions via Appwrite Auth |
| Data Encryption | Resume encryption via Appwrite Storage |
| Audit Logging | Login attempts, status updates, credential generation |
| Sensitive Actions | Forced re-authentication required |
| Rate Limiting | Protection against abusive usage patterns |

---

## 9. Scalability Strategy

| Strategy | Detail |
|----------|--------|
| Indexed Fields | `tenantId`, `driveId`, `companyId` for fast lookups |
| Pagination | All high-volume collections return paginated results |
| Async Processing | Job queue for email notifications, stat recalculation |
| Concurrency Target | 500 concurrent users per tenant |
| Response SLA | Sub-2-second response on all core APIs |
| Horizontal Scaling | Stateless API servers + Appwrite managed scaling |
| Vertical Scaling | Plan upgrade under load |
