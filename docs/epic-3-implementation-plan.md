# Epic 3: Daily Tracking & Dashboard — Implementation Plan

> Self-contained reference for launching a Claude agent team. This document covers strategy, story order, dependencies, technical context, and agent assignments.

## Table of Contents

1. [Objective](#objective)
2. [Current State](#current-state)
3. [Implementation Order & Dependencies](#implementation-order--dependencies)
4. [Story Details (Revised)](#story-details-revised)
5. [Technical Context](#technical-context)
6. [Agent Team Strategy](#agent-team-strategy)

---

## Objective

Build the "Today" dashboard — the main entry point of the Momentum fitness app. Users see:

1. **Samsung Health-style activity rings** showing 3 HealthConnect metrics (steps, active minutes, active calories) vs daily goals
2. **Sleep tracking** summary from HealthConnect data
3. **Manual habit tracking** (yoga, custom items) with boolean/number/duration toggles
4. **Sport session tracker** with configurable weekly/monthly goals
5. **Streaks & gamification** (subsequent phase)
6. **Monthly calendar view** for long-term tracking (subsequent phase)

Users configure which items to track and their goals via `/profile/trackables`.

---

## Current State

### What Already Exists (from Epic 5)

**Database tables** (already migrated and populated):
- `trackable_items` — 4 system items auto-created on first HealthConnect sync
- `trackable_goals` — 3 default daily goals (steps: 10,000, active minutes: 90, calories: 500)
- `daily_entries` — populated by HealthConnect sync with `source: "health_connect"`
- `health_activities` — exercise sessions from Samsung Health (walking, etc.)
- `sync_devices` — registered devices

**System trackable items** (auto-created by health sync):
| Name | Type | Unit | Default Goal | Color | Icon |
|------|------|------|-------------|-------|------|
| Pas | number | pas | 10,000/daily | #22C55E | footprints |
| Minutes d'activite | duration | min | 90/daily | #3B82F6 | timer |
| Calories actives | number | kcal | 500/daily | #EF4444 | flame |
| Durée sommeil | duration | min | (none) | #8B5CF6 | moon |

**Existing API endpoints** (health-sync):
- `POST /health-sync` — batch sync from Android app
- `GET /health-sync/status` — sync status + configured trackables
- `GET /health-sync/activities` — list health activities with pagination

**What does NOT exist yet:**
- No `/trackables` CRUD endpoints
- No `/tracking` entry management endpoints
- No `sortOrder` field on `TrackableItem`
- No "workout" auto-trackable for sport sessions
- No `Streak` model/table
- No dashboard UI (current home page is a placeholder)
- No tracking configuration UI

### Database Validation

**Production DB** (validated Feb 13, 2026) — clean, real-world data:

| Metric | Feb 13 | Feb 12 | Default Goal | Status |
|--------|--------|--------|-------------|--------|
| Pas | 10,069 | 11,180 | 10,000/daily | 100%+ |
| Minutes d'activité | 100 min | 111 min | 90/daily | 111% |
| Calories actives | 500 kcal | 599 kcal | 500/daily | 100% |
| Durée sommeil | 507 min (8h27) | 447 min (7h27) | **(none — needs default 480 min = 8h)** | N/A |

- Source: Samsung Health (`com.sec.android.app.shealth`) via Galaxy S24 Ultra (SM-S928B)
- Last sync: 2026-02-13 22:48 UTC
- All 4 system trackables active, 3 have goals (sleep needs one)
- Values can exceed 100% of goal — rings UI must handle overflow gracefully

Dev DB has older test data (Feb 5-7) with some aberrant values (activity minutes = 1439). Use prod for validation.

---

## Implementation Order & Dependencies

```
Story 3.1 (Backend: Trackables CRUD)
  │
  ├──► Story 3.3 (Backend: Daily Entries & Summary)
  │       │
  │       └──► Story 3.4 (Frontend: Today Dashboard + Samsung Rings)
  │               │
  │               └──► Story 3.5 (Backend: Streaks) ──► Story 3.6 (Frontend: Gamification UI)
  │
  └──► Story 3.2 (Frontend: Configuration UI)
                                                        Story 3.7 (Frontend: Calendar View)
                                                          └── depends on 3.3 + 3.5
```

### Phase 1 — Core (stories 3.1 → 3.3 → 3.4 + 3.2)

| Order | Story | Type | Depends On | Can Parallelize With |
|-------|-------|------|-----------|---------------------|
| 1 | **3.1** Trackables CRUD Backend | API | None | — |
| 2 | **3.3** Daily Entries Backend | API | 3.1 | 3.2 (after 3.1 done) |
| 3a | **3.4** Today Dashboard UI | Web | 3.1 + 3.3 | 3.2 |
| 3b | **3.2** Configuration UI | Web | 3.1 | 3.4 |

### Phase 2 — Gamification (stories 3.5 → 3.6 → 3.7)

| Order | Story | Type | Depends On |
|-------|-------|------|-----------|
| 4 | **3.5** Streaks Backend | API | 3.3 |
| 5 | **3.6** Gamification UI | Web | 3.4 + 3.5 |
| 6 | **3.7** Calendar View | Web | 3.3 + 3.5 |

---

## Story Details (Revised)

### Story 3.1: Trackable Items — Backend CRUD

**Goal:** Create endpoints to manage trackable items and goals. The data model already exists (Epic 5 migration).

**Schema change required:**
- Add `sortOrder Int @default(0) @map("sort_order")` to `TrackableItem` model
- Migration: `npx prisma migrate dev --name add_trackable_sort_order`

**Endpoints to implement:**

```
GET    /trackables                    → list user's trackables (system + custom), sorted by sortOrder, include active goal
POST   /trackables                    → create custom trackable { name, icon, color, trackingType, unit? }
PATCH  /trackables/:id               → update trackable (name, icon, color, isActive, sortOrder)
DELETE /trackables/:id               → delete custom trackable (403 if isSystem=true)
POST   /trackables/:id/goals         → create goal { targetValue, frequency }
PATCH  /trackables/:id/goals/:goalId → update goal { targetValue, frequency, endDate? }
PUT    /trackables/reorder            → bulk update sortOrder [{ id, sortOrder }]
```

**Business rules:**
- System trackables (isSystem=true) cannot be deleted, but their goals can be modified
- Only one active goal per trackable (no endDate = active). Creating a new goal auto-closes the previous one (sets endDate = now)
- `GET /trackables` must return the active goal for each item (goal where endDate IS NULL)
- Default sortOrder: system items first (0-3), custom items after (100+)
- Creating a custom trackable auto-sets `isSystem: false`, `source: "manual"`
- **Sleep goal migration:** The "Durée sommeil" system trackable currently has no default goal. Add a one-time data fix (in the service or a migration seed) to create a default goal of 480 min (8h) daily for existing users who have the sleep trackable but no goal. Also update the `ensureSystemTrackables()` function in `health-sync.service.ts` to create this default goal for new users.

**Validation schemas (Zod 4):**
- createTrackable: name (1-50 chars), icon (string), color (hex), trackingType (enum), unit (optional string)
- createGoal: targetValue (positive number), frequency (daily|weekly|monthly)
- reorder: array of { id: uuid, sortOrder: int }

**Files to create:**
- `apps/api/src/routes/trackable.routes.ts`
- `apps/api/src/services/trackable.service.ts`
- `apps/api/src/schemas/trackable.schema.ts`

**Files to modify:**
- `apps/api/src/index.ts` — mount `/trackables` route
- `apps/api/prisma/schema.prisma` — add `sortOrder` field

**Test with:** existing system trackables in dev DB (4 items + 3 goals)

---

### Story 3.2: Tracking Configuration — UI

**Goal:** Settings page at `/profile/trackables` to manage tracked items and goals.

**URL change:** `/settings/trackables` → `/profile/trackables`

**Page structure:**
1. **PageHeader** — "Configuration du suivi" with back arrow to `/profile`
2. **System items section** — HealthConnect items with "HealthConnect" badge, non-deletable
   - Each shows: icon + name + current goal + toggle switch (isActive)
   - Tap goal area → GoalEditModal
3. **Custom items section** — user-created items with drag handles for reorder
   - Each shows: icon + name + goal + toggle switch + delete button
   - Tap goal area → GoalEditModal
   - Drag to reorder
4. **Add button** — floating "+" or bottom button → CreateTrackableModal

**Components to create:**
- `apps/web/src/app/(app)/profile/trackables/page.tsx` — main page
- `apps/web/src/components/tracking/trackable-list.tsx` — sortable list
- `apps/web/src/components/tracking/trackable-config-card.tsx` — item card with toggle, goal display, badges
- `apps/web/src/components/tracking/goal-edit-modal.tsx` — Dialog: frequency select + target input
- `apps/web/src/components/tracking/create-trackable-modal.tsx` — Dialog: name, icon selector, color picker, type, unit
- `apps/web/src/components/tracking/icon-selector.tsx` — Lucide icon picker (searchable grid)
- `apps/web/src/components/tracking/color-picker.tsx` — predefined color palette

**API client:**
- `apps/web/src/lib/api/trackables.ts` — CRUD functions following existing pattern (see `measurements.ts`)

**Libraries already available:** dnd-kit (core, sortable, modifiers, utilities), lucide-react, shadcn Dialog/Select/Input/Switch/Badge

**Profile page update:** Change the menu item link from `/settings/trackables` to `/profile/trackables` in `apps/web/src/app/(app)/profile/page.tsx`

---

### Story 3.3: Daily Tracking — Backend

**Goal:** Endpoints to read and manage daily tracking entries + summary statistics.

**Endpoints to implement:**

```
GET    /tracking/today                → today's complete tracking state
GET    /tracking/rings                → Samsung rings data (steps, activity, calories vs goals)
GET    /tracking/entries?from=&to=&trackableId=  → entry history with filters
POST   /tracking/entries              → upsert manual entry { trackableId, date, value, notes? }
DELETE /tracking/entries/:id          → delete manual entry only (403 if source=health_connect)
GET    /tracking/summary?period=week|month&date=  → completion stats per trackable
```

**`GET /tracking/today` response shape:**
```typescript
{
  date: "2026-02-13",
  rings: {
    steps:    { value: 8432, goal: 10000, percentage: 84, trackableId: "..." },
    active:   { value: 67,   goal: 90,    percentage: 74, trackableId: "..." },
    calories: { value: 312,  goal: 500,   percentage: 62, trackableId: "..." },
  },
  sleep: {
    value: 455,  // minutes
    goal: 480,   // 8h target, null if no goal set
    percentage: 95,
    trackableId: "..."
  },
  trackables: [
    {
      id: "...",
      name: "Yoga",
      icon: "person-standing",
      color: "#F59E0B",
      trackingType: "boolean",
      unit: null,
      goal: { targetValue: 1, frequency: "daily" },
      entry: { id: "...", value: 1, source: "manual" } | null,
      completed: true
    },
    // ... other active trackables sorted by sortOrder
  ],
  workoutSessions: {
    today: 0,
    thisWeek: 2,
    thisMonth: 5,
    goal: { targetValue: 3, frequency: "weekly" } | null
  },
  progress: {
    completed: 4,
    total: 6,
    percentage: 67
  }
}
```

**Business rules:**
- `rings` data comes from `daily_entries` with source "health_connect" for today's date, matched to system trackable IDs
- `percentage` can exceed 100 (e.g., 10,069 steps / 10,000 goal = 100.69). Do NOT cap server-side — let the frontend decide how to display overflow
- `sleep` is separated from rings (it's a distinct metric, not a ring)
- `trackables` lists only active non-system trackables (custom items like yoga)
- `workoutSessions` counts `workout_sessions` with `status = 'completed'` for today/this week/this month
- `POST /tracking/entries` only works for trackables where `isSystem = false` OR source would be "manual". Cannot overwrite health_connect entries
- `GET /tracking/summary` returns per-trackable completion rates over the period

**Files to create:**
- `apps/api/src/routes/tracking.routes.ts`
- `apps/api/src/services/tracking.service.ts`
- `apps/api/src/schemas/tracking.schema.ts`

**Files to modify:**
- `apps/api/src/index.ts` — mount `/tracking` route

---

### Story 3.4: Today Dashboard — UI

**Goal:** Build the main app dashboard at `/` with Samsung Health-style activity rings and tracking cards.

**Page structure (`apps/web/src/app/(app)/page.tsx`):**

```
┌─────────────────────────────────┐
│  Header: "Aujourd'hui"         │
│  Subtitle: "Bonjour, Elliot"   │
├─────────────────────────────────┤
│                                 │
│    ┌─────────────────────┐      │
│    │   ACTIVITY RINGS    │      │
│    │  ┌───────────────┐  │      │
│    │  │  ┌─────────┐  │  │      │
│    │  │  │  ┌───┐  │  │  │      │
│    │  │  │  │   │  │  │  │      │
│    │  │  │  └───┘  │  │  │      │
│    │  │  └─────────┘  │  │      │
│    │  └───────────────┘  │      │
│    │  13,410 pas         │      │
│    │  134 min  ·  734 kcal│     │
│    └─────────────────────┘      │
│                                 │
│  Sleep: 🌙 6h09 / 8h (76%)    │
├─────────────────────────────────┤
│  SUIVI DU JOUR                  │
│  ┌─ ☐ Yoga ─────────────────┐  │
│  ┌─ ☐ Méditation ───────────┐  │
│  ┌─ ✅ Lecture (grisé) ─────┐  │
├─────────────────────────────────┤
│  SPORT                          │
│  2 séances cette semaine / 3    │
│  [Démarrer une séance]          │
├─────────────────────────────────┤
│  67% complété aujourd'hui       │
└─────────────────────────────────┘
```

**Activity Rings Component — Recharts RadialBarChart via shadcn Chart:**

Use the shadcn `chart-radial-simple` pattern with Recharts `RadialBarChart`. Already installed (`recharts@2.15.4` + `components/ui/chart.tsx`). Provides native progressive fill animation out of the box.

```tsx
// Implementation approach:
// - Use RadialBarChart with 3 data items → 3 concentric rings automatically
// - Each item: { name: "steps", value: percentage, fill: "var(--color-steps)" }
// - PolarAngleAxis with domain [0, 100] to make values = percentages
// - RadialBar with background={{ fill: "hsl(var(--muted))" }} for track circles
// - cornerRadius={10} for rounded end caps
// - startAngle={90}, endAngle={-270} for top-start clockwise fill
// - barSize={14} controls ring thickness
// - innerRadius="30%", outerRadius="100%" controls ring spacing
//
// Colors (via ChartConfig + CSS variables):
// - Steps (outer):    green  #22C55E
// - Active min (mid): blue   #3B82F6
// - Calories (inner): red    #EF4444
//
// ANIMATION (built-in):
// - isAnimationActive={true} (default)
// - animationDuration={1000} for 1s progressive fill
// - animationEasing="ease-out" for natural deceleration
//
// OVERFLOW HANDLING (percentage > 100%):
// - Cap the RadialBar value at 100 for display (full ring)
// - Add a subtle CSS glow/brightness filter on the ring when exceeded
// - Show actual values in the legend below (e.g., "10,069 / 10,000 pas")
//
// Imports:
// import { RadialBar, RadialBarChart, PolarAngleAxis } from "recharts"
// import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
```

Fallback: If Recharts RadialBarChart proves too limiting for the Samsung Health look, a custom SVG component using `<circle>` with `stroke-dasharray`/`stroke-dashoffset` and CSS transitions can be substituted with the same props interface.

**Components to create:**
- `apps/web/src/components/tracking/activity-rings.tsx` — SVG concentric rings component
- `apps/web/src/components/tracking/ring-legend.tsx` — labels below rings (value/goal for each metric)
- `apps/web/src/components/tracking/sleep-card.tsx` — sleep summary display
- `apps/web/src/components/tracking/trackable-card.tsx` — per-item card (boolean toggle, number input, duration input)
- `apps/web/src/components/tracking/workout-summary-card.tsx` — sport sessions summary + CTA
- `apps/web/src/components/tracking/daily-progress-bar.tsx` — overall day completion

**API client:**
- `apps/web/src/lib/api/tracking.ts` — `getToday()`, `upsertEntry()`, `deleteEntry()`

**Interactions:**
- Boolean trackable (yoga): tap checkbox → optimistic toggle via `POST /tracking/entries` with value 0 or 1
- Number/duration trackable: tap → inline input appears → submit on blur/enter
- Workout card: tap "Démarrer" → navigate to `/workouts`
- Rings: tap → could navigate to detail/history (future enhancement)

**Libraries:** React Query for data fetching/mutations (follow existing patterns), shadcn Card/Checkbox/Input/Button/Progress

---

### Story 3.5: Streaks Calculation — Backend

**Goal:** Track consecutive completion streaks for each trackable.

**Schema addition:**
```prisma
model Streak {
  id              String    @id @default(uuid())
  userId          String    @map("user_id")
  user            User      @relation(fields: [userId], references: [id])
  trackableId     String?   @map("trackable_id")
  trackable       TrackableItem? @relation(fields: [trackableId], references: [id], onDelete: Cascade)
  currentStreak   Int       @default(0) @map("current_streak")
  longestStreak   Int       @default(0) @map("longest_streak")
  lastActivityDate DateTime? @map("last_activity_date") @db.Date
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  @@unique([userId, trackableId])
  @@map("streaks")
}
```

**Endpoints:**
```
GET /streaks              → all streaks for user (with atRisk flag)
GET /streaks/:trackableId → specific trackable streak
```

**Streak logic:**
- Daily: consecutive calendar days where `daily_entries.value >= goal.targetValue`
- Weekly: consecutive weeks where total entries meet goal
- Monthly: consecutive months where total meets goal
- Auto-update on: `POST /tracking/entries` (manual), health sync (automatic)
- Current day doesn't break streak if not yet complete
- atRisk = streak > 0 AND no activity today yet

**Files to create:**
- `apps/api/src/services/streak.service.ts`
- `apps/api/src/routes/streak.routes.ts`

---

### Story 3.6: Gamification UI — Streaks & Progress

**Goal:** Visual streak indicators and monthly progress on the dashboard.

**Enhancements to Story 3.4 components:**
- `StreakBadge` on dashboard header (flame icon + count, pulse animation if atRisk)
- Per-trackable streak mini-badge on completed items
- `MonthlyProgress` component: horizontal bar showing monthly goal progress
  - Green: on track / Orange: behind but catchable / Red: goal impossible
- Stats modal (accessible from dashboard) showing per-trackable stats

**Style:** Fintech aesthetic — no confetti, subtle CSS animations, data-focused typography.

---

### Story 3.7: Monthly Calendar View

**Goal:** Calendar heatmap showing tracking completion over time.

**Page:** Accessible from dashboard (stats button) or as a tab

**Features:**
- Calendar grid: days colored by completion percentage (red → orange → green)
- Filter by trackable (all, steps only, yoga only, etc.)
- Month navigation (previous/next, max 12 months back)
- Day detail popover showing items completed that day
- Projection: "Il vous faut X séances de plus pour atteindre votre objectif"

---

## Technical Context

### Project Architecture

```
momentum/
├── apps/
│   ├── api/          # Express.js backend (port 3001)
│   │   ├── src/
│   │   │   ├── index.ts              # Route mounting (NO /api/v1 prefix)
│   │   │   ├── routes/               # Route handlers
│   │   │   ├── services/             # Business logic
│   │   │   ├── schemas/              # Zod validation schemas
│   │   │   ├── middleware/           # Auth middleware (Bearer token)
│   │   │   ├── lib/prisma.ts         # Prisma client instance
│   │   │   └── generated/prisma/     # Generated Prisma client
│   │   └── prisma/
│   │       └── schema.prisma         # Database schema
│   └── web/          # Next.js 14 frontend
│       ├── src/
│       │   ├── app/(app)/            # Authenticated app routes
│       │   │   ├── page.tsx          # Home dashboard (placeholder)
│       │   │   └── profile/          # Profile section
│       │   ├── components/
│       │   │   ├── ui/               # shadcn components (35+)
│       │   │   ├── layout/           # AppLayout, navigation
│       │   │   └── tracking/         # NEW: tracking components
│       │   └── lib/api/              # API client functions
│       └── package.json
└── docs/
    └── stories/                       # Story files (3.1-3.7)
```

### Key Conventions

| Topic | Convention |
|-------|-----------|
| Zod version | **4.3.5** — import `{ z } from "zod"`, `{ ZodError } from "zod"` |
| Prisma version | **7** — config in `prisma.config.ts`, client at `src/generated/prisma/` |
| Prisma import | `import { prisma } from "../lib/prisma.js"` (note `.js` extension) |
| Prisma client import | `from "../generated/prisma/client.js"` |
| Transaction type | `type PrismaTransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0]` |
| API route prefix | **None** — mount directly: `/trackables`, `/tracking`, `/streaks` |
| Auth middleware | `import { authMiddleware } from "../middleware/auth.middleware.js"` — sets `req.userId` |
| API error format | `{ error: { code: string, message: string, details?: any } }` |
| Web API base | `const API_URL = "/backend"` (proxied to Express) |
| Web API auth | `Authorization: Bearer ${token}` from `useAuthStore` |
| Web API pattern | See `apps/web/src/lib/api/measurements.ts` for reference |
| TypeScript check | `npx tsc --noEmit -p apps/api` or `npx tsc --noEmit -p apps/web` |
| Lint | `npm run lint` |
| Dev servers | DO NOT start — user runs them separately |
| Prisma migration | `cd apps/api && npx prisma migrate dev --name <name>` |

### Available UI Dependencies (already installed)

- **shadcn components:** Card, Dialog, Sheet, Button, Input, Select, Switch, Badge, Progress, Checkbox, Tabs, Popover, Calendar, Chart, Separator, Avatar, Form, Label, Sonner (toast)
- **Recharts** 2.15.4 — for charts, includes RadialBarChart
- **dnd-kit** — @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/modifiers, @dnd-kit/utilities
- **lucide-react** 0.562.0 — icon library
- **date-fns** 4.1.0 — date utilities
- **react-hook-form** + @hookform/resolvers — form handling with Zod
- **zustand** 5.0.10 — state management
- **next-themes** — dark mode support

### Database Connection

- **Dev:** `postgresql://momentum:momentum_dev@localhost:5432/momentum`
- **Prod:** `192.168.1.197:5432` — credentials in environment config (do not hardcode)

---

## Agent Team Strategy

### Recommended Team Structure

Launch **3 agents** working in 2 phases:

#### Phase 1: Backend First (sequential)

**Agent: `api-dev`** (general-purpose agent)
- **Role:** Backend developer
- **Scope:** Stories 3.1 → 3.3 (sequential — 3.3 depends on 3.1)
- **Tasks:**
  1. Add `sortOrder` field to TrackableItem + run migration
  2. Implement trackable CRUD routes/service/schemas (Story 3.1)
  3. Implement tracking entries routes/service/schemas (Story 3.3)
  4. Verify with `npx tsc --noEmit -p apps/api`
- **Key context:** Read existing patterns in `health-sync.routes.ts`, `health-sync.service.ts`, `health-sync.schema.ts`

#### Phase 2: Frontend (parallel, after Phase 1)

**Agent: `web-dashboard`** (general-purpose agent)
- **Role:** Frontend developer — Dashboard
- **Scope:** Story 3.4
- **Tasks:**
  1. Create API client (`apps/web/src/lib/api/tracking.ts`)
  2. Build ActivityRings SVG component
  3. Build SleepCard, TrackableCard, WorkoutSummaryCard, DailyProgressBar
  4. Compose the dashboard page at `apps/web/src/app/(app)/page.tsx`
  5. Verify with `npx tsc --noEmit -p apps/web`
- **Key context:** Read existing component patterns in `apps/web/src/components/`, profile page for layout style

**Agent: `web-config`** (general-purpose agent)
- **Role:** Frontend developer — Configuration
- **Scope:** Story 3.2
- **Tasks:**
  1. Create API client (can share with dashboard or separate)
  2. Build TrackableConfigCard, GoalEditModal, CreateTrackableModal, IconSelector, ColorPicker
  3. Build configuration page at `apps/web/src/app/(app)/profile/trackables/page.tsx`
  4. Update profile page menu link
  5. Verify with `npx tsc --noEmit -p apps/web`
- **Key context:** Read existing settings patterns, dnd-kit usage in sortable.tsx

#### Phase 3: Gamification (later session)

Stories 3.5 → 3.6 → 3.7 can be handled in a separate session after Phase 1+2 are validated.

### Agent Instructions Template

When spawning agents, provide them with:
1. This file (`docs/epic-3-implementation-plan.md`) as primary context
2. The specific story file (`docs/stories/3.X.*.md`) for detailed acceptance criteria
3. Reference to existing similar code (health-sync for API, measurements page for UI)
4. Explicit instruction: "DO NOT start dev servers. Verify with `npx tsc --noEmit`."

### Coordination Rules

- `api-dev` completes Story 3.1 fully before starting 3.3
- `web-dashboard` and `web-config` start ONLY after `api-dev` finishes both stories
- Both frontend agents can work in parallel (no file conflicts)
- All agents verify TypeScript compilation before declaring done
- All agents follow existing code patterns (no new abstractions unless needed)
