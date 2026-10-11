# Momentum — Backend Architecture

Reconciled against the working tree on 2026-10-11; replaces archived sections 6.1 and 10.1–10.6.
See [workflows](./components-workflows.md) for end-to-end decisions, [API specification](./api-spec.md)
for endpoint/payload contracts and [data models](./data-models.md) for fields/relations/SQL constraints.
This document owns execution boundaries, not another schema or endpoint catalogue.

## 1. Express composition and business-logic placement

[index.ts](../../apps/api/src/index.ts) creates and starts one Express 4 application:

```text
dotenv → Express app
  → Helmet
  → CORS (conditional origin policy)
  → express.json, 10 MB limit
  → public root + database health check
  → domain routers (auth middleware at router/route level)
  → route-local validation/business responses/catches
      ↔ domain service functions where extracted
      ↔ Prisma singleton → pg adapter/pool → PostgreSQL
```

The host is localhost by default in development, all interfaces in production, overridable by
environment/`--host`. When host is `0.0.0.0`, CORS reflects all origins with credentials; otherwise
it accepts configured development/frontend origins and origin-less requests. This is the actual
conditional policy, not a universal allowlist. `/health` executes `SELECT 1` and returns 503 on
database failure; it does not use the normal domain-error response.

Routers are mounted directly, without `/api/v1`. Progression is mounted at `/` because its paths
include sessions/progression-suggestions; AI coaching is mounted under sessions. Auth has public
endpoints; most resource routers use `router.use(authMiddleware)`. The public exercise muscle-group
endpoint precedes that middleware. Route order matters for named routes such as sessions
`active`/`last` before `:id`, and for middleware that runs before later routers.

In [index.ts](../../apps/api/src/index.ts), progression is mounted at `/` **before** `/config`.
Its [unconditional router auth middleware](../../apps/api/src/routes/progression.routes.ts) runs
even when no progression endpoint matches. Consequently,
[`GET /config/ai-status`](../../apps/api/src/routes/config.routes.ts) is effectively authenticated:
although the config router has no local auth middleware, a request without Bearer authorization
returns 401 before reaching it. Unknown paths reaching this root-mounted middleware also return
401 anonymously; with a valid token and no matching handler they fall through to Express's default 404. Earlier handlers that already respond, including `/`, `/health` and public auth/muscle-group
endpoints, are not subject to this later middleware.

The current [getAIStatus client](../../apps/web/src/lib/api/sessions.ts) sends no Bearer header.
The Next forwarding route does not derive one from the auth cookie, so this client call receives
401 even for a browser with persisted login state. This is an existing client/mount-order mismatch,
not a working public configuration endpoint.

| Source layer                                                                                                                                                                                      | Actual responsibility                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [routes](../../apps/api/src/routes)                                                                                                                                                               | Express Routers, input parsing, ownership/existence checks, response formatting, direct Prisma business logic where not extracted |
| [auth service](../../apps/api/src/services/auth.service.ts)                                                                                                                                       | bcrypt and JWT functions; user orchestration remains in auth routes                                                               |
| [tracking service](../../apps/api/src/services/tracking.service.ts)                                                                                                                               | Today/rings/history/summary aggregation and manual-entry rules                                                                    |
| [trackable service](../../apps/api/src/services/trackable.service.ts)                                                                                                                             | Configuration/goals/reorder, system-item provisioning and icon suggestions                                                        |
| [progression service](../../apps/api/src/services/progression.service.ts)                                                                                                                         | Per-set evaluation, suggestion persistence and transactional response                                                             |
| [password-reset](../../apps/api/src/services/password-reset.service.ts), [email](../../apps/api/src/services/email.service.ts), [AI coaching](../../apps/api/src/services/ai-coaching.service.ts) | Extracted integration/business functions                                                                                          |
| [schemas](../../apps/api/src/schemas)                                                                                                                                                             | Zod body/query validation and inferred inputs                                                                                     |
| [Prisma singleton](../../apps/api/src/lib/prisma.ts)                                                                                                                                              | Generated client with PrismaPg adapter and pg Pool; development global reuse                                                      |

Workout/session/exercise/measurement logic is mainly in route modules; no separate controller
directory, repository abstraction or corresponding service-class suite is implemented. The archived
`WorkoutService`/`AuthService` class diagram is not a required layering pattern. Relative API imports
use `.js` with NodeNext; generated Prisma output is consumed from `src/generated/prisma`.

