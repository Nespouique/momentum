# Momentum — API Specification

## 1. Runtime contract and transport

Reconciled against source on 2026-10-11. This replaces section 5 of the
[archived architecture](../archive/architecture-original.md); schema/domain details from its
sections 4/8/18 are consolidated in [Data Models](data-models.md). Contracts below describe
implemented handlers, including limitations, not proposed endpoints.

[Express registration](../../apps/api/src/index.ts) mounts routes **without `/api/v1`**.
Direct API paths are `/auth`, `/profile`, `/measurements`, `/exercises`, `/workouts`, `/sessions`,
`/progression-suggestions`, `/config`, `/health-sync`, `/trackables` and `/tracking`.
Browser clients use `/backend` + the same path via the
[Next.js proxy](../../apps/web/src/app/backend/[...path]/route.ts).

- JSON request bodies; Express JSON limit 10 MB. GET query parameters are listed per domain.
- Bearer auth: `Authorization: Bearer <token>`. Cookies do not authenticate Express; the proxy
  does not synthesize a token from them.
- Proxy exports GET/POST/PUT/PATCH/DELETE, preserves path/query, forwards headers except `host`,
  forwards body text on non-GET/HEAD, and streams upstream response/status/headers except
  `transfer-encoding`. Network failure: 502 `PROXY_ERROR` / `Failed to connect to API server`.
- There is no universal success wrapper. Tables state exact envelopes: a bare resource,
  `{data: ...}`, `{user: ...}`, or paginated object. Dates in JSON are strings, not JS Date objects.
- Zod object schemas define recognized fields; extra keys are not a way to set user IDs, sources,
  timestamps or undocumented filters. Many query dates are `z.coerce.date()`; request-specific
  date formats must not be generalized into a global strict-date validator.
- All endpoints below require Bearer auth **except** root, health, public auth operations,
  and `/exercises/muscle-groups`. The `/config/ai-status` handler has no local auth middleware,
  but is effectively protected: the earlier root-mounted progression router authenticates
  requests before they reach the configuration router.

## 2. Authentication and profile

Sources: [auth routes](../../apps/api/src/routes/auth.routes.ts),
[auth validation](../../apps/api/src/schemas/auth.schema.ts),
[profile routes](../../apps/api/src/routes/profile.routes.ts),
[profile validation](../../apps/api/src/schemas/profile.schema.ts).

<!-- prettier-ignore -->
| Method / path | Auth | Request → success |
| --- | --- | --- |
| POST `/auth/register` | Public | `{name,email,password,birthDate?,height?}` → 201 `{user,accessToken,expiresAt}` |
| POST `/auth/login` | Public | `{email,password}` → 200 `{user,accessToken,expiresAt}` |
| POST `/auth/logout` | Public | No required body → 200 `{message:"Logged out successfully"}` |
| GET `/auth/me` | Bearer | → 200 `{user}` |
| POST `/auth/forgot-password` | Public | `{email}` → 200 `{message:"If an account exists with this email, a reset link has been sent."}` |
| POST `/auth/reset-password` | Public | `{token,password}` → 200 `{message:"Password has been reset successfully."}` |
| GET `/profile` | Bearer | → bare profile |
| PATCH `/profile` | Bearer | `{name?,birthDate?,height?,goalDescription?}` → bare profile |
| GET `/profile/preferences` | Bearer | → `{accentColor}` |
| PATCH `/profile/preferences` | Bearer | `{accentColor}` → `{accentColor}` |
| PUT `/profile/password` | Bearer | `{currentPassword,newPassword}` → `{message:"Password updated successfully"}` |

Validation/projections:

- Registration: name length ≥2; valid email; password ≥8 characters; optional birthDate is merely
  a string (no date validation); optional height is an integer 50–300 cm, **not nullable**.
  User projection: `id,email,name,accentColor,birthDate,createdAt`.
- Login: valid email; nonempty password. User projection: `id,email,name,accentColor`.
  `/auth/me` adds `createdAt`, not birthDate or updatedAt. No password/reset hashes are returned.
- Profile GET/PATCH projection: `id,email,name,birthDate,height,goalDescription,createdAt`.
  Optional name ≥2; birthDate string/null (empty string clears it); height number/null 50–300;
  goalDescription string/null ≤500. Omitted fields are preserved. Accent uses separate preferences.
- Preferences require six-digit hex `#RRGGBB`; response/persistence uppercase the value.
- Password change: current password nonempty, new password ≥8. Reset: nonempty token/password ≥8.
  No strength/complexity policy beyond these lengths, no email normalization in these handlers.

Example valid requests (IDs/tokens in this document are illustrative; retrieve actual IDs first):

```json
{
  "name": "John Doe",
  "email": "user@example.com",
  "password": "SecurePass123!",
  "birthDate": "1990-01-15",
  "height": 180
}
```

```json
{ "accentColor": "#22c55e" }
```

The second request returns `{"accentColor":"#22C55E"}`.

### Token and ownership contract

[Auth service](../../apps/api/src/services/auth.service.ts): bcrypt cost 12; JWT contains
`userId,email` and standard `iat/exp`, expiry 7 days, secret from `JWT_SECRET` with a development
fallback. [Middleware](../../apps/api/src/middleware/auth.middleware.ts) verifies the token and
sets `req.userId/userEmail`; it does not look up the account or revoke tokens.
Logout acknowledges client-side removal; it does **not** invalidate a JWT. Password change/reset
also do not revoke outstanding tokens. There is no refresh-token or server-session API.

