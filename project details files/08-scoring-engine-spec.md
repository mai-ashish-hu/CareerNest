# 08 – Scoring Engine Specification

## Project: CareerNest – TP Cell Management Platform

---

## 1. Overview

The Scoring Engine is a server-side component responsible for **evaluating student eligibility** for placement drives and, in future phases, **ranking candidates** based on configurable criteria. In MVP, the engine focuses on eligibility filtering; AI-based ranking is deferred to Phase 2.

---

## 2. MVP Scope – Eligibility Engine

### 2.1 Purpose

When a student applies to a drive, the scoring engine validates whether the student meets the drive's eligibility criteria. This prevents ineligible applications from entering the pipeline.

### 2.2 Eligibility Rules Schema

Each drive defines eligibility rules as a structured object:

```json
{
  "minCGPA": 7.0,
  "maxBacklogs": 0,
  "departments": ["CSE", "IT", "ECE"]
}
```

### 2.3 Eligibility Check Algorithm

```
FUNCTION checkEligibility(student, driveRules):
    IF student.CGPA < driveRules.minCGPA:
        RETURN { eligible: false, reason: "CGPA below minimum" }

    IF student.backlogs > driveRules.maxBacklogs:
        RETURN { eligible: false, reason: "Backlogs exceed limit" }

    IF student.department NOT IN driveRules.departments:
        RETURN { eligible: false, reason: "Department not eligible" }

    RETURN { eligible: true }
```

### 2.4 Integration Points

| Trigger | Action |
|---------|--------|
| `POST /applications` | Eligibility check runs before creating the application |
| `GET /drives` (Student) | Only eligible drives are returned in the listing |
| Drive eligibility change | Re-evaluation queued for existing applications (if drive is still `draft`) |

### 2.5 Response on Failure

```json
{
  "success": false,
  "error": {
    "code": "ELIGIBILITY_FAILED",
    "message": "You are not eligible for this drive",
    "details": [
      { "rule": "minCGPA", "required": 7.0, "actual": 6.5 }
    ]
  }
}
```

---

## 3. Phase 2 – Candidate Ranking Engine (Future)

> **Note:** The following is the planned specification for Phase 2. It is NOT part of the MVP.

### 3.1 Ranking Criteria

| Criterion | Weight (Default) | Description |
|-----------|-----------------|-------------|
| CGPA | 40% | Normalized academic performance |
| Backlogs | 20% | Fewer backlogs = higher score |
| Department Match | 15% | Preferred departments score higher |
| Resume Score | 15% | AI-parsed resume quality (future) |
| Past Performance | 10% | Interview history within the platform |

### 3.2 Scoring Formula

```
score = (w1 × normalizedCGPA)
      + (w2 × backlogScore)
      + (w3 × departmentMatchScore)
      + (w4 × resumeScore)
      + (w5 × pastPerformanceScore)
```

Where:
- `normalizedCGPA` = `student.CGPA / 10` (0–1 range)
- `backlogScore` = `max(0, 1 - (student.backlogs × 0.25))`
- `departmentMatchScore` = `1.0` if exact match, `0.5` if related, `0.0` otherwise
- `resumeScore` = AI-evaluated (Phase 2)
- `pastPerformanceScore` = based on previous selection rates

### 3.3 Ranking API (Phase 2)

```
GET /drives/:id/rankings?page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "rankings": [
      {
        "studentId": "usr_555",
        "name": "John Doe",
        "score": 0.87,
        "breakdown": {
          "cgpa": 0.36,
          "backlogs": 0.20,
          "department": 0.15,
          "resume": 0.10,
          "history": 0.06
        }
      }
    ],
    "total": 80,
    "page": 1,
    "limit": 20
  }
}
```

### 3.4 Configurable Weights

TPOs can customize scoring weights per tenant:

```json
{
  "tenantId": "tnt_456",
  "scoringWeights": {
    "cgpa": 0.35,
    "backlogs": 0.25,
    "departmentMatch": 0.15,
    "resumeScore": 0.15,
    "pastPerformance": 0.10
  }
}
```

---

## 4. Performance Requirements

| Requirement | Target |
|-------------|--------|
| Eligibility check latency | < 100ms |
| Ranking computation (per drive) | < 2s for up to 1,000 applicants |
| Batch eligibility check | Support 5,000 checks/hour during peak |

---

## 5. Implementation Notes

- Eligibility checks are **synchronous** (blocking before application creation)
- Ranking computations are **asynchronous** (queued via background job)
- All scoring logic resides in `services/scoring.service.ts`
- Scoring weights are stored in the `Tenants` collection as optional config
