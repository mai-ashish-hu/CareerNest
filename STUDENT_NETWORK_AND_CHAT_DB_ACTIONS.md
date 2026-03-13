# Student Network and Chat DB Actions

## 1. What changed

The student profile feature is now split into:

- immutable identity in `students`
- editable LinkedIn-style summary data in `student_profiles`
- structured child tables for skills, achievements, education, experience, and projects
- campus-scoped chat tables for internal student communication

For Appwrite schema setup, use Appwrite-native column types instead of the deprecated `string` type:

- use `varchar` for short searchable text
- use `text` for paragraphs and descriptions
- use `float` / `integer` for numeric values
- use `boolean` for flags
- use `datetime` for actual dates
- use `email` and `url` where validation matters
- use `enum` for controlled value sets
- use `relationship` for cross-table linking

Do not use:

- `string` because it is deprecated
- `point`, `line`, `polygon`, or `ip` because they are not needed for this feature

Important implementation note:

- keep scalar IDs like `tenantId`, `studentId`, `channelId`, and `senderStudentId` because the current backend already filters on those fields
- add `relationship` columns alongside those scalar IDs so Appwrite can load connected data from `students`
- Appwrite currently treats relationships as experimental, so scalar IDs should remain the stable query path until the app is fully migrated
- for optional `url`, `float`, `integer`, and `datetime` columns, write `null` when empty, not `''`

## 2. Keep and expand `students`

These remain managed by the college/admin side and are not student-editable.

| Column | Appwrite type | Notes |
|---|---|---|
| `$id` | row/document ID | Keep using the student ID as the primary identifier. |
| `name` | `varchar(200)` | Student full name. |
| `email` | `email` | Identity email; keep private in public profile responses. |
| `departements` or `department` | `relationship -> departments` | Existing many-to-one academic department link. Keep the current field name already used in your project. |
| `colleges` | `relationship -> colleges` | Existing many-to-one tenant source of truth. |
| `tenantId` | `varchar(128)` | Optional compatibility mirror of `colleges.$id` for filters that still expect scalar tenant IDs. |
| `enrollmentYear` | `integer` | Keep numeric if already present. |
| other college-issued metadata | `integer` / `datetime` / `enum` / `varchar` | Pick the narrowest type per field instead of defaulting to text. |

Add these relationship columns on `students` so the student row can load all related profile data:

| Relationship column on `students` | Target table | Type | On delete | Notes |
|---|---|---|---|---|
| `profile` | `student_profiles` | `relationship`, two-way, one-to-one | `cascade` | Inverse column on `student_profiles`: `student`. |
| `skills` | `student_profile_skills` | `relationship`, two-way, one-to-many | `cascade` | Inverse column on `student_profile_skills`: `student`. |
| `achievements` | `student_profile_achievements` | `relationship`, two-way, one-to-many | `cascade` | Inverse column on `student_profile_achievements`: `student`. |
| `educationRecords` | `student_profile_education` | `relationship`, two-way, one-to-many | `cascade` | Inverse column on `student_profile_education`: `student`. |
| `experienceRecords` | `student_profile_experience` | `relationship`, two-way, one-to-many | `cascade` | Inverse column on `student_profile_experience`: `student`. |
| `projects` | `student_profile_projects` | `relationship`, two-way, one-to-many | `cascade` | Inverse column on `student_profile_projects`: `student`. |
| `chatMessages` | `campus_chat_messages` | `relationship`, two-way, one-to-many | `set null` | Inverse column on `campus_chat_messages`: `senderStudent`. Keep chat history even if a student is removed. |

Do not add a direct `students -> campus_chat_channels` relationship. Channels are tenant-scoped, not student-owned.

## 3. New Appwrite tables / collections to create

### 3.1 `student_profiles`

One row per student. Recommended row/document ID: `studentId`.

| Column | Appwrite type | Required | Notes |
|---|---|---|---|
| `studentId` | `varchar(128)` | yes | Scalar mirror of the student row ID for current backend filters and direct lookup. |
| `student` | `relationship -> students` | yes | Two-way with `students.profile`, one-to-one, `cascade` on delete. |
| `tenantId` | `varchar(128)` | yes | Scalar tenant filter used throughout the current backend. |
| `headline` | `varchar(120)` | no | Short public headline. |
| `about` | `text(1200)` | no | Public profile summary. |
| `city` | `varchar(120)` | no | Display city. |
| `currentYear` | `enum` | no | Recommended values: `1st Year`, `2nd Year`, `3rd Year`, `4th Year`, `5th Year`, `Graduate`. |
| `cgpa` | `float` | no | Store as numeric value, not text. |
| `profilePicture` | `url` | no | Avatar/profile image URL. |
| `searchableName` | `varchar(200)` | yes | Lowercased normalized student name. |

Recommended indexes / queryability:

- `studentId` unique or key index
- `tenantId` key index
- `tenantId + searchableName` composite key index

### 3.2 `student_profile_skills`