[Reset service](../../apps/api/src/services/password-reset.service.ts) generates 32 random bytes
as hex, stores SHA-256 digest and one-hour expiry, then sends a link through
[Resend](../../apps/api/src/services/email.service.ts). Expired or successfully used tokens are
cleared. Missing email has the same successful forgot-password response; unexpected exceptions
can still return 500. A successful handler response does not separately confirm email delivery.

## 3. Body measurements

Sources: [routes](../../apps/api/src/routes/measurement.routes.ts),
[validation](../../apps/api/src/schemas/measurement.schema.ts).

<!-- prettier-ignore -->
| Method / path | Request/query | Success |
| --- | --- | --- |
| GET `/measurements` | `page` default 1, minimum 1; `limit` default 20, clamped 1–50 (parseInt) | `{data,pagination:{page,limit,total,totalPages}}`, date descending |
| GET `/measurements/latest` | none | Bare Measurement; 404 if none |
| GET `/measurements/progress` | Required `field`; `period=1month|3months|6months|1year|all`, default 3months | `{field,period,data:[{date,value}],change,changePercent}` |
| GET `/measurements/:id` | none | Bare Measurement |
| POST `/measurements` | Required parseable `date` string, optional measurement fields/notes | 201 bare Measurement |
| PUT `/measurements/:id` | Same fields, all optional, partial update | Bare Measurement |
| DELETE `/measurements/:id` | none | 204, empty body |

Ownership is enforced by authenticated user ID on all record reads/updates/deletes. Measurement
date validation uses `Date.parse`, not a strict YYYY-MM-DD regex; storage is DATE. All numeric
fields and notes may be omitted or explicitly null. Numeric bounds (inclusive):

<!-- prettier-ignore -->
| Fields | Range |
| --- | --- |
| `weight` (kg) | 20–500 |
| `neck` | 20–100 |
| `shoulders`, `chest`, `hips` | 50–200 |
| `bicepsLeft`, `bicepsRight` | 15–80 |
| `forearmLeft`, `forearmRight` | 15–60 |
| `wristLeft`, `wristRight` | 10–30 |
| `waist` | 40–200 |
| `thighLeft`, `thighRight` | 30–100 |
| `calfLeft`, `calfRight` | 20–70 |
| `ankleLeft`, `ankleRight` | 15–40 |

Circumferences are cm; notes ≤1000 characters. Progress `field` accepts exactly the numeric
fields above. Data dates are YYYY-MM-DD, null samples omitted, chronological ascending; changes
are null with fewer than two points, otherwise rounded to two decimals. Period windows are
anchored to current server time, not a selectable reference date. No numeric field is mandatory.

```json
{
  "date": "2026-10-11",
  "weight": 75.5,
  "waist": 82,
  "bicepsLeft": 35,
  "bicepsRight": 35.5,
  "notes": "Morning measurement"
}
```

Creation/update date uniqueness conflict is 409 `DUPLICATE_DATE`, not generic `CONFLICT`.

## 4. Exercise library and workouts

### Exercise routes

Sources: [routes](../../apps/api/src/routes/exercise.routes.ts),
[validation](../../apps/api/src/schemas/exercise.schema.ts),
[muscle vocabulary](../../packages/shared/src/types/index.ts).

<!-- prettier-ignore -->
| Method / path | Request/query | Success |
| --- | --- | --- |
| GET `/exercises/muscle-groups` | Public | `{muscleGroups:[...]}` |
| GET `/exercises` | Optional `muscleGroup`, `search` | `{data,total}`, name ascending |
| GET `/exercises/stats` | none | `{data:[{exerciseId,exerciseName,muscleGroups,sessions}]}` |
| GET `/exercises/:id` | none | Bare Exercise |
| GET `/exercises/:id/last-performance` | none | `{data:null}` or `{data:{exerciseId,exercise,sessionId,completedAt,workout,sets}}` |
| POST `/exercises` | `{name,muscleGroups}` | 201 bare Exercise |
| PUT `/exercises/:id` | `{name?,muscleGroups?}` | Bare Exercise |
| DELETE `/exercises/:id` | none | 204 |

Name 2–100 characters; muscleGroups nonempty array drawn from `abdos,biceps,dos,epaules,fessiers,
ischios,lombaires,mollets,pecs,quadriceps,trapezes,triceps`. Search is case-insensitive substring;
muscle filter checks array membership. `isCustom` is not a supported filter/field.
The library is **shared**: authenticated users can mutate any library exercise; only performance
statistics/history are user-scoped. Deletion rejects use in workout programs (409); references
from session history/suggestions can still cause an unmapped FK error (500).

Stats include completed user sessions, exclude skipped/substituted exercises, require nonnull
actual reps/weight, and expose per-session `sessionId,completedAt,bestE1RM,totalVolume,maxWeight,
repsAtMaxWeight`. E1RM uses Epley `weight*(1+reps/30)`; volume is sum reps×kg, rounded to one decimal.
Last performance filters completed user sessions and sets with nonnull completedAt; its sets
project `setNumber,actualReps,actualWeight,rpe`, and `workout` may be null for ad-hoc history.
Missing performance, including an unknown exercise ID with no history, returns `{data:null}`.

