# CareerNest Database Changes

All changes to the Appwrite database schema are documented here.
Each entry includes: what changed, why, and migration instructions.

---

## Change Log

---

### [2026-03-13] v2.0 — Courses System Expansion

#### Collection: `courses`

**Added Fields:**

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `courseType` | enum(`video`, `link`, `livestream`) | Yes | `link` | Determines what content this course provides |
| `contentLink` | url | No | — | Used when `courseType = link` |
| `videoFileId` | varchar | No | — | Appwrite Storage file ID when `courseType = video` |
| `streamUrl` | url | No | — | External livestream URL (YouTube Live, Zoom, etc.) when `courseType = livestream` |
| `streamStartTime` | datetime | No | — | Scheduled start time for livestreams |
| `thumbnailUrl` | url | No | — | Optional thumbnail image URL |
| `instructor` | varchar | No | — | Name of the instructor/creator |
| `tenantId` | varchar | Yes | — | Tenant isolation (was missing) |
| `department` | varchar | No | — | Optional department restriction |
| `isPublished` | boolean | Yes | `true` | Whether course is visible to students |

**Why:** The original courses collection only had `name` and `department`, with no actual content delivery mechanism. It had no way to store videos, links, or livestream URLs. This expansion enables the full courses module.

**Migration:**
```
1. In Appwrite Console, open Database → careernest_db → courses collection
2. Add attribute: courseType (enum, required, values: video,link,livestream, default: link)
3. Add attribute: contentLink (URL, optional)
4. Add attribute: videoFileId (varchar 2083, optional)
5. Add attribute: streamUrl (URL, optional)
6. Add attribute: streamStartTime (datetime, optional)
7. Add attribute: thumbnailUrl (URL, optional)
8. Add attribute: instructor (varchar 255, optional)
9. Add attribute: department (varchar 255, optional)
10. Add attribute: isPublished (boolean, required, default: true)
11. Ensure tenantId (varchar 255, required) exists — add if missing
12. Create index: [tenantId, courseType] for filtered queries
```

---

### [2026-03-13] v2.0 — Interviews Collection (New)

#### Collection: `interviews` (NEW)

**Purpose:** Track scheduled interviews for placement drives.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `$id` | string | Auto | Appwrite document ID |
| `tenantId` | varchar(255) | Yes | Tenant isolation |
| `applicationId` | varchar(255) | Yes | Link to application |
| `driveId` | varchar(255) | Yes | Link to drive |
| `studentId` | varchar(255) | Yes | Link to student |
| `companyId` | varchar(255) | Yes | Link to company |
| `scheduledAt` | datetime | Yes | When interview is scheduled |
| `durationMinutes` | integer | No | Expected duration (default 60) |
| `format` | enum(`video_call`, `in_person`, `phone`) | Yes | Interview format |
| `roomId` | varchar(255) | No | For video_call — unique room identifier for interview platform |
| `meetingLink` | url | No | External meeting link (Zoom, Meet) or internal interview platform URL |
| `interviewerName` | varchar(255) | No | Name of interviewer |
| `interviewerEmail` | email | No | Email of interviewer |
| `notes` | text | No | Notes for the candidate |
| `status` | enum(`scheduled`, `ongoing`, `completed`, `cancelled`) | Yes | Current status |
| `recordingFileId` | varchar(255) | No | Appwrite Storage file ID of recording (future) |
| `feedback` | text | No | Post-interview feedback (internal) |
| `result` | enum(`pending`, `pass`, `fail`) | No | Interview outcome |
| `$createdAt` | datetime | Auto | Created timestamp |
| `$updatedAt` | datetime | Auto | Updated timestamp |

**Migration:**
```
1. In Appwrite Console, create new collection: interviews
2. Set collection ID: interviews
3. Add all fields as described above
4. Create indexes:
   - [tenantId] — for tenant isolation queries
   - [applicationId] — for per-application lookup
   - [driveId] — for per-drive listing
   - [studentId] — for student schedule view
   - [status] — for filtering by status
   - [scheduledAt] — for chronological ordering
5. Set permissions: Any authenticated user in the tenant can read their own interviews
```

---

### [2026-03-13] v2.0 — Interview Signals Collection (New)

#### Collection: `interview_signals` (NEW)

