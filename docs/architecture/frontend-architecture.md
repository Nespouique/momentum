# Momentum — Frontend Architecture

Reconciled against the working tree on 2026-10-11. This document replaces archived sections
6.2–6.3 and 9.1–9.3. See [components and workflows](./components-workflows.md) for cross-layer
decisions, [API specification](./api-spec.md) for contracts and [data models](./data-models.md)
for persistence models. Library versions are maintained in [tech stack](./tech-stack.md);
the [web package](../../apps/web/package.json) supplies the current dependency evidence.

## 1. Rendering and route composition

The application uses Next.js 16 App Router with React 19. Layouts compose the shell, while
feature pages are predominantly client components reading browser stores and fetching data in
effects/callbacks. This is not the archived server-state React Query architecture: there is no
React Query dependency, provider, query-key factory or query-hook layer.

| Source                                                                | Responsibility                                                                                                         |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [Root layout](../../apps/web/src/app/layout.tsx)                      | Fonts, fixed dark theme, pre-hydration accent script, AccentColorProvider, Sonner toaster, service-worker registration |
| [App layout group](<../../apps/web/src/app/(app)/layout.tsx>)         | Wrap application pages in AppLayout                                                                                    |
| [Session layout group](<../../apps/web/src/app/(session)/layout.tsx>) | Also wraps active-session pages in AppLayout; it is not a separate shell without navigation                            |
| [Auth route group](<../../apps/web/src/app/(auth)/layout.tsx>)        | Authentication presentation outside AppLayout                                                                          |
| [AppLayout](../../apps/web/src/components/layout/app-layout.tsx)      | Desktop left sidebar, centered max-width content, mobile bottom navigation                                             |
| [Next proxy](../../apps/web/src/proxy.ts)                             | Cookie-flag navigation redirects, excluding backend/API/static paths                                                   |

Both [DesktopSidebar](../../apps/web/src/components/layout/desktop-sidebar.tsx) and
[MobileBottomNav](../../apps/web/src/components/layout/mobile-bottom-nav.tsx) link to home,
workouts, exercises and profile. The former `(dashboard)` group and top-level tracking,
measurements and progress route tree in the archive are obsolete.

### Implemented page families

| Routes / source                                                                                                                                                                                                                                      | Composition and state ownership                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [Home `/`](<../../apps/web/src/app/(app)/page.tsx>)                                                                                                                                                                                                  | Browser-local selected day; date-context tracking aggregate, isolated reads/edits and optimistic updates |
| [Workouts](<../../apps/web/src/app/(app)/workouts/page.tsx>), [new](<../../apps/web/src/app/(app)/workouts/new/page.tsx>), [edit](<../../apps/web/src/app/(app)/workouts/[id]/edit/page.tsx>)                                                        | Local template/active-session state, builder, start/resume actions, history/calendar sheets              |
| [Active `/session/:id`](<../../apps/web/src/app/(session)/session/[id]/page.tsx>)                                                                                                                                                                    | Session store screen machine plus page-local sheets, submission lock and suggestions                     |
| [History `/sessions/:id`](<../../apps/web/src/app/(app)/sessions/[id]/page.tsx>)                                                                                                                                                                     | Persisted session detail/corrections, distinct from active execution route                               |
| [AI coach](<../../apps/web/src/app/(session)/session/[id]/ai-coach/page.tsx>)                                                                                                                                                                        | Existing planned-session coaching page                                                                   |
| [Exercises](<../../apps/web/src/app/(app)/exercises/page.tsx>), [stats](<../../apps/web/src/app/(app)/exercises/stats/page.tsx>)                                                                                                                     | Library and performance charts                                                                           |
| [Profile](<../../apps/web/src/app/(app)/profile/page.tsx>), [edit](<../../apps/web/src/app/(app)/profile/edit/page.tsx>), [settings](<../../apps/web/src/app/(app)/settings/page.tsx>)                                                               | Profile, preference/settings operations and navigation                                                   |
| [Measurements](<../../apps/web/src/app/(app)/profile/measurements/page.tsx>), [date/detail editor](<../../apps/web/src/app/(app)/profile/measurements/[id]/page.tsx>), [graphs](<../../apps/web/src/app/(app)/profile/measurements/graphs/page.tsx>) | Page-local measurement overview, editing, comparison helpers and Recharts                                |
| [Trackable configuration](<../../apps/web/src/app/(app)/profile/trackables/page.tsx>)                                                                                                                                                                | Current system/custom configuration, goal editing, dnd-kit reorder with optimistic snapshot rollback     |
| [Login](<../../apps/web/src/app/(auth)/login/page.tsx>), [register](<../../apps/web/src/app/(auth)/register/page.tsx>), forgot/reset-password                                                                                                        | Auth forms and form-local errors                                                                         |