### Workout routes

Sources: [routes](../../apps/api/src/routes/workout.routes.ts),
[nested validation](../../apps/api/src/schemas/workout.schema.ts).

<!-- prettier-ignore -->
| Method / path | Request/query | Success |
| --- | --- | --- |
| GET `/workouts` | Optional case-insensitive `search` | `{data,total}`; updatedAt descending; items/exercises and `lastCompletedAt` included, sets omitted |
| GET `/workouts/:id` | none | Bare full Workout with ordered items/exercises/sets |
| POST `/workouts` | Full nested template | 201 bare full Workout |
| PUT `/workouts/:id` | Same required payload as create | Bare full Workout; replaces all items transactionally |
| DELETE `/workouts/:id` | none | 204; existing planned session FK may prevent deletion → 500 |
| POST `/workouts/:id/duplicate` | No required body | 201 full copy; name suffix ` (copy)`, new nested IDs |

All are user-owned. Missing/foreign workouts return 404 `Workout not found`.
Payload: name 2–100; optional nullable description ≤500; at least one item.
Item requires type `exercise|superset`, integer position ≥1, integer rounds 1–10, integer
restAfter 0–600 seconds and exercises. Simple item must have exactly one exercise, superset ≥2;
simple rounds need not equal 1. Each exercise requires UUID exerciseId, integer position ≥1,
integer restBetweenSets 0–600 and ≥1 set. Each set requires integer setNumber ≥1, integer
targetReps 1–100, optional nullable targetWeight 0–500 kg. All referenced exercises must exist.
Duplicate positions/set numbers are not rejected. Template updates recreate nested IDs and clear
nullable session-template links via SQL referential actions; copied session targets survive.

Example POST `/workouts` (valid shape, replace UUID with an existing exercise ID):

```json
{
  "name": "Push Day",
  "description": "Chest and triceps",
  "items": [
    {
      "type": "exercise",
      "position": 1,
      "rounds": 1,
      "restAfter": 120,
      "exercises": [
        {
          "exerciseId": "11111111-1111-4111-8111-111111111111",
          "position": 1,
          "restBetweenSets": 90,
          "sets": [
            { "setNumber": 1, "targetReps": 10, "targetWeight": 60 },
            { "setNumber": 2, "targetReps": 10, "targetWeight": 60 }
          ]
        }
      ]
    }
  ]
}
```

## 5. Workout sessions

Sources: [all session handlers](../../apps/api/src/routes/session.routes.ts),
[validation](../../apps/api/src/schemas/session.schema.ts),
[client DTOs](../../apps/web/src/lib/api/sessions.ts).

<!-- prettier-ignore -->
| Method / path | Request/query | Success |
| --- | --- | --- |
| GET `/sessions` | Optional `status`, UUID `workoutId`, coerced dates `from,to`; limit default 20 (1–100), offset default 0 (≥0) | `{data,total,limit,offset}`; startedAt descending; compact exercises/workout |
| GET `/sessions/active` | none | `{data:Session|null}` |
| GET `/sessions/last` | Required UUID `workoutId` | `{data:Session|null}`, last completed by completedAt |
| GET `/sessions/:id` | none | `{data:Session,lastSession:Session|null}` |
| POST `/sessions` | `{workoutId:UUID}` | 201 `{data:Session,lastSession:Session|null}` |
| POST `/sessions/ad-hoc` | `{exerciseId:UUID}` | 201 `{data:Session,lastSession:null}` |
| PATCH `/sessions/:id` | `{status?:"completed"|"abandoned",notes?:string}` (≤1000) | `{data:Session}` |
| DELETE `/sessions/:id` | none | 204 |
| POST `/sessions/:id/exercises` | `{exerciseId:UUID}` | 201 `{data:SessionExercise}`; active ad-hoc only |
| PATCH `/sessions/:id/exercises/:exerciseId` | `{status:"skipped"}` | `{data:SessionExercise}` |
| POST `/sessions/:id/exercises/:exerciseId/substitute` | `{newExerciseId:UUID}` | 201 `{data:SessionExercise}` |
| PUT `/sessions/:id/exercises/reorder` | `{exerciseIds:UUID[]}` nonempty | `{data:SessionExercise[]}` |
| POST `/sessions/:id/superset/:workoutItemId/replace` | `{exerciseIds:UUID[]}` nonempty | 201 `{data:SessionExercise[]}` |
| POST `/sessions/:id/exercises/:exerciseId/sets` | `{setNumber,actualReps,actualWeight,rpe?}` | 200 `{data:SessionSet}`; updates existing target set |
| PUT `/sessions/:id/sets/:setId` | `{actualReps?,actualWeight?,rpe?}` | `{data:SessionSet}` |
| DELETE `/sessions/:id/sets/:setId` | none | 204 |
| GET `/sessions/:id/logs` | none | `{data:{session:{id,status,startedAt,completedAt},totalCalls,logs}}` |

`exerciseId` in **nested route parameters** denotes a SessionExercise row ID, not the shared
Exercise ID; body exerciseId/newExerciseId denotes the library ID. SetId denotes a SessionSet.
Full sessions contain scalar session fields, nullable workout `{id,name,description}`, ordered
exercises with library summary `{id,name,muscleGroups}`, nullable workoutItem
`{id,type,rounds,restAfter}`, nullable workoutItemExercise `{id,restBetweenSets}`, and ordered
SessionSets. List responses instead include workout `{id,name}|null` and exercises
`{id,status,exercise:{id,name,muscleGroups}}`; they do not contain set details.

