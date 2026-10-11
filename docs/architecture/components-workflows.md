# Momentum — Components and Workflows

Reconciled against the working-tree implementation on 2026-10-11. This document supersedes
the corresponding diagrams and examples in the [archived architecture](../archive/architecture-original.md),
sections 6 and 7. It describes implemented behavior, including Story 3.8's daily-home navigation.

## 1. Responsibility boundaries

| Document                                            | Responsibility                                                                                |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| This document                                       | Cross-layer sequences, decisions, recovery and implementation gaps                            |
| [Frontend architecture](./frontend-architecture.md) | Route/layout composition, component inventory, hooks, stores, hydration and browser transport |
| [Backend architecture](./backend-architecture.md)   | Express composition, ownership, validation, transaction boundaries and progression algorithm  |
| [Data models](./data-models.md)                     | Model fields, relations, constraints and migrations                                           |
| [API specification](./api-spec.md)                  | Endpoint/request/response contracts and status codes                                          |

Endpoint names below identify real execution steps rather than reproduce the API catalogue.
The linked route handlers and schemas remain the evidence for behavior while neighboring documents
are reconciled. Neither the former split nor the archive proves a feature is implemented.

## 2. Authentication and request authorization

Sources: [login page](<../../apps/web/src/app/(auth)/login/page.tsx>),
[auth store](../../apps/web/src/stores/auth.ts), [auth client](../../apps/web/src/lib/api/auth.ts),
[Next route gate](../../apps/web/src/proxy.ts),
[backend proxy](../../apps/web/src/app/backend/[...path]/route.ts),
[auth routes](../../apps/api/src/routes/auth.routes.ts),
[JWT middleware](../../apps/api/src/middleware/auth.middleware.ts).

```text
Login/register form → frontend validation → auth-store action → auth client
  → /backend/auth/login or register → Next forwarding route → Express schema.parse
  → user lookup/create + bcrypt → signed JWT + public user + expiresAt
  → auth store updates user/token/isAuthenticated → storage + cookie → home navigation
```

- Invalid input stops at the form or returns a Zod validation error from Express. Login lookup
  failure and password mismatch both return `INVALID_CREDENTIALS`; loading clears and the form
  displays the error. Registration auto-logs in after account creation.
- The browser persists auth state. The Next route gate trusts the cookie's `isAuthenticated`
  flag for navigation only; it does not verify the JWT. A protected navigation redirects to
  `/login?from=...` when this flag is absent. The login page currently navigates to `/` rather than
  consuming `from`.
- Protected API clients pass the token explicitly. Express requires a Bearer header, verifies the
  JWT, then attaches `userId` and `userEmail`; resource ownership is checked downstream.
- `checkAuth()` uses `/auth/me` and clears auth on any failure, including network failures. It is
  available in the store but is not a root-layout boot-time validation step.
- Logout clears the local auth state and sends a logout request. The server endpoint only
  acknowledges logout: it does not revoke the JWT or clear workout recovery storage.

## 3. Workout session lifecycle

Sources: [workouts page](<../../apps/web/src/app/(app)/workouts/page.tsx>),
[active session page](<../../apps/web/src/app/(session)/session/[id]/page.tsx>),
[session store](../../apps/web/src/stores/session.ts),
[session client](../../apps/web/src/lib/api/sessions.ts),
[session routes](../../apps/api/src/routes/session.routes.ts).

### 3.1 Start or resume

```text
Workouts page loads templates + active session
  active session exists → show resume/abandon actions; disable new starts
  no active session → choose a template OR first exercise for “À la volée”
    → start request → validate input/existence/ownership where applicable
    → create session + exercises + target sets → navigate /session/:id
    conflict → refresh active-session banner
Active session page → loadSession → server state + local recovery → select execution screen
```

The page uses an immediate ref lock and disabled controls to prevent duplicate starts. The backend
also checks for an active session and maps a concurrent unique-constraint failure to
`SESSION_ALREADY_ACTIVE` with its ID. This protects both start modes, including concurrent tabs.

| Decision                 | Planned                                                                                                                      | `ad_hoc`                                                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Initial structure        | Copy the owned template's ordered items into session exercises and target sets; retain template references for grouping/rest | Create one selected library exercise, with no workout/template references                                             |
| Initial targets          | Template `WorkoutSet` values                                                                                                 | Last completed, non-skipped/non-substituted performance for that exercise; no history → three sets of 10 reps at 0 kg |
| Comparison               | Last completed session of that workout plus per-exercise performance cache                                                   | Per-exercise history; `lastSession` is null                                                                           |
| Fresh execution          | Overview, then ordinary exercise or superset                                                                                 | Exercise screen directly                                                                                              |
| End of current exercises | Summary                                                                                                                      | `ad-hoc-decision`: add another exercise or enter summary                                                              |
| Progression/coaching     | Dedicated summary-time requests/actions                                                                                      | No template progression; AI coach hidden/rejected                                                                     |