No express-rate-limit middleware, pino logger or central error middleware is mounted. Logging
uses console; session routes add a wrapper recording method/path/status/duration to
`SessionApiCall` when a session ID is known. Log persistence is best-effort and separate from
the business transaction.

## 2. Authentication and authorization

Sources: [auth routes](../../apps/api/src/routes/auth.routes.ts),
[auth service](../../apps/api/src/services/auth.service.ts),
[auth middleware](../../apps/api/src/middleware/auth.middleware.ts),
[password reset](../../apps/api/src/services/password-reset.service.ts).

- Password hashes use bcrypt with cost 12. Login validates the body, looks up email, compares the
  password and signs a JWT; unknown user and mismatch share a 401 credential error. Registration
  checks email first, hashes and creates the user, then returns auto-login data. Concurrent unique
  failures are not covered by a universal Prisma error mapper.
- JWT claims contain `userId` and email; tokens expire after seven days. `expiresAt` is derived
  from decoded exp. Verification catches failures and returns null. The service uses `JWT_SECRET`
  with a development fallback; no issuer/audience options or separate runtime claim-schema parsing
  are configured.
- Missing/non-Bearer header yields `UNAUTHORIZED`; failed verification yields `INVALID_TOKEN`.
  `AuthRequest` adds optional `userId`/`userEmail`, filled before calling next. It does not add
  the historical `req.user` object or requery the user on every request.
- `/auth/me` queries the actual user and can return `USER_NOT_FOUND`. A signed token alone does
  not replace this database existence check where needed.
- Logout is an unauthenticated acknowledgment and tokens remain stateless. Password change/reset
  does not implement JWT revocation or refresh tokens.
- Reset requests store a SHA-256 hash of a random token with one-hour expiry and email a plain-token
  link. Reset changes the password and clears token fields. Invalid/expired reset outcomes are
  explicit business codes; the reset flow is separate from access JWTs.

### Ownership is a resource-layer rule

Owned resource queries commonly use `findFirst({ where: { id, userId } })`; missing and another
user's resource therefore produce the same 404. Tracking entries verify the trackable's user,
and nested session exercises/sets verify membership in the owned parent. Progression routes check
owner before calling functions that accept only session/suggestion IDs. Those functions are not
independent authorization boundaries.

The exercise library is deliberately shared: the current Exercise model has no userId/isCustom.
Workout/ad-hoc creation and substitutions verify library IDs exist rather than enforce per-user
exercise ownership. Do not restore the archive's custom-versus-system exercise authorization model.

## 3. Data access and transaction boundaries

The singleton wraps a pg Pool configured by `DATABASE_URL` in PrismaPg. Routes/services query
Prisma directly with ordered includes and public projections. List rows/counts often run through
`Promise.all`; that is concurrent reading, not a consistent transactional snapshot.

| Operation / evidence                                                         | Atomic work and limitations                                                                                                                                                               |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Workout create/duplicate](../../apps/api/src/routes/workout.routes.ts)      | Transaction validates unique library IDs and creates nested items/exercises/sets                                                                                                          |
| Workout update                                                               | Owner checked before helper; transaction validates IDs, deletes old items and recreates full structure. Update input equals create schema, not a partial patch                            |
| [Planned/ad-hoc session start](../../apps/api/src/routes/session.routes.ts)  | Nested Prisma create atomically creates session/exercises/sets; active-session precheck outside create is reinforced by a database partial unique index and conflict recovery             |
| Add ad-hoc exercise                                                          | Transaction locks owned session, rechecks active/type/duplicate state, chooses next position and creates exercise/sets. History targets are read before that lock                         |
| Record set result                                                            | Transaction locks owned session, requires in_progress, checks exercise/set membership and updates existing set results/completion timestamp                                               |
| Finish/abandon session                                                       | Transaction locks owned session; completion marks exercises with recorded results, then writes status/notes/server timestamp. It does not reject an already terminal session              |
| Substitute/group replacement                                                 | Transaction marks old exercises substituted and creates replacements/reorders. Initial ownership/activity checks are outside these transactions; no universal session lock applies        |
| Reorder session exercises                                                    | Transaction applies position updates after validation. Set PUT checks ownership/membership but has no active-state guard or session-row lock; set DELETE requires active status           |
| [Manual entry upsert](../../apps/api/src/services/tracking.service.ts)       | Ownership/source read followed by a single unique-key upsert; source check and write are not enclosed in one transaction                                                                  |
| [Goal replacement/reorder](../../apps/api/src/services/trackable.service.ts) | Goal transaction closes active goals and creates replacement; reorder transaction checks ownership and updates positions. No database uniqueness guarantee for one active goal is implied |
| [Health sync](../../apps/api/src/routes/health-sync.routes.ts)               | One transaction updates device, ensures system items/goals, upserts metric/sleep entries and health activities                                                                            |
| [Suggestion response](../../apps/api/src/services/progression.service.ts)    | Row lock + read + template per-set increments + answer/time update in one transaction; answered suggestions do not increment again                                                        |

