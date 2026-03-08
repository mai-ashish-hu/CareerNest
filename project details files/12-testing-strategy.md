# 12 – Testing Strategy

## Project: CareerNest – TP Cell Management Platform

---

## 1. Testing Philosophy

CareerNest follows a **layered testing approach** focused on:

1. **Correctness** — business logic works as specified
2. **Isolation** — multi-tenant boundaries are never breached
3. **Resilience** — graceful handling of edge cases and failures
4. **Performance** — meets SLA under expected load

---

## 2. Test Pyramid

```
         ┌─────────────┐
         │   E2E Tests  │    ← Few, critical user flows
         ├─────────────┤
         │ Integration  │    ← API + DB, tenant isolation
         │    Tests     │
         ├─────────────┤
         │  Unit Tests  │    ← Services, middleware, utils
         └─────────────┘
              (Most)
```

| Layer | Coverage Target | Tools |
|-------|----------------|-------|
| Unit Tests | > 80% | Vitest / Jest |
| Integration Tests | Critical paths | Supertest + Appwrite test project |
| E2E Tests | Core user flows | Playwright / Cypress |

---

## 3. Unit Testing

### 3.1 What to Unit Test

| Component | Test Focus |
|-----------|------------|
| **Middleware** | Auth verification, tenant resolution, role enforcement, permission checks |
| **Services** | Business logic, eligibility checks, stage transitions |
| **Validators** | Zod schema validation (valid/invalid inputs) |
| **Utils** | Pagination helpers, error formatting, response helpers |
| **Scoring Engine** | Eligibility checks with various student/drive combinations |

### 3.2 Example Test Cases

#### Eligibility Engine

```
✓ Should pass when student CGPA >= minCGPA
✓ Should fail when student CGPA < minCGPA
✓ Should pass when student backlogs <= maxBacklogs
✓ Should fail when student backlogs > maxBacklogs
✓ Should pass when student department is in allowed list
✓ Should fail when student department is NOT in allowed list
✓ Should return detailed failure reason
✓ Should handle edge case: CGPA exactly at minimum
```

#### Stage Transition Validation

```
✓ Should allow: applied → under_review
✓ Should allow: under_review → shortlisted
✓ Should allow: shortlisted → interview_scheduled
✓ Should allow: interview_scheduled → selected
✓ Should allow: interview_scheduled → rejected
✓ Should reject: applied → selected (skip stages)
✓ Should reject: rejected → shortlisted (backward transition)
✓ Should reject: selected → rejected (final state)
```

#### Tenant Middleware

```
✓ Should extract tenantId from subdomain
✓ Should extract tenantId from auth token
✓ Should reject requests with no tenant context
✓ Should reject requests with mismatched tenant
```

### 3.3 Running Unit Tests

```bash
npm run test                               # All tests
npm run test --workspace=apps/server       # Backend tests only
npm run test -- --coverage                 # With coverage report
```

---

## 4. Integration Testing

### 4.1 What to Integration Test

| Area | Test Focus |
|------|------------|
| **Tenant Isolation** | Verify no cross-tenant data access via API |
| **Auth Flow** | Login → token → authorized request → logout |
| **Drive Lifecycle** | Create company → create drive → student applies → stage updates |
| **RBAC Enforcement** | Each role can ONLY access permitted routes and data |
| **Application Workflow** | Full stage transition: applied → selected |

### 4.2 Critical Integration Test Scenarios

#### Tenant Isolation Tests

```
✓ Tenant A user cannot read Tenant B's students
✓ Tenant A user cannot read Tenant B's drives
✓ Tenant A user cannot modify Tenant B's applications
✓ API rejects requests with forged tenantId
✓ Subdomain mismatch with token tenantId is rejected
```

#### RBAC Tests

```
✓ Student cannot access TPO routes
✓ Company cannot access other companies' drives
✓ TPO Assistant cannot access other departments
✓ Unauthenticated user is rejected on all protected routes
✓ Super Admin can access all tenant data
```

