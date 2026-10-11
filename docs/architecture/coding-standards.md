# Momentum — Coding Standards

## Scope and precedence

Reconciled on 2026-10-11 with [AGENTS.md](../../AGENTS.md), TypeScript/ESLint/Prettier configuration,
and implementation sources. This document consolidates monolith
[section 16](../archive/architecture-original.md#16-coding-standards), the relevant security and
performance material from [section 14](../archive/architecture-original.md#14-security--performance),
and [section 15](../archive/architecture-original.md#15-testing-strategy).
Enforced rules, contributor conventions, and future recommendations are identified separately.

Documentation, identifiers, code comments, and commit messages are English. Application-facing
labels, validation messages, and toasts are French. Existing English transport errors and root
HTML language metadata are not proof that every user-facing string already follows this convention.

## TypeScript rules

Source: [tsconfig.base.json](../../tsconfig.base.json),
[API config](../../apps/api/tsconfig.json), [web config](../../apps/web/tsconfig.json), and
[shared config](../../packages/shared/tsconfig.json).

- `strict: true`; `noUncheckedIndexedAccess`, `noImplicitOverride`,
  `noPropertyAccessFromIndexSignature`, and `noFallthroughCasesInSwitch` are enabled.
- Narrow indexed values before use; use bracket notation for index-signature properties.
- Explicit `any` is an ESLint error. Use meaningful domain types, generics, or `unknown` with
  validation/narrowing; do not hide missing validation behind unsafe casts.
- API/shared target ES2022 with `NodeNext`; web targets ES2017 with `esnext` modules,
  `bundler` resolution, DOM libraries, JSX preservation, and `noEmit`.
- API relative imports **must use `.js` extensions**, including generated Prisma client imports.
  This is the contributor convention even though current output is CommonJS; do not describe
  the API as a fully ESM package (its manifest has no `type: "module"`).
- Web imports use aliases or extensionless relative paths. `@/*` maps to web `src/*`;
  `@shared/*` maps to shared source in API/web. Prefer public `@momentum/shared` exports for
  shared contracts. TypeScript aliases alone do not configure Node runtime resolution.
- Return types on public functions are useful where they clarify contracts, but
  `explicit-function-return-type` is **off**, not an enforced export rule.

### Naming and imports

<!-- prettier-ignore -->
| Item | Convention | Example |
| --- | --- | --- |
| Variables/functions | camelCase | `getToday` |
| Components/types/interfaces | PascalCase | `ExerciseCard`, `AuthRequest` |
| Constants | UPPER_SNAKE_CASE | `MUSCLE_GROUPS` |
| Files | kebab-case | `workout-builder.tsx` |
| API files | Domain suffix | `auth.routes.ts`, `auth.service.ts`, `auth.schema.ts` |
| Hooks | `use-*.ts` | `use-wake-lock.ts` |
| Schemas | camelCase + `Schema` | `registerSchema` |
| Inferred input types | PascalCase + `Input`/`FormData` | `RegisterInput` |

API import order: side effects, external packages, shared types, local modules with `.js`.

```typescript
import "dotenv/config";
import express from "express";
import type { HealthCheckResponse } from "@momentum/shared";
import { prisma } from "./lib/prisma.js";
```

Web order: `"use client"` when needed, React, internal components, stores, API/lib, external
utilities. Use `import type` for type-only imports where appropriate. Feature folders may expose
barrel `index.ts` exports; preserve their existing organization.

## Formatting and lint enforcement

[.prettierrc](../../.prettierrc): semicolons, double quotes, two-space indentation, ES5 trailing
commas, `printWidth: 100`, bracket spacing, and parentheses around arrow parameters. Print width
is a formatter target, not a hard ban on long Markdown tables/URLs.
[.prettierignore](../../.prettierignore) excludes `node_modules`, `dist`, `.next`, and `*.lock`.

[.eslintrc.js](../../.eslintrc.js) uses `eslint:recommended`,
`plugin:@typescript-eslint/recommended`, and `prettier` (conflicting-rule suppression, not a
Prettier execution plugin). It enforces unused-variable errors with `_` exemptions for arguments
and variables, and `no-explicit-any: error`. It does not enable the monolith's strict type-checked
presets, mandatory return types, or `no-console` rule.

All workspace lint scripts target `src`; root `scripts/`, Prisma seed/config, and Markdown are
not covered by those ESLint commands. Ignored paths also include `*.config.js` and `*.config.mjs`.
Web lint uses `eslint src --ext .ts,.tsx`; **`next lint` no longer exists in Next.js 16**, and
`next build` does not replace the separate lint step.

## Frontend conventions

- Compose feature components from existing Shadcn/Radix primitives; keep hooks, handlers, and
  rendering readable. Add `"use client"` for interactive components requiring client APIs.
- Auth uses Zustand `persist`; the session state machine uses plain Zustand `create` with API
  reload and partial manual `localStorage` recovery for selected rest/result metadata. Do not claim
  whole-store persistence or guaranteed offline recovery. Local UI state uses React hooks;
  forms use React Hook Form and Zod. API calls live in `src/lib/api/*.ts`.
- Browser requests use `/backend`, forwarded by the
  [route handler](../../apps/web/src/app/backend/[...path]/route.ts). The separate
  [proxy.ts](../../apps/web/src/proxy.ts) handles page redirects.
- Keep planned and `ad_hoc` sessions distinct; `WorkoutSession.workoutId`, `workout`, and
  session template links can be null. Do not dereference a template on ad-hoc paths.
- Root theme is dark. Read persisted `User.accentColor` through the existing accent provider;
  use semantic `primary`, `primary-foreground`, and `ring` tokens instead of fixed selected colors.
- Log actionable error context and display a French toast/message. Do not silently turn a failed
  mutation into success; deliberate best-effort cleanup or invalid-token handling may be explicit.
- Recommended performance practice: narrow data fetches, defer heavy optional UI, and use
  Next.js image optimization where suitable. Automatic route splitting is available; blanket
  claims of React Query caching or offline PWA support are incorrect.

## Backend conventions

- Each domain route file exports a default Express Router. Mount paths are defined in
  [src/index.ts](../../apps/api/src/index.ts), **without an `/api/v1` prefix**.
- Validate request boundaries with schemas in `src/schemas`; use `.parse()` and handle `ZodError`.
  Keep reusable domain logic in existing service modules; no generic controller layer or global
  error/validation middleware is currently present.
- Apply `authMiddleware` to protected routes and scope private reads/writes to the authenticated
  user's ID. `AuthRequest.userId`/`userEmail` are optional in the type and set after verification;
  do not accept ownership from an untrusted request body.
- Use the singleton generated Prisma client with PostgreSQL adapter. Preserve actual relation
  nullability and cascading behavior; use transactions for multi-write operations that must be atomic.
- Current email/coaching modules eagerly construct SDK clients before the API listener starts.
  Optional feature labels do not imply missing-key startup is supported; see the
  [initialization defect](deployment.md#eager-integration-initialization-defect). Guarded/lazy client
  initialization is recommended future code work, not an implemented convention or tested fix.
- Prisma model names are singular PascalCase, field names camelCase, and mapped PostgreSQL
  tables/columns snake_case. Review **SQL migrations as well as the Prisma schema**: SQL-only
  checks and partial indexes are not fully represented in the schema.
- Select only needed fields, retain user filters and bounded pagination, and add indexes based
  on measured query patterns. There is no universal default list limit or blanket SQL/XSS guarantee.
  Prisma and React defaults do not protect arbitrary raw SQL or unsafe HTML injection.

## API contracts and errors

The prevailing error shape is:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [{ "field": "email", "message": "Invalid email format" }]
  }
}
```

Return suitable route-specific status codes; log internal failures and keep transport responses
free of credentials/internal diagnostics. Codes and `formatZodError` helpers are generally local
to route files, not a single shared error-class hierarchy.

Success envelopes vary in current code: auth returns `{ user, accessToken, expiresAt }`, sessions
commonly return `{ data }`, individual measurements return the object directly, and measurement
lists return `{ data, pagination: { page, limit, total, totalPages } }`. Session lists use
`limit`/`offset`. Follow the endpoint's actual contract and its client, not an invented global wrapper.

The shared [ApiResponse type](../../packages/shared/src/types/index.ts) still has
`success`, optional `data`, and string `error`; it does not model all implemented responses.
Shared `Date` types also need care at JSON boundaries (wire dates are strings). Harmonization is
recommended future contract work, not a completed change. See [API specification](api-spec.md).

## Authentication and security: implemented behavior

Sources: [auth service](../../apps/api/src/services/auth.service.ts),
[auth middleware](../../apps/api/src/middleware/auth.middleware.ts),
[auth routes](../../apps/api/src/routes/auth.routes.ts), and
[auth store](../../apps/web/src/stores/auth.ts).

- Application passwords use bcrypt cost **12**; the development seed separately uses cost 10.
- Login/register return `accessToken`; the store calls its internal field **`token`** and sends
  `Authorization: Bearer <token>`. JWT duration is hardcoded to seven days; `JWT_EXPIRES_IN` is
  not a consumed environment setting.
- Auth state is persisted in `localStorage` and a JavaScript-written `auth-storage` cookie with
  `Path=/`, seven-day max age, and `SameSite=Lax`. It is **not `HttpOnly`**, and the writer does
  not add `Secure`. The page proxy reads `isAuthenticated`, not a verified JWT signature.
  API JWT verification and ownership checks remain the authorization boundary.
- Logout clears client auth state; its API endpoint does not revoke already-issued JWTs.
  No refresh-token mechanism or server-side JWT denylist is configured.
- `JWT_SECRET` must be explicitly configured for deployment: code still has a development fallback.
  Do not reproduce secrets or seed credentials in documentation, examples, logs, or commits.
- Helmet is applied to Express, not automatically to the web response. Its defaults are not a
  repository-wide CSP guarantee. API JSON body limit is `10mb`.
- CORS is permissive when API `HOST` is `0.0.0.0`, including the default production binding;
  `FRONTEND_URL` alone does not enforce a restrictive production allowlist.
- `express-rate-limit` is absent. A production rate-limit policy and server-managed cookie/token
  hardening are recommendations requiring implementation and compatibility review, not existing controls.

## Testing and verification

**Current:** the API and web workspaces expose `npm test -w apps/api` and `npm test -w apps/web`;
their scripts run Node's built-in `node:test` through installed `tsx` over `test/*.test.ts`.
Focused unit/schema/service tests exist, but there is no separate test framework/configuration,
coverage script, browser component suite, or end-to-end job. CI runs `npm run lint` followed by
`npm run build`; it has no test database or test job. Commands such as `npm run test:coverage` from
the monolith are not executable.

**Recommended future strategy:** extend unit tests for calculations/state transitions, add
PostgreSQL-backed integration tests for ownership/constraints/import recovery, and browser flows
for authentication, planned/ad-hoc sessions, and daily tracking. Vitest, Supertest, Testing Library,
and Playwright are historical candidate tools, not mandatory installed tooling. Keep fixtures
isolated from personal/production data.
The old mock `WorkoutService` and React Query `Dashboard` examples reference absent modules and
are preserved only in the archive.

For documentation-only edits, check formatting, relative links, source claims, and `git diff --check`.
For code changes, use the checks appropriate to the affected workspace. Follow
[deployment development guidance](deployment.md#development-commands-and-verification): do not run
a full/web production build against an active Next.js dev server.

## Git and documentation conventions

- Stage/commit/push only when explicitly requested. Run `npm run lint` before an authorized commit.
- Use concise English conventional commits, e.g. `docs(architecture): reconcile deployment guide`.
  `feature/description`, `fix/description`, and `refactor/description` are suggested branch naming,
  not repository-enforced branch policies.
- Prefer self-documenting code; use focused English JSDoc for public contracts or complex logic.
  Package README content should describe purpose, setup, real scripts, and environment variables;
  do not imply package READMEs exist when they do not.
- Keep historical designs explicitly labeled. Do not overwrite unrelated work, generated artifacts,
  or the BMAD/OpenCode management framework as part of application documentation maintenance.
