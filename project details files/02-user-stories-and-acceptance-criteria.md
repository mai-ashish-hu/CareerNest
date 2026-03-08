# 02 – User Stories and Acceptance Criteria

## Project: CareerNest – TP Cell Management Platform

---

## Super Admin Stories

### US-SA-01: Tenant Provisioning
**As a** Super Admin,
**I want to** create and manage college tenants,
**So that** each college gets its own isolated workspace.

**Acceptance Criteria:**
- [ ] Super Admin can create a new tenant with name, subdomain, and subscription plan
- [ ] Each tenant receives a unique `tenantId`
- [ ] Tenant subdomain is validated for uniqueness
- [ ] Tenant status can be set to active/inactive
- [ ] Cross-tenant data is never accessible from another tenant's context

### US-SA-02: Global Dashboard
**As a** Super Admin,
**I want to** view all tenants and their statuses,
**So that** I can monitor platform health.

**Acceptance Criteria:**
- [ ] Dashboard lists all tenants with status, subscription plan, and creation date
- [ ] Super Admin can filter and search tenants
- [ ] Tenant details page shows usage metrics

---

## TPO (Training & Placement Officer) Stories

### US-TPO-01: Company Onboarding
**As a** TPO,
**I want to** onboard companies to my college's placement cell,
**So that** they can post drives and hire students.

**Acceptance Criteria:**
- [ ] TPO can add a company with name, contact info, and status
- [ ] Company is scoped to the TPO's `tenantId`
- [ ] Company receives login credentials for their portal
- [ ] Audit log is created for company onboarding action

### US-TPO-02: Drive Management
**As a** TPO,
**I want to** create and manage placement drives,
**So that** students can apply for job opportunities.

**Acceptance Criteria:**
- [ ] TPO can create a drive with job role, CTC, eligibility rules, and deadline
- [ ] Drive is linked to a specific company
- [ ] Eligibility rules must be configured before drive activation
- [ ] Drive status can be: Draft, Active, Closed
- [ ] TPO can view all drives with filters by company, status, and date

### US-TPO-03: Application Stage Management
**As a** TPO,
**I want to** update application stages for students,
**So that** the hiring workflow progresses correctly.

**Acceptance Criteria:**
- [ ] TPO can move applications through: Applied → Under Review → Shortlisted → Interview Scheduled → Selected/Rejected
- [ ] Stage transitions are validated at the backend
- [ ] Students are notified of stage changes
- [ ] Audit log records each stage transition

### US-TPO-04: Analytics Dashboard
**As a** TPO,
**I want to** view placement analytics,
**So that** I can track department-wise placement performance.

**Acceptance Criteria:**
- [ ] Dashboard shows: placement %, department stats, drive conversion metrics
- [ ] Data is filtered by the TPO's `tenantId`
- [ ] Analytics refresh with latest data on page load

### US-TPO-05: Course Management
**As a** TPO,
**I want to** create courses and manage enrollment,
**So that** students are properly categorized by department.

**Acceptance Criteria:**
- [ ] TPO can create courses with name and department
- [ ] Students can be enrolled in courses
- [ ] Course data is used for eligibility filtering in drives

### US-TPO-06: Announcements
**As a** TPO,
**I want to** publish announcements to students,
**So that** placement-related updates reach everyone.

**Acceptance Criteria:**
- [ ] TPO can create, edit, and delete announcements
- [ ] Announcements are scoped to the TPO's tenant
- [ ] Students see announcements on their dashboard

---

## TPO Assistant Stories

### US-TPOA-01: Department-Scoped Access
**As a** TPO Assistant,
**I want to** manage placement activities for my department only,
**So that** I can help the TPO without accessing other departments' data.

**Acceptance Criteria:**
- [ ] TPO Assistant sees only students and drives relevant to their department
- [ ] Cannot access data from other departments within the same tenant
- [ ] Can update application stages for their department's students

---

## Student Stories

### US-STU-01: Profile Management
**As a** Student,
**I want to** create and update my placement profile,
**So that** companies can evaluate my candidacy.

**Acceptance Criteria:**
- [ ] Student can fill in: department, CGPA, backlogs, and other profile details
- [ ] Student can upload a resume (encrypted storage)
- [ ] Profile data is used for eligibility checks during drive application

### US-STU-02: Drive Application
**As a** Student,
**I want to** browse and apply to eligible placement drives,
**So that** I can participate in the hiring process.

**Acceptance Criteria:**
- [ ] Student sees only drives they are eligible for (based on CGPA, backlogs, department)
- [ ] Student can apply to a drive before the deadline
- [ ] Duplicate applications to the same drive are prevented
- [ ] Application is timestamped

### US-STU-03: Application Tracking
**As a** Student,
**I want to** see the real-time status of my applications,
**So that** I know where I stand in each hiring process.

**Acceptance Criteria:**
- [ ] Student dashboard shows all applications with current stage
- [ ] Stages displayed: Applied, Under Review, Shortlisted, Interview Scheduled, Selected, Rejected
- [ ] Status updates appear in real-time (or near-real-time)

### US-STU-04: View Announcements
**As a** Student,
**I want to** view placement announcements from my college,
**So that** I stay informed about upcoming opportunities.

**Acceptance Criteria:**
- [ ] Student sees announcements scoped to their tenant
- [ ] Announcements are sorted by recency

---

## Company Stories

### US-COM-01: Company Portal Login
**As a** Company HR representative,
**I want to** log in to my company portal,
**So that** I can manage drives and review candidates.

**Acceptance Criteria:**
- [ ] Company user can log in with credentials provided by TPO
- [ ] Access is scoped to drives associated with their company within the tenant
- [ ] No access to other companies' data or other tenants

### US-COM-02: Drive Configuration
**As a** Company HR representative,
**I want to** configure eligibility criteria for my drives,
**So that** only qualified students can apply.

**Acceptance Criteria:**
- [ ] Company can set: minimum CGPA, maximum backlogs, eligible departments
- [ ] Eligibility rules are enforced when students apply
- [ ] Company can update rules before drive activation

### US-COM-03: Candidate Review
**As a** Company HR representative,
**I want to** review applications and update hiring stages,
**So that** I can manage my recruitment pipeline.

**Acceptance Criteria:**
- [ ] Company sees all applications for their drives
- [ ] Can filter by stage, department, CGPA
- [ ] Can move candidates through hiring stages
- [ ] Stage transitions are validated and logged