Home has previous/next-day icon controls in the existing PageHeader actions slot. A fresh client
initializes the selected day to browser-local today after hydration; next-day is disabled at today.
The existing workout calendar remains a distinct feature and is not the implementation of
[story 3.8](../stories/3.8.daily-home-navigation.md).

## 2. Component inventory and feature boundaries

Inventory lists implemented symbols/responsibilities rather than copying fictional historical
props. Use component definitions for exact props and [barrel exports](../../apps/web/src/components/workouts/index.ts)
when available.

| Feature                | Implemented components/source                                                                                                                                                                                                                                                                                                                                                                                                                              | Responsibility                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Layout                 | [PageHeader](../../apps/web/src/components/layout/page-header.tsx), AppLayout, DesktopSidebar, MobileBottomNav, [NavItem](../../apps/web/src/components/layout/nav-item.tsx)                                                                                                                                                                                                                                                                               | Titles/back/actions and responsive navigation                                                                              |
| Home                   | [ActivityRings](../../apps/web/src/components/tracking/activity-rings.tsx), [SleepCard](../../apps/web/src/components/tracking/sleep-card.tsx), [WorkoutSummaryCard](../../apps/web/src/components/tracking/workout-summary-card.tsx), [TrackableCard](../../apps/web/src/components/tracking/trackable-card.tsx)                                                                                                                                          | System data display, computed workout period progress, editable custom boolean/numeric/duration cards                      |
| Workout construction   | [WorkoutBuilder](../../apps/web/src/components/workouts/workout-builder.tsx), [ExerciseSelector](../../apps/web/src/components/workouts/exercise-selector.tsx), [ExerciseItemCard / SupersetItemCard](../../apps/web/src/components/workouts/workout-item-cards.tsx), [ExerciseConfigDrawer](../../apps/web/src/components/workouts/exercise-config-drawer.tsx), [SupersetConfigDrawer](../../apps/web/src/components/workouts/superset-config-drawer.tsx) | Ordered items, per-set targets, simple/superset editing and local builder state                                            |
| Workout browsing       | [WorkoutCard](../../apps/web/src/components/workouts/workout-card.tsx), [SessionHistorySheet](../../apps/web/src/components/workouts/session-history-sheet.tsx), [SessionCalendarSheet](../../apps/web/src/components/workouts/session-calendar-sheet.tsx)                                                                                                                                                                                                 | Templates and nullable-workout session-history projections                                                                 |
| Active execution       | [Screen exports](../../apps/web/src/components/session/screens/index.ts), [ResultInput](../../apps/web/src/components/session/result-input.tsx), [SupersetProgress](../../apps/web/src/components/session/superset-progress.tsx), [ProgressionSuggestionCard](../../apps/web/src/components/session/progression-suggestion-card.tsx)                                                                                                                       | Overview/exercise/rest/transition/reorder/ad-hoc decision/summary screens, result editing and explicit suggestion response |
| Tracking configuration | [TrackableConfigCard](../../apps/web/src/components/tracking/trackable-config-card.tsx), [CreateTrackableModal](../../apps/web/src/components/tracking/create-trackable-modal.tsx), [GoalEditModal](../../apps/web/src/components/tracking/goal-edit-modal.tsx)                                                                                                                                                                                            | Configuration and goals; mutations notify parent to reload                                                                 |
| Measurements/progress  | Measurement page-local StatCard/Evolution/MeasurementRow/BilateralRow; graph page-local chart helpers; [chart primitives](../../apps/web/src/components/ui/chart.tsx)                                                                                                                                                                                                                                                                                      | No standalone historical MeasurementComparison/ProgressChart contract is required                                          |
| UI                     | [UI directory](../../apps/web/src/components/ui), [ConfirmDeleteDialog](../../apps/web/src/components/ui/confirm-delete-dialog.tsx), [Sonner](../../apps/web/src/components/ui/sonner.tsx)                                                                                                                                                                                                                                                                 | Repository-owned Shadcn-style primitives, dialogs, forms and feedback                                                      |

