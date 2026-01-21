# Momentum - Components & Workflows

## 1. Backend Architecture

### 1.1 Express App Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                        EXPRESS APP                              │
├─────────────────────────────────────────────────────────────────┤
│  Middleware Layer                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │  CORS    │ │  Helmet  │ │Rate Limit│ │  Error Handler    │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  Auth Middleware                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  JWT Validation → User Context → Request Enrichment      │  │
│  └──────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  Route Layer (Controllers)                                      │
│  ┌────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐ ┌───────────┐  │
│  │  Auth  │ │ Workout │ │ Session │ │Tracking│ │Progression│  │
│  └────────┘ └─────────┘ └─────────┘ └────────┘ └───────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  Service Layer (Business Logic)                                 │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  │AuthService │ │WorkoutSvc  │ │SessionSvc  │ │TrackingSvc │  │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                  │
│  │ExerciseSvc │ │MeasureSvc  │ │ProgressSvc │                  │
│  └────────────┘ └────────────┘ └────────────┘                  │
├─────────────────────────────────────────────────────────────────┤
│  Data Access Layer                                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    PRISMA CLIENT                          │  │
│  │  (Type-safe queries, transactions, migrations)            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    └─────────────────┘
```

---

## 2. Frontend Architecture

### 2.1 Next.js App Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                       NEXT.JS APP                               │
├─────────────────────────────────────────────────────────────────┤
│  Layout Components                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │  PageHeader  │ │DesktopSidebar│ │MobileBottomNav│           │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
├─────────────────────────────────────────────────────────────────┤
│  Page Components                                                │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  │ Dashboard  │ │  Workouts  │ │  Session   │ │  Tracking  │  │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  │ Exercises  │ │Measurements│ │  Progress  │ │  Settings  │  │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  Feature Components                                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐  │
│  │ WorkoutBuilder  │ │  SessionTimer   │ │  SetInputForm   │  │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐  │
│  │  StreakDisplay  │ │ ProgressChart   │ │ TrackableCard   │  │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  UI Components (Shadcn)                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
│  │Button│ │ Card │ │Dialog│ │ Form │ │Input │ │Select│ ...  │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘      │
├─────────────────────────────────────────────────────────────────┤
│  State Management                                               │
│  ┌─────────────────────────┐ ┌─────────────────────────────┐  │
│  │  Zustand (Client State) │ │  React Query (Server State) │  │
│  │  - Auth Store           │ │  - Workouts Query           │  │
│  │  - Session Store        │ │  - Exercises Query          │  │
│  │  - UI Store             │ │  - Tracking Query           │  │
│  └─────────────────────────┘ └─────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  API Layer                                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    API CLIENT                             │  │
│  │  (Fetch wrapper, auth headers, error handling)            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Inventory

### 3.1 Dashboard Components

| Component | Description | Props |
|-----------|-------------|-------|
| `DailyOverview` | Today's summary card | `date: Date` |
| `StreakDisplay` | Current streak with fire animation | `streak: Streak` |
| `QuickActions` | Start workout, log tracking buttons | `onAction: (type) => void` |
| `RecentActivity` | Last 5 activities list | `activities: Activity[]` |
| `WeeklyProgress` | 7-day mini heatmap | `data: DayData[]` |

### 3.2 Workout Components

| Component | Description | Props |
|-----------|-------------|-------|
| `WorkoutCard` | Workout template preview | `workout: Workout` |
| `WorkoutBuilder` | Create/edit workout form | `workout?: Workout, onSave: (w) => void` |
| `ExerciseSelector` | Search and add exercises | `onSelect: (e) => void` |
| `ExerciseRow` | Single exercise in builder | `exercise: WorkoutExercise, onUpdate, onRemove` |
| `WorkoutItemCards` | Render workout items (exercises/supersets) | `items: WorkoutItem[]` |
| `SupersetConfigDrawer` | Configure superset exercises | `item: WorkoutItem, onSave` |

### 3.3 Session Components

| Component | Description | Props |
|-----------|-------------|-------|
| `ActiveSession` | Full session view | `session: WorkoutSession` |
| `SetInputForm` | Reps/weight/RPE input | `onSubmit: (set) => void` |
| `SessionTimer` | Rest timer with notification | `duration: number, onComplete: () => void` |
| `ExerciseProgress` | Sets completed indicator | `completed: number, total: number` |
| `SessionSummary` | Post-workout stats | `session: WorkoutSession` |

### 3.4 Tracking Components

| Component | Description | Props |
|-----------|-------------|-------|
| `TrackableCard` | Single trackable with quick log | `trackable: TrackableItem, entry?: DailyEntry` |
| `TrackableForm` | Create/edit trackable | `trackable?: TrackableItem, onSave` |
| `DailyCheckIn` | All trackables for today | `date: Date` |
| `TrackingCalendar` | Monthly view with entries | `trackableId: string` |

### 3.5 Progress Components

| Component | Description | Props |
|-----------|-------------|-------|
| `ProgressChart` | Line chart for metric | `data: DataPoint[], metric: string` |
| `MeasurementForm` | Body measurements input | `measurement?: Measurement, onSave` |
| `MeasurementComparison` | Before/after comparison | `from: Measurement, to: Measurement` |
| `ProgressionSuggestion` | Accept/dismiss suggestion | `suggestion: ProgressionSuggestion` |

---

## 4. Core Workflows

### 4.1 Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │  Next.js │     │  Express │     │PostgreSQL│
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ 1. Login Form  │                │                │
     │───────────────>│                │                │
     │                │                │                │
     │                │ 2. POST /auth/login             │
     │                │───────────────>│                │
     │                │                │                │
     │                │                │ 3. Find user   │
     │                │                │───────────────>│
     │                │                │                │
     │                │                │<───────────────│
     │                │                │  4. User data  │
     │                │                │                │
     │                │                │ 5. Verify password (bcrypt)
     │                │                │────────┐       │
     │                │                │        │       │
     │                │                │<───────┘       │
     │                │                │                │
     │                │                │ 6. Generate JWT│
     │                │                │────────┐       │
     │                │                │        │       │
     │                │                │<───────┘       │
     │                │                │                │
     │                │<───────────────│                │
     │                │ 7. { user, accessToken }        │
     │                │                │                │
     │<───────────────│                │                │
     │ 8. Store token │                │                │
     │    (Zustand +  │                │                │
     │    localStorage)                │                │
     │                │                │                │
     │ 9. Redirect to │                │                │
     │    Dashboard   │                │                │
     │───────────────>│                │                │
```

