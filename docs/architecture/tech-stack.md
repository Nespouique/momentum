# Momentum — Tech Stack

## Scope and evidence

Reconciled on 2026-10-11 with [AGENTS.md](../../AGENTS.md), all three workspace manifests,
the [root manifest](../../package.json), and [package-lock.json](../../package-lock.json).
**Declared** means the manifest range; **locked** means the exact dependency resolved for `npm ci`,
not a measurement of a running production container. Repository behavior is distinguished from
historical plans and recommendations throughout these documents.

This document supersedes section 3 of the
[original architecture](../archive/architecture-original.md#3-tech-stack). See
[source tree](source-tree.md), [coding standards](coding-standards.md), and
[deployment](deployment.md) for structure, conventions, commands, and operations.

## Runtime and package management

- npm workspaces: `apps/api`, `apps/web`, and `packages/shared`; no separate application lockfiles.
- Root application version: `0.1.11`; workspace versions remain `0.1.0`. The lockfile's root metadata
  still says `0.1.0`; it is dependency-resolution evidence, not the release-version authority.
- Root `engines.node` declares `>=20.0.0`. Next.js 16.1.6 requires `>=20.9.0`; locked Prisma 7.3.0
  requires `^20.19 || ^22.12 || >=24.0`. For the repository's Node 20 CI/Docker line, use **20.19+**.
  Node 22.12+ or 24+ also satisfy Prisma's engine range, but are not the configured CI/image line.
- CI selects Node `20`; both Dockerfiles select `node:20-alpine`. Neither pins a patch or digest.
- npm 10+ is the documented working baseline, not an enforced `engines.npm` or `packageManager` pin.
- PostgreSQL images are `postgres:16` in development and `postgres:16-alpine` in production Compose;
  these are floating major tags, not exact server patch versions.

## Frontend dependencies

Source: [apps/web/package.json](../../apps/web/package.json).

<!-- prettier-ignore -->
| Package | Declared | Locked | Role |
| --- | --- | --- | --- |
| `next` | `^16.1.6` | `16.1.6` | App Router, standalone server, Turbopack |
| `react`, `react-dom` | `^19.2.3` | `19.2.4` | UI runtime |
| `tailwindcss`, `@tailwindcss/postcss` | `^4.1.18` | `4.1.18` | CSS and PostCSS integration |
| `postcss` | `^8.4.49` | `8.5.6` | CSS processing |
| `zustand` | `^5.0.10` | `5.0.11` | Persisted auth; in-memory session store with partial manual recovery |
| `react-hook-form` | `^7.71.1` | `7.71.1` | Forms |
| `@hookform/resolvers` | `^5.2.2` | `5.2.2` | Form-schema integration |
| `zod` | `^4.3.5` | `4.3.6` | Validation |
| `recharts` | `^2.15.4` | `2.15.4` | Charts |
| `date-fns` | `^4.1.0` | `4.1.0` | Dates |
| `lucide-react` | `^0.562.0` | `0.562.0` | Icons |
| `@lucide/lab` | `^0.1.2` | `0.1.2` | Additional icons |
| `@dnd-kit/core` | `^6.3.1` | `6.3.1` | Drag and drop |
| `@dnd-kit/sortable` | `^10.0.0` | `10.0.0` | Sorting |
| `@dnd-kit/modifiers` | `^9.0.0` | `9.0.0` | Drag modifiers |
| `@dnd-kit/utilities` | `^3.2.2` | `3.2.2` | Drag utilities |
| `class-variance-authority` | `^0.7.1` | `0.7.1` | Component variants |
| `clsx` | `^2.1.1` | `2.1.1` | Conditional classes |
| `tailwind-merge` | `^3.4.0` | `3.4.0` | Class merging |
| `cmdk` | `^1.1.1` | `1.1.1` | Command UI |
| `react-day-picker` | `^9.13.0` | `9.13.0` | Calendar |
| `react-colorful` | `^5.6.1` | `5.6.1` | Color picker |
| `sonner` | `^2.0.7` | `2.0.7` | Notifications |
| `vaul` | `^1.1.2` | `1.1.2` | Drawers |
| `next-themes` | `^0.4.6` | `0.4.6` | Available dependency; root currently forces dark mode |
| `@base-ui/react` | `^1.1.0` | `1.1.0` | UI primitives |
| `radix-ui` | `^1.4.3` | `1.4.3` | UI primitives |

### Shadcn and Radix

Shadcn components are source files in `src/components/ui`, not a versioned `shadcn-ui` runtime
dependency. [components.json](../../apps/web/components.json) declares `new-york-v4`, zinc,
CSS variables, RSC/TSX, Lucide, and the `@diceui` registry. Prefer existing primitives when composing
feature components; this does not prohibit application-specific components.

Individual Radix packages below have identical declared baselines (with `^`) and locked versions:

<!-- prettier-ignore -->
| `@radix-ui/` package suffix | Version |
| --- | --- |
| `react-avatar` | `1.1.11` |
| `react-checkbox` | `1.3.3` |
| `react-collapsible` | `1.1.12` |
| `react-dialog` | `1.1.15` |
| `react-dropdown-menu` | `2.1.16` |
| `react-label` | `2.1.8` |
| `react-popover` | `1.1.15` |
| `react-select` | `2.2.6` |
| `react-separator` | `1.1.8` |
| `react-slot` | `1.2.4` |
| `react-tabs` | `1.1.13` |
| `react-toast` | `1.2.15` |
| `react-toggle` | `1.1.10` |
| `react-toggle-group` | `1.1.11` |

Tailwind is configured through [postcss.config.mjs](../../apps/web/postcss.config.mjs) and
[globals.css](../../apps/web/src/app/globals.css): `@import "tailwindcss"`, `@theme inline`,
`@custom-variant`, and `@source inline`. No Tailwind config file is present, despite the stale
`tailwind.config.ts` string in Shadcn metadata. User accent preferences drive `--primary`,
`--primary-foreground`, and `--ring` dynamically.

## Backend dependencies

Source: [apps/api/package.json](../../apps/api/package.json).

<!-- prettier-ignore -->
| Package | Declared | Locked | Role |
| --- | --- | --- | --- |
| `express` | `^4.21.2` | `4.22.1` | HTTP API |
| `prisma`, `@prisma/client`, `@prisma/adapter-pg` | `^7.2.0` | `7.3.0` | ORM, CLI, PostgreSQL adapter |
| `pg` | `^8.17.1` | `8.18.0` | Driver and Hercules SQL imports |
| `bcrypt` | `^6.0.0` | `6.0.0` | Password hashing |
| `jsonwebtoken` | `^9.0.3` | `9.0.3` | Stateless JWT |
| `helmet` | `^8.0.0` | `8.1.0` | API security headers |
| `cors` | `^2.8.5` | `2.8.6` | API CORS middleware |
| `dotenv` | `^16.6.1` | `16.6.1` | Environment loading |
| `zod` | `^4.3.5` | `4.3.6` | Request validation |
| `openai` | `^6.17.0` | `6.17.0` | AI coaching and icon suggestions |
| `resend` | `^6.9.1` | `6.9.1` | Password-reset email |
| `tsx` | `^4.21.0` | `4.21.0` | Development and migration scripts |
| `ts-node-dev` | `^2.0.0` | `2.0.0` | Declared dev dependency; dev scripts use `tsx` |

The Prisma `prisma-client` generator outputs to `src/generated/prisma` with `moduleFormat = "cjs"`.
[prisma.config.ts](../../apps/api/prisma.config.ts) owns datasource URL, schema, migration path,
and explicit seed command. [lib/prisma.ts](../../apps/api/src/lib/prisma.ts) instantiates the
generated client with `PrismaPg` and a `pg.Pool`.

Express 4 is the runtime even though `@types/express` declares `^5.0.0` and locks `5.0.6`.
Do not infer Express 5 runtime semantics from those type declarations.

Email and coaching clients are constructed unconditionally at module import. Their product features
may be optional, but missing credentials can prevent API startup before `app.listen`: Resend 6.9.1
rejects an empty/undefined effective key, and OpenAI 6.17.0 rejects an undefined effective key.
See [initialization prerequisites and defect](deployment.md#eager-integration-initialization-defect)
for the example/Compose mismatch and the limits of this source-only verification.

## Shared package and development tooling

[packages/shared/package.json](../../packages/shared/package.json) publishes local `dist/index.js`
and declarations. Its source currently exports `User`, `ApiResponse<T>`, `HealthCheckResponse`,
`Exercise`, `MUSCLE_GROUPS`, and `MuscleGroup`; it is not a complete shared domain-model package.
See [contract caveats](coding-standards.md#api-contracts-and-errors).

<!-- prettier-ignore -->
| Package | Declared | Locked | Scope |
| --- | --- | --- | --- |
| `typescript` | `^5.7.3` | `5.9.3` | All three workspaces |
| `eslint` | `^8.57.1` | `8.57.1` | Root |
| `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin` | `^7.18.0` | `7.18.0` | Root |
| `eslint-config-prettier` | `^9.1.0` | `9.1.2` | Root |
| `prettier` | `^3.4.2` | `3.8.1` | Root |
| `concurrently` | `^9.1.2` | `9.2.1` | Parallel API/web development |
| `sql.js` | `^1.13.0` | `1.13.0` | Root; Hercules SQLite reader |
| `@types/react` | Root override `^19.2.0` | `19.2.11` | React types |
| `@types/react-dom` | Root override `^19.2.0` | `19.2.3` | React DOM types |
| `@types/node` | `^20.17.12` | `20.19.31` | API/web |
| `@types/bcrypt` | `^6.0.0` | `6.0.0` | API |
| `@types/cors` | `^2.8.17` | `2.8.19` | API |
| `@types/express` | `^5.0.0` | `5.0.6` | API |
| `@types/jsonwebtoken` | `^9.0.10` | `9.0.10` | API |
| `@types/pg` | `^8.16.0` | `8.16.0` | API |

## Testing, infrastructure, and historical plans

**Current:** API and web workspaces include scoped `test` scripts invoking Node's built-in
`node:test` runner through the already-installed `tsx` package, with tests under each workspace's
`test/` directory. No separate test framework, test-runner configuration, coverage script, Vitest,
Supertest, Testing Library, or Playwright dependency is installed. These are executable unit and
service/schema tests, not browser component or end-to-end coverage. CI currently runs lint and
build, not these application tests. An external browser tool on a development host is not part of
the repository test runner.

Docker Compose provides development PostgreSQL and a production reference stack. GitHub Actions
publishes API/web images to Docker Hub. The recorded homelab deployment uses Proxmox LXC 197,
Dockhand/Hawser management, and Nginx Proxy Manager on a separate LXC; these host services are
not npm dependencies. See [deployment](deployment.md#production-topology-and-compose).

**Historical, not installed:** Next 14, React 18, Tailwind 3, Zustand 4, Zod 3, React Query,
`pino`, `express-rate-limit`, GHCR publication, and the test pyramid in the monolith.
React Query cache durations, JSON logging, rate limits, and coverage uploads therefore cannot be
claimed as runtime guarantees. Future testing/observability recommendations are retained in
[coding standards](coding-standards.md#testing-and-verification) and
[deployment](deployment.md#monitoring-and-health-checks).

## Library references

Checked through Context7 for the relevant Next.js 16, Prisma 7, and Tailwind 4 behavior:

- [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16): `proxy.ts`,
  direct ESLint CLI, Node requirement.
- [Next.js standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output).
- [Prisma system requirements](https://www.prisma.io/docs/orm/reference/system-requirements).
- [Prisma production migrations](https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production).
- [Tailwind PostCSS installation](https://tailwindcss.com/docs/installation/using-postcss).
- [Shadcn documentation](https://ui.shadcn.com/docs).
- [Zustand documentation](https://zustand.docs.pmnd.rs/).

These references preserve applicable monolith section 18 links. Its React Query reference remains
historical because that library is not part of the current application.
