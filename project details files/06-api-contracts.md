# 06 – API Contracts

## Project: CareerNest – TP Cell Management Platform

---

## 1. API Overview

- **Base URL:** `https://{subdomain}.careernest.com/api/v1`
- **Protocol:** HTTPS only
- **Format:** JSON request/response
- **Validation:** Zod schema validation on all request bodies
- **Authentication:** Bearer token (Appwrite Auth)

### Common Headers

| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer <token>` | ✅ (all except login) |
| `Content-Type` | `application/json` | ✅ |

### Standard Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable error message",
    "details": []
  }
}
```

---

## 2. Middleware Pipeline (Applied to All Routes)

```
Request → Auth Verification → Tenant Resolution → Role Enforcement → Permission Check → Zod Validation → Handler → Audit Log → Response
```

---

## 3. Authentication APIs

### POST `/auth/login`

**Access:** Public

| Field | Type | Required |
|-------|------|----------|
| `email` | String | ✅ |
| `password` | String | ✅ |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOi...",
    "user": {
      "id": "usr_123",
      "tenantId": "tnt_456",
      "role": "tpo",
      "email": "tpo@college.edu",
      "name": "Dr. Placement"
    }
  }
}
```

### POST `/auth/logout`

**Access:** Authenticated

**Response (200):**
```json
{ "success": true, "message": "Logged out successfully" }
```

---

## 4. Tenant APIs

### POST `/tenants`

**Access:** Super Admin

| Field | Type | Required |
|-------|------|----------|
| `name` | String | ✅ |
| `subdomain` | String | ✅ |
| `subscriptionPlan` | Enum (`free`, `basic`, `pro`) | ✅ |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "tnt_456",
    "name": "IIT Bombay",
    "subdomain": "iitb",
    "subscriptionPlan": "pro",
    "status": "active"
  }
}
```

### GET `/tenants`

**Access:** Super Admin

**Query Params:** `?page=1&limit=20&status=active`

**Response (200):**
```json
{
  "success": true,
  "data": { "tenants": [...], "total": 50, "page": 1, "limit": 20 }
}
```

---

## 5. Company APIs

### POST `/companies`

**Access:** TPO

| Field | Type | Required |
|-------|------|----------|
| `name` | String | ✅ |
| `contactInfo` | Object `{ email, phone, contactPerson }` | ✅ |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "cmp_789",
    "tenantId": "tnt_456",
    "name": "TechCorp",
    "contactInfo": { "email": "hr@techcorp.com", "phone": "+91...", "contactPerson": "Jane" },
    "status": "active"
  }
}
```

### GET `/companies`

**Access:** TPO

**Query Params:** `?page=1&limit=20&status=active`

### GET `/companies/:id`

**Access:** TPO, Company (own only)

---

## 6. Drive APIs

### POST `/drives`

**Access:** TPO, Company

| Field | Type | Required |
|-------|------|----------|
| `companyId` | String | ✅ |
| `jobRole` | String | ✅ |
| `CTC` | Float | ✅ |
| `eligibilityRules` | Object `{ minCGPA, maxBacklogs, departments[] }` | ✅ |
| `deadline` | DateTime | ✅ |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "drv_101",
    "tenantId": "tnt_456",
    "companyId": "cmp_789",
    "jobRole": "SDE-1",
    "CTC": 1200000,
    "eligibilityRules": { "minCGPA": 7.0, "maxBacklogs": 0, "departments": ["CSE", "IT"] },
    "deadline": "2026-04-01T23:59:59Z",
    "status": "draft"
  }
}
```

### GET `/drives`

**Access:** TPO, Student (eligible only), Company (own only)

**Query Params:** `?page=1&limit=20&status=active&companyId=cmp_789`

### PATCH `/drives/:id`

**Access:** TPO, Company (own only)

| Field | Type | Required |
|-------|------|----------|
| `status` | Enum (`draft`, `active`, `closed`) | ❌ |
| `eligibilityRules` | Object | ❌ |
| `deadline` | DateTime | ❌ |

---

## 7. Application APIs

### POST `/applications`

**Access:** Student

| Field | Type | Required |
|-------|------|----------|
| `driveId` | String | ✅ |

> Backend auto-resolves `studentId` and `tenantId` from auth token. Eligibility is validated server-side.

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "app_202",
    "tenantId": "tnt_456",
    "driveId": "drv_101",
    "studentId": "usr_555",
    "stage": "applied",
    "appliedAt": "2026-03-01T10:30:00Z"
  }
}
```

### GET `/applications`

**Access:** TPO (tenant-wide), Student (self only), Company (own drives only)

**Query Params:** `?driveId=drv_101&stage=shortlisted&page=1&limit=20`

### PATCH `/applications/:id/stage`

**Access:** TPO, Company

| Field | Type | Required |
|-------|------|----------|
| `stage` | Enum (`under_review`, `shortlisted`, `interview_scheduled`, `selected`, `rejected`) | ✅ |

> Stage transitions are validated. Invalid transitions (e.g., `applied` → `selected`) are rejected.

---

## 8. Student APIs

### GET `/students`

**Access:** TPO (tenant-wide), TPO Assistant (dept only)

**Query Params:** `?department=CSE&isPlaced=false&page=1&limit=20`

### GET `/students/:id`

**Access:** TPO, TPO Assistant (dept only), Student (self only)

### PATCH `/students/:id`

**Access:** Student (self only)

| Field | Type | Required |
|-------|------|----------|
| `CGPA` | Float | ❌ |
| `backlogs` | Integer | ❌ |
| `resumeFileId` | String | ❌ |

---

## 9. Course APIs

### POST `/courses`

**Access:** TPO

| Field | Type | Required |
|-------|------|----------|
| `name` | String | ✅ |
| `department` | String | ✅ |

### GET `/courses`

**Access:** TPO, Student

---

## 10. Announcement APIs

### POST `/announcements`

**Access:** TPO

| Field | Type | Required |
|-------|------|----------|
| `title` | String | ✅ |
| `body` | String | ✅ |

### GET `/announcements`

**Access:** TPO, Student

**Query Params:** `?page=1&limit=20`

---

## 11. Analytics APIs

### GET `/analytics/placement`

**Access:** TPO

**Response (200):**
```json
{
  "success": true,
  "data": {
    "placementPercentage": 72.5,
    "totalStudents": 400,
    "placedStudents": 290,
    "departmentStats": [
      { "department": "CSE", "total": 120, "placed": 105, "percentage": 87.5 },
      { "department": "ECE", "total": 100, "placed": 68, "percentage": 68.0 }
    ],
    "driveConversion": [
      { "driveId": "drv_101", "company": "TechCorp", "applied": 80, "selected": 5, "rate": 6.25 }
    ]
  }
}
```

---

## 12. Pagination Standard

All list endpoints follow:

| Param | Default | Max |
|-------|---------|-----|
| `page` | 1 | — |
| `limit` | 20 | 100 |

**Response envelope:**
```json
{
  "data": [...],
  "total": 150,
  "page": 1,
  "limit": 20
}
```