### Execution rules

- Start planned session requires an owned workout; copies template targets, flattening ordered
  exercises with grouping links and zero-based positions. Ad-hoc has `type:"ad_hoc"`,
  `workoutId:null`, `workout:null`; default/history targets are documented in [Data Models](data-models.md).
- Both starts reject an existing active session: 409 `SESSION_ALREADY_ACTIVE`, with
  `activeSessionId` **inside error**. SQL partial uniqueness also protects concurrent starts.
- All operations verify session ownership and nested membership. No UUID parser is applied
  universally to route parameters; body/query validation is endpoint-specific.
- Appending requires active ad-hoc, locks the session row, rejects an already-present library
  exercise (409 CONFLICT), and appends after maximum position.
- Skip/substitute/reorder/superset replacement/record/delete-set require an active session;
  most use 400 SESSION_NOT_ACTIVE. PUT result update has **no active-session restriction**.
  PATCH session itself allows terminal status/notes updates without an active-only guard.
- Completing/abandoning stamps current completedAt. Completion marks eligible exercises with
  any nonnull actualReps as completed, even if other target sets remain unrecorded.
- Substitution marks original row substituted and copies targets only into its replacement.
  Reorder validates supplied rows exclude skipped/substituted; subsets are placed after excluded
  active rows. Returned list excludes substituted but can include skipped rows.
- Superset replacement uses original first exercise's set count and last completed per-exercise
  performance targets (10 reps/0 kg fallback); retains grouping. Its intermediate fractional
  position write conflicts with Prisma Int: see remaining discrepancies in [Data Models](data-models.md).
- Record set requires positive integer setNumber, integer actualReps 0–100, actualWeight 0–1000 kg,
  optional integer RPE 1–10; null RPE is not accepted here. PUT uses optional same bounds, allows
  explicit null RPE, and does not stamp completedAt. There is no generic POST `/sessions/:id/sets`.
- Logging is best-effort for wrapped session requests; ownership is checked for logs retrieval.
  The wrapper can attempt logging failed/foreign-ID operations; this is not a complete security
  audit ledger or a source of workout completion counts.

Example POST results (replace session/exercise route IDs with actual row IDs):

```json
{ "setNumber": 1, "actualReps": 10, "actualWeight": 60, "rpe": 7 }
```

Example active-session conflict:

```json
{
  "error": {
    "code": "SESSION_ALREADY_ACTIVE",
    "message": "You already have an active session",
    "activeSessionId": "22222222-2222-4222-8222-222222222222"
  }
}
```

## 6. Progression, coaching and configuration

Sources: [progression routes](../../apps/api/src/routes/progression.routes.ts),
[progression service](../../apps/api/src/services/progression.service.ts),
[response validation](../../apps/api/src/schemas/progression.schema.ts),
[coaching routes](../../apps/api/src/routes/ai-coaching.routes.ts),
[coaching service](../../apps/api/src/services/ai-coaching.service.ts),
[proposal validation](../../apps/api/src/schemas/ai-coaching.schema.ts),
[configuration route](../../apps/api/src/routes/config.routes.ts).

<!-- prettier-ignore -->
| Method / path | Request | Success |
| --- | --- | --- |
| GET `/sessions/:sessionId/progression-suggestions` | none | `{data:[{id,exerciseId,exerciseName,suggestionType,currentValue,suggestedValue,reason,status,createdAt,respondedAt}]}` |
| GET `/sessions/:sessionId/stagnation` | none | `{data:{hasStagnation,stagnatingExerciseIds,aiCoachingAvailable}}` |
| PATCH `/progression-suggestions/:id` | `{status:"accepted"|"dismissed"}` | `{data:{id,status,respondedAt}}` |
| POST `/sessions/:id/ai-coaching` | No required body | `{data:{sessionId,workoutName,analyzedSessionsCount,proposals,coachMessage}}` |
| POST `/sessions/:id/apply-coaching` | `{proposals:[{exerciseId,sets:[{setNumber,targetReps,targetWeight}]}]}` | `{data:{success:true,appliedCount}}` |
| GET `/config/ai-status` | Bearer required by earlier root-mounted router; no body | `{data:{available:boolean}}`, key configuration only, not provider health |

The configuration handler itself is public, but [mount order](../../apps/api/src/index.ts)
places `app.use("/", progressionRoutes)` before `/config`; that router's
`router.use(authMiddleware)` runs even when none of its progression endpoints match.
Consequently anonymous GET `/config/ai-status` returns 401 UNAUTHORIZED before the handler;
a valid Bearer token allows it to proceed. The current
[client `getAIStatus()`](../../apps/web/src/lib/api/sessions.ts) sends no Authorization header,
so its request fails with 401 even when the user is logged in. This is an existing integration bug.