Adding an ad-hoc exercise checks the owned session under a row lock, requires an active ad-hoc
session, rejects an exercise already present (including earlier skipped/substituted occurrences),
and appends it with its target sets. The client disables existing exercise IDs and reloads the
session after a successful addition. Display names use `workout?.name` with “À la volée” fallback.

### 3.2 Set, rest and execution decisions

```text
Exercise complete → POST result to existing session set immediately
  success → update session + retain returned set ID and sent values
  failure → retain input in pending-results storage for retry
  ordinary exercise → rest / transition
  superset → next member in same round (no timer), or rest/transition after last member
During rest → edit reps/weight in pending map
Rest expires or is skipped → flush changed result(s) with PUT, retry POST if necessary
  successful keys → clear recovery entries
  failed keys → keep recovery entries
  → next set / next round / next exercise / summary / ad-hoc decision
```

Results are associated with **session-exercise ID + set index**, not only the exercise-library ID.
The server POST updates a pre-created target set addressed by its set number; it does not append
an arbitrary flat set to the session. The round/set index stays on the completed round during
rest so edits still address that round. Superset detection counts active exercises sharing a
non-null workout item ID, including dynamically replaced groups.

Skip excludes the corresponding exercise/group from active navigation. Substitution preserves
the original as `substituted` and creates replacement targets. Reorder/postpone persists positions;
the store reloads and restores the current exercise/set by identity plus timer state. Group
replacement can produce one ordinary exercise or multiple superset members. These operations are
not a single atomic client transaction: parallel calls or reloads can fail after a server write.

### 3.3 Recovery, finish and abandon

- Navigation away resets in-memory session state, but preserves rest and pending-result storage.
  Reopening fetches the session, reconstructs ordinary/round-based progress, restores an unexpired
  rest for the same session and clamps obsolete indices. Without active rest, it attempts failed
  POSTs and modified-result PUTs, retaining unresolved keys.
- Rest is computed from an absolute `restEndAt`. Foreground visibility/focus/pageshow handling
  catches up the timer. Audio, service-worker notifications and wake lock are best-effort browser
  capabilities, not guarantees of background execution.
- Reaching `summary` is a client screen transition, **not** a persisted completed status.
  Summary edits are submitted first; `completeSession()` flushes pending writes before the final
  PATCH. A failed flush/PATCH throws and the page shows a failure toast rather than completion.
- The final PATCH records server completion time and marks non-skipped/non-substituted exercises
  with recorded reps as completed. It does not require every target set to have been performed.
  Successful finish clears recovery storage and returns to workouts; it does not return suggestions
  in the PATCH response.
- Abandon PATCH records `abandoned` and server completion time. Successful store abandonment clears
  recovery state. The store currently catches abandonment errors without rethrowing, while the page
  still navigates away; do not interpret that navigation as proof of a saved abandonment.

## 4. Daily tracking and date attribution

Sources: [home](<../../apps/web/src/app/(app)/page.tsx>),
[tracking client](../../apps/web/src/lib/api/tracking.ts),
[TrackableCard](../../apps/web/src/components/tracking/trackable-card.tsx),
[tracking routes](../../apps/api/src/routes/tracking.routes.ts),
[tracking service](../../apps/api/src/services/tracking.service.ts),
[Health Connect ingestion](../../apps/api/src/routes/health-sync.routes.ts).

```text
Home mount/token/selected-day change → getToday(date context) → /tracking/today
  → current configuration + selected-day entries + period counters capped at selected day
  → rings, sleep, workout counts, active custom habits
Edit habit → optimistic local value/completion → POST /tracking/entries with captured selected date
  owned trackable missing → 404
  existing Health Connect entry → 403; no overwrite
  otherwise → upsert (trackable, date), source manual → 201 entry
  success → refresh the aggregate for the owning selected date
  failure → error toast + reload to restore server values
```

Unchecking writes value `0`; it does not delete the daily row. Numeric/duration input uses
nonnegative `parseInt` values. Backend entry validation remains broader: UUID, date-string shape,
numeric value and optional notes; it does not enforce each tracking type's domain or future-date
policy. Home reads, snapshots, pending edits and drafts are keyed to token/user/date; late reads are
discarded, edits retain the date captured at interaction/editor opening, and failed optimistic
updates restore their original trackable/date snapshot.

### 4.1 Read and completion rules