**Purpose:** WebRTC signaling for the real-time video interview platform. Stores ephemeral signaling messages (offers, answers, ICE candidates) for peer-to-peer connection establishment.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `$id` | string | Auto | Appwrite document ID |
| `roomId` | varchar(255) | Yes | Interview room identifier (matches `interviews.roomId`) |
| `senderId` | varchar(255) | Yes | User ID of the signal sender |
| `senderName` | varchar(255) | No | Display name of sender |
| `type` | enum | Yes | Signal type: `join`, `offer`, `answer`, `candidate`, `chat`, `mute_status`, `leave` |
| `targetId` | varchar(255) | No | Specific recipient user ID (null = broadcast to all) |
| `data` | text | Yes | JSON-encoded signal payload |
| `$createdAt` | datetime | Auto | Created timestamp (used for polling) |

**Why:** The interview platform uses HTTP polling-based WebRTC signaling instead of WebSockets for simplicity. This collection stores short-lived signals that peers poll for. Signals older than 5 minutes can be automatically cleaned up.

**Migration:**
```
1. In Appwrite Console, create new collection: interview_signals
2. Set collection ID: interview_signals
3. Add attributes:
   - roomId (varchar 255, required)
   - senderId (varchar 255, required)
   - senderName (varchar 255, optional)
   - type (varchar 50, required)
   - targetId (varchar 255, optional)
   - data (text, required)
4. Create indexes:
   - [roomId, $createdAt] — for polling new signals by room
   - [roomId] — for room cleanup
5. Set permissions: Any authenticated user can read/write (signals are filtered by roomId access)
6. Consider TTL: Signals can be cleaned up after 5-10 minutes via scheduled function
```

---

### [2026-03-13] v2.0 — Users Collection: Department Scope for TPO_ASSISTANT

#### Collection: `users`

**Added Fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `departmentId` | varchar(255) | No | For `tpo_assistant` role — restricts to a single department |
| `tenantId` | varchar(255) | No | Explicit tenant ID (for faster queries, in addition to relationship) |

**Why:** TPO_ASSISTANT users need to be scoped to a specific department. Without this field, there's no way to determine which department a TPO_ASSISTANT is responsible for. This enables proper data isolation in the college portal.

**Migration:**
```
1. In Appwrite Console, open users collection
2. Add attribute: departmentId (varchar 255, optional)
3. Add attribute: tenantId (varchar 255, optional) — if not already present
4. For existing TPO_ASSISTANT users, manually set their departmentId
5. Create index: [departmentId] for filtered queries
```

---

### [2026-03-13] v2.0 — Students Collection: Additional Fields

#### Collection: `students`

**Added Fields:**

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `tenantId` | varchar(255) | Yes | — | Direct tenant ID for faster queries (was only via relationship) |
| `isPlaced` | boolean | No | `false` | Track placement status |
| `enrollmentNumber` | varchar(100) | No | — | Official enrollment/roll number |
| `currentYear` | integer | No | — | Current academic year (1-5) |
| `cgpa` | double | No | — | Current CGPA |
| `backlogs` | integer | No | `0` | Number of active backlogs |
| `departmentName` | varchar(255) | No | — | Denormalized for faster queries |

**Why:** Several service files reference `student.isPlaced`, `student.tenantId`, and `student.cgpa` but these fields were not in the original schema. Adding them prevents runtime errors.

**Migration:**
```
1. In Appwrite Console, open students collection
2. Add attribute: tenantId (varchar 255, optional) — add if missing
3. Add attribute: isPlaced (boolean, optional, default: false)
4. Add attribute: enrollmentNumber (varchar 100, optional)
5. Add attribute: currentYear (integer, optional)
6. Add attribute: cgpa (double, optional)
7. Add attribute: backlogs (integer, optional, default: 0)
8. Add attribute: departmentName (varchar 255, optional)
9. Create index: [tenantId, isPlaced] for placement analytics
10. Create index: [tenantId, departmentName] for department filtering
```

---

### [2026-03-13] v2.0 — Drives Collection: Status & Tenant Fields

#### Collection: `drives`

**Added Fields:**

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `status` | enum(`active`, `closed`, `draft`) | No | `active` | Drive status |
| `tenantId` | varchar(255) | No | — | Direct tenant ID for faster queries |

**Why:** The application service references `drive.status` but the original drives schema had no status field. The tenantId field allows direct tenant filtering without join queries.