The [ad-hoc migration](../../apps/api/prisma/migrations/20260731120000_add_preferences_and_ad_hoc_sessions/migration.sql)
adds a type/workout consistency check and one-in-progress-session-per-user partial unique index.
These protections are SQL migration behavior, not adequately described by only the Prisma indexes.
Exact DDL/relations and migration history belong in data-models; this table records their execution
consequences.

Session target reps/weights are copied into session sets, but grouping/rest/progression links can
still refer to current template items. Do not claim a complete immutable template snapshot.
Foreign-key effects on template replacement/deletion must be checked against the data model;
the historical generic “cascade everything” rule is insufficient.

The manual-source precheck can race with sync. Session substitution/reorder/status changes and
set PUT do not all share the same locking strategy. Transaction use above is scoped evidence,
not a claim that every mutation is serialized or retry-idempotent.

## 4. Validation and error handling

Most handlers parse body/query in their own try block. ZodError is formatted from **`issues`**
into field path/message arrays. Query schemas coerce dates and numeric pagination; IDs are UUIDs,
not the historical cuid validators. [Workout schema](../../apps/api/src/schemas/workout.schema.ts)
validates nested items/per-set targets and simple-versus-superset cardinality;
[session schema](../../apps/api/src/schemas/session.schema.ts) distinguishes start, status, result,
substitution and reorder inputs. [Tracking schema](../../apps/api/src/schemas/tracking.schema.ts)
only checks date-string shape and numeric value for entries: it is not type-specific boolean,
nonnegative integer, calendar-validity or future-day validation.

Route-local branches map existence/ownership/source/domain failures to JSON. Services use a mix
of null returns, `{ success, reason }`, ordinary errors and narrowly scoped session error classes;
there is no global AppError inheritance/status registry. For example, tracking maps synchronized-row
overwrite/delete to 403, session start maps active conflict to 409, and some inactive-session operations
use 400 while ad-hoc addition uses 409. Read endpoint contracts in api-spec rather than infer one
status from a global diagram.

Unexpected caught exceptions generally log context and return `INTERNAL_ERROR` with a generic
message. This is not universal: [AI coaching routes](../../apps/api/src/routes/ai-coaching.routes.ts)
return the caught Error message for some 500 responses.
Prisma errors are only translated where explicitly implemented (active-start and suggestion
uniqueness, among domain-specific cases), not by a general error mapper. Express JSON parser,
CORS errors and authenticated unmatched-route fallthrough fall outside route catches and use
default handling; anonymous unknown paths reaching progression's root auth middleware return 401
instead. The server does not guarantee the JSON domain envelope for default Express responses.
The Next proxy handles upstream
connectivity failures separately. [Error workflow](./components-workflows.md#6-error-propagation-and-recovery)
owns the complete propagation to browser feedback/recovery.

## 5. Progression algorithm

Sources: [progression routes](../../apps/api/src/routes/progression.routes.ts),
[progression service](../../apps/api/src/services/progression.service.ts),
[progression schema](../../apps/api/src/schemas/progression.schema.ts).

### 5.1 Trigger and eligible input

Suggestions are generated on the owned planned session's suggestion GET if no suggestions exist,
and evaluation is also invoked by the stagnation route. A session may still be `in_progress` at
summary. Abandoned/ad-hoc sessions return no suggestions. Evaluation excludes skipped/substituted
exercises but does not require session-exercise status completed: non-null actualReps determines
recorded sets. An unperformed target set is filtered out rather than making the entire exercise fail.

### 5.2 Decisions in evaluateExercise

1. Keep sets with non-null actualReps; empty input means no suggestion.
2. Require every kept set to meet its own reps target. Weight passes when target or actual weight
   is null, or actual weight meets target. This null tolerance is actual behavior.
3. Suppress a suggestion if that exercise has a dismissed suggestion attached to any of the user's
   last **three completed sessions**, not the last three performances of that exercise.
4. Inspect the user's last **four completed sessions** (`MIN_SUCCESSFUL_SESSIONS + 2`, with the
   constant equal to 2). Included exercises are filtered by library ID, but the session query itself
   is not filtered to sessions containing that exercise.
