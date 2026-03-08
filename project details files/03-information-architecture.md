# 03 – Information Architecture

## Project: CareerNest – TP Cell Management Platform

---

## 1. Portal Structure

CareerNest uses **role-based portal separation**. All portals share the same backend but are presented via role-aware routing in Remix.js. No shared UI states exist across roles.

```
CareerNest Platform
├── Super Admin Portal (Global Access)
├── College / TPO Portal (Tenant-Scoped)
├── Student Portal (Self-Scoped)
└── Company Portal (Drive-Scoped)
```

---

## 2. Navigation Maps

### 2.1 Super Admin Portal

```
/admin
├── /dashboard              → Global overview of all tenants
├── /tenants
│   ├── /                   → List all tenants
│   ├── /create             → Create new tenant
│   └── /:id                → Tenant details & management
└── /settings               → Platform-wide settings
```

### 2.2 College / TPO Portal

```
/college
├── /dashboard              → Placement analytics & overview
├── /companies
│   ├── /                   → List all onboarded companies
│   ├── /create             → Onboard new company
│   └── /:id                → Company details
├── /drives
│   ├── /                   → List all drives
│   ├── /create             → Create new drive
│   └── /:id
│       ├── /details        → Drive details & eligibility
│       └── /applications   → Applications for this drive
├── /students
│   ├── /                   → List all students
│   └── /:id                → Student profile & applications
├── /courses
│   ├── /                   → List courses
│   └── /create             → Create course
├── /announcements
│   ├── /                   → List announcements
│   └── /create             → Create announcement
├── /analytics              → Placement %, dept stats, conversion
└── /settings               → College-level settings
```

### 2.3 Student Portal

```
/student
├── /dashboard              → Overview of applications & announcements
├── /profile
│   ├── /                   → View profile
│   └── /edit               → Edit profile & upload resume
├── /drives
│   ├── /                   → Browse eligible drives
│   └── /:id                → Drive details & apply
├── /applications           → Track all applications & statuses
└── /announcements          → View placement announcements
```

### 2.4 Company Portal

```
/company
├── /dashboard              → Overview of active drives
├── /drives
│   ├── /                   → List company's drives
│   └── /:id
│       ├── /details        → Drive details & eligibility config
│       └── /applications   → Review & manage candidates
└── /settings               → Company profile settings
```

---

## 3. Content Hierarchy

```
Platform (CareerNest)
└── Tenant (College)
    ├── Users (TPO, Assistants)
    ├── Students
    │   ├── Profile
    │   ├── Resume
    │   └── Applications
    ├── Companies
    │   └── Drives
    │       ├── Eligibility Rules
    │       └── Applications
    │           └── Stages (Applied → Selected/Rejected)
    ├── Courses
    ├── Announcements
    ├── Placement Records
    └── Audit Logs
```

---

## 4. Access Scope Matrix

| Entity | Super Admin | TPO | TPO Assistant | Student | Company |
|--------|:-----------:|:---:|:-------------:|:-------:|:-------:|
| Tenants | ✅ All | ❌ | ❌ | ❌ | ❌ |
| Users | ✅ All | ✅ Own tenant | ✅ Own dept | ❌ | ❌ |
| Students | ✅ All | ✅ Own tenant | ✅ Own dept | ✅ Self only | ❌ |
| Companies | ✅ All | ✅ Own tenant | ❌ | ❌ | ✅ Self only |
| Drives | ✅ All | ✅ Own tenant | ✅ Own dept | ✅ Eligible only | ✅ Own drives |
| Applications | ✅ All | ✅ Own tenant | ✅ Own dept | ✅ Self only | ✅ Own drives |
| Analytics | ✅ Global | ✅ Own tenant | ✅ Own dept | ❌ | ❌ |
| Announcements | ✅ All | ✅ Own tenant | ✅ Own dept | ✅ View only | ❌ |
| Audit Logs | ✅ All | ✅ Own tenant | ❌ | ❌ | ❌ |

---

## 5. URL Strategy

- **Subdomain-based tenant resolution**: `college-name.careernest.com`
- **Nested routing** via Remix.js for role-specific layouts
- **Route guards** enforce authentication and role checks before rendering