**Migration:**
```
1. In Appwrite Console, open drives collection
2. Add attribute: status (enum, values: active,closed,draft, optional, default: active)
3. Add attribute: tenantId (varchar 255, optional)
4. Create index: [tenantId, status] for filtered queries
5. Backfill: UPDATE all existing drives SET status = 'active'
```

---

### [2026-03-13] v2.0 — Applications Collection: Additional Fields

#### Collection: `applications`

**Added Fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `phoneNumber` | varchar(20) | No | Student phone at time of application |
| `currentCity` | varchar(255) | No | Student current city at time of application |
| `degree` | varchar(255) | No | Degree being pursued |
| `branch` | varchar(255) | No | Branch/specialization |
| `academicYear` | varchar(50) | No | Academic year (e.g., "2023-24") |
| `graduationYear` | integer | No | Expected graduation year |
| `cgpa` | double | No | CGPA at time of application |
| `hasBacklogs` | boolean | No | Whether student has active backlogs |
| `backlogCount` | integer | No | Number of backlogs |
| `skills` | text | No | Comma-separated skills |
| `coverLetter` | text | No | Optional cover letter |
| `resumeFileId` | varchar(255) | No | Appwrite Storage file ID for resume |

**Why:** The application service (`applicationService.create`) already saves these fields but the original schema only had `tenantId`, `driveId`, `studentId`, `stage`, and `appliedAt`. Without these fields, Appwrite will reject the document creation.

**Migration:**
```
1. In Appwrite Console, open applications collection
2. Add all attributes listed above (all optional)
3. Create index: [tenantId, driveId] for drive-specific application queries
4. Create index: [studentId, tenantId] for student's own applications
```

---

### [2026-03-13] v2.0 — Storage Buckets

**New Bucket: `course_videos`**
- Purpose: Store uploaded course video files
- Max file size: 500MB
- Allowed extensions: mp4, webm, ogg, avi, mov
- Permissions: Authenticated read, TPO/admin write

**Why:** The courses system needs a dedicated bucket for video uploads separate from resumes and profile photos.

**Migration:**
```
1. In Appwrite Console, go to Storage
2. Create bucket: course_videos
3. Set max file size: 500MB
4. Add allowed extensions: mp4, webm, ogg, avi, mov
5. Set read permissions: users (authenticated)
6. Set write permissions: team (tpo, tpo_assistant, admin)
```

---

## Summary of All Collections Status

| Collection | Status | Changes in v2.0 |
|-----------|--------|----------------|
| announcements | ✅ Unchanged | — |
| applications | ⚠️ Updated | Added 12 application data fields |
| audit_logs | ✅ Unchanged | — |
| campus_chat_channels | ✅ Unchanged | — |
| campus_chat_messages | ✅ Unchanged | — |
| colleges | ✅ Unchanged | — |
| companies | ✅ Unchanged | — |
| courses | ⚠️ Updated | Added 10 content delivery fields |
| departments | ✅ Unchanged | — |
| drives | ⚠️ Updated | Added status, tenantId |
| **interviews** | 🆕 New | Full new collection |
| **interview_signals** | 🆕 New | WebRTC signaling for video calls |
| placement_records | ✅ Unchanged | — |
| students | ⚠️ Updated | Added tenantId, isPlaced, academic fields |
| student_profiles | ✅ Unchanged | — |
| student_profile_achievements | ✅ Unchanged | — |
| student_profile_education | ✅ Unchanged | — |
| student_profile_experience | ✅ Unchanged | — |
| student_profile_projects | ✅ Unchanged | — |
| student_profile_skills | ✅ Unchanged | — |
| users | ⚠️ Updated | Added departmentId, tenantId |

---

## Appwrite Index Recommendations

For optimal query performance, create these composite indexes:

```
students:     [tenantId]                    — tenant filtering
students:     [tenantId, isPlaced]          — placement analytics
students:     [tenantId, departmentName]    — department analytics
applications: [tenantId, driveId]           — drive applications
applications: [tenantId, studentId]         — student applications
applications: [tenantId, stage]             — stage filtering
drives:       [tenantId, status]            — active drives
courses:      [tenantId, courseType]        — course type filtering
courses:      [tenantId, isPublished]       — published courses
interviews:   [tenantId, studentId]         — student interviews
interviews:   [tenantId, driveId]           — drive interviews
interviews:   [tenantId, scheduledAt]       — chronological listing
interview_signals: [roomId, $createdAt]    — polling new signals
interview_signals: [roomId]                — room cleanup
```
