# 07 – Monorepo Structure

## Project: CareerNest – TP Cell Management Platform

---

## 1. Repository Overview

CareerNest uses a **monorepo** structure to co-locate the frontend, backend, and shared utilities in a single repository. This simplifies dependency management, shared type definitions, and consistent tooling.

---

## 2. Top-Level Directory Structure

```
careernest/
├── apps/
│   ├── web/                        # Remix.js Frontend
│   └── server/                     # Express.js Backend API
├── packages/
│   ├── shared/                     # Shared types, constants, utilities
│   └── config/                     # Shared configuration (ESLint, Prettier, TS)
├── docs/                           # Documentation files (these 12 docs)
├── .github/
│   └── workflows/                  # CI/CD pipelines
├── package.json                    # Root workspace config
├── turbo.json                      # Turborepo configuration (if used)
├── .env.example                    # Environment variable template
├── .gitignore
└── README.md
```

---

## 3. Frontend – `apps/web/`

```
apps/web/
├── app/
│   ├── root.tsx                    # Root layout
│   ├── entry.client.tsx            # Client entry
│   ├── entry.server.tsx            # Server entry
│   ├── routes/
│   │   ├── _auth.tsx               # Auth layout (login, etc.)
│   │   ├── _auth.login.tsx
│   │   ├── admin/                  # Super Admin portal routes
│   │   │   ├── _layout.tsx
│   │   │   ├── dashboard.tsx
│   │   │   └── tenants/
│   │   │       ├── _index.tsx
│   │   │       ├── create.tsx
│   │   │       └── $tenantId.tsx
│   │   ├── college/                # TPO portal routes
│   │   │   ├── _layout.tsx
│   │   │   ├── dashboard.tsx
│   │   │   ├── companies/
│   │   │   ├── drives/
│   │   │   ├── students/
│   │   │   ├── courses/
│   │   │   ├── announcements/
│   │   │   └── analytics.tsx
│   │   ├── student/                # Student portal routes
│   │   │   ├── _layout.tsx
│   │   │   ├── dashboard.tsx
│   │   │   ├── profile/
│   │   │   ├── drives/
│   │   │   ├── applications.tsx
│   │   │   └── announcements.tsx
│   │   └── company/                # Company portal routes
│   │       ├── _layout.tsx
│   │       ├── dashboard.tsx
│   │       ├── drives/
│   │       └── settings.tsx
│   ├── components/
│   │   ├── ui/                     # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Badge.tsx
│   │   ├── layout/                 # Layout components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   └── forms/                  # Form components
│   │       ├── DriveForm.tsx
│   │       ├── CompanyForm.tsx
│   │       └── ProfileForm.tsx
│   ├── lib/
│   │   ├── api.ts                  # API client utilities
│   │   ├── auth.ts                 # Auth helpers
│   │   └── utils.ts                # General utilities
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useTenant.ts
│   │   └── usePagination.ts
│   └── styles/
│       └── tailwind.css            # Tailwind CSS entry
├── public/                         # Static assets
├── tailwind.config.ts
├── remix.config.js
├── tsconfig.json
└── package.json
```

---

## 4. Backend – `apps/server/`

```
apps/server/
├── src/
│   ├── index.ts                    # Express app entry point
│   ├── config/
│   │   ├── appwrite.ts             # Appwrite SDK configuration
│   │   ├── env.ts                  # Environment variable loader
│   │   └── constants.ts            # Application constants
│   ├── middleware/
│   │   ├── auth.middleware.ts       # Token verification
│   │   ├── tenant.middleware.ts     # Tenant resolution
│   │   ├── role.middleware.ts       # Role enforcement
│   │   ├── permission.middleware.ts # Permission checks
│   │   ├── audit.middleware.ts      # Audit logging
│   │   ├── validate.middleware.ts   # Zod schema validation
│   │   └── rateLimit.middleware.ts  # Rate limiting
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── tenant.routes.ts
│   │   ├── company.routes.ts
│   │   ├── drive.routes.ts
│   │   ├── application.routes.ts
│   │   ├── student.routes.ts
│   │   ├── course.routes.ts
│   │   ├── announcement.routes.ts
│   │   └── analytics.routes.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── tenant.controller.ts
│   │   ├── company.controller.ts
│   │   ├── drive.controller.ts
│   │   ├── application.controller.ts
│   │   ├── student.controller.ts
│   │   ├── course.controller.ts
│   │   ├── announcement.controller.ts
│   │   └── analytics.controller.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── tenant.service.ts
│   │   ├── company.service.ts
│   │   ├── drive.service.ts
│   │   ├── application.service.ts
│   │   ├── student.service.ts
│   │   ├── scoring.service.ts       # Scoring engine
│   │   ├── email.service.ts         # Email notifications
│   │   └── analytics.service.ts
│   ├── validators/
│   │   ├── auth.schema.ts
│   │   ├── tenant.schema.ts
│   │   ├── company.schema.ts
│   │   ├── drive.schema.ts
│   │   ├── application.schema.ts
│   │   └── student.schema.ts
│   ├── jobs/
│   │   ├── queue.ts                 # Job queue setup
│   │   ├── emailJob.ts              # Email notification job
│   │   └── analyticsJob.ts          # Placement stats recalculation
│   ├── utils/
│   │   ├── errors.ts                # Custom error classes
│   │   ├── response.ts              # Standardized response helpers
│   │   └── pagination.ts            # Pagination utilities
│   └── types/
│       ├── express.d.ts             # Express type extensions
│       └── appwrite.d.ts            # Appwrite type extensions
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── tsconfig.json
└── package.json
```

---

## 5. Shared Packages – `packages/`

### `packages/shared/`

```
packages/shared/
├── src/
│   ├── types/
│   │   ├── tenant.types.ts
│   │   ├── user.types.ts
│   │   ├── drive.types.ts
│   │   ├── application.types.ts
│   │   └── common.types.ts
│   ├── constants/
│   │   ├── roles.ts                 # Role enums
│   │   ├── stages.ts                # Application stage enums
│   │   └── status.ts                # Status enums
│   └── utils/
│       ├── validation.ts
│       └── formatting.ts
├── tsconfig.json
└── package.json
```

### `packages/config/`

```
packages/config/
├── eslint/
│   └── index.js
├── prettier/
│   └── index.js
└── typescript/
    └── base.json
```

---

## 6. Key Conventions

| Convention | Rule |
|------------|------|
| File naming | `kebab-case` for files, `PascalCase` for components |
| Route files | Remix flat route convention (`_layout.tsx`, `$paramId.tsx`) |
| Middleware | All middleware in `middleware/` directory with `.middleware.ts` suffix |
| Validators | Zod schemas in `validators/` directory with `.schema.ts` suffix |
| Services | Business logic isolated in `services/` directory |
| Controllers | Route handlers in `controllers/` directory |
