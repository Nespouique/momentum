# Momentum — Source Tree

## Scope

Repository map verified on 2026-10-11 against manifests, tracked paths, entry points, and
[AGENTS.md](../../AGENTS.md). This is a structural map, not an exhaustive listing of generated
files. It reconciles [section 11](../archive/architecture-original.md#11-project-structure) of
the original monolith; hypothetical paths there are not current implementation requirements.

## Root and workspace boundaries

```text
momentum/
├── .github/workflows/ci-cd.yml       # PR/tag lint-build; tag-only Docker publication
├── .opencode/                       # Agent/project management framework
├── _bmad/                           # BMAD framework
├── _bmad-output/                    # Existing planning/implementation artifacts
├── apps/
│   ├── api/                         # @momentum/api; Express, port 3001
│   └── web/                         # @momentum/web; Next.js, port 3000
├── packages/shared/                 # @momentum/shared; shared types/constants
├── docker/                          # Dockerfiles and reference Compose files
├── scripts/                         # Hercules imports and icon generation
├── docs/                            # Architecture, product, UX, stories, specs, archives
├── web-bundles/                     # Agent/team/expansion-pack bundles, not app assets
├── AGENTS.md                        # Contributor/agent conventions
├── package.json                     # Root scripts, npm workspaces, app version
├── package-lock.json                # Root lockfile (v3)
├── tsconfig.base.json               # Shared compiler policy
├── .eslintrc.js                     # ESLint 8 configuration
├── .prettierrc                      # Formatting configuration
├── .prettierignore
├── .dockerignore
├── .gitignore
├── .env.production.example          # Reference production Compose inputs
└── README.md
```

`node_modules`, API/shared `dist`, Prisma generated client, web `.next`, and TypeScript build info
are installation/build artifacts. They are not an additional workspace or application source.
There is no root `.env.example`; see [environment setup](deployment.md#environment-configuration).

## API workspace

```text
apps/api/
├── .env.example
├── package.json
├── tsconfig.json
├── prisma.config.ts                 # URL, schema/migration paths, seed command
├── prisma/
│   ├── schema.prisma                # 17 models; generated client in src/generated/prisma
│   ├── seed.ts                      # Development account and initial exercise catalog
│   └── migrations/                  # 14 ordered SQL migrations + migration_lock.toml
└── src/
    ├── index.ts                     # Express middleware, route mounts, listener, /health
    ├── data/valid-icons.ts          # Generated Lucide-name allowlist (tracked)
    ├── lib/prisma.ts                # PrismaPg + pg.Pool client singleton
    ├── middleware/auth.middleware.ts
    ├── routes/                      # Domain routers (*.routes.ts)
    ├── schemas/                     # Zod schemas (*.schema.ts)
    ├── services/                    # Existing reusable domain services
    └── test/                         # Query, entry-contract, and selected-day service tests
```

Routers and schemas cover auth, profile, measurements, exercises, workouts, sessions, progression,
AI coaching, health sync, trackables, and tracking. `config.routes.ts` additionally exposes
configuration. Services currently cover auth, password reset, email, AI coaching, progression,
trackables, and tracking. Many CRUD operations remain in routers; there are no `controllers/`,
generic `validators/`, `app.ts`/`server.ts`, or central route `index.ts` layers from the monolith.

### Route mounts

Source: [apps/api/src/index.ts](../../apps/api/src/index.ts).

<!-- prettier-ignore -->
| API path | Router file | Responsibility |
| --- | --- | --- |
| `/auth` | `auth.routes.ts` | Register/login/logout/me and password reset |
| `/profile` | `profile.routes.ts` | Profile, preferences, password |
| `/measurements` | `measurement.routes.ts` | CRUD, latest, progress |
| `/exercises` | `exercise.routes.ts` | Catalog, muscle groups, statistics |
| `/workouts` | `workout.routes.ts` | Templates and nested configuration |
| `/sessions` | `session.routes.ts` | Planned/ad-hoc sessions, exercises, sets, logs |
| `/` | `progression.routes.ts` | Session suggestions/stagnation and `/progression-suggestions` |
| `/config` | `config.routes.ts` | Runtime configuration |
| `/sessions` | `ai-coaching.routes.ts` | Session coaching |
| `/health-sync` | `health-sync.routes.ts` | Companion synchronization and activities |
| `/trackables` | `trackable.routes.ts` | Items, goals, ordering, icon suggestions |
| `/tracking` | `tracking.routes.ts` | Daily entries, today, and statistics |
| `/health` | Entry point handler | API + database readiness |

These are direct Express paths, not `/api/v1/*`. Browser clients prefix them with `/backend`;
see [API specification](api-spec.md) and source routers for endpoint contracts.

## Web workspace

```text
apps/web/
├── .env.example
├── components.json                  # Shadcn metadata and registry
├── next.config.mjs                  # Standalone output; transpile shared; app version
├── postcss.config.mjs               # @tailwindcss/postcss
├── next-env.d.ts                     # Next.js-generated type references (runtime artifact)
├── package.json
├── tsconfig.json
├── test/                             # daily-calendar, edit-controller, and read-coordinator tests
├── public/
│   ├── manifest.json
│   ├── sw.js                        # Rest-timer notifications, no offline fetch cache
│   ├── icon.svg
│   └── icon-192.png
└── src/
    ├── app/
    │   ├── (app)/                   # App shell and authenticated feature pages
    │   │   ├── page.tsx             # Daily home/dashboard
    │   │   ├── exercises/           # Catalog and stats
    │   │   ├── profile/             # Edit, measurements, graphs, trackables
    │   │   ├── sessions/[id]/       # Session detail
    │   │   ├── settings/
    │   │   └── workouts/            # List, new, [id]/edit
    │   ├── (auth)/                  # Login, register, forgot/reset password
    │   ├── (session)/               # session/[id] and ai-coach; shared AppLayout
    │   ├── api/health/route.ts       # Web process health
    │   ├── backend/[...path]/route.ts # HTTP forwarding to Express
    │   ├── globals.css              # Tailwind 4 and semantic theme tokens
    │   └── layout.tsx               # Fonts, dark theme, accent, toast, service worker
    ├── components/
    │   ├── ui/                      # Shadcn/Radix/Base UI primitives
    │   ├── layout/                  # Shell, sidebar, bottom nav, page header
    │   ├── exercises/
    │   ├── workouts/                # Builder, cards, history/calendar sheets
    │   ├── session/screens/         # Active/rest/transition/overview/ad-hoc/summary
    │   ├── tracking/                # Daily progress, goals, sleep, activity, item controls
    │   ├── theme/accent-color-provider.tsx
    │   └── sw-register.tsx
    ├── hooks/                       # Timer audio, wake lock, local-day lifecycle, toast
    ├── lib/
    │   ├── api/                     # auth, exercises, measurements, profile,
    │   │                            # sessions, workouts, trackables, tracking
    │   ├── validations/             # Frontend Zod validation
    │   ├── daily-calendar.ts         # Local calendar arithmetic and timestamp bounds
    │   ├── daily-edit-controller.ts  # Date-scoped optimistic edit helpers
    │   ├── daily-read-coordinator.ts # Stale-read/date ownership guard
    │   ├── constants/muscle-groups.ts
    │   ├── icons.ts
    │   ├── compose-refs.ts
    │   └── utils.ts
    ├── stores/auth.ts               # Persisted token/user and cookie synchronization
    ├── stores/session.ts            # In-memory state machine; partial manual recovery
    └── proxy.ts                     # Next.js 16 page redirects based on auth cookie
```

Route groups do not add URL segments. `(app)` replaces the historical `(dashboard)` group;
measurements live under `/profile/measurements`, and trackable settings under `/profile/trackables`.
Active `/session/[id]` and regular `/sessions/[id]` details are separate routes. The
[(session) layout](<../../apps/web/src/app/(session)/layout.tsx>) uses the shared `AppLayout`,
not an independent full-screen shell. The [session store](../../apps/web/src/stores/session.ts)
uses plain Zustand `create`, without `persist` middleware: it reloads session data from the API
and manually restores selected rest/result metadata from `localStorage`. Recovery is partial,
not persistence of the entire state machine or guaranteed offline restoration.
Daily-home calendar/edit utilities and workspace test directories are present as listed above; test scripts
use Node's built-in `node:test` runner via the installed `tsx` package, not an installed test
framework. There is no standalone React Query `hooks/queries` tree or dedicated `progress/page.tsx`.
No `tailwind.config.*` file or `src/middleware.ts` is present: CSS-first Tailwind and `src/proxy.ts`
are the current implementations. The stale Shadcn config-path string is documented in
[tech stack](tech-stack.md#shadcn-and-radix), not promoted into a real file.

## Shared package

```text
packages/shared/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                     # Re-exports ./types
    └── types/index.ts               # User, Exercise, health/response types, muscle groups
```

There are no shared `constants/` or `utils/` directories; constants currently live alongside types.
`dist/index.js` and declarations are produced by its build. See
[coding standards](coding-standards.md#typescript-rules) for API `.js` imports and web aliases.

## Database navigation

Sources: [schema.prisma](../../apps/api/prisma/schema.prisma) and
[SQL migrations](../../apps/api/prisma/migrations).

<!-- prettier-ignore -->
| Models | Mapped tables |
| --- | --- |
| `User`, `Measurement`, `Exercise` | `users`, `measurements`, `exercises` |
| `Workout`, `WorkoutItem`, `WorkoutItemExercise`, `WorkoutSet` | `workouts`, `workout_items`, `workout_item_exercises`, `workout_sets` |
| `WorkoutSession`, `SessionExercise`, `SessionSet` | `workout_sessions`, `session_exercises`, `session_sets` |
| `ProgressionSuggestion` | `progression_suggestions` |
| `TrackableItem`, `TrackableGoal`, `DailyEntry` | `trackable_items`, `trackable_goals`, `daily_entries` |
| `HealthActivity`, `SyncDevice`, `SessionApiCall` | `health_activities`, `sync_devices`, `session_api_calls` |

Users own measurements, workouts, sessions, progression suggestions, health records/devices, and
trackables. Templates contain ordered items, exercises, and sets; sessions contain recorded exercises
and sets. Sessions can be planned or ad-hoc, so the template relation is nullable. Exercises form
a shared catalog rather than user-owned rows. Trackables have goals and dated entries.

The last migration adds the planned/ad-hoc consistency check and a partial unique index for one
active session per user. Those SQL-only invariants and the migration's historical duplicate cleanup
matter beyond the schema file. See [data models](data-models.md) and
[migration operations](deployment.md#database-migrations-and-release-safety).

## Docker and utility scripts

```text
docker/
├── Dockerfile.api                   # Build shared/API; migrate deploy before API start
├── Dockerfile.web                   # Build shared/web; run apps/web/server.js
├── docker-compose.dev.yml           # PostgreSQL only
└── docker-compose.prod.yml          # Web, API, PostgreSQL, Prisma Studio

scripts/
├── generate-icon-list.mjs           # Root postinstall/generate-icons hook
├── hercules-import-exercises.ts
├── hercules-import-workouts.ts
├── hercules-import-history.ts
├── hercules-import-measurements.ts
├── hercules-exercise-mapping.json
├── hercules-workout-mapping.json
├── hercules-caro-import-exercises.ts
├── hercules-caro-import-workouts.ts
├── hercules-caro-import-history.ts
├── hercules-caro-import-measurements.ts
├── hercules-caro-exercise-mapping.json
└── hercules-caro-workout-mapping.json
```

Hercules CLI inputs are hardcoded under `docs/features/`; mappings are target-database-specific.
The available scripts, mapping order, fixed export inputs, ownership caveat, and partial
idempotence are covered in [deployment](deployment.md#hercules-migration-procedure).
Root icon generation writes the tracked API allowlist; it runs on `postinstall`, not a configured
`prebuild` hook despite the script's older comment.

## Documentation and historical material

[Architecture index](index.md) routes to [overview](overview.md), this document, [tech stack](tech-stack.md),
[coding standards](coding-standards.md), [deployment](deployment.md), [data models](data-models.md),
[API specification](api-spec.md), and [components/workflows](components-workflows.md).
The independently reconciled [frontend architecture](frontend-architecture.md) and
[backend architecture](backend-architecture.md) provide implementation-specific detail.
Product/UX references include [PRD](../prd.md), [epics](../epics.md),
[frontend specification](../front-end-spec.md), `docs/stories/`, `docs/specs/`, and `docs/features/`.
The [archive](../archive/architecture-original.md) retains original design examples; applicable
library references are consolidated in [tech stack](tech-stack.md#library-references).

The monolith's `.bmad-core`, assistant-specific settings, PascalCase component filenames, split
`ci.yml`/`deploy.yml`, alternate Dockerfile names, and controller/query-hook trees are historical
or absent. Current management directories are `.opencode/` and `_bmad*`; `web-bundles` contains
agent resources. Story 3.8 added scoped test directories; no separate test-runner configuration is
present or required for the current built-in runner scripts.

## Domain glossary

Adapted from [monolith section 18](../archive/architecture-original.md#18-appendix):

<!-- prettier-ignore -->
| Term | Meaning |
| --- | --- |
| Workout | Reusable template of exercises, sets, and targets |
| Session | Recorded training execution; planned from a template or ad-hoc |
| Set | One exercise effort with targets/results, commonly repetitions and weight |
| Trackable | User/system item tracked through dated values and goals |
| Streak | Consecutive qualifying days or goal periods; definitions depend on tracking logic |
| Progressive overload | Increasing training stimulus; suggestions are domain-specific |
| RPE | Rate of perceived exertion; the set field uses a 1–10 difficulty scale |