### 4.2 Workout Session Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │  Zustand │     │  Express │     │PostgreSQL│
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ 1. Start Workout               │                │
     │───────────────────────────────>│                │
     │         POST /sessions          │                │
     │                │                │                │
     │                │                │ 2. Create      │
     │                │                │───────────────>│
     │                │                │                │
     │<───────────────────────────────│                │
     │ 3. Session { status: in_progress }              │
     │                │                │                │
     │ 4. Store in    │                │                │
     │    SessionStore│                │                │
     │───────────────>│                │                │
     │                │                │                │
     │ ═══════════════╪════════════════╪════════════════│
     │ ║ LOOP: For each set            ║                │
     │ ═══════════════╪════════════════╪════════════════│
     │                │                │                │
     │ 5. Log Set     │                │                │
     │    (reps, weight, rpe)          │                │
     │───────────────────────────────>│                │
     │         POST /sessions/:id/sets │                │
     │                │                │                │
     │                │                │ 6. Save set    │
     │                │                │───────────────>│
     │                │                │                │
     │<───────────────────────────────│                │
     │ 7. Set confirmed                │                │
     │                │                │                │
     │ 8. Update local│                │                │
     │    state       │                │                │
     │───────────────>│                │                │
     │                │                │                │
     │ 9. Start rest  │                │                │
     │    timer       │                │                │
     │────────┐       │                │                │
     │        │       │                │                │
     │<───────┘       │                │                │
     │                │                │                │
     │ ═══════════════╪════════════════╪════════════════│
     │ ║ END LOOP                      ║                │
     │ ═══════════════╪════════════════╪════════════════│
     │                │                │                │
     │ 10. Complete   │                │                │
     │     Session    │                │                │
     │───────────────────────────────>│                │
     │   PATCH /sessions/:id           │                │
     │   { status: completed }         │                │
     │                │                │                │
     │                │                │ 11. Update     │
     │                │                │───────────────>│
     │                │                │                │
     │                │                │ 12. Trigger    │
     │                │                │     progression│
     │                │                │     analysis   │
     │                │                │────────┐       │
     │                │                │        │       │
     │                │                │<───────┘       │
     │                │                │                │
     │<───────────────────────────────│                │
     │ 13. Session summary +           │                │
     │     progression suggestions     │                │
     │                │                │                │
     │ 14. Clear      │                │                │
     │     SessionStore                │                │
     │───────────────>│                │                │