- The home endpoint remains `GET /tracking/today`; its optional selected-day context is the date key
  and six local calendar bounds/date keys. Omitting the complete context preserves legacy
  API-local-today behavior. Current user trackables are ordered by `sortOrder`, current goals use
  `endDate: null`, active custom trackables form the editable list. System trackables supply
  separate rings/sleep/workout sections.
- Daily boolean completion uses a positive entry (at least 1 when a goal exists). Numeric/duration
  with a daily goal compare value to target; non-daily/no-goal completion uses positive value.
  Missing custom entries are incomplete. Missing system data has zero-value defaults.
- Weekly/monthly custom goal progress uses positive entries from the containing period start
  through the selected entry date: boolean counts entry days; numeric/duration sums values. Without
  selected-day context, the legacy current-period calculation remains. For a trackable with an open
  goal (`endDate: null`), the standalone summary instead counts
  rows meeting target and divides by existing entry rows, not by all calendar days. Without an
  open goal, it returns `completionRate: 0`, `daysCompleted: 0` and `totalDays: 0` even when period
  entries exist. It is not an interchangeable dashboard aggregator.
- Workout counters count only `completed` Momentum workout sessions using **completedAt**, with no
  type filter, so both planned and ad-hoc sessions qualify. With selected-day context, timestamp
  counters use browser-local day/week/month starts and the exclusive start of the day after
  selection as their upper bound. Without context, the existing API-local bounds remain. Health
  activities are stored separately and are not added to these workout counts.
- Rings, sleep and workout summary are display components without manual value callbacks.
  `TrackableCard` receives source metadata but does not itself disable edits for
  `health_connect`; the backend enforces that restriction on an existing synchronized row.
- Health sync overwrites its metrics/sleep daily rows with `source: health_connect`, even if an
  earlier row was manual. Manual entry changes cannot overwrite/delete an existing synchronized
  row. No manual-over-sync priority policy exists.

### 4.2 Date keys versus instants

| Context                   | Implemented convention                                                                                                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Daily tracking key        | `YYYY-MM-DD`; PostgreSQL DATE via Prisma. Legacy aggregate requests format API-local today; contextual home requests supply the browser-selected key. Both become UTC midnight for DATE queries |
| Manual/synchronized input | Date string converted to `Date`; a correctly formed date-only key represents UTC midnight. Entry schema checks shape, not complete calendar validity                                            |
| Goal periods              | Contextual home requests supply Monday-first browser-local week/month DATE keys and local-midnight instants; DATE keys query entries                                                            |
| Workout dashboard         | Legacy API-local day/week/month instant bounds; contextual home requests use browser-local bounds and exclusive next-local-day cutoff                                                           |
| Home heading              | Browser-local selected `YYYY-MM-DD` key formats the displayed date and is also sent to the aggregate                                                                                            |
| Session calendar          | Browser-local calendar keys from completedAt, falling back to startedAt; list API filters startedAt                                                                                             |

These conventions are not a user-specific timezone service. Contextual home reads explicitly
resolve browser/API timezone disagreement, and calendar stepping plus local-midnight boundaries
account for DST. The selected-day interval is half-open `[dayStart,nextDayStart)`; period session
counters also end at `nextDayStart`, while DATE entries use the selected calendar key. Correcting a
past daily entry changes its activity-date row even though creation/update occurred today.
The workout calendar is session history, not a habit-editing calendar or implemented daily home navigation.

## 5. Progression detection and response

Sources: [session page](<../../apps/web/src/app/(session)/session/[id]/page.tsx>),
[progression routes](../../apps/api/src/routes/progression.routes.ts),
[algorithm and acceptance transaction](../../apps/api/src/services/progression.service.ts).

```text
Planned session summary → GET /sessions/:id/progression-suggestions
  verify owned session
  ad_hoc or abandoned → empty suggestions
  existing suggestions → return them
  none → evaluate recorded exercise sets + recent user history → persist suggestions → return
User accepts/dismisses → PATCH /progression-suggestions/:id
  verify owner + planned mode → lock suggestion
  already answered → return previous answer (no second increment)
  accepted → increment linked template's per-set reps/weight + record answer in transaction
  dismissed → record answer; later evaluations respect cooldown
```