All session/suggestion operations verify ownership. Suggestion reads lazily generate missing
suggestions for planned in-progress/completed sessions; abandoned/ad-hoc return empty data.
Stagnation currently means **pending progression suggestions**, not an independent plateau
analysis; ad-hoc returns false/empty/AI unavailable. See current increment semantics and algorithm
discrepancies in [Data Models](data-models.md#8-type-boundaries-and-remaining-discrepancies).
Acceptance updates linked template sets transactionally, once; it does not alter recorded results.

AI requires planned session + workout; generation additionally requires configured OpenAI key.
It analyzes current exercise data and up to nine completed same-user/same-workout sessions, using
`gpt-4o-mini`. Proposal contains `exerciseId,exerciseName,analysis,justification,sets`; each set has
`setNumber,currentReps,currentWeight,suggestedReps,suggestedWeight`. Generation parses provider
JSON without a full Zod output validation. Proposals are not persisted or signed approval objects.

Apply requires nonempty proposals/sets, UUID exercise IDs, integer setNumber ≥1, integer
targetReps 1–100, required nullable targetWeight ≥0 (no maximum). It rejects duplicate exercises,
duplicate set numbers, ambiguous/ineligible session exercise matches and missing current linked
template sets; partial valid set proposals are accepted. appliedCount counts **sets**, not
exercises. It does not require an OpenAI key or verify provenance against a generated proposal.

```json
{
  "proposals": [
    {
      "exerciseId": "11111111-1111-4111-8111-111111111111",
      "sets": [{ "setNumber": 1, "targetReps": 10, "targetWeight": 62.5 }]
    }
  ]
}
```

## 7. Daily tracking

Sources: [routes](../../apps/api/src/routes/tracking.routes.ts),
[schemas](../../apps/api/src/schemas/tracking.schema.ts),
[service](../../apps/api/src/services/tracking.service.ts),
[browser client](../../apps/web/src/lib/api/tracking.ts).

<!-- prettier-ignore -->
| Method / path | Request/query | Success |
| --- | --- | --- |
| GET `/tracking/today` | Optional selected-day context: `date` plus all of `dayStart,nextDayStart,weekStart,monthStart,weekDateStart,monthDateStart`; omit the entire context for legacy behavior | `{date,rings,sleep,trackables,workoutSessions,progress}` |
| GET `/tracking/rings` | No parsed date parameter | `{steps,active,calories}` |
| GET `/tracking/entries` | Optional coerced dates `from,to`, UUID trackableId; limit default 20 (1–100), offset default 0 (≥0) | `{data,total,limit,offset}`, date descending |
| POST `/tracking/entries` | `{trackableId:UUID,date:"YYYY-MM-DD",value:number,notes?:string}` | 201 bare DailyEntry, for both insert/update |
| DELETE `/tracking/entries/:id` | none | 204 |
| GET `/tracking/summary` | `period=week|month` default week; optional coerced `date` default now | `{period,start,end,trackables:[{trackableId,name,completionRate,daysCompleted,totalDays}]}` |

### Dashboard response and counters

- Without optional date context, `date` is API-process-local today formatted YYYY-MM-DD, preserving
  the legacy contract. With complete context, `date` is the validated browser-selected calendar key.
  DATE queries represent either key as UTC midnight (`new Date(dateStr + "T00:00:00.000Z")`), not
  as a local-midnight instant.
- `rings.steps/active/calories`: `{value,goal,percentage,trackableId}`. Missing item yields
  0/0/0/null; missing entry yields value 0; percentage is rounded and not capped at 100.
- `sleep`: same shape, nullable goal; absent sleep item yields 0/null/0/null; duration in minutes.
- Custom `trackables` include only currently active non-system items, sortOrder ascending, with
  `id,name,icon,color,trackingType,unit,goal,entry,completed,goalProgress`. Goal and entry are full
  selected persistence rows or null, even though client types expose a smaller projection.
  Current goal means one `endDate=null` row, not goal active at the requested historical date.
- Daily completion: boolean with goal uses value ≥1; daily number/duration uses targetValue;
  non-daily number/duration uses value >0; any goal-less item uses value >0.
  Weekly/monthly goalProgress `{current,target,frequency}` counts positive-entry days for boolean,
  sums positive values for number/duration. Without context it covers the full current period; with
  selected-day context it covers that period from its supplied date start through the selected
  DATE key, inclusive. Both modes use current trackables/goals, not a historical configuration.
- `workoutSessions:{today,thisWeek,thisMonth,goal}` counts completed sessions by `completedAt`,
  both planned/ad-hoc; imported activities do not count. Without context, day/week/month bounds
  are API-local. With context they use supplied browser-local timestamp starts and a half-open
  range ending at `nextDayStart`, so all three counters exclude completions after the selected
  local day. Goal is current system workout goal `{targetValue,frequency}` or null.
- `progress:{completed,total,percentage}` counts custom active items only; rounded percentage,
  zero if no custom items. Rings/system metrics do not contribute to this denominator.
- Summary uses current active system/custom items and current goals over the full containing
  Monday-start week/month. **Only with an open goal** (`endDate=null`), totalDays is the number
  of entries, not calendar days; daysCompleted counts values ≥targetValue regardless of goal
  frequency/type, and completionRate is their rounded percentage (0 when there are no entries).
  Without an open goal, completionRate, daysCompleted and totalDays are all 0, even if entries
  exist. The goal-based formula differs from dashboard weekly boolean completion logic.

### Entry editing, attribution and security

Ownership is enforced through TrackableItem for list/upsert/delete. Input date has only a shape
regex, not calendar validity/future-date validation; `value` has no range/type-dependent bounds,
notes no length limit. Requests do not accept source/userId/timestamps. Date is converted with
`new Date(data.date)`; callers should supply the displayed calendar key, not an ISO instant that
shifts local days. Missing entries are absent from history and null/zero in dashboard defaults.
Reading today/entries/summary does not create DailyEntry rows.

Manual upsert writes source `manual`; omitted notes preserve existing notes. Existing
`health_connect` source returns 403, as does deletion of an imported entry. These protections are
application checks before writes, not atomic database predicates. System/disabled trackables
without an imported entry are not categorically rejected by this API. Preserve existing home
editing rules rather than infer a broader read-only policy from `isSystem` alone.

```json
{
  "trackableId": "33333333-3333-4333-8333-333333333333",
  "date": "2026-10-10",
  "value": 1,
  "notes": "Evening yoga"
}
```

GET `/tracking/entries?from=2026-10-10&to=2026-10-10&limit=100&offset=0` reads that day;
pagination remains necessary above 100 records. It includes nested trackable summary
`id,name,icon,color,trackingType,unit`, not configuration-only habits without entries.
There is **no GET `/tracking/entries/:date`** route. Adding `?date=...` to today/rings has no effect.

## 8. Trackable configuration

Sources: [routes](../../apps/api/src/routes/trackable.routes.ts),
[schemas](../../apps/api/src/schemas/trackable.schema.ts),
[services](../../apps/api/src/services/trackable.service.ts).

<!-- prettier-ignore -->
| Method / path | Request | Success |
| --- | --- | --- |
| GET `/trackables` | none | `{data:[{id,name,icon,color,trackingType,unit,isSystem,isActive,sortOrder,goal}]}` |
| POST `/trackables` | `{name,icon,color,trackingType,unit?}` | 201 bare TrackableItem |
| PATCH `/trackables/:id` | `{name?,icon?,color?,unit?,isActive?,sortOrder?}` | Bare TrackableItem |
| DELETE `/trackables/:id` | none | 204; system item →403 |
| POST `/trackables/:id/goals` | `{targetValue,frequency}` | 201 bare TrackableGoal |
| PATCH `/trackables/:id/goals/:goalId` | `{targetValue?,frequency?,endDate?}` | Bare TrackableGoal |
| PUT `/trackables/reorder` | `{items:[{id:UUID,sortOrder:integer}]}` | `{success:true,updated:count}` |
| POST `/trackables/suggest-icons` | `{name}` | `{icons:[five validated icon names],color}` |

Name 1–50, icon nonempty (CRUD does not check icon vocabulary), six-digit hex color,
trackingType `boolean|number|duration`; create unit optional string, not null. PATCH unit
optional/null, max20; trackingType is not updateable. sortOrder integer, no minimum. System
items may be updated/renamed/deactivated; only deletion is specially forbidden.
Reads include inactive items and one current goal, sorted by sortOrder. List handler may lazily
create the workout trackable/default weekly goal and a missing goal for an existing sleep item.
Custom creation creates no goal automatically, starts sortOrder at100 or appends after max.

Goal targetValue >0; frequency daily/weekly/monthly; creation startDate is server now and closes
existing open goals transactionally. No accepted startDate field or historical reconstruction.
PATCH endDate must be datetime string, cannot clear it with null. Goal ownership includes parent
trackable and goal membership. Reorder permits an empty array, validates all item ownership;
missing/foreign/duplicate IDs trigger a service exception mapped to 500, not 404/403.

Icon suggestion name uses same bound, calls gpt-4o-mini, validates returned names against the
server set and pads to five fallbacks; invalid/empty model JSON uses fallback icons/color.
No configured key returns 503 SERVICE_UNAVAILABLE. There is no GET `/trackables/:id`, no PUT
trackable/goal route and no goal-delete route.

## 9. Health synchronization and health checks

Sources: [HealthSync routes](../../apps/api/src/routes/health-sync.routes.ts),
[HealthSync validation](../../apps/api/src/schemas/health-sync.schema.ts),
[root/health handlers](../../apps/api/src/index.ts).

<!-- prettier-ignore -->
| Method / path | Auth | Request/query → success |
| --- | --- | --- |
| POST `/health-sync` | Bearer | Batch below → `{synced:{dailyMetrics,activities,sleepSessions},device:{id,lastSyncAt}}` |
| GET `/health-sync/status` | Bearer | → `{configured,lastSync,trackables}` |
| GET `/health-sync/activities` | Bearer | Optional `from,to` coerced dates, activityType string; limit20 (1–100), offset0 (≥0) → `{data,total,limit,offset}` |
| GET `/` | Public | → `{message:"Momentum API"}` |
| GET `/health` | Public | SELECT1 success →200 `{status:"ok",timestamp,database:"connected"}`; failure →503 `{status:"error",timestamp,database:"disconnected"}` |

Health does not return version or `healthy/unhealthy`. HealthSync status configured means any
system trackable exists, not necessarily a successful sync. lastSync is latest device timestamp
or null. trackables contains available `steps,activeCalories,activeMinutes,sleepDuration` keys
with `{id,goalValue:number|null}`; missing keys are omitted; workout trackable is not mapped.
Activities response projects `id,date,startTime,endTime,activityType,title,durationMinutes,
calories,distance,heartRateAvg,sourceApp`; date descending, scoped to authenticated user.

### Batch payload and import rules

Required `deviceName` nonempty, `syncedAt` datetime string. `dailyMetrics`, `activities` and
`sleepSessions` default to empty arrays if omitted. Required nullable fields inside each record
must still be provided (null does not mean optional).

<!-- prettier-ignore -->
| Record | Fields / validation |
| --- | --- |
| dailyMetrics | date YYYY-MM-DD shape; steps nullable integer ≥0; activeCalories, activeMinutes nullable number ≥0 |
| activities | hcRecordId nonempty string; date YYYY-MM-DD shape; startTime/endTime datetime; activityType nonempty; title nullable string; durationMinutes ≥0; calories/distance nullable ≥0; heartRateAvg nullable integer ≥0; sourceApp nullable string |
| sleepSessions | date YYYY-MM-DD shape; startTime/endTime datetime; durationMinutes ≥0; score nullable integer 0–100; stages nullable array |
| sleep stage | stage `awake|light|deep|rem|sleeping`; startTime/endTime datetime |

No cross-field end-after-start, duration consistency, calendar validity or maximum batch length
validation is implemented. Distances are metres, energy kcal, durations minutes, heart rate bpm.

```json
{
  "deviceName": "Android phone",
  "syncedAt": "2026-10-11T08:00:00.000Z",
  "dailyMetrics": [
    { "date": "2026-10-10", "steps": 8500, "activeCalories": 420, "activeMinutes": 60 }
  ],
  "activities": [],
  "sleepSessions": [
    {
      "date": "2026-10-10",
      "startTime": "2026-10-09T22:00:00.000Z",
      "endTime": "2026-10-10T06:00:00.000Z",
      "durationMinutes": 480,
      "score": null,
      "stages": null
    }
  ]
}
```

One transaction upserts the user/device, lazily creates five system trackables/default goals,
upserts daily values/sleep by trackable+DATE with source health_connect, and activities by
user+hcRecordId. Null metrics skip writes; imports can overwrite prior manual values without
clearing notes. Sleep records on the same day overwrite sequentially; stages/score/start/end
are validated but discarded from persistence. `dailyMetrics` success count is **non-null metric
writes** (three in this example), not input day count; activity/sleep counts include updates.
syncedAt is caller-supplied, not server receipt time. Replay is an upsert, not a no-op guarantee.

## 10. Story 3.8 implementation and historical reconciliation

The implemented [Story 3.8](../stories/3.8.daily-home-navigation.md) adds selected-day context to
`GET /tracking/today` while preserving requests that omit context. The complete context consists
of the selected `date` key, browser-local `dayStart`/`nextDayStart`, browser-local `weekStart` and
`monthStart` instants, and the corresponding `weekDateStart` and `monthDateStart` DATE keys. The
schema requires all seven parameters together, validates calendar boundaries and instants, and
allows DST-length local days. The web derives them from browser calendar fields and serializes
instants for transport. The data models remain unchanged.

On contextual reads, the aggregate loads current configuration and selected-day DATE entries;
week/month positive-entry progress is bounded by the corresponding period DATE start and selected
date inclusive. Completed-session day/week/month counts filter `completedAt` over the respective
browser-local start and the exclusive `nextDayStart`. This does not alter `/tracking/rings`,
`/tracking/summary`, history filtering, or unrelated date-based endpoints. `POST /tracking/entries`
still accepts the explicit selected DATE key and retains its existing ownership, validation and
Health Connect source checks; upserts still mark manual entries as `manual`. Workout starts retain
their actual execution time for both session types.

The story's user-reported overall manual acceptance is recorded in the canonical story. It is not
a scenario-by-scenario agent test report, a formal BMAD/code review, or evidence of production
deployment. The local validation target was the development server on `code` with a local copy of
production data.

Historical omissions are deliberate and justified:

- `/api/v1`, protected/revoking logout, private custom exercises, flat WorkoutExercise/Set,
  absolute progression values and persisted Streak are obsolete designs, not current contracts.
- No `/progression/suggestions`, `/progression/history/:exerciseId`, `/progression/analysis`,
  `/streaks*`, GET `/tracking/entries/:date`, GET `/trackables/:id`, PUT trackable/goal or generic
  session POST sets is implemented. Current equivalents are listed above where they exist;
  nonexistent analyses/streaks have no claimed equivalent.
- Archive example envelopes, generic error status mappings and health version are replaced with
  actual handler responses. Original frontend/library/deployment guidance remains in its own
  shards; React Query references are not evidence of a current API client dependency.

Remaining cross-layer debt: shared Date typings and ApiResponse differ from JSON; tracking
trackableId can be null despite client string typing; migration-defined workout FK deletion
differs from an optional-relation schema default; supersets attempt fractional Int writes;
progression uses `pectoraux` vs `pecs` and historical-session counting needs independent review.
These are recorded, not repaired by Story 3.8. Its implementation does not imply changes to other
endpoint contracts or a broader tracking redesign.

## 11. Exact handled errors and security boundaries

Structured handler errors usually use:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [{ "field": "date", "message": "Date must be YYYY-MM-DD format" }]
  }
}
```

This detail is the explicit message for an entry date that fails the YYYY-MM-DD shape regex.
Other details are generated from each route's schema and installed Zod version.
`details` is optional; Zod handlers map issues to `{field:issue.path.join("."),message}`. Business
validation can return the same code without details. Standard unexpected exceptions return
500 `INTERNAL_ERROR` / `An unexpected error occurred`, except coaching, which returns its Error
message. This is not a universal Express error middleware. Unmatched routes that pass body/CORS
processing still encounter the root-mounted progression auth middleware: anonymous requests
return structured 401 UNAUTHORIZED (invalid Bearer tokens return 401 INVALID_TOKEN), whereas
requests with a valid Bearer token fall through to Express's default 404 response.
Malformed/oversized JSON and CORS failures may use Express default responses rather than this
envelope. No global
rate limiter or implemented 429 RATE_LIMITED/BAD_REQUEST contract exists in the app registration.

### Authentication/profile/measurement/library errors

<!-- prettier-ignore -->
| HTTP / code | Exact message / condition |
| --- | --- |
| 401 UNAUTHORIZED | `No valid authorization token provided` — missing/non-Bearer header |
| 401 INVALID_TOKEN | `Invalid or expired token` |
| 400 EMAIL_EXISTS | `An account with this email already exists` |
| 401 INVALID_CREDENTIALS | `Invalid email or password` |
| 404 USER_NOT_FOUND | `User not found` — me/profile reads and password change |
| 400 INVALID_PASSWORD | `Current password is incorrect` |
| 400 INVALID_RESET_TOKEN | `This reset link is invalid. Please request a new one.` |
| 400 EXPIRED_RESET_TOKEN | `This reset link has expired. Please request a new one.` |
| 404 NOT_FOUND | `No measurements found`, `Measurement not found`, `Exercise not found`, or `Workout not found` by route |
| 409 DUPLICATE_DATE | `A measurement already exists for this date` |
| 409 CONFLICT | `Cannot delete exercise used in workout programs` |
| 400 VALIDATION_ERROR | Workout missing reference: `One or more exercises do not exist: <comma-separated IDs>` |

### Session/progression/coaching errors

<!-- prettier-ignore -->
| HTTP / code | Exact message / condition |
| --- | --- |
| 404 NOT_FOUND | `Session not found`, `Exercise not found`, `Exercise not found in session`, `New exercise not found`, `Set not found for this exercise`, `Set not found in session`, or `Suggestion not found` |
| 404 NOT_FOUND | Superset: `No active exercises found for this superset` or `One or more exercises not found` |
| 409 SESSION_ALREADY_ACTIVE | `You already have an active session`, includes error.activeSessionId |
| 400 SESSION_NOT_ACTIVE | `Session is not active` — active-only mutations |
| 409 SESSION_NOT_ACTIVE | `Exercises can only be added to an active ad-hoc session` — append |
| 409 CONFLICT | `Exercise already exists in session` — append |
| 400 VALIDATION_ERROR | `Some exercise IDs are invalid or not part of this session` — reorder |
| 409 PROGRESSION_NOT_AVAILABLE | `Progression is not available for ad-hoc sessions` |
| 409 AI_COACHING_NOT_AVAILABLE | `AI coaching requires a planned workout session` |
| 503 SERVICE_UNAVAILABLE | `AI coaching is not available` — generation without key |
| 409 VALIDATION_ERROR | `Coaching proposal no longer matches the workout template` |
| 500 INTERNAL_ERROR | Coaching propagates service Error message; provider/JSON generation failure becomes `Failed to generate coaching advice` |

### Tracking/configuration errors

<!-- prettier-ignore -->
| HTTP / code | Exact message / condition |
| --- | --- |
| 404 NOT_FOUND | `Trackable not found`, `Entry not found`, or `Trackable or goal not found` |
| 403 FORBIDDEN | `Cannot overwrite HealthConnect data` |
| 403 FORBIDDEN | `Cannot delete HealthConnect data` |
| 403 FORBIDDEN | `System trackables cannot be deleted` |
| 503 SERVICE_UNAVAILABLE | `AI suggestions are not available` — icon suggestions without key |

All Zod parse failures caught by these routes use 400 VALIDATION_ERROR / `Validation failed` with
details. HealthSync has only validation/internal handler errors in addition to auth. Bare health
failure uses its own 503 body; proxy 502 is a separate transport error described in section 1.

### Implemented security boundaries

Owned resources are scoped to JWT user ID or checked before mutation: workouts, sessions and
nested results/logs, suggestions/coaching, measurements, trackables/goals/entries, device/health
sync and activity list. Foreign owned resources normally look missing (404); reorder trackables
instead maps membership failures to500. Shared exercise writes have no owner/admin role guard.
Prisma foreign keys do not implement authorization or row-level security.

Express uses Helmet and CORS. When HOST is `0.0.0.0`, CORS reflects any origin with credentials;
otherwise localhost3000/3001/3002 plus configured FRONTEND_URL are allowed (or no Origin header).
Do not infer a restrictive production-origin allowlist, rate limiting, JWT revocation, atomic
manual-vs-sync conflict policy or uniform error mapping from the historical security diagrams.

Useful external references retained for these domains:
[Prisma](https://www.prisma.io/docs), [Express error handling](https://expressjs.com/en/guide/error-handling.html),
[Zod](https://zod.dev),
[Health Connect records](https://developer.android.com/health-and-fitness/guides/health-connect/data-and-data-types/data-types).
