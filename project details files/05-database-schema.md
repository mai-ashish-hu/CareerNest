# 05 – Database Schema

## Project: CareerNest – TP Cell Management Platform

---

## 1. Database Strategy

- **Engine:** Appwrite Cloud Pro (SQL Relational Database)
- **Isolation Model:** Logical isolation via mandatory `tenantId` on every row
- **Optimization:** High read frequency, write bursts during placement season

---

## 2. Collections & Fields

### 2.1 Tenants

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String (auto) | ✅ | Unique tenant identifier |
| `name` | String | ✅ | College name |
| `subdomain` | String | ✅ | Unique subdomain (e.g., `iitb`) |
| `subscriptionPlan` | Enum | ✅ | `free`, `basic`, `pro` |
| `status` | Enum | ✅ | `active`, `inactive`, `suspended` |
| `createdAt` | DateTime | ✅ | Auto-generated |
| `updatedAt` | DateTime | ✅ | Auto-updated |

### 2.2 Users

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String (auto) | ✅ | Unique user identifier |
| `tenantId` | String | ✅ | FK → Tenants |
| `role` | Enum | ✅ | `super_admin`, `tpo`, `tpo_assistant`, `student`, `company` |
| `email` | String | ✅ | Unique per tenant |
| `name` | String | ✅ | Display name |
| `department` | String | ❌ | Required for `tpo_assistant` and `student` |
| `status` | Enum | ✅ | `active`, `inactive`, `blocked` |
| `createdAt` | DateTime | ✅ | Auto-generated |

### 2.3 Students

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | String | ✅ | FK → Users |
| `tenantId` | String | ✅ | FK → Tenants |
| `department` | String | ✅ | Student's department |
| `CGPA` | Float | ✅ | Cumulative GPA |
| `backlogs` | Integer | ✅ | Number of active backlogs |
| `resumeFileId` | String | ❌ | FK → Appwrite Storage file |
| `enrollmentYear` | Integer | ❌ | Year of enrollment |
| `isPlaced` | Boolean | ✅ | Placement status |

### 2.4 Companies

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String (auto) | ✅ | Unique company identifier |
| `tenantId` | String | ✅ | FK → Tenants |
| `name` | String | ✅ | Company name |
| `contactInfo` | Object | ✅ | `{ email, phone, contactPerson }` |
| `status` | Enum | ✅ | `active`, `inactive` |
| `createdAt` | DateTime | ✅ | Auto-generated |

### 2.5 Drives

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String (auto) | ✅ | Unique drive identifier |
| `tenantId` | String | ✅ | FK → Tenants |
| `companyId` | String | ✅ | FK → Companies |
| `jobRole` | String | ✅ | Job title / role |
| `CTC` | Float | ✅ | Compensation offered |
| `eligibilityRules` | Object | ✅ | `{ minCGPA, maxBacklogs, departments[] }` |
| `deadline` | DateTime | ✅ | Application deadline |
| `status` | Enum | ✅ | `draft`, `active`, `closed` |
| `createdAt` | DateTime | ✅ | Auto-generated |

### 2.6 Applications

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String (auto) | ✅ | Unique application identifier |
| `tenantId` | String | ✅ | FK → Tenants |
| `driveId` | String | ✅ | FK → Drives |
| `studentId` | String | ✅ | FK → Students (userId) |
| `stage` | Enum | ✅ | `applied`, `under_review`, `shortlisted`, `interview_scheduled`, `selected`, `rejected` |
| `appliedAt` | DateTime | ✅ | Timestamp of application |
| `updatedAt` | DateTime | ✅ | Last stage change time |

### 2.7 Courses

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String (auto) | ✅ | Unique course identifier |
| `tenantId` | String | ✅ | FK → Tenants |
| `name` | String | ✅ | Course name |
| `department` | String | ✅ | Department it belongs to |
| `createdAt` | DateTime | ✅ | Auto-generated |

### 2.8 Announcements

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String (auto) | ✅ | Unique announcement identifier |
| `tenantId` | String | ✅ | FK → Tenants |
| `title` | String | ✅ | Announcement title |
| `body` | String | ✅ | Announcement content |
| `createdBy` | String | ✅ | FK → Users |
| `createdAt` | DateTime | ✅ | Auto-generated |

### 2.9 PlacementRecords

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String (auto) | ✅ | Unique record identifier |
| `tenantId` | String | ✅ | FK → Tenants |
| `studentId` | String | ✅ | FK → Students |
| `driveId` | String | ✅ | FK → Drives |
| `companyId` | String | ✅ | FK → Companies |
| `ctcOffered` | Float | ✅ | Final CTC offered |
| `placedAt` | DateTime | ✅ | Date of placement |

### 2.10 AuditLogs

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String (auto) | ✅ | Unique log identifier |
| `tenantId` | String | ✅ | FK → Tenants |
| `userId` | String | ✅ | Who performed the action |
| `action` | String | ✅ | Action type (e.g., `LOGIN`, `STAGE_UPDATE`, `DRIVE_CREATE`) |
| `resourceType` | String | ✅ | Entity type affected |
| `resourceId` | String | ✅ | Entity ID affected |
| `metadata` | Object | ❌ | Additional context (old/new values) |
| `timestamp` | DateTime | ✅ | When the action occurred |

---

## 3. Indexes

| Collection | Indexed Fields | Purpose |
|------------|---------------|---------|
| All Collections | `tenantId` | Tenant isolation & query performance |
| Drives | `companyId`, `deadline`, `status` | Filtering & sorting drives |
| Applications | `driveId`, `studentId`, `stage` | Application lookup & stage queries |
| Students | `department`, `CGPA`, `backlogs` | Eligibility filtering |
| AuditLogs | `userId`, `action`, `timestamp` | Audit trail queries |
| PlacementRecords | `studentId`, `companyId` | Placement analytics |

---

## 4. Relationships Diagram

```
Tenants (1) ──────┬──── (N) Users
                  ├──── (N) Students
                  ├──── (N) Companies ──── (N) Drives
                  ├──── (N) Courses
                  ├──── (N) Announcements
                  ├──── (N) PlacementRecords
                  └──── (N) AuditLogs

Drives (1) ──── (N) Applications ──── (1) Student
```

---

## 5. Data Integrity Rules

- `tenantId` is **mandatory** on every row — no exceptions
- `stage` transitions in Applications follow a strict state machine
- Duplicate applications (same `studentId` + `driveId`) are prevented
- `subdomain` in Tenants must be globally unique
- `email` in Users must be unique within a tenant