5. Count matching exercise occurrences with the same number of recorded sets. Match set numbers
   to the current recorded-set structure (built as index + 1); require historical reps targets at
   least current targets, compatible weight targets, and each historical actual meeting its own
   target. At least **two** matching successful occurrences are needed.
6. If no recorded set has a positive weight target, suggest **+2 reps per set**. Otherwise suggest
   **+5 kg** for muscle groups pectoraux/dos/quadriceps/ischios/fessiers, **+2.5 kg** otherwise.
   Store the increment as currentValue 0 and suggestedValue delta, rather than an absolute target.

The comments describe current + two past sessions as three successes, but the query does not
exclude the current session when already completed; it does not require consecutive successes
and can count multiple matching exercise occurrences in a session. Historical completed ad-hoc
performances are not excluded from history even though ad-hoc sessions cannot generate suggestions.
There is no four-session variance test, average-volume threshold, exercise-ID/name heuristic,
weight-stuck fallback or increase-sets suggestion branch.

### 5.3 Persistence and response

Suggestions are unique per session + exercise. On P2002 the service retrieves the existing row;
this resolves duplicate generation races, not a whole-session atomic evaluation. Once rows exist,
the suggestion GET returns them rather than reevaluating changed results; partial generation or
summary-time corrections can therefore leave older suggestions.

Accept/dismiss first checks ownership in the route. The service locks the suggestion, rejects
ad-hoc/missing-workout context, and returns the existing result if already answered. Acceptance
applies `suggestedValue - currentValue` to **each linked template WorkoutSet**, updating reps or
weight with Prisma increments, then records status/respondedAt atomically. It does not change
the performed session's targets. If no corresponding template link is found, the current code
can still mark the suggestion accepted without a template update. Null template weight fields
and replaced/deleted links are important verification cases; do not claim all targets were updated
solely because the response says accepted.

The endpoint named stagnation currently reports exercise IDs from pending progression suggestions
and combines that with configured AI availability; it is not a separate statistical stagnation
algorithm. Existing coaching routes/services are distinct from automatic progression and guard
ad-hoc sessions.

## 6. Historical disposition and story boundary

| Historical pattern                             | Current replacement / disposition                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Controllers → service classes → repositories   | Domain Routers → selected function services or direct Prisma                                     |
| Global req.user declaration                    | AuthRequest.userId/userEmail                                                                     |
| Throw UnauthorizedError to central middleware  | Middleware directly returns auth errors                                                          |
| AppError hierarchy + pino middleware           | Route-local responses/Zod issues + console/session logs                                          |
| validate middleware + validators directory     | `.parse()` inside handlers + schemas directory                                                   |
| Flat workout exercises/sets and partial update | Nested item/exercise/set template and full replacement update                                    |
| Generic progression variance example           | Recorded per-set comparison, bounded user history, cooldown and transactional increment response |
| Streak service/model/endpoints                 | Absent; dashboard period-goal counters are not streaks                                           |
| Completion triggers suggestions in PATCH       | Summary-time suggestion GET and stagnation evaluation                                            |

[Story 3.8](../stories/3.8.daily-home-navigation.md) extends the existing `GET /tracking/today`
aggregate with optional, validated browser-local date context. With no context, the legacy
API-local-today behavior remains. With context, the service reads entries for the selected DATE
key and caps weekly/monthly entry progress at that key; completed sessions are counted by
`completedAt` in browser-local day/week/month timestamp ranges, each ending at the exclusive start
of the day after the selected date. Manual upserts continue to use the explicit DATE key, ownership
checks and Health Connect overwrite refusal; source is still `manual`. No migration, timezone
preference or historical configuration reconstruction was added. See the
[tracking workflow](./components-workflows.md#4-daily-tracking-and-date-attribution) and
[API contract](./api-spec.md#7-daily-tracking).