The home mounts rings → sleep → workout summary → custom tracking, with the completion count in
the custom-section heading. [DailyProgressBar](../../apps/web/src/components/tracking/daily-progress-bar.tsx)
exists but is not mounted there. Historical `DailyOverview`, `QuickActions`, `RecentActivity`,
`WeeklyProgress`, `DailyCheckIn`, `TrackingCalendar`, `ActiveSession`, `SetInputForm`,
`SessionTimer` and `StreakDisplay` are not the current component inventory. Relevant functionality
is composed in pages/screens or absent (notably streaks and habit-history calendar).

Auth/profile forms use React Hook Form, Zod resolvers and French validation messages under
[validations](../../apps/web/src/lib/validations). Do not generalize that to every feature:
WorkoutBuilder uses local `WorkoutFormData` and [builder helpers](../../apps/web/src/components/workouts/types.ts),
and TrackableCard uses its own numeric editor. API validation remains authoritative.

## 3. Client state, persistence and hydration

### 3.1 Auth store

[auth.ts](../../apps/web/src/stores/auth.ts) is a module-level Zustand store with `persist` and
`createJSONStorage`. `auth-storage` contains only `token`, `user` and `isAuthenticated` via
`partialize`; `isLoading` and actions are not persisted. Login/register set loading, update
auth on success, and clear loading/rethrow on failure. `updateUser` merges a profile patch.

Custom synchronous storage reads localStorage in the browser and returns null on the server.
Writes mirror serialized Zustand state into localStorage and a URL-encoded seven-day,
`SameSite=Lax`, path-wide cookie. This is JavaScript-managed storage, not an HttpOnly session
cookie. The Next proxy parses the cookie's state flag; Express still verifies Bearer JWTs.

Persistence hydration occurs through middleware initialization; no explicit `skipHydration`,
manual `rehydrate`, `hasHydrated` UI gate or `onFinishHydration` hook is configured. Server
rendering therefore has default store values rather than the browser's saved state. Pages
typically gate API calls on `token` and rerun effects when it becomes available. This does not
constitute JWT validation or a general SSR hydration-consistency guarantee.

`checkAuth()` calls getMe and clears all auth values on any exception. The current root/group
layouts do not invoke it; profile editing invokes it after saving. `expiresAt` returned at login
is not persisted or used by a refresh/expiry scheduler. No token refresh flow is implemented.

### 3.2 Session store and recovery

[session.ts](../../apps/web/src/stores/session.ts) is a plain Zustand store, **without persist
middleware**. Its state includes the fetched session/last session, explicit token, loading/error,
navigation indices/screen, rest deadline and pause state, superset membership/round state,
pending results, acknowledged set IDs/sent values and per-exercise performance cache.

