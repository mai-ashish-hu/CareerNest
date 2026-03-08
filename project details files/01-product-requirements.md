# 01 – Product Requirements Document (PRD)

## Project: CareerNest – TP Cell Management Platform

---

## 1. Product Vision

CareerNest aims to become the **default SaaS infrastructure** for college placement management in India by digitizing and structuring the entire hiring lifecycle — from company onboarding to offer letter issuance.

---

## 2. Target Users

| Role | Description |
|------|-------------|
| **Colleges (TPO Offices)** | Placement officers who manage drives, track students, and coordinate with companies |
| **Students** | Internal and external candidates applying through the placement cell |
| **Companies (HR Teams)** | Recruiters who create drives, filter candidates, and manage hiring stages |
| **Super Admin** | Platform-level administrator for tenant provisioning and global oversight |

---

## 3. Core Problems Addressed

### For TPO (Training & Placement Officer)
- Manual spreadsheet tracking of student applications and placement stats
- Email overload for coordinating between students, companies, and departments
- Lack of structured analytics for decision-making

### For Students
- No visibility into application stages or real-time status
- Fragmented placement communication across channels

### For Companies
- Manual candidate coordination with college placement cells
- Lack of structured filtering tools for eligibility-based shortlisting

---

## 4. Key Value Propositions

- **Full Company Portal** — dedicated interface for HR teams (key differentiator)
- **Strict Multi-Tenant Architecture** — logical isolation per college via `tenantId`
- **Role-Scoped Dashboards** — each user sees only what their role permits
- **Structured Hiring Workflow** — standardized stages from application to selection

---

## 5. Functional Requirements

| ID | Requirement | Description |
|----|-------------|-------------|
| FR1 | Tenant Isolation | System must prevent cross-college access at all levels (API, data, UI) |
| FR2 | Role-Based Permissions | Each user sees only data within their role scope (Super Admin, TPO, Assistant, Student, Company) |
| FR3 | Drive Lifecycle | Company must configure eligibility criteria before drive activation |
| FR4 | Application Tracking | Students must see real-time status of their applications |
| FR5 | Analytics Dashboard | TPO must see: placement %, department stats, drive conversion metrics |
| FR6 | Student Profile & Resume | Students can upload and manage their profile and resume |
| FR7 | Company Onboarding | TPO can onboard companies and manage their access |
| FR8 | Course Management | TPO can create courses and manage student enrollment |
| FR9 | Announcements | TPO can publish announcements to students |

---

## 6. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Response time < 2 seconds for all core APIs |
| **Concurrency** | Support 500 concurrent users per tenant |
| **Security** | HTTPS-only communication |
| **Audit** | Complete audit logging for all sensitive actions |
| **Privacy** | Resume encryption via Appwrite Storage |
| **Availability** | 95% uptime SLA |

---

## 7. Success Metrics

| Metric | Target |
|--------|--------|
| Reduction in spreadsheet usage | 80% |
| Support tickets for data inconsistency | < 10% |
| Student login adoption rate | 90% |
| Platform uptime | 95% SLA |

---

## 8. Out of Scope (Phase 2)

- AI-based candidate ranking
- Calendar sync for interviews
- Company rating system
- Advanced data exports