#### Application Workflow Tests

```
✓ Eligible student can apply to drive
✓ Ineligible student is rejected with reason
✓ Duplicate application to same drive is prevented
✓ Stage transition follows valid state machine
✓ Invalid stage transition returns error
✓ Application after deadline is rejected
```

### 4.3 Running Integration Tests

```bash
npm run test:integration --workspace=apps/server
```

---

## 5. End-to-End (E2E) Testing

### 5.1 Critical E2E Flows

| Flow | Steps |
|------|-------|
| **TPO Onboarding** | Login as TPO → Create company → Create drive → View applications |
| **Student Application** | Login as Student → Browse drives → Apply to drive → Track status |
| **Company Review** | Login as Company → View drive → Review applications → Update stages |
| **Super Admin Setup** | Login as Super Admin → Create tenant → Verify isolation |

### 5.2 E2E Test Environment

- Separate Appwrite test project with seeded data
- Test users for each role pre-created
- Database reset between test suites

### 5.3 Running E2E Tests

```bash
npm run test:e2e
```

---

## 6. Performance / Load Testing

### 6.1 Load Test Targets

| Scenario | Target |
|----------|--------|
| Concurrent users per tenant | 500 |
| Applications per hour (peak) | 5,000 |
| API response time (p95) | < 2 seconds |
| Resume upload throughput | Verified under stress |

### 6.2 Load Test Scenarios

```
Scenario 1: Normal Load
  - 100 concurrent users
  - Mix: 60% reads, 30% applications, 10% stage updates
  - Duration: 10 minutes
  - Target: < 1s p95 response

Scenario 2: Peak Load
  - 500 concurrent users
  - 5,000 applications submitted in 1 hour
  - Duration: 1 hour
  - Target: < 2s p95 response, 0% errors

Scenario 3: Stress Test
  - 1,000 concurrent users (2x expected)
  - Duration: 15 minutes
  - Target: Graceful degradation, no crashes
```

### 6.3 Tools

- **k6** or **Artillery** for API load testing
- Custom scripts for application burst simulation

---

## 7. Security Testing

### 7.1 Security Test Checklist

- [ ] HTTPS enforced on all environments
- [ ] Expired tokens are rejected
- [ ] Invalid tokens are rejected
- [ ] Cross-tenant access attempts are logged and blocked
- [ ] SQL injection attempts are sanitized
- [ ] Rate limiting blocks abusive request patterns
- [ ] Resume files are encrypted at rest
- [ ] Sensitive actions require re-authentication
- [ ] Audit logs capture all security-relevant events

### 7.2 Dependency Auditing

```bash
npm audit                    # Check for known vulnerabilities
npm audit --fix              # Auto-fix where possible
```

---

## 8. Test Data Management

### 8.1 Seed Data

Test environments are seeded with:

| Entity | Count | Notes |
|--------|-------|-------|
| Tenants | 2 | For cross-tenant isolation testing |
| Users per tenant | 10 | 1 TPO, 2 Assistants, 5 Students, 2 Company users |
| Companies per tenant | 3 | With varied status |
| Drives per company | 2 | 1 active, 1 closed |
| Applications per drive | 10 | Across all stages |

### 8.2 Data Reset

- Integration tests reset data before each suite
- E2E tests use isolated test accounts
- Production data is **never** used in testing

---

## 9. CI Integration

All tests run in the GitHub Actions CI pipeline:

```
PR → Lint → Type Check → Unit Tests → Integration Tests → Build
Merge to main → Full test suite + E2E → Deploy
```

| Test Type | When Run | Blocking? |
|-----------|----------|-----------|
| Unit Tests | Every PR | ✅ Yes |
| Integration Tests | Every PR | ✅ Yes |
| E2E Tests | Merge to main | ✅ Yes |
| Load Tests | Pre-release (manual) | ⚠️ Advisory |
| Security Audit | Weekly + pre-release | ⚠️ Advisory |