One row per skill entry, not one long comma-separated skills string.

| Column | Appwrite type | Required | Notes |
|---|---|---|---|
| `studentId` | `varchar(128)` | yes | Scalar mirror for current filters. |
| `student` | `relationship -> students` | yes | Two-way with `students.skills`, many-to-one, `cascade` on delete. |
| `tenantId` | `varchar(128)` | yes | Tenant filter. |
| `skill` | `text(16383)` | yes | Free-text skill label with the full Appwrite `text` column size. Use this for anything from `Python` and `C++` to long custom skill names or stacked labels. |
| `sortOrder` | `integer` | yes | Preserve display order. |

Recommended indexes / queryability:

- `studentId` key index
- `tenantId` key index
- `studentId + sortOrder` composite key index

### 3.3 `student_profile_achievements`

One row per achievement.

| Column | Appwrite type | Required | Notes |
|---|---|---|---|
| `studentId` | `varchar(128)` | yes | Scalar mirror for current filters. |
| `student` | `relationship -> students` | yes | Two-way with `students.achievements`, many-to-one, `cascade` on delete. |
| `tenantId` | `varchar(128)` | yes | Tenant filter. |
| `title` | `varchar(120)` | yes | Achievement title. |
| `description` | `text(500)` | yes | Public summary. |
| `certificateUrl` | `url` | no | Certificate/proof link. |
| `sortOrder` | `integer` | yes | Preserve display order. |

Recommended indexes / queryability:

- `studentId` key index
- `tenantId` key index
- `studentId + sortOrder` composite key index

### 3.4 `student_profile_education`

One row per education entry.

| Column | Appwrite type | Required | Notes |
|---|---|---|---|
| `studentId` | `varchar(128)` | yes | Scalar mirror for current filters. |
| `student` | `relationship -> students` | yes | Two-way with `students.educationRecords`, many-to-one, `cascade` on delete. |
| `tenantId` | `varchar(128)` | yes | Tenant filter. |
| `level` | `enum` | yes | Recommended values: `class_10`, `class_12`, `diploma`, `btech`, `mtech`, `bca`, `mca`, `bsc`, `msc`, `mba`, `phd`, `other`. |
| `institution` | `varchar(160)` | no | School/college/institute name. |
| `board` | `varchar(120)` | no | Board or university. |
| `department` | `varchar(120)` | no | Academic department label for the record. |
| `branch` | `varchar(120)` | no | Branch or specialization. |
| `currentYear` | `enum` | no | Use the same values as `student_profiles.currentYear` when the record represents the current degree. |
| `graduationYear` | `integer` | no | Graduation year as a number. |
| `cgpa` | `float` | no | Numeric GPA/CGPA when applicable. |
| `marks` | `float` | no | Percentage or marks as a numeric value. |
| `year` | `integer` | no | Passing year when applicable. |
| `sortOrder` | `integer` | yes | Preserve display order. |

Recommended indexes / queryability:

- `studentId` key index
- `tenantId` key index
- `studentId + sortOrder` composite key index

### 3.5 `student_profile_experience`

One row per experience entry.

| Column | Appwrite type | Required | Notes |
|---|---|---|---|
| `studentId` | `varchar(128)` | yes | Scalar mirror for current filters. |
| `student` | `relationship -> students` | yes | Two-way with `students.experienceRecords`, many-to-one, `cascade` on delete. |
| `tenantId` | `varchar(128)` | yes | Tenant filter. |
| `title` | `varchar(120)` | yes | Role or internship title. |
| `company` | `varchar(120)` | yes | Company or organization name. |
| `description` | `text(600)` | yes | Experience summary. |
| `start` | `datetime` | yes | Store as ISO 8601. If only month/year is known, normalize to the first day of that month. |
| `end` | `datetime` | no | Nullable for ongoing roles. |
| `certificateUrl` | `url` | no | Proof/certificate link. |
| `sortOrder` | `integer` | yes | Preserve display order. |

Recommended indexes / queryability:

- `studentId` key index
- `tenantId` key index
- `studentId + sortOrder` composite key index
- `start` key index if you want chronological sorting at DB level

### 3.6 `student_profile_projects`

One row per project.

| Column | Appwrite type | Required | Notes |
|---|---|---|---|
| `studentId` | `varchar(128)` | yes | Scalar mirror for current filters. |
| `student` | `relationship -> students` | yes | Two-way with `students.projects`, many-to-one, `cascade` on delete. |
| `tenantId` | `varchar(128)` | yes | Tenant filter. |
| `title` | `varchar(120)` | yes | Project title. |
| `shortDescription` | `text(500)` | yes | Public description. |
| `technologiesUsed` | `varchar(50)[]` | no | Array of technology tags. |
| `projectUrl` | `url` | no | Live project/demo link. |
| `repositoryUrl` | `url` | no | Git repository link. |
| `sortOrder` | `integer` | yes | Preserve display order. |

Recommended indexes / queryability:

