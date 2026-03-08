# CareerNest — Appwrite Database Setup Guide

> **This is the authoritative checklist for all manual Appwrite configuration.**  
> Work through each section top-to-bottom. Items marked ⚠️ are required for the app to function correctly.

---

## 1. Auth — User Labels

Appwrite Auth labels are how the server derives each user's role. The **exact spelling and casing** below is mandatory.

| Label to set in Appwrite Auth | CareerNest Role |
|---|---|
| `SuperAdmin` | super_admin |
| `TPO` | tpo |
| `TPOAssistant` | tpo_assistant |
| `Student` | student |
| `Company` | company |

**How to assign:** Auth → Users → select user → Labels tab → add the label above.  
Each user should have **exactly one** label. Multiple labels are resolved by priority (SuperAdmin wins over TPO, etc.).

---

## 2. Storage Bucket

| Bucket ID | Purpose |
|---|---|
| `resumes` | Student resume file uploads |

**Settings:** Max file size `5 MB`, allowed MIME types: `application/pdf`, `image/*`.

---

## 3. Database

**Database ID:** `careernest_db`  
(Override with `APPWRITE_DATABASE_ID` env var if you use a different name.)

---

## 4. Collections

Create all collections inside `careernest_db`. Collection IDs must match the table below (or override via env vars in your `.env` file).

### 4.1 `colleges` — Tenants

| Attribute | Type | Required | Notes |
|---|---|---|---|
| `collegeId` | String (50) | ✅ | Unique per college |
| `collegeName` | String (100) | ✅ | |
| `address` | String (300) | ✅ | |
| `city` | String (100) | ✅ | |
| `state` | String (100) | ✅ | |
| `pincode` | Integer | ✅ | |
| `phone` | Integer | ✅ | |
| `email` | Email | ✅ | |
| `website` | URL | ✅ | |
| `establishedYear` | Integer | ✅ | |

**Indexes:**
| Index name | Type | Attribute |
|---|---|---|
| `collegeId_unique` | Unique | `collegeId` |

---

### 4.2 `users` — Admins (TPO / TPO Assistant accounts)

| Attribute | Type | Required | Notes |
|---|---|---|---|
| `name` | String (100) | ✅ | |
| `email` | Email | ✅ | |
| `colleges` | Relationship → `colleges` | ✅ | Many-to-one (a user belongs to one college) |
| `tenantId` | String (36) | ❌ | Legacy fallback field — keep for backwards compat |

**Indexes:**
| Index name | Type | Attribute |
|---|---|---|
| `email_idx` | Key | `email` |

---

### 4.3 `students`

> ⚠️ **Casing is critical.** `userid` is all lowercase. `CGPA` is all-caps. `backlogs` is all lowercase. Wrong casing = silent query failures.

| Attribute | Type | Required | Notes |
|---|---|---|---|
| `userid` | String (36) | ✅ | Appwrite Auth user `$id` — **all lowercase** |
| `name` | String (200) | ✅ | |
| `email` | Email | ✅ | |
| `department` | String (100) | ✅ | |
| `enrollmentYear` | Integer | ✅ | |
| `phoneNumber` | Integer | ✅ | |
| `address` | String (500) | ✅ | |
| `colleges` | Relationship → `colleges` | ✅ | Many-to-one |
| `tenantId` | String (36) | ✅ | Denormalised for fast queries |
| `CGPA` | Float | ❌ | All-caps. Used for eligibility checks |
| `backlogs` | Integer | ❌ | All lowercase. Used for eligibility checks |
| `isPlaced` | Boolean | ❌ | Default `false`. Set to `true` when stage = `selected` |

**Indexes:**
| Index name | Type | Attribute |
|---|---|---|
| `email_idx` | Key | `email` |
| `userid_idx` | Key | `userid` |
| `tenantId_idx` | Key | `tenantId` |
| `department_idx` | Key | `department` |

---

### 4.4 `companies`

| Attribute | Type | Required | Notes |
|---|---|---|---|
| `name` | String (200) | ✅ | |
| `contactEmail` | Email | ✅ | Used as login credential |
| `contactPhone` | String (15) | ✅ | |
| `contactPerson` | String (100) | ✅ | |
| `status` | Enum | ✅ | Values: `active`, `inactive` |
| `colleges` | Relationship → `colleges` | ✅ | Many-to-one |
| `tenantId` | String (36) | ❌ | Legacy fallback — keep for backwards compat |

**Indexes:**
| Index name | Type | Attribute |
|---|---|---|
| `contactEmail_idx` | Key | `contactEmail` |
| `tenantId_idx` | Key | `tenantId` |
| `status_idx` | Key | `status` |

---

### 4.5 `drives`

> ⚠️ `CGPA` and `Backlogs` are both capitalised exactly as shown. `companies` is a relationship field, not a plain string.