Generation works while a planned session is still `in_progress` at summary. It evaluates recorded
sets individually, not average volume/weight variance. The exact bounded-history qualification,
increments and caveats live in [backend progression](./backend-architecture.md#5-progression-algorithm).
The archived four-consecutive-session rule, exercise-name heuristic and `increase_sets` branch
are not the current algorithm. Suggestions are not recomputed automatically after every result
edit once a session already has suggestions. The route named `stagnation` currently derives IDs
from pending progression suggestions; it is not an independent plateau detector.

## 6. Error propagation and recovery

```text
Browser API function → Next forwarding route → Express
  invalid/missing Bearer → middleware returns JSON 401
  schema rejection → route catch formats Zod issues as JSON 400
  ownership/business rejection → route returns domain status/code
  unexpected caught exception → route logs + JSON INTERNAL_ERROR 500 (usually generic message)
  JSON parser/CORS failure outside route catch → Express default handling
  unknown path reaching progression root auth → anonymous 401; valid-token fallthrough → default 404
Next upstream fetch failure → JSON PROXY_ERROR 502
Response → domain client parses JSON and throws domain Error
  → form alert / page error / toast / store error / retained pending results
```

The forwarding route preserves upstream status/body rather than classifying errors. No global
Express `AppError` hierarchy/error middleware or React Query error state is installed. JSON
parsing failures, non-JSON default Express responses and network rejections can bypass the
domain-error shape expected by clients. There is no general automatic 401 logout/redirect,
global retry policy or query invalidation mechanism.

| Failure                   | Current recovery behavior                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Login/register            | Loading cleared, error rethrown to form                                                                      |
| Auth recheck              | Any failure clears auth state                                                                                |
| Initial home read         | Toast, then unavailable-data view; successful later reload may replace data                                  |
| Home save                 | Toast and server reload; concurrent edits/refetches have no request/date guard                               |
| Set write/rest correction | Console logging and persisted pending keys for retry                                                         |
| Final session save        | Flush failure blocks finish, page shows error toast                                                          |
| Session load              | Store error populated, but page checks missing session before error, so initial failure may remain a spinner |
| Suggestion response       | Local status changes only after API success; error rethrown to suggestion card                               |

## 7. Historical reconciliation and coverage

| Archived section                 | Current destination and disposition                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 6.1 backend components           | Backend §§1–4: real middleware → routers → selected functions/direct Prisma; historical controllers/service classes retired    |
| 6.2 frontend layers              | Frontend §§1–4: real layouts, feature/UI components, local fetch state and two stores; React Query/UI-store assumption removed |
| 6.3 component inventory          | Frontend §2: real components and page-local equivalents; fictional prop contracts removed                                      |
| 7.1 authentication               | This §2, frontend §3, backend §2: cookie navigation gate distinguished from JWT authorization                                  |
| 7.2 sessions                     | This §3: nested target sets, round/rest recovery, explicit finish and full ad-hoc lifecycle                                    |
| 7.3 daily tracking               | This §4: selected-day home aggregate, date-scoped edits, current configuration and source rules                                |
| 7.4 progression                  | This §5, backend §5: summary-triggered generation, per-set checks, idempotent response                                         |
| 7.5 streaks                      | Retired as runtime claim: no Streak model, service, endpoint or streak display exists; period goal progress is not a streak    |
| 7.6 errors                       | This §6: restored missing flow with route-local handling and actual client recovery                                            |
| 9.1–9.3 frontend                 | Frontend §§1–5: routes, state/hydration, functional API clients and real Next proxy replace historical snippets                |
| 10.1–10.2 backend/data access    | Backend §§1,3: route functions and actual transaction scope; fields/constraints remain owned by data-models                    |
| 10.3–10.5 auth/errors/validation | Backend §§2,4: AuthRequest, JWT results, Zod issues and local response formatting                                              |
| 10.6 progression service         | Backend §5: actual algorithm and persistence instead of historical variance pseudocode                                         |

## 8. Story 3.8 implementation and completion boundary

[Daily Home Navigation](../stories/3.8.daily-home-navigation.md) is implemented and marked done in
the scoped sprint status. The home has previous/next-day controls, browser-local selected-day state,
date-context reads through the existing `/tracking/today` aggregate, and date-scoped mutation/read
isolation. Browser-local midnight/focus/visibility refreshes the future-navigation cap without
automatically changing the selected date. Optional API context preserves legacy requests without
context; selected-day entry progress and completedAt period counts are bounded as detailed in
[API specification §7](./api-spec.md#7-daily-tracking). Upserts preserve the explicit calendar key,
existing ownership and Health Connect protections, and `manual` source marking. No new table,
historical goal snapshot, timezone preference, global query cache, or general tracking redesign was
introduced.

Completion records the user's overall report that manual acceptance testing is OK, from the local
development server on `code` using a local copy of production data. It does not claim that the
agent ran manual scenarios 1–13 individually, that CORS was separately verified, that a formal BMAD
review occurred, or that this version was deployed to production. The initial Chromium startup
blocker remains in the story's history; the later user acceptance determines the story status.
The implementation-readiness report remains a historical point-in-time snapshot, not a live status.