```

### 4.3 Daily Tracking Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │  Zustand │     │  Express │     │PostgreSQL│
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ 1. Open Dashboard               │                │
     │───────────────>│                │                │
     │                │                │                │
     │                │ 2. GET /tracking/entries/today  │
     │                │───────────────>│                │
     │                │                │                │
     │                │                │ 3. Query       │
     │                │                │───────────────>│
     │                │                │                │
     │                │<───────────────│<───────────────│
     │<───────────────│ 4. Today's entries              │
     │                │                │                │
     │ 5. Display trackables with status               │
     │────────┐       │                │                │
     │        │       │                │                │
     │<───────┘       │                │                │
     │                │                │                │
     │ 6. Toggle trackable (e.g., Yoga done)           │
     │───────────────>│                │                │
     │                │                │                │
     │                │ 7. POST /tracking/entries       │
     │                │   { trackableId, date, value }  │
     │                │───────────────>│                │
     │                │                │                │
     │                │                │ 8. Upsert entry│
     │                │                │───────────────>│
     │                │                │                │
     │                │                │ 9. Update      │
     │                │                │    streak      │
     │                │                │────────┐       │
     │                │                │        │       │
     │                │                │<───────┘       │
     │                │                │                │
     │                │<───────────────│<───────────────│
     │<───────────────│ 10. Entry + updated streak     │
     │                │                │                │
     │ 11. Optimistic │                │                │
     │     UI update  │                │                │
     │────────┐       │                │                │
     │        │       │                │                │
     │<───────┘       │                │                │
```

### 4.4 Progression Detection Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Express │     │ Progress │     │PostgreSQL│
│ (trigger)│     │ Service  │     │          │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │
     │ 1. Session completed            │
     │───────────────>│                │
     │                │                │
     │                │ 2. Get last N sessions for each exercise
     │                │───────────────>│
     │                │                │
     │                │<───────────────│
     │                │ 3. Session history
     │                │                │
     │                │ 4. Analyze each exercise
     │                │────────┐       │
     │                │        │       │
     │                │   ┌────▼────────────────────────────┐
     │                │   │ For each exercise:              │
     │                │   │                                 │
     │                │   │ a. Calculate average performance│
     │                │   │    (reps x weight x sets)       │
     │                │   │                                 │
     │                │   │ b. Check stabilization          │
     │                │   │    (3-4 sessions at same level) │
     │                │   │                                 │
     │                │   │ c. If stable + target achieved: │
     │                │   │    → Generate suggestion        │
     │                │   │                                 │
     │                │   │ d. Suggestion logic:            │
     │                │   │    - Weight: +2.5kg (small)     │
     │                │   │            or +5kg (compound)   │
     │                │   │    - Reps: +2 if weight stuck   │
     │                │   │    - Sets: +1 if reps maxed     │
     │                │   └─────────────────────────────────┘
     │                │        │       │
     │                │<───────┘       │
     │                │                │
     │                │ 5. Save suggestions
     │                │───────────────>│
     │                │                │
     │<───────────────│                │
     │ 6. Return suggestions           │
```

### 4.5 Streak Calculation Logic

```
┌─────────────────────────────────────────────────────────────────┐
│                    STREAK CALCULATION                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  On new entry (workout session OR trackable entry):             │
│                                                                 │
│  1. Get streak record for user + trackable (or workout)         │
│                                                                 │
│  2. Calculate days since last activity:                         │
│     daysDiff = today - lastActivityDate                         │
│                                                                 │
│  3. Apply logic based on goal frequency:                        │
│                                                                 │
│     ┌─────────────────────────────────────────────────────┐     │
│     │ DAILY GOAL:                                          │     │
│     │   if (daysDiff === 0) → same day, no change          │     │
│     │   if (daysDiff === 1) → consecutive, streak++        │     │
│     │   if (daysDiff > 1)   → broken, streak = 1           │     │
│     └─────────────────────────────────────────────────────┘     │
│                                                                 │
│     ┌─────────────────────────────────────────────────────┐     │
│     │ WEEKLY/MONTHLY GOAL:                                 │     │
│     │   Check if goal was met in previous period           │     │
│     │   if (goalMet) → streak++ at period end              │     │
│     │   if (!goalMet) → streak = 0 at period end           │     │
│     └─────────────────────────────────────────────────────┘     │
│                                                                 │
│  4. Update longest streak if current > longest                  │
│                                                                 │
│  5. Update lastActivityDate = today                             │
│                                                                 │
│  IMPORTANT: Streak is NOT broken until END of day               │
│  (user has until midnight to maintain streak)                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. State Management

### 5.1 Zustand Stores

```typescript
// stores/auth-store.ts
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

// stores/session-store.ts
interface SessionState {
  activeSession: WorkoutSession | null;
  currentExerciseIndex: number;
  timerSeconds: number;
  isTimerRunning: boolean;
  setActiveSession: (session: WorkoutSession | null) => void;
  nextExercise: () => void;
  addSet: (set: Set) => void;
  startTimer: (duration: number) => void;
  stopTimer: () => void;
}
```

### 5.2 API Client Pattern

```typescript
// lib/api-client.ts
class ApiClient {
  async get<T>(endpoint: string): Promise<T>;
  async post<T>(endpoint: string, data?: unknown): Promise<T>;
  async put<T>(endpoint: string, data: unknown): Promise<T>;
  async patch<T>(endpoint: string, data: unknown): Promise<T>;
  async delete<T>(endpoint: string): Promise<T>;
}

// Automatic token injection via Zustand store
// Automatic 401 handling with redirect to login
```