| Attribute | Type | Required | Notes |
|---|---|---|---|
| `companies` | Relationship → `companies` | ✅ | Many-to-one |
| `title` | String (200) | ✅ | |
| `status` | Enum | ✅ | Values: `draft`, `active`, `closed`. **Backfill existing rows to `active`.** |
| `jobLevel` | Enum | ✅ | `internship`, `entry`, `junior`, `mid`, `senior` |
| `jobType` | Enum | ✅ | `full-time`, `part-time`, `internship`, `contract`, `freelance` |
| `experience` | Enum | ✅ | `fresher`, `0-1`, `1-2`, `2-3`, `3-5`, `5+` |
| `ctcPeriod` | Enum | ✅ | `annual`, `monthly` |
| `location` | String (255) | ✅ | |
| `vacancies` | Integer | ✅ | |
| `description` | String (5000) | ❌ | Default `''` |
| `salary` | Integer | ✅ | Stored as raw number (₹/year or ₹/month per `ctcPeriod`) |
| `deadline` | Datetime | ✅ | |
| `department` | String[] (array) | ✅ | Multi-select: `CSE`, `IT`, `ECE`, `EE`, `ME`, `CE`, `Civil`, `BBA`, `MBA`, `MCA` |
| `studyingYear` | Enum | ✅ | `1st`, `2nd`, `3rd`, `4th`, `5th`, `graduate` |
| `externalLink` | URL | ❌ | Optional external application link |
| `CGPA` | Float | ✅ | **All-caps.** Minimum CGPA required |
| `Backlogs` | Integer | ✅ | **Capital B.** Maximum backlogs allowed |

**Indexes:**
| Index name | Type | Attribute |
|---|---|---|
| `status_idx` | Key | `status` |
| `deadline_idx` | Key | `deadline` |

> ⚠️ **Data backfill required:** Run the following in Appwrite Console → Databases → `drives` → Documents: set `status = "active"` on all existing drive documents that don't yet have a status value.

---

### 4.6 `applications`

| Attribute | Type | Required | Notes |
|---|---|---|---|
| `tenantId` | String (36) | ✅ | |
| `driveId` | String (36) | ✅ | Appwrite document ID of the drive |
| `studentId` | String (36) | ✅ | Appwrite **Auth** user `$id` of the student |
| `stage` | Enum | ✅ | `applied`, `under_review`, `shortlisted`, `interview_scheduled`, `selected`, `rejected` |
| `appliedAt` | Datetime | ✅ | |

**Indexes:**
| Index name | Type | Attributes | Notes |
|---|---|---|---|
| `tenantId_idx` | Key | `tenantId` | |
| `driveId_idx` | Key | `driveId` | |
| `studentId_idx` | Key | `studentId` | |
| `duplicate_check` | Unique | `tenantId`, `driveId`, `studentId` | ⚠️ Prevents duplicate applications |
| `stage_idx` | Key | `stage` | |

---

### 4.7 `courses`

| Attribute | Type | Required | Notes |
|---|---|---|---|
| `tenantId` | String (36) | ✅ | |
| `name` | String (200) | ✅ | |
| `department` | String (100) | ✅ | |

**Indexes:**
| Index name | Type | Attribute |
|---|---|---|
| `tenantId_idx` | Key | `tenantId` |

---

### 4.8 `announcements`

| Attribute | Type | Required | Notes |
|---|---|---|---|
| `tenantId` | String (36) | ✅ | |
| `title` | String (200) | ✅ | |
| `body` | String (5000) | ✅ | |
| `createdBy` | String (36) | ✅ | Appwrite Auth user `$id` of the creator |

**Indexes:**
| Index name | Type | Attribute |
|---|---|---|
| `tenantId_idx` | Key | `tenantId` |

---

### 4.9 `placement_records`

| Attribute | Type | Required | Notes |
|---|---|---|---|
| `tenantId` | String (36) | ✅ | |
| `studentId` | String (36) | ✅ | Appwrite Auth user `$id` |
| `driveId` | String (36) | ✅ | |
| `companyId` | String (36) | ✅ | Appwrite document `$id` of the company |
| `ctcOffered` | Integer | ✅ | Copied from `drives.salary` at time of selection |
| `placedAt` | Datetime | ✅ | |

**Indexes:**
| Index name | Type | Attribute |
|---|---|---|
| `tenantId_idx` | Key | `tenantId` |
| `studentId_idx` | Key | `studentId` |
| `driveId_idx` | Key | `driveId` |

---

### 4.10 `audit_logs`

| Attribute | Type | Required | Notes |
|---|---|---|---|
| `tenantId` | String (36) | ✅ | Use `"global"` for super-admin actions |
| `userId` | String (36) | ✅ | Appwrite Auth user `$id` |
| `action` | String (100) | ✅ | e.g. `DRIVE_CREATE`, `STAGE_UPDATE` |
| `resourceType` | String (50) | ✅ | e.g. `drive`, `application` |
| `resourceId` | String (36) | ✅ | |
| `metadata` | String (2000) | ❌ | JSON string with method, path, IP, user-agent |
| `timestamp` | Datetime | ✅ | |

