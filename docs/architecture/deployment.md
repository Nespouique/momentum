# Momentum — Development, Deployment, and Operations

## Scope and evidence

Reconciled on 2026-10-11 with manifests, lockfile, Dockerfiles/Compose, the CI workflow,
Prisma configuration and all 14 SQL migrations, Hercules scripts, environment examples, and
[AGENTS.md](../../AGENTS.md). This consolidates monolith
[section 12](../archive/architecture-original.md#12-development-workflow),
[section 13](../archive/architecture-original.md#13-deployment-architecture),
[section 17](../archive/architecture-original.md#17-monitoring--observability), and relevant
[security/performance](../archive/architecture-original.md#14-security--performance) and
[testing](../archive/architecture-original.md#15-testing-strategy) material.

**Repository behavior** below is established by committed configuration/code. **Recorded operations**
describe the homelab notes dated 2026-10-11, not a fresh remote inspection. **Recommendations** and
**historical material** do not imply implemented automation or guarantees.

## Development setup

Use Node 20.19+ on the repository's configured Node 20 line, npm 10+ as the working baseline,
and Docker with Compose v2 plus PostgreSQL 16. Root engines only declare Node `>=20`; the stronger
effective minimum comes from locked Prisma. See [exact versions](tech-stack.md).

Run setup from the repository root:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Configure API `DATABASE_URL` and a private `JWT_SECRET` before installation. Before starting the API,
also provide non-empty `RESEND_API_KEY` and `OPENAI_API_KEY` through its private environment:
the current eager SDK initialization makes these startup prerequisites even when email/coaching
features are unused. The copied API example leaves both empty and is not sufficient as-is.
Configure web `API_URL` if the API is not reachable at its default `http://localhost:3001`. Then:

```bash
npm ci
npm run db:start
npm run db:migrate -w apps/api
npm run build -w packages/shared
npm run dev
```

`npm ci` runs root icon generation and API `prisma generate` via postinstall. Prisma generation
is not a database migration. Development `db:migrate` uses `prisma migrate dev`; Prisma 7 seeding
is explicit. Optionally run `npm run db:seed -w apps/api` on a disposable development database:
[seed.ts](../../apps/api/prisma/seed.ts) upserts a development account and populates 31 exercises
only when the entire exercise table is empty. It is not a production bootstrap step or an importer
for personal accounts; its account credentials must not be copied into deployment docs.

The dev Compose uses `postgres:16`, container `momentum-postgres`, host port 5432, and named volume
`postgres_data` scoped by the Compose project. Match the example API URL to its development
credentials locally. `db:stop` removes containers/network while retaining the volume;
`db:reset` uses `down -v` and **destroys the development database volume** before recreation.

### Environment configuration

Sources: [API example](../../apps/api/.env.example), [web example](../../apps/web/.env.example),
[production example](../../.env.production.example), and consuming source files.
There is no root development `.env.example` to copy.

<!-- prettier-ignore -->
| Setting | Consumer and actual behavior |
| --- | --- |
| `DATABASE_URL` | API Prisma config/client, seed, and Hercules CLI. CLI imports read the process environment directly; they do not load API `.env` automatically. |
| `JWT_SECRET` | Auth service; explicitly configure in production because a development fallback still exists. |
| `PORT` | API listener, default 3001. Web container sets 3000. |
| `NODE_ENV` | API binding and Prisma singleton policy; set to production by API image/Compose. |
| `HOST` / `--host` | API binding override; default localhost in dev and `0.0.0.0` in production. |
| `FRONTEND_URL` | API allowed-origin list and password-reset links. Production binding currently activates permissive CORS. |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Email client is constructed at module import. A non-empty key is currently a startup prerequisite; sender has a default. Example key is empty; reference production Compose passes neither setting. |
| `OPENAI_API_KEY` | Coaching client is constructed at module import. An absent key can block startup, independently of feature use; provision a non-empty key for operation. Example key is empty; reference production Compose does not pass it. |
| `API_URL` | Server-side Next `/backend` forwarding, default `http://localhost:3001`; production Compose sets `http://api:3001`. |
| `NEXT_PUBLIC_API_URL` | Present in web example but unused by current clients, which use `/backend`. It is not the proxy's runtime setting. |
| `APP_VERSION` | Injected from root package version by `next.config.mjs`; build-time value. |
| `DOCKERHUB_USERNAME`, `TAG` | Production Compose image selectors; defaults `nespouique`, `latest`. |
| `DB_PASSWORD` | Production Compose PostgreSQL password and API connection URL. |
| `TZ` | Reference production containers use `Europe/Paris`; not declared by the environment example. |

`JWT_EXPIRES_IN` is hardcoded in the auth service, and `CORS_ORIGIN` is not read. They are not
supported configuration knobs. Keep credentials in private runtime environment storage, not docs.
The production example is an input template, not evidence of configured integrations.

### Eager integration initialization defect

[index.ts](../../apps/api/src/index.ts) imports auth and AI routes unconditionally. Auth imports
password reset, which imports [email.service.ts](../../apps/api/src/services/email.service.ts);
AI routes import [ai-coaching.service.ts](../../apps/api/src/services/ai-coaching.service.ts).
Both construct SDK clients at module scope, before `app.listen`, without an optional-feature guard.

Static inspection of the installed, locked SDK versions establishes that Resend **6.9.1** throws
when the effective key is empty or undefined (including its environment fallback), while OpenAI
**6.17.0** throws when `apiKey` remains undefined after its environment default. The OpenAI constructor
does not reject an explicitly supplied empty string at that check; this is not a usable credential
or evidence that coaching will work. The API example's empty Resend key can therefore block startup;
the reference Compose's omitted keys expose the same initialization defect before any request.

Treat the integrations as optional product capabilities, but not safely optional startup configuration
in the current implementation. Provision actual credentials privately before starting the API, or
address lazy/guarded initialization in separately authorized code work. This is a source-derived
failure mode; no API startup, SDK request, or production failure was reproduced for this review.

### Development commands and verification

Source: [root scripts](../../package.json) and workspace manifests.

<!-- prettier-ignore -->
| Command | Actual action |
| --- | --- |
| `npm run dev` | Concurrent `tsx watch src/index.ts` and `next dev` |
| `npm run dev:api` / `npm run dev:web` | Start one workspace dev server |
| `npm run dev:host` | Concurrent API `--host` and web `next dev -H 0.0.0.0` for LAN access |
| `npm run build` | Sequential shared → API (`prisma generate && tsc`) → web (`next build`) |
| `npm run lint` | All workspace ESLint `src` scripts |
| `npm run format` / `npm run format:check` | Root Prettier write/check |
| `npm run db:start` / `db:stop` / `db:reset` | Dev Compose up / down / destructive volume reset |
| `npm run generate-icons` | Regenerate `apps/api/src/data/valid-icons.ts` |
| `npm run db:generate -w apps/api` | Generate Prisma client |
| `npm run db:migrate -w apps/api` | `prisma migrate dev` |
| `npm run db:push -w apps/api` | Direct schema push; not a production migration workflow |
| `npm run db:studio -w apps/api` | Prisma Studio |
| `npm run db:seed -w apps/api` | Explicit configured development seed |
| `npm run start -w apps/api` | `node dist/index.js`; does not itself run migrations |
| `npm run start -w apps/web` | `next start`; Docker instead runs the standalone server |

There are no root `typecheck`, `test`, `test:coverage`, `clean`, `db:migrate`, or `db:seed` aliases.
For a direct non-emitting compiler check, use `npx tsc --noEmit -p apps/api` or
`npx tsc --noEmit --incremental false -p apps/web` after prerequisites/generated dependencies exist.
These are CLI commands, not npm scripts.

Keep developer-controlled servers in dedicated terminals. **Do not run a full build or web build
while Next.js dev is running**: both write `.next` and can invalidate browser chunk references.
API-only/shared builds can be scoped with `-w`; web HMR needs no manual build. Full builds belong
to isolated production/CI verification. See [testing status](coding-standards.md#testing-and-verification).

## Hercules migration procedure

### Available implementation and prerequisite limits

The eight [scripts](../../scripts) are one-off SQLite-to-PostgreSQL import utilities using
`sql.js` (root dev dependency), `pg` (API runtime dependency), and `tsx` (API dev dependency).
They execute raw SQL against mapped snake_case tables and do not pass through API validation or
authorization. There is no generic import CLI, dry-run flag, input-path option, or user-selection flag.

**Current hardcoded input paths (both files are present in the repository):**

- Standard family: `docs/features/Hercule_18-01-2026_19h33m23s_v34.db`.
- Caro family: `docs/features/Hercule_Caro.db`.

These are fixed exports, not configurable upload locations. Recheck their availability and identity
before an import; moving documentation or archiving data does not automatically update these scripts.
Do not mix the two SQLite exports or mapping families. Personal exports/mappings are not fixtures
for an automated test suite.

### Order and mapping lifecycle

Once input identity and target-user/schema checks below are resolved, run from the root,
with `DATABASE_URL` supplied privately in the process environment. Commands are the actual script
entry points, not new npm aliases:

```bash
npx tsx scripts/hercules-import-exercises.ts
npx tsx scripts/hercules-import-workouts.ts
npx tsx scripts/hercules-import-history.ts
npx tsx scripts/hercules-import-measurements.ts
```

For the other export, the corresponding sequence is:

```bash
npx tsx scripts/hercules-caro-import-exercises.ts
npx tsx scripts/hercules-caro-import-workouts.ts
npx tsx scripts/hercules-caro-import-history.ts
npx tsx scripts/hercules-caro-import-measurements.ts
```

1. **Exercises:** select exercises used in performances, trim names, map configured names or create
   missing catalog rows; serialize Hercules IDs as strings to avoid integer precision loss.
   Output: `scripts/hercules-exercise-mapping.json` or `hercules-caro-exercise-mapping.json`.
2. **Workouts:** require that exercise mapping; convert Hercules template sessions to workouts,
   group supersets, preserve ordering/rest targets, and parse repetition/load arrays.
   Output: corresponding `hercules-workout-mapping.json` or `hercules-caro-workout-mapping.json`.
3. **History:** require both mappings; group performances by timestamp + Hercules session ID,
   create completed sessions, recorded exercises/sets, and session notes. Calculate completion
   from source duration; absent template-exercise references can remain null.
4. **Measurements:** independent of exercise/workout mappings, but dependent on the correct user.
   Standard import filters measurements from 2024-02-28 and does not import body mass; Caro merges
   body measurements and weight by normalized date with no cutoff, but not other body-composition fields.

Mappings contain **target database UUIDs**. Preserve them with the source export and target backup;
do not reuse development mappings against production or restore a database without reconciling
its mapping IDs. Exercise/workout scripts overwrite their JSON outputs on successful completion.
The scripts can skip unmapped rows/items; a success message does not certify complete data transfer.

### Ownership and operational procedure

**Implemented ownership caveat:** the standard workout importer selects `SELECT id FROM users LIMIT 1`
without ordering. Standard history/measurements use their hardcoded email, while the Caro scripts
select their own hardcoded email. Existing seed/test users or a multi-user target can therefore make
the standard workout owner disagree with the history owner. No environment variable fixes that.

**Recommended operator procedure, not an automated guarantee:**

1. Work on a restored disposable database first. Confirm export identity, exact input availability,
   the selected user in every script, current PostgreSQL schema, and writable mapping output locations.
2. Back up the target database and mapping files, record counts/IDs, and prevent concurrent import
   runs or application mutations. Apply ordinary schema migrations before importing records.
3. Supply `DATABASE_URL` explicitly through private environment provisioning. The localhost fallback
   is development-only; current production Compose does not publish PostgreSQL port 5432.
   Use an approved private connection/tunnel or tooling on the database network; the monolith's
   direct LXC-IP connection is not a working production default.
4. Run each stage sequentially; stop on failures or unexpected unmapped rows. Check every mapping
   UUID exists and each workout belongs to the intended user before history insertion.
5. Validate actual counts, duplicate candidates, template/item/set structure, date boundaries,
   excluded exercises, and notes in the target. Rehearse reruns against the restored test target.
6. Archive export, mappings, checksums, counts, logs with sensitive fields redacted, and backup ID.
   Do not run the development seed as part of production import.

### Partial idempotence and recovery

<!-- prettier-ignore -->
| Stage | Implemented duplicate check | Limit |
| --- | --- | --- |
| Exercises | Existing target name | No unique name constraint; concurrent runs can duplicate; renames change identity. |
| Workouts | User ID + mapped/trimmed name | No unique constraint; existing partial workouts are skipped rather than repaired. |
| History | User + workout + start in `[source − 60s, source + 60s)` | Near sessions can collide; a partial session is skipped rather than completed on rerun. |
| Measurements | User + normalized date | Backed by `@@unique([userId, date])`; existing values are skipped rather than updated. Timezone normalization differs between script families. |

There is **no enclosing transaction** for a complete import or a workout/session's nested creation,
and no generic import rollback. A failed run can leave parents without all children and mappings
out of sync. Recover by inspecting/reconciling partial records or restoring the pre-import target
and its mappings; never claim every script can safely repair itself by rerunning.
Hercules's time-based performance fields and some source metadata are not imported; configured
standard exclusions also deliberately omit rehabilitation/stretching and selected substitutions.

**Historical counts:** monolith section 12.5 reports 21 mapped exercises, 5 workouts/87 sets,
125 sessions/2,121 sets, and 2 measurement rows for an earlier standard import. These are archived
run results, not today's database totals or acceptance criteria for another export. The
[migration analysis](../features/hercules-migration-analysis.md) preserves earlier mapping
decisions; implementation details above take precedence over its proposed transformations/cutoffs.

## Production topology and Compose

**Repository reference:** [docker-compose.prod.yml](../../docker/docker-compose.prod.yml) defines
`web`, `api`, `postgres`, and `prisma-studio` (Studio is included by default, not an opt-in profile).
Web/API image names use Docker Hub `${DOCKERHUB_USERNAME:-nespouique}/momentum-{web,api}:${TAG:-latest}`.
It publishes web 3000, API 3001, and Studio 5555; PostgreSQL is internal-only with persisted
`postgres_data`. All services restart unless stopped. Web waits for API health; API and Studio
wait for PostgreSQL health. Studio has no healthcheck in this Compose.

```text
Browser → HTTPS / Nginx Proxy Manager → Next.js :3000
                                     └─ /backend/* → Express :3001 → PostgreSQL :5432
Prisma Studio :5555 ───────────────────────────────────────────────→ PostgreSQL
```

**Recorded homelab operations:** Momentum runs on Proxmox LXC 197; Nginx Proxy Manager/TLS is on
LXC 230 and Dockhand on LXC 210. Dockhand Git stack 17 uses the separate infrastructure repository's
`compose/momentum/docker-compose.yml`, materialized as `/data/stacks/momentum/docker-compose.yml`.
The public app is `https://momentum.hallais.bzh`. These host paths are operational records, not
files in this application repository. Notes record API/web `latest` corresponding to release
`0.1.11`, webhook enabled, automatic image update disabled, and PostgreSQL image/volume preserved.
Do not replace the managed stack with the repository reference Compose under a different project name.

**Recommended:** pin a version tag or digest for both application images, record the PostgreSQL image
and actual volume identity, and restrict API/Studio ingress according to the deployment topology.
The Compose port publications and integration initialization prerequisites need explicit operator review; they are
not proof of a private-only API, protected Studio, or a restrictive CORS policy.

For an independent deployment of the repository reference (not the existing managed homelab stack),
copy `.env.production.example` to a private root `.env` and configure its real values and `TAG`.
Before `up`, ensure the actual API container environment receives non-empty `RESEND_API_KEY` and
`OPENAI_API_KEY` through an independently configured private deployment mechanism. The reference
Compose does not inject these keys: adding them only to the root `.env` or passing `--env-file`
does not forward unreferenced settings into the API container. The unmodified template alone is
not a complete startup procedure, and `config --quiet` cannot validate SDK initialization.
Only after the container environment prerequisite is resolved:

```bash
docker compose --env-file .env -f docker/docker-compose.prod.yml config --quiet
docker compose --env-file .env -f docker/docker-compose.prod.yml pull
docker compose --env-file .env -f docker/docker-compose.prod.yml up -d
```

Never use `down -v` for a production release/rollback. A Compose project/name change can select
a different named volume; verify the mounted database volume before starting PostgreSQL.

### Actual Dockerfile behavior

- [API Dockerfile](../../docker/Dockerfile.api): Node 20 Alpine builder copies repository sources,
  installs OpenSSL and all dependencies with `npm ci`, then builds shared/API. Runner copies
  API `dist`, Prisma schema/migrations/config, generated client, root dependencies, and actual
  compiled shared files in place of the workspace symlink. It runs as `expressjs` (UID 1001).
  **Startup is `npx prisma migrate deploy && node dist/index.js`**; failed migrations block API start.
- [Web Dockerfile](../../docker/Dockerfile.web): Node 20 Alpine builder runs
  `npm ci --ignore-scripts` (including skipping root icon generation), builds shared/web, and copies
  standalone output plus static/public assets under their monorepo locations. Runner includes
  `wget`, uses UID 1001, binds `0.0.0.0:3000`, and runs `node apps/web/server.js`.
- [next.config.mjs](../../apps/web/next.config.mjs) sets standalone output, shared transpilation,
  Turbopack root, and build-time app version. There is no supported browser URL replacement by
  setting `NEXT_PUBLIC_API_URL` on a prebuilt image; use the server-side `API_URL` forwarding path.
- [.dockerignore](../../.dockerignore) excludes installation/build/generated Prisma output and
  environment files, but does not exclude all docs/personal exports. Both builders use `COPY . .`;
  a slimmer build context is recommended separate configuration work, not an existing guarantee.

## CI publication and release tagging

Source: [.github/workflows/ci-cd.yml](../../.github/workflows/ci-cd.yml).

1. Pull requests targeting `main` and pushes of tags matching `v*` trigger `lint-build`:
   checkout v4, setup-node v4 with Node 20 and npm cache, `npm ci`, `npm run lint`, `npm run build`.
2. On **tag pushes only**, Docker jobs depend on successful lint-build and build web/API in a
   matrix with Buildx v3, Docker login v3, and build-push v5. Publication uses Docker Hub credentials
   referenced as `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`; no credential values belong here.
3. Each image receives `latest`, seven-character commit SHA, and tag-derived version **without the
   leading `v`**: Git `v0.1.11` produces image tag `0.1.11`.
4. No push-to-main/develop trigger, automatic release creation, test/coverage job, database service,
   production DB migration job, or deployment webhook call is present in this workflow.
   Docker Hub publication is not proof that Dockhand has pulled/redeployed that image.

**Recommended release sequence:** review intended changes and SQL migrations, align the root version
for build-time UI reporting, obtain successful PR checks, create/push an authorized `v<version>` tag,
wait for both image publications, record both digests, then perform the managed deployment and
health/data checks below. A version tag is a better release selector than `latest`, but only a digest
is content-addressed; the workflow itself does not prevent retagging image versions.
This procedure documents future operations; it does not execute tagging or deployment.

## Database migrations and release safety

Prisma configuration points to `prisma/migrations`; directories are applied in their ordered names.
All 14 SQL files were reviewed for this reconciliation. Historical migrations include destructive
removal of `users.age` and exercise custom/owner columns, so the full chain is not universally
data-preserving. The newest
[migration](../../apps/api/prisma/migrations/20260731120000_add_preferences_and_ad_hoc_sessions/migration.sql)
adds accent, nullable workout ID, `SessionType`, a planned/ad-hoc check, duplicate-active cleanup,
and a partial unique index for one in-progress session per user. Cleanup abandons older duplicate
active sessions; it is not a read-only schema change.

**Implemented:** the API image applies pending migrations at startup via `migrate deploy` before
serving requests. It does not run `migrate dev`, `db push`, or seed in production. Repeated starts
normally skip recorded applied migrations; this does not make arbitrary SQL/import code idempotent.

**Recommended pre-deployment:**

- Record the currently deployed image digests, database image/volume, migration status, and configuration.
- Take and verify a consistent PostgreSQL backup; rehearse restoration on an isolated target.
  Review migration locks/data changes and compatibility with the previous app version.
- Control application writes and concurrent rollouts during sensitive migration windows.
  A startup migration can exceed the API healthcheck's ten-second start period.
- Deploy the matching web/API image pair through the existing stack owner; observe migration logs
  and inspect `prisma migrate status` in the API container. Do not manually mark migrations applied
  merely to bypass a failed startup.

On the recorded homelab, container names are `momentum-api-1`, `momentum-web-1`, and
`momentum-postgres-1`; recheck names before using read-only diagnostics:

```bash
docker exec momentum-api-1 npx prisma migrate status
docker logs momentum-api-1
curl --fail http://localhost:3001/health
curl --fail http://localhost:3000/api/health
curl --fail http://localhost:3000/backend/health
```

Verify public login/static assets, expected 401 responses for protected API endpoints without a
token, and authenticated read/write smoke tests with planned and ad-hoc sessions. Compare scoped
counts and check duplicate-active sessions; the web process health alone is insufficient.

**Recorded 2026-10-11:** operations notes report all 14 migrations applied, verified pre-migration
database dumps and a complete LXC backup, successful health/public/private-route checks, and stable
aggregates (2 users, 42 workouts, 664 sessions, 560 health activities). These are dated observations,
not automated CI acceptance criteria or fresh validation performed by this documentation change.

### Rollback and failed migrations

- **Application-only rollback:** restore the previously recorded web/API images/configuration only
  after establishing that they are compatible with the current schema. Preserve PostgreSQL image
  and volume. Returning to old images does **not** undo database migrations.
- **Schema/data rollback:** stop writers, preserve a snapshot/backup of the failed current state,
  and restore the matching pre-migration database plus matching application images/configuration.
  Decide how to retain/reconcile post-backup writes. Restore into a clean isolated target first;
  do not blindly overlay a pre-migration dump onto the migrated database.
- There are no committed down-migration scripts or automatic rollback workflow. Prisma's
  `migrate resolve` reconciles migration history after a deliberately completed repair/rollback;
  it does not undo SQL. Failed/partially applied migrations require SQL-state inspection and an
  explicit forward repair or restore strategy before restarting the rollout.
- Recorded pre-`v0.1.11` local rollback image tags and backup artifacts are described in the
  homelab session notes. Their availability must be checked before use; no permanent recovery
  guarantee follows from their historical existence.

## Monitoring and health checks

**Implemented:** console logging in API/services/proxy; no `pino`, Sentry integration, tracing pipeline,
or central JSON logger is configured. Session routes additionally persist selected call metadata
(method/path/status/duration) to `SessionApiCall` and expose authenticated session logs; this is
not full application telemetry or a retention policy.

<!-- prettier-ignore -->
| Check | Actual contract | Limitation |
| --- | --- | --- |
| API `GET /health` | Runs `SELECT 1`; 200 `{ status: "ok", timestamp, database: "connected" }`, 503 with `error`/`disconnected` status values | Proves connectivity, not every migration/business invariant |
| Web `GET /api/health` | 200 `{ status: "ok", timestamp }` | Does not query API/DB |
| Web `GET /backend/health` | Forwards API health | Exercises web-to-API connectivity; proxy failures return 502 |
| PostgreSQL Compose health | `pg_isready` | Readiness, not a backup/restore or data-integrity check |

Production API/web checks use `wget` every 30 seconds (10-second timeout, three retries);
start periods are ten seconds API and forty seconds web. PostgreSQL production checks run every
ten seconds (five-second timeout, five retries). Docker health states alone do not implement
external alerting or restart unhealthy containers automatically.

**Recommended:** external checks for public app and proxied API readiness, alerts on migration/startup
failures, bounded log retention, documented backup/restore rehearsal, and targeted request/error
instrumentation. Sentry/structured logging were historical future options, not delivered features.

## Security, performance, testing, and readiness boundaries

See [coding standards](coding-standards.md#authentication-and-security-implemented-behavior) for
JWT `token` storage, non-HttpOnly cookies, permissive production CORS, missing rate limiting,
and contract limitations. HTTPS is provided by the external reverse proxy; Helmet covers API
responses, not a repository-wide web CSP. The service worker handles timer notifications and
clicks; it has no fetch-cache handler, so offline assets/data support is not implemented.

Current schema indexes and route-specific pagination are real; a universal default limit of 50,
React Query five-minute cache, and complete offline PWA claims are historical assumptions.
Future optimizations require measurement and implementation.

The API and web workspaces have scoped Node `node:test` scripts; CI does not run them, and there is
no browser/end-to-end suite. See [testing status and proposed strategy](coding-standards.md#testing-and-verification).
The monolith's
`ci.yml`/`deploy.yml`, GHCR images, test/coverage commands, pino health-version example, and Portainer
topology are retained in the archive rather than copied as executable current configuration.

This documentation reconciliation does **not** complete implementation readiness. The
[readiness report](../implementation-readiness-report-2026-10-11.md) still requires corpus selection
and assessment, and sibling architecture domains may be undergoing independent reconciliation.
Unresolved operational risks include import identity/ownership/recovery compatibility, limited
automated test coverage and no CI test job, eager SDK initialization/missing container keys, auth/CORS hardening, runtime patch/image drift,
sensitive build-context content, and rollback
rehearsal. None is silently converted into an implementation guarantee by this document. Story
3.8's done status is tracked separately and does not complete general implementation readiness.

## Monolith reconciliation coverage

<!-- prettier-ignore -->
| Original section | Current destination | Treatment |
| --- | --- | --- |
| 3 — Tech stack | [tech-stack.md](tech-stack.md) | Manifest ranges and exact lock versions; uninstalled technologies labeled historical. |
| 11 — Project structure | [source-tree.md](source-tree.md) | Actual workspaces, routes, configs, scripts, PWA assets, and management directories. |
| 12 — Development workflow | Development and Hercules sections above | Real scripts/env consumers; all four import stages and both mapping families; qualified duplicate/recovery behavior. |
| 13 — Deployment architecture | Production, CI, migrations, rollback above | Actual Docker Hub/tag pipeline and Docker entry points; recorded external Dockhand topology distinguished. |
| 14 — Security and performance | [coding-standards.md](coding-standards.md), operational boundaries above | Actual JWT/CORS/headers/indexes/pagination; unsupported security/cache guarantees removed from normative guidance. |
| 15 — Testing strategy | [coding-standards.md](coding-standards.md#testing-and-verification) | Absence stated; useful test pyramid/naming retained as recommendations; non-executable examples stay archived. |
| 16 — Coding standards | [coding-standards.md](coding-standards.md) | Real strict compiler and lint rules, naming, imports, error envelopes, formatting, and contributor conventions. |
| 17 — Monitoring | Monitoring above | Actual health response shapes and session logs; pino/Sentry/version-field examples historical. |
| 18 — Appendix | [glossary](source-tree.md#domain-glossary), [library references](tech-stack.md#library-references) | Session definition includes ad-hoc; applicable references retained, React Query historical. |

Original examples are preserved in the archive rather than silently treated as deployed code.
Sibling data-model/API/workflow reconciliation remains separately owned.