| Storage key                  | Stored recovery data                                                          |
| ---------------------------- | ----------------------------------------------------------------------------- |
| `momentum_rest_state`        | Session ID, absolute rest end/duration, screen, indices and superset position |
| `momentum_pending_results`   | Map entries of session-exercise ID + set index to reps/weight                 |
| `momentum_completed_set_ids` | Map from result key to acknowledged server set ID                             |
| `momentum_sent_results`      | Map of acknowledged reps/weight for detecting rest-time corrections           |

Maps are serialized as entry arrays and reconstructed explicitly. Storage access is browser-guarded;
load helpers tolerate invalid JSON. Rest restoration requires the same session and an unexpired
deadline. The other maps are global keys, not explicitly namespaced by user/session; resolution
against server session-exercise identities and explicit start/finish/abandon cleanup are important.
This is targeted recovery, not a general offline mutation queue or persisted server cache.

`loadSession` rebuilds progress from recorded sets, handles round-based ordering, restores/clamps
active rest, and retries unresolved writes when no active rest remains. `reset` clears memory
without clearing localStorage so temporary navigation remains recoverable. New planned-session
initialization clears old recovery keys; successful finish/abandon also clears them. Auth logout
does not call session reset/cleanup.

The screen union is `overview`, `exercise`, `rest`, `transition`, `superset-exercise`,
`superset-rest`, `superset-transition`, `ad-hoc-decision` and `summary`. These are UI states,
distinct from database session status. [Session lifecycle](./components-workflows.md#3-workout-session-lifecycle)
owns the full decision sequence and write failure handling.

### 3.3 Page-local state and concurrency

Home, workout lists, tracking configuration, history/calendars and charts own fetched data with
`useState`, effects and callbacks. Mutations manually reload or update local data. There is no
global UI store, automatic cache invalidation, refetch-on-focus for all data, or shared retry policy.
The session store has an explicit performance Map cache; calendar/history have local workout maps.

Home keys reads and snapshots by token, user and selected date, and rejects late read results when
their request generation/date is no longer current. Edits capture their original date and owner;
optimistic state, rollback, pending writes and numeric drafts remain date-scoped. The numeric editor
uses a per-user/date/trackable key and guards Enter/blur from duplicate submission. These mechanisms
are local to the home feature, not a global query cache or general mutation framework.

## 4. Functional API clients and Next forwarding route

Domain modules under [lib/api](../../apps/web/src/lib/api) contain functions, local response
interfaces and domain error classes (`SessionError`, `TrackingError`, `WorkoutError`, etc.).
They use `fetch` with base `/backend`, explicitly receive authentication tokens and set Bearer
headers. JSON writes set content type and serialize input; parameterized lists use query strings.
There is no shared `ApiClient` class injecting a token from Zustand.

An existing exception is [getAIStatus](../../apps/web/src/lib/api/sessions.ts): it accepts no token
and fetches `/backend/config/ai-status` without Bearer authorization. The config handler has no
local auth middleware, but [Express mount order](../../apps/api/src/index.ts) puts progression's
root-mounted `router.use(authMiddleware)` before `/config`, making this endpoint effectively
authenticated. The request therefore returns 401, including when the browser has a login cookie:
the forwarding route does not turn that cookie into a Bearer header. This is a current client bug,
not an implemented public-endpoint exception to authentication.

Response parsing typically handles `204` before JSON, then throws a domain error with code/message
and optional field details on non-success. Session errors additionally preserve `activeSessionId`.
These classes do not uniformly carry HTTP status. JSON bodies are cast to TypeScript interfaces,
not runtime-validated. Auth's forgot-password function intentionally ignores HTTP response status;
other clients have their own handling. A network rejection/non-JSON body can surface as a native
fetch/parsing error instead of a domain error.

[The catch-all route](../../apps/web/src/app/backend/[...path]/route.ts) runs server-side and:

1. Resolves asynchronous Next route params and joins path segments.
2. Forwards path and original query string to server-only `API_URL` (fallback localhost:3001).
3. Forwards request headers except Host and reads the text body for non-GET/HEAD requests.
4. Fetches upstream and returns its body stream, status/status text and headers except
   Transfer-Encoding.
5. Returns JSON `PROXY_ERROR` with HTTP 502 if upstream fetch fails.

GET/POST/PUT/PATCH/DELETE handlers are exported. The route does not synthesize Bearer auth from
the cookie, verify JWTs, retry, transform domain responses or choose a viewed tracking date.
The navigation gate excludes `/backend`; Express authentication protects private data there.
This same-origin transport replaces archived direct-browser `NEXT_PUBLIC_API_URL` examples
and their automatic 401 logout/redirect behavior.

## 5. Browser lifecycle, visual preferences and dates

- [useTimerAudio](../../apps/web/src/hooks/use-timer-audio.ts) initializes audio after interaction,
  requests notification permission, plays countdown beeps and schedules a service-worker message
  plus page timer fallback. Cleanup cancels notifications and closes audio. Browser throttling and
  permission/platform support still apply.
- [useLocalDay](../../apps/web/src/hooks/use-local-day.ts) initializes the selected day from
  browser-local calendar fields after hydration and refreshes the today cap at local midnight,
  focus, and visible-page resume. A cap refresh does not advance the selected day.
- [useWakeLock](../../apps/web/src/hooks/use-wake-lock.ts) acquires/releases a screen wake lock for
  an active session, reacquires on visibility and logs unsupported/failure cases.
- The active page ticks against the absolute deadline and handles visibilitychange/pageshow/focus;
  sheets pause/resume the timer. Pause state itself is not serialized as a persisted pause flag.
- [ServiceWorkerRegister](../../apps/web/src/components/sw-register.tsx) and the
  [service worker](../../apps/web/public/sw.js) implement existing PWA/notification behavior;
  their existence does not imply offline tracking saves.
- [AccentColorProvider](../../apps/web/src/components/theme/accent-color-provider.tsx) reacts to
  `user.accentColor`, validates hex input and applies `--primary`, `--primary-foreground` and
  `--ring`. A root inline script reads persisted user color before hydration to reduce flashing.
  Primary/selected controls should use these variables. Metric/trackable colors are separate
  domain colors; the theme remains fixed dark.
- [Daily calendar helpers](../../apps/web/src/lib/daily-calendar.ts) step local calendar days,
  derive selected-day/week/month starts and serialize browser-local instants as UTC. Week/month
  DATE keys accompany the instants because PostgreSQL DATE entry filters and timestamp-based
  completed-session filters use distinct representations.
- [SessionCalendarSheet](../../apps/web/src/components/workouts/session-calendar-sheet.tsx)
  navigates browser-local months, groups completedAt (fallback startedAt) into date keys and requests
  completed sessions in a buffered interval with limit 100. Statistics use API totals. Since the
  API filters startedAt, midnight-spanning sessions can disagree with completion-date grouping;
  the calendar is not a canonical date-aware tracking data source.

## 6. Historical disposition and Story 3.8 implementation

Archived Zustand concepts are retained but the simplified store snippets are replaced by the
actual auth persistence and session recovery model. React Query hooks, query keys, generic UI
store, direct-browser ApiClient and automatic 401 redirect are historical assumptions absent from
the implementation. Archived generic component props and `(dashboard)` routes are not contracts.

The implemented [story 3.8](../stories/3.8.daily-home-navigation.md) adds two home day controls
and date-dependent behavior while preserving the existing UI/actions. Its selected-date read uses
the existing aggregate and current configuration; entry activity dates and completedAt timestamp
bounds are capped at the selected day. It adds no global query cache or historical configuration
snapshot. User-reported overall manual acceptance and its scope are recorded in the canonical story;
this is not a claim of formal review or production deployment.

Library semantics for `persist`/`createJSONStorage`, partial persistence and hydration were checked
with Context7 against the [official Zustand persistence guide](https://zustand.docs.pmnd.rs/integrations/persisting-store-data).
Application behavior above is established from local code, not copied library examples.