- `studentId` key index
- `tenantId` key index
- `studentId + sortOrder` composite key index

### 3.7 `campus_chat_channels`

Channels are tenant-scoped. Default channels are created by the server when this table exists.

| Column | Appwrite type | Required | Notes |
|---|---|---|---|
| `tenantId` | `varchar(128)` | yes | Tenant filter. |
| `slug` | `varchar(80)` | yes | Stable channel key such as `general`, `placements`, `projects`. |
| `name` | `varchar(80)` | yes | Display name. |
| `description` | `text(255)` | no | Channel description. |
| `isDefault` | `boolean` | yes | Marks system-created default channels. |
| `messages` | `relationship -> campus_chat_messages` | no | Optional inverse of `campus_chat_messages.channel` if you create the channel/message relationship as two-way. |

Recommended indexes / queryability:

- `tenantId` key index
- `tenantId + slug` unique index

### 3.8 `campus_chat_messages`

| Column | Appwrite type | Required | Notes |
|---|---|---|---|
| `tenantId` | `varchar(128)` | yes | Tenant filter. |
| `channelId` | `varchar(128)` | yes | Scalar mirror for current channel filters. |
| `channel` | `relationship -> campus_chat_channels` | yes | Many-to-one. If you use a two-way relationship, inverse column on channels is `messages`. Use `cascade` so deleting a channel deletes its messages. |
| `senderStudentId` | `varchar(128)` | yes | Scalar mirror for current sender filters and message ownership checks. |
| `senderStudent` | `relationship -> students` | no | Two-way with `students.chatMessages`, many-to-one, `set null` on delete. |
| `senderName` | `varchar(200)` | yes | Denormalized snapshot so old messages stay readable. |
| `senderDepartmentName` | `varchar(120)` | no | Denormalized department snapshot. |
| `senderProfilePicture` | `url` | no | Denormalized avatar snapshot. |
| `body` | `text(1000)` | yes | Message body. |

Recommended indexes / queryability:

- `tenantId` key index
- `channelId` key index
- `senderStudentId` key index
- `$createdAt` key index
- `tenantId + channelId + $createdAt` composite key index

## 4. Firebase document to typed table mapping

Use the previous nested Firebase document like this:

- `about` -> `student_profiles.about` (`text`)
- `academicInfo.currentYear` -> `student_profiles.currentYear` (`enum`)
- `academicInfo.cgpa` -> `student_profiles.cgpa` (`float`)
- `city` -> `student_profiles.city` (`varchar`)
- `profilePicture` -> `student_profiles.profilePicture` (`url`)
- `skills[]` -> `student_profile_skills.skill` (`text`)
- `achievements[]` -> `student_profile_achievements`
- `education[]` -> `student_profile_education`
- `experience[]` -> `student_profile_experience`
- `projects[]` -> `student_profile_projects`

Migration conversions you should do during backfill:

- parse CGPA and marks into numbers before writing `float` columns
- parse `graduationYear` and `year` into numbers before writing `integer` columns
- convert experience `start` / `end` values into ISO 8601 before writing `datetime` columns
- write `null` for missing optional URLs or dates instead of empty strings
- create both the scalar ID columns and the relationship columns during import

Do not migrate private contact fields into the public profile tables:

- `contactInfo.email`
- phone numbers
- addresses
- passwords

Keep email only in the existing `students` identity record.

## 5. Privacy, tenant rules, and relationship loading

The backend now enforces these rules:

- a student can only search the directory inside their own `tenantId`
- a student can only open public profiles inside their own `tenantId`
- peer profile responses hide email and other contact details
- campus chat channels and messages are tenant-scoped

To preserve that behavior:

- every new table above must keep a scalar `tenantId`
- all list and detail queries should keep filtering by `tenantId`
- relationships help navigation, but the tenant filter still comes from scalar columns in the current backend
- Appwrite relationship loading is opt-in, so select relationship fields explicitly when you want linked rows returned

## 6. Deployment checklist

1. Keep the current `students.colleges` and `students.departements` relationships.
2. Add the new `students` relationship columns for profile, skills, achievements, education, experience, projects, and chat messages.
3. Create the eight new student network / chat tables listed above.
4. Add the typed columns exactly as listed above. Do not use deprecated `string`.
5. Add indexes for `tenantId`, `studentId`, `channelId`, `senderStudentId`, `sortOrder`, `slug`, and `searchableName` where noted.
6. Backfill legacy Firebase profile data into the new tables and convert old string values to `float`, `integer`, `datetime`, `enum`, `url`, and `email` as needed.
7. Add the new table / collection IDs to `.env` for the server.
8. Smoke test:
   - `/profile`
   - `/network`
   - `/network/:studentId`
   - `/chat`

## 7. Important fallback behavior

Until the new tables exist:

- read paths fall back to legacy top-level student profile fields where available
- edit and chat write paths will fail with a setup error message

That is intentional so production reads do not crash during migration, but writes only start after the schema is actually provisioned.
