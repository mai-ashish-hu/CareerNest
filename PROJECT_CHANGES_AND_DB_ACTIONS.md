# CareerNest Project Changes and DB Actions

## 1. What I changed

### A. Company portal was rewritten from placeholder pages into a real authenticated app

Before:
- `/dashboard` had the shell.
- `/drives` and `/settings` were standalone public pages with placeholder content.
- Company pages mostly showed `--` values and did not use live backend data.

After:
- Added a proper pathless authenticated layout for all company pages.
- Replaced the old placeholder company pages with real data-backed routes.
- Added shared server-side company loading utilities so all company pages use the same identity and data rules.

Result:
- `/dashboard`, `/drives`, and `/settings` now all sit behind the same authenticated company layout.
- Company dashboard shows drive metrics, applications, selections, and upcoming deadlines.
- Company drives page shows real drives, real pipeline stats, and can create drives.
- Company settings page shows the actual company profile instead of placeholders.

### B. Company auth/session handling was fixed

Before:
- Company login did not reliably resolve `tenantId`.
- The JWT/session did not carry `companyId`.
- Backend company access often fell back to tenant-wide data instead of company-only data.

After:
- Login now resolves both `tenantId` and `companyId` for company users.
- Session typing now supports `companyId`.
- Express request typing now includes `companyId`.

Result:
- Company users now have enough identity context to safely scope their own data.

### C. Company access control was tightened on the backend

Before:
- A company user could potentially see tenant-wide companies and drives.
- Company drive creation was not forced to the logged-in company.
- Company application listing/stage updates were not strongly tied to the company's own drives.

After:
- Company users can only fetch their own company profile from company endpoints.
- Company drive listing is now automatically scoped to their own company.
- Company drive creation is forced to the logged-in company.
- Company application listing requires a drive and verifies that the drive belongs to that company.
- Company application stage updates now verify ownership through the drive.

Result:
- The company portal now behaves like a company-scoped portal instead of a partially tenant-wide view.

### D. Company document persistence was corrected

Before:
- Company creation did not persist `tenantId`.
- Company creation did not explicitly persist `status`.
- Some code already expected these fields to exist.

After:
- New company documents now store:
  - `tenantId`
  - `status` with default `active`

Result:
- Company listing/filtering/login lookups are now aligned with the actual stored data model.

## 2. Files changed

### Modified

- `packages/lib/src/auth.server.ts`
  - Added `SessionUser` type.
  - Added optional `companyId` support in session data.

- `packages/lib/src/index.ts`
  - Exported `SessionUser`.

- `apps/server/src/types/express.d.ts`
  - Added `companyId` to `req.user`.
  - Allowed nullable `tenantId`.

- `apps/server/src/middleware/auth.middleware.ts`
  - Reads `companyId` from JWT and attaches it to `req.user`.

- `apps/server/src/services/auth.service.ts`
  - Added company context lookup by `contactEmail`.
  - Added company-aware JWT payload creation.
  - Returns `companyId` in the login response.

- `apps/server/src/services/company.service.ts`
  - Company create now writes `tenantId` and `status`.
  - Company list now supports `status` filtering properly.

- `apps/server/src/controllers/company.controller.ts`
  - Company users can only access their own company profile.
  - Company users only receive their own company from list endpoints.

- `apps/server/src/services/drive.service.ts`
  - Added stronger company ownership checks.
  - Drive create now validates the linked company against the tenant.
  - Drive update can be company-scoped.

- `apps/server/src/controllers/drive.controller.ts`
  - Company drive create/list/get/update are now restricted to the logged-in company.

- `apps/server/src/services/application.service.ts`
  - Stage updates now optionally verify company ownership through the drive.

- `apps/server/src/controllers/application.controller.ts`
  - Company application list and stage update paths now validate drive ownership.

### Added

- `apps/web-company/app/utils/company.server.ts`
  - Shared company auth/data utilities.
  - Drive mapping helpers.
  - Application summary helpers.

- `apps/web-company/app/routes/_app.tsx`
  - New authenticated company layout route.

- `apps/web-company/app/routes/_app.dashboard.tsx`
  - New real company dashboard.

- `apps/web-company/app/routes/_app.drives.tsx`
  - New real company drives page.
  - Includes create-drive flow.

- `apps/web-company/app/routes/_app.settings.tsx`
  - New real company settings/profile page.

### Removed/Replaced

- `apps/web-company/app/routes/dashboard.tsx`
- `apps/web-company/app/routes/dashboard._index.tsx`
- `apps/web-company/app/routes/drives.tsx`
- `apps/web-company/app/routes/settings.tsx`

These were replaced by the new `_app.*` route structure.

## 3. DB work you need to do

This is the important part.

### Required collection/schema checks

You need to verify the `companies` collection in Appwrite has these attributes available and queryable:

- `tenantId`
  - type: string
  - used for company listing/filtering and admin/company scoping

- `status`
  - type: string
  - expected values: `active`, `inactive`
  - used for company filtering and admin status management

- `contactEmail`
  - type: string
  - used to resolve company login context

- `colleges`
  - existing relationship/array field already used in this project
  - still needed because some fallback tenant resolution reads from it

### Required indexes / queryability

Make sure Appwrite can query these fields on the `companies` collection:

- `contactEmail`
- `tenantId`
- `status`

If your Appwrite setup requires explicit indexes for equality filters, add them.

Reason:
- Login now resolves company context using `contactEmail`.
- Company listing/admin listing use `tenantId` and `status`.

### Required data backfill for existing company documents

For old company documents created before this fix:

1. Backfill `tenantId`
   - Set it from the existing `colleges` relationship.
   - If `colleges` is an array, use the first company-college link used by your current model.

2. Backfill `status`
   - If missing, set it to `active`.

3. Verify `contactEmail`
   - It must match the Appwrite Auth user email for that company login.
   - If it does not match, company login context resolution will fail or resolve incorrectly.

### Required data consistency checks

For each company account, verify:

1. There is exactly one company document that matches the login email in `contactEmail`.
2. That company document has a valid `tenantId`.
3. That company document has `status`.
4. Existing drives linked to that company still point to the correct company document in the `companies` relationship field.

### What you do NOT need to add

No new collection is required.

No new `companyId` field is required in the database for:
- drives
- applications
- students

`companyId` is derived from:
- the company document `$id`
- the company linked on the drive
- the company identity stored in the JWT/session

## 4. Suggested DB migration plan

### Step 1
- Confirm `companies` collection schema contains:
  - `tenantId`
  - `status`
  - `contactEmail`
  - `colleges`

### Step 2
- Add or verify indexes/query support for:
  - `contactEmail`
  - `tenantId`
  - `status`

### Step 3
- Backfill old company documents:
  - `tenantId = colleges[0]` or the equivalent linked tenant
  - `status = active` when empty/missing

### Step 4
- Verify every company auth user has a matching company document by email.

### Step 5
- Smoke test company login and these pages:
  - `/dashboard`
  - `/drives`
  - `/settings`

## 5. Verification status

I could not run the normal toolchain in this environment because `node`, `npm`, and `tsc` were not available in the sandbox.

So the verification I completed was:
- static code inspection
- route structure audit
- changed-file diff review
- backend data flow review for company login/scoping

## 6. Main risk remaining

The biggest remaining risk is Appwrite schema/index mismatch.

If `companies.tenantId`, `companies.status`, or `companies.contactEmail` are missing or not queryable in Appwrite, the new company login/data flow will not work correctly until the DB is updated.