**Indexes:**
| Index name | Type | Attribute |
|---|---|---|
| `tenantId_idx` | Key | `tenantId` |
| `userId_idx` | Key | `userId` |
| `action_idx` | Key | `action` |
| `timestamp_idx` | Key | `timestamp` |

---

## 5. Collection Permissions

All collections should have server-side only access. Apply the following to every collection:

| Permission | Value |
|---|---|
| Create | Any (API key only — no client SDK writes) |
| Read | Any (API key only) |
| Update | Any (API key only) |
| Delete | Any (API key only) |

> In Appwrite Cloud: set all document security to **OFF** and rely entirely on API Key authentication (server SDK). Your API key should have `databases.read`, `databases.write`, `users.read`, `users.write`, `teams.read`, `teams.write`, `storage.read`, `storage.write` scopes.

---

## 6. Critical Casing Reference

This is the single biggest source of bugs. Every attribute name must match exactly.

| Collection | Attribute | ✅ Correct | ❌ Wrong |
|---|---|---|---|
| `students` | Auth user ID | `userid` | `userId`, `userID` |
| `students` | Grade points | `CGPA` | `cgpa`, `Cgpa` |
| `students` | Number of backlogs | `backlogs` | `Backlogs`, `backLogs` |
| `drives` | Min CGPA required | `CGPA` | `cgpa`, `Cgpa` |
| `drives` | Max backlogs allowed | `Backlogs` | `backlogs`, `backLogs` |
| `drives` | Company relationship | `companies` | `company`, `companyId` |

---

## 7. Data Backfill (For Existing Data)

If you already have documents in the database from an earlier version, apply these fixes:

### 7.1 Add `status = "active"` to existing drives

In Appwrite Console → Databases → `careernest_db` → `drives`:
- Go through each existing document
- Set the `status` field to `"active"`

Or use the Appwrite Server SDK / REST API to bulk-update:
```javascript
// Run this once via a script using your API key
const drives = await databases.listDocuments('careernest_db', 'drives', [Query.limit(500)]);
for (const drive of drives.documents) {
    if (!drive.status) {
        await databases.updateDocument('careernest_db', 'drives', drive.$id, { status: 'active' });
    }
}
```

### 7.2 Verify `userid` casing on existing student documents

Check that the `userid` attribute (lowercase) is populated on all student documents. If you created students before this fix, the field may be missing or named differently.

---

## 8. Environment Variables Checklist

Your `.env` file (in `apps/server/.env` or root `.env`) must have all of these set before going to production:

```env
# Appwrite
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=<your-project-id>
APPWRITE_API_KEY=<your-api-key>

# Database
APPWRITE_DATABASE_ID=careernest_db

# Collections (only needed if you use non-default IDs)
COLLECTION_TENANTS=colleges
COLLECTION_ADMINS=users
COLLECTION_STUDENTS=students
COLLECTION_COMPANIES=companies
COLLECTION_DRIVES=drives
COLLECTION_APPLICATIONS=applications
COLLECTION_COURSES=courses
COLLECTION_ANNOUNCEMENTS=announcements
COLLECTION_PLACEMENT_RECORDS=placement_records
COLLECTION_AUDIT_LOGS=audit_logs

# Storage
APPWRITE_BUCKET_RESUMES=resumes

# Security — REQUIRED in production, will throw on startup if missing
JWT_SECRET=<minimum-32-char-random-string>
SESSION_SECRET=<minimum-32-char-random-string>

# SMTP
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=yourpassword
SMTP_FROM=CareerNest <noreply@yourdomain.com>

# App
NODE_ENV=production
PORT=4000
APP_URL=https://your-domain.com
```

---

## 9. Summary of Breaking Changes vs Previous Version

| # | What changed | Action required |
|---|---|---|
| 1 | `drives` got a new `status` field | Add `status` attribute (Enum) to the `drives` collection. Backfill existing rows to `"active"`. |
| 2 | Auth labels must match exact casing | Verify all existing Appwrite Auth users have labels using the exact strings in Section 1 |
| 3 | `students.userid` must be lowercase | Verify the attribute name in Appwrite is `userid` (no capital U) |
| 4 | `students.CGPA` must be all-caps | Verify the attribute name is `CGPA` in Appwrite |
| 5 | `students.backlogs` must be lowercase | Verify the attribute name is `backlogs` in Appwrite |
| 6 | `drives.CGPA` must be all-caps | Verify the attribute name is `CGPA` in Appwrite |
| 7 | `drives.Backlogs` must have capital B | Verify the attribute name is `Backlogs` in Appwrite |
| 8 | `applications` needs unique index on `tenantId+driveId+studentId` | Add the composite unique index to prevent duplicate applications |
