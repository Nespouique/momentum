---
stepsCompleted:
  - step-01-document-discovery
  - step-02-prd-analysis
  - step-03-epic-coverage-validation
  - step-04-ux-alignment
  - step-05-epic-quality-review
  - step-06-final-assessment
project: momentum
date: 2026-10-11
scope: "Story 3.8 — daily home navigation"
status: completed
readinessStatus: ready
calendarAuthority: browser-local
remainingClarificationBlockers: 0
inputDocuments:
  - docs/prd.md
  - docs/front-end-spec.md
  - docs/architecture/index.md
  - docs/architecture/overview.md
  - docs/architecture/tech-stack.md
  - docs/architecture/coding-standards.md
  - docs/architecture/source-tree.md
  - docs/architecture/deployment.md
  - docs/architecture/data-models.md
  - docs/architecture/api-spec.md
  - docs/architecture/components-workflows.md
  - docs/architecture/frontend-architecture.md
  - docs/architecture/backend-architecture.md
  - docs/epics.md
  - docs/stories/3.8.daily-home-navigation.md
  - docs/epic-3-implementation-plan.md
---

# Implementation Readiness Assessment Report

**Date:** 2026-10-11
**Project:** momentum

## Document Discovery — Confirmed

Assessment target: `docs/stories/3.8.daily-home-navigation.md`.

Candidate sources:

- PRD: `docs/prd.md`.
- UX: `docs/front-end-spec.md`.
- Epics: `docs/epics.md`.
- Supplemental Epic 3 plan: `docs/epic-3-implementation-plan.md`.
- Architecture (historical, excluded from automatic discovery):
  `docs/archive/architecture-original.md`.
- Architecture (sharded): `docs/architecture/index.md`, `tech-stack.md`,
  `coding-standards.md`, `deployment.md`, `data-models.md`, `source-tree.md`,
  `api-spec.md`, `components-workflows.md`, `overview.md`,
  `frontend-architecture.md`, and `backend-architecture.md` in `docs/architecture/`.

Documentation was centralized under `docs/` at the user's request. BMAD planning
and general outputs now target `docs/`; implementation artifacts target
`docs/stories/`. The sharded architecture index is the primary discovery entry
point. The original monolith was initially archived to prevent loss from the
incomplete split. Both versions have now been reconciled against repository
sources, with all 18 original subjects mapped in the architecture index;
superseded examples remain historical. This consolidation does not complete
the discovery step or validate implementation readiness. Corpus confirmation is
was provided by the user with `C` after consolidation. The architecture archive
is excluded from the active assessment corpus. The Epic 3 implementation plan is
supplemental context, not a competing epic definition. The companion PRD is
outside the assessment scope. No unresolved document-format duplicates remain.

## PRD Analysis

### Reading Scope and Extraction Method

The complete `step-02-prd-analysis.md` (172 lines) and the complete `docs/prd.md`
(754 lines, including the change log, all four epics, embedded stories, historical
checklist, technical risks, and next-step prompts) were read. This analysis uses
the user-confirmed corpus from step 01 and extracts requirements from the PRD only.
The assessment target remains Story 3.8 — daily home navigation.

Requirement text below is translated into English in full, without condensing
individual requirements. Source identifiers remain unchanged, including `FR10bis`
and the original story/acceptance-criterion numbering. `PRD-C001`–`PRD-C077` are
local extraction identifiers for otherwise unlabeled requirements, constraints,
assumptions, scope declarations, and investigation/process requirements; they do
not introduce new product requirements. Repeated obligations remain visible at
each source location. FR/NFR totals count explicitly labeled PRD entries;
embedded story requirements and unlabeled constraints are counted separately to
avoid inflating those totals or silently treating overlapping text as new FRs.

### Functional Requirements

Source: `docs/prd.md`, Requirements / Functional Requirements, lines 34–75.

#### Fitness Core Module

- **FR1:** The system must allow creating and managing training programs (Workouts) with a name and a type (chest/back/shoulders/arms/legs).
- **FR2:** The system must provide an exercise library with name, muscle group, equipment, and optional seat position.
- **FR3:** The system must allow adding exercises to a program with a defined order, goals (target sets/reps), a rest time between sets, and a rest time before the next exercise.
- **FR4:** The system must allow starting a training session based on a program.
- **FR5:** The system must allow logging sets in real time (reps, weight) during a session.
- **FR6:** The system must provide a rest timer between sets with an audio notification at the end.
- **FR7:** The system must retain the complete history of training sessions.

#### Progressive Overload

- **FR8:** The system must detect performance stabilization (3 consecutive sessions where goals are achieved at the same level).
- **FR9:** The system must suggest progression (+2 reps for bodyweight exercises, +2.5 kg for isolation / +5 kg for compound exercises with weights) when stabilization is detected.
- **FR10:** The user must be able to accept or ignore a progression suggestion.
- **FR10bis:** An ignored suggestion triggers a cooldown of 3 sessions before a new suggestion for the same exercise.

#### AI Coach (Optional)

- **FR24:** The system must offer access to the AI Coach when at least one exercise is stagnating.
- **FR25:** The AI Coach must analyze the history of the last 10 sessions of the same workout.
- **FR26:** The AI Coach must propose personalized set-by-set adjustments with analysis and justification.
- **FR27:** The user must be able to adjust the AI Coach's proposals before applying them.
- **FR28:** The AI Coach is available only if the OpenAI API key is configured.

#### Today Dashboard

- **FR11:** The system must display a "Today" home page showing the day's tasks/goals.
- **FR12:** The system must allow manually entering daily steps.
- **FR13:** The system must allow marking yoga as done/not done (checkbox).
- **FR14:** The system must display remaining tasks at the top and completed tasks at the bottom.

#### Gamification

- **FR15:** The system must calculate and display streaks (consecutive days of activity).
- **FR16:** The system must calculate and display the daily completion percentage.
- **FR17:** The system must support decomposed monthly goals (X days/month to achieve).

#### Profile and Measurements

- **FR18:** The system must allow creating and modifying a user profile (name, age, height, goals).
- **FR19:** The system must allow recording dated body measurements (weight, chest circumference, waist, arms, legs).
- **FR20:** The system must retain measurement history for visualizing progress.

#### Custom Exercises and Tracking

- **FR21:** The system must allow the user to create custom exercises in the library.
- **FR22:** The system must allow the user to configure the items they wish to track daily (types and goals).
- **FR23:** The system must allow defining goals for each tracked item (e.g., 10,000 steps/day, yoga 5 times/week, sport 4 times/week).

**Total FRs: 29** — FR1–FR28 plus FR10bis; source ordering is preserved.

### Non-Functional Requirements

Source: `docs/prd.md`, Requirements / Non-Functional Requirements, lines 79–99.

#### Performance

- **NFR1:** The training-session interface must be responsive (<100 ms) so as not to interrupt the user's flow.
- **NFR2:** The application must work smoothly on mobile during a session (no lag).

#### Architecture and Deployment

- **NFR3:** The application must be self-hostable via Docker/Docker Compose.
- **NFR4:** The architecture must be modular, allowing progressive activation of modules (fitness → meals → projects).
- **NFR5:** The system must use PostgreSQL as its database.

#### Security and Data

- **NFR6:** User data must remain on personal infrastructure (no mandatory external cloud).
- **NFR7:** Authentication must be prepared for future integration with Authentik.

#### UX/UI

- **NFR8:** The mobile interface must prioritize quick actions (quick logging).
- **NFR9:** The desktop interface must prioritize analytics and visualization.
- **NFR10:** Gamification must be subtle (fintech style, not childish).

#### Maintainability

- **NFR11:** The code must use strict TypeScript (no `any`).
- **NFR12:** UI components must exclusively use Shadcn UI and Tailwind CSS.

**Total NFRs: 12.** Additional accessibility, interaction, platform, security,
testing, and deployment obligations appear below at their original locations.

### Additional Requirements

#### Embedded Story Requirements and Acceptance Criteria

Source: `docs/prd.md`, Epic 1–4, lines 256–686. Each `Story X.Y / AC n`
identifier below retains the original story ID and criterion number. Nested
details belong to their parent criterion and are not counted as separate ACs.
The four migration stories have recorded results rather than numbered ACs.

##### Story 1.1: Project Scaffolding & Monorepo Setup

As a developer, I want a properly structured monorepo with Next.js frontend and Express backend, so that I have a solid foundation to build upon with shared TypeScript types.

1. **Story 1.1 / AC 1:** Monorepo structure created with `apps/web`, `apps/api`, `packages/shared` directories.
2. **Story 1.1 / AC 2:** Next.js 14+ configured with App Router and strict TypeScript.
3. **Story 1.1 / AC 3:** Express.js configured with strict TypeScript.
4. **Story 1.1 / AC 4:** `shared` package configured for shared types between frontend and backend.
5. **Story 1.1 / AC 5:** Functional `dev`, `build`, `lint` scripts at the root.
6. **Story 1.1 / AC 6:** ESLint + Prettier configured with consistent rules.
7. **Story 1.1 / AC 7:** Appropriate `.gitignore` and basic README.

##### Story 1.2: Database & Prisma Setup

As a developer, I want PostgreSQL configured with Prisma ORM, so that I can define and migrate the database schema with type safety.

1. **Story 1.2 / AC 1:** Docker Compose configured with a PostgreSQL service for local development.
2. **Story 1.2 / AC 2:** Prisma initialized in the project with a PostgreSQL connection.
3. **Story 1.2 / AC 3:** `User` model created with base fields (id, email, password hash, name, createdAt, updatedAt).
4. **Story 1.2 / AC 4:** First migration generated and applicable.
5. **Story 1.2 / AC 5:** Prisma Client generated and accessible from the backend.
6. **Story 1.2 / AC 6:** Basic seed script for test data.
7. **Story 1.2 / AC 7:** Environment variables documented (`.env.example`).

##### Story 1.3: Shadcn UI & Dark Theme Foundation

As a user, I want a dark-themed modern interface, so that the app is comfortable to use and visually consistent.

1. **Story 1.3 / AC 1:** Shadcn UI installed and configured in the Next.js frontend.
2. **Story 1.3 / AC 2:** Tailwind CSS configured with dark mode enabled by default.
3. **Story 1.3 / AC 3:** Custom dark theme with restrained color accents.
4. **Story 1.3 / AC 4:** `AppLayout` component created (header, main content area, bottom nav placeholder).
5. **Story 1.3 / AC 5:** Reusable `PageHeader` component created.
6. **Story 1.3 / AC 6:** Placeholder home page displaying "Momentum" with the layout.
7. **Story 1.3 / AC 7:** Fonts configured (modern sans-serif).

##### Story 1.4: Authentication System

As a user, I want to register and login securely, so that my data is protected and personal.

1. **Story 1.4 / AC 1:** API endpoints: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`.
2. **Story 1.4 / AC 2:** Passwords hashed with bcrypt.
3. **Story 1.4 / AC 3:** JWT tokens generated and validated.
4. **Story 1.4 / AC 4:** Authentication middleware protecting private routes.
5. **Story 1.4 / AC 5:** `/login` page with a form (email, password).
6. **Story 1.4 / AC 6:** `/register` page with a form (name, email, password, confirm password).
7. **Story 1.4 / AC 7:** Automatic redirect to login if unauthenticated.
8. **Story 1.4 / AC 8:** Secure client-side token storage (httpOnly cookie or secure storage).
9. **Story 1.4 / AC 9:** Server-side input validation and appropriate error messages.

##### Story 1.5: User Profile Management

As a user, I want to view and edit my profile information, so that I can personalize my experience and track my baseline stats.

1. **Story 1.5 / AC 1:** `User` model extended with profile fields (age, height, goal description).
2. **Story 1.5 / AC 2:** API endpoints: `GET /profile`, `PATCH /profile`, `PUT /profile/password`.
3. **Story 1.5 / AC 3:** `/profile` page (Profile Hub) displaying profile information.
4. **Story 1.5 / AC 4:** Profile editing form with validation (React Hook Form + Zod).
5. **Story 1.5 / AC 5:** Password change functionality (separate form).
6. **Story 1.5 / AC 6:** Visual feedback during saving (loading, success Toast, error).
7. **Story 1.5 / AC 7:** Navigation to the profile from bottom nav (User icon).

##### Story 1.6: Measurements Tracking

As a user, I want to record and view my body measurements over time, so that I can track my physical progress.

1. **Story 1.6 / AC 1:** `Measurement` model created with complete bilateral fields:
   - `userId, date, notes`
   - `weight` (kg)
   - Measurements in cm: `neck, shoulders, chest, bicepsLeft, bicepsRight, forearmLeft, forearmRight, wristLeft, wristRight, waist, hips, thighLeft, thighRight, calfLeft, calfRight, ankleLeft, ankleRight`
2. **Story 1.6 / AC 2:** API endpoints: `GET /measurements`, `GET /measurements/:id`, `POST /measurements`, `PUT /measurements/:id`, `DELETE /measurements/:id`, `GET /measurements/latest`, `GET /measurements/progress`.
3. **Story 1.6 / AC 3:** `/profile/measurements` page listing measurement history (most recent first).
4. **Story 1.6 / AC 4:** Measurement addition form with date picker and optional fields grouped by body area.
5. **Story 1.6 / AC 5:** Ability to edit and delete an entry.
6. **Story 1.6 / AC 6:** Units displayed (kg, cm).
7. **Story 1.6 / AC 7:** Navigation to measurements from the profile hub.

##### Story 1.7: CI/CD Pipeline & Production Docker

As a developer, I want automated build, test, and deployment pipeline, so that I can deploy reliably to my Proxmox server.

1. **Story 1.7 / AC 1:** Multi-stage Dockerfile for frontend (Next.js standalone).
2. **Story 1.7 / AC 2:** Dockerfile for backend (Express).
3. **Story 1.7 / AC 3:** Production Docker Compose with web, api, postgres services.
4. **Story 1.7 / AC 4:** GitHub Actions workflow: lint, build, push images to DockerHub.
5. **Story 1.7 / AC 5:** Images tagged with a version (git sha or semver).
6. **Story 1.7 / AC 6:** Production environment variables documented.
7. **Story 1.7 / AC 7:** Health check endpoints (`/health`) on frontend and backend.
8. **Story 1.7 / AC 8:** README with deployment instructions.

##### Story 2.1: Exercise Library - Data Model & Backend

As a developer, I want a complete exercise data model and API, so that exercises can be managed and used in workout programs.

1. **Story 2.1 / AC 1:** `Exercise` model created (id, name, muscleGroups[], isCustom, userId nullable, createdAt).
2. **Story 2.1 / AC 2:** Constants for `muscleGroups` (multi-selection array): `abdos, biceps, dos, epaules, fessiers, ischios, lombaires, mollets, pecs, quadriceps, trapezes, triceps`.
3. **Story 2.1 / AC 3:** API endpoints: `GET /exercises`, `GET /exercises/:id`, `POST /exercises`, `PUT /exercises/:id`, `DELETE /exercises/:id`, `GET /exercises/muscle-groups`.
4. **Story 2.1 / AC 4:** Filtering by muscleGroup on `GET /exercises?muscleGroup=pecs`.
5. **Story 2.1 / AC 5:** Filtering by type `GET /exercises?isCustom=true`.
6. **Story 2.1 / AC 6:** Custom exercises linked to the user, shared base exercises (userId null).
7. **Story 2.1 / AC 7:** Seed with an initial library of common exercises (15–20 base exercises with multiple muscle groups).
8. **Story 2.1 / AC 8:** Validation: an exercise used in a program cannot be deleted.

##### Story 2.2: Exercise Library - UI

As a user, I want to browse, search, and add exercises to my library, so that I can build my workout programs with the exercises I use.

1. **Story 2.2 / AC 1:** `/exercises` page listing all available exercises.
2. **Story 2.2 / AC 2:** Muscle-group filters (tabs or multi-selection dropdown).
3. **Story 2.2 / AC 3:** Search bar by name.
4. **Story 2.2 / AC 4:** Cards or list display with name and muscle-group badges.
5. **Story 2.2 / AC 5:** "Ajouter un exercice" button opening a modal/drawer form.
6. **Story 2.2 / AC 6:** Form: name (required), muscle groups (required, multi-selection with chips).
7. **Story 2.2 / AC 7:** Visual badge distinguishing custom exercises from the base library.
8. **Story 2.2 / AC 8:** Edit/delete actions on custom exercises only.
9. **Story 2.2 / AC 9:** Navigation accessible from the main menu.

##### Story 2.3: Workout Program - Data Model & Backend

As a developer, I want workout program and workout-exercise relationship models, so that users can create structured training programs.

1. **Story 2.3 / AC 1:** `Workout` model created (id, userId, name, description nullable, createdAt, updatedAt).
2. **Story 2.3 / AC 2:** `WorkoutExercise` model created (id, workoutId, exerciseId, order, targetSets, targetReps, targetWeight nullable, restBetweenSets in seconds, restAfterExercise in seconds).
3. **Story 2.3 / AC 3:** API endpoints: `GET /workouts`, `GET /workouts/:id` (with exercises), `POST /workouts`, `PUT /workouts/:id`, `DELETE /workouts/:id`, `POST /workouts/:id/duplicate`.
4. **Story 2.3 / AC 4:** Workout creation with exercises in a single request (nested create).
5. **Story 2.3 / AC 5:** Cascade delete: deleting a workout deletes its WorkoutExercises.
6. **Story 2.3 / AC 6:** Validation: a workout must have at least 1 exercise to be valid.

##### Story 2.4: Workout Builder - UI

As a user, I want to create and edit my workout programs, so that I can structure my training sessions according to my split.

1. **Story 2.4 / AC 1:** `/workouts` page listing my programs with name and description.
2. **Story 2.4 / AC 2:** "Nouveau programme" button creating a new workout.
3. **Story 2.4 / AC 3:** `/workouts/new` and `/workouts/:id/edit` pages for creation/editing.
4. **Story 2.4 / AC 4:** Fields: program name (required), description (optional, free text).
5. **Story 2.4 / AC 5:** "Exercices" section with an ordered list of program exercises.
6. **Story 2.4 / AC 6:** "Ajouter exercice" button opening a selector (ExerciseSelector) from the library.
7. **Story 2.4 / AC 7:** For each exercise: target sets, target reps, target weight (optional), rest between sets (input in seconds), rest after exercise (input in seconds).
8. **Story 2.4 / AC 8:** Ability to reorder exercises (drag & drop or up/down buttons).
9. **Story 2.4 / AC 9:** Ability to remove an exercise from the program.
10. **Story 2.4 / AC 10:** Saving with visual feedback (loading, success, error).

##### Story 2.5: Workout Session - Data Model & Backend

As a developer, I want session and set tracking models, so that workout execution can be recorded in detail.

1. **Story 2.5 / AC 1:** `WorkoutSession` model created (id, userId, workoutId, status: in_progress/completed/abandoned, startedAt, completedAt nullable, notes nullable).
2. **Story 2.5 / AC 2:** `Set` model created (id, sessionId, exerciseId, setNumber, reps, weight, rpe nullable 1–10, completedAt).
3. **Story 2.5 / AC 3:** Endpoints: `POST /sessions` (start), `GET /sessions/:id`, `PATCH /sessions/:id` (complete/abandon/notes), `DELETE /sessions/:id`, `GET /sessions` (history), `GET /sessions/active`.
4. **Story 2.5 / AC 4:** Set endpoints: `POST /sessions/:id/sets`, `PUT /sessions/:id/sets/:setId`, `DELETE /sessions/:id/sets/:setId`.
5. **Story 2.5 / AC 5:** Automatic duration calculation on completion (completedAt - startedAt).
6. **Story 2.5 / AC 6:** History filtering by status, workoutId, date range (from/to), pagination (limit/offset).

##### Story 2.6: Active Workout Session - UI

As a user, I want an optimized interface during my workout, so that I can log my sets quickly without interrupting my training flow.

1. **Story 2.6 / AC 1:** `/session/:id` page in full-screen mode (main navigation hidden).
2. **Story 2.6 / AC 2:** Pre-Session screen with confirmation before starting.
3. **Story 2.6 / AC 3:** Current exercise displayed with name, muscle groups, and goals (sets × reps @ weight).
4. **Story 2.6 / AC 4:** Progress dots indicating the current set (○ ● ○ ○).
5. **Story 2.6 / AC 5:** SetInput component with +/- steppers (no keyboard) for reps and weight, prefilled with target or last value.
6. **Story 2.6 / AC 6:** Large "SET DONE" button (≥60 px) for quick validation.
7. **Story 2.6 / AC 7:** SessionTimer component: full-screen rest timer starting automatically after validation.
8. **Story 2.6 / AC 8:** Timer adjustment buttons (+30 s, -30 s) and "Skip".
9. **Story 2.6 / AC 9:** Audio notification (Web Audio API) at the end of rest time.
10. **Story 2.6 / AC 10:** Inter-exercise timer if configured (restAfterExercise).
11. **Story 2.6 / AC 11:** Mobile-optimized interface: large touch-friendly buttons, ≤3 taps to log.
12. **Story 2.6 / AC 12:** Wake Lock API to prevent the screen from sleeping.
13. **Story 2.6 / AC 13:** "Abandon" button with confirmation (session marked abandoned).
14. **Story 2.6 / AC 14:** Session Summary at the end with statistics and the ability to add notes.

##### Story 2.7: Session History & Details

As a user, I want to view my past workout sessions, so that I can track my training consistency and review my performance.

1. **Story 2.7 / AC 1:** `/sessions` page listing session history (most recent first).
2. **Story 2.7 / AC 2:** Each entry displays: date, workout name, duration, status (completed/abandoned).
3. **Story 2.7 / AC 3:** Filtering by workout type or date range.
4. **Story 2.7 / AC 4:** `/sessions/:id` page displaying session details.
5. **Story 2.7 / AC 5:** Detail: list of exercises with performed sets (reps × weight for each set).
6. **Story 2.7 / AC 6:** Session notes displayed if present.
7. **Story 2.7 / AC 7:** Visual comparison with goals (target vs performed).
8. **Story 2.7 / AC 8:** Ability to add/edit notes for a past session.

##### Story 2.8: Progressive Overload System

As a user, I want the app to detect when I'm plateauing and suggest progression, so that I continuously improve without having to manually track patterns.

1. **Story 2.8 / AC 1:** Stabilization detection algorithm: identify when an exercise has been performed with the same reps/weight across 3 consecutive sessions AT THE SAME difficulty LEVEL.
2. **Story 2.8 / AC 2:** Suggestion logic: propose +2 reps (bodyweight) OR +2.5 kg (isolation) / +5 kg (compound) depending on exercise type.
3. **Story 2.8 / AC 3:** `ProgressionSuggestion` model (exerciseId, sessionId, suggestionType, currentValue, suggestedValue, reason, status: pending/accepted/dismissed).
4. **Story 2.8 / AC 4:** Suggestion displayed on the end-of-session screen (Session Summary).
5. **Story 2.8 / AC 5:** Suggestion UI: display current progression → suggestion, with Apply/Ignore buttons.
6. **Story 2.8 / AC 6:** If accepted: automatically update goals in the workout template.
7. **Story 2.8 / AC 7:** Do not suggest again if the user ignored recently (cooldown of 3 sessions).

##### Story 2.9: AI Coach

As a user experiencing stagnation, I want personalized AI coaching advice, so that I get intelligent recommendations to break through plateaus.

1. **Story 2.9 / AC 1:** AI Coach button visible only if stagnation is detected AND API key configured.
2. **Story 2.9 / AC 2:** Dedicated `/session/[id]/ai-coach` page with contextual analysis.
3. **Story 2.9 / AC 3:** The AI analyzes the last 10 sessions of the same workout.
4. **Story 2.9 / AC 4:** Personalized set-by-set proposals with analysis and justification.
5. **Story 2.9 / AC 5:** The user can adjust the suggested values before applying.
6. **Story 2.9 / AC 6:** Actions: "Appliquer et terminer" or "Ignorer et terminer".

##### Story 3.1: Trackable Items - Data Model & Backend

As a developer, I want a flexible system for user-defined trackable items, so that users can configure what habits they want to track with their goals.

1. **Story 3.1 / AC 1:** `TrackableItem` model created (id, userId, name, icon, color, trackingType: boolean/number/duration, unit nullable, isActive, createdAt).
2. **Story 3.1 / AC 2:** `TrackableGoal` model created (id, trackableId, targetValue, frequency: daily/weekly/monthly, startDate, endDate nullable).
3. **Story 3.1 / AC 3:** Types: `boolean` (checkbox), `number` (numeric value), `duration` (minutes).
4. **Story 3.1 / AC 4:** Endpoints: `GET /trackables`, `GET /trackables/:id`, `POST /trackables`, `PUT /trackables/:id`, `DELETE /trackables/:id`.
5. **Story 3.1 / AC 5:** Goal endpoints: `POST /trackables/:id/goals`, `PUT /trackables/:id/goals/:goalId`.
6. **Story 3.1 / AC 6:** Seed with disabled default items (suggestions: yoga, steps, meditation, reading, side-project).
7. **Story 3.1 / AC 7:** A special "workout" trackable created automatically and linked to Epic 2 sessions (not deletable).

##### Story 3.2: Tracking Configuration - UI

As a user, I want to configure what I track and set my goals, so that the app adapts to my personal habits and objectives.

1. **Story 3.2 / AC 1:** `/settings/trackables` page for trackable configuration.
2. **Story 3.2 / AC 2:** List of tracked items with on/off toggle for each.
3. **Story 3.2 / AC 3:** "Ajouter un élément" button to create a new trackable.
4. **Story 3.2 / AC 4:** TrackableForm: name, icon (Lucide icons selector), color (color picker), type (checkbox/number/duration), unit if number/duration.
5. **Story 3.2 / AC 5:** For each active item: goal configuration via modal/drawer.
6. **Story 3.2 / AC 6:** Goal options: frequency (daily/weekly/monthly) + target value.
7. **Story 3.2 / AC 7:** Ability to reorder items (drag & drop, affects dashboard order).
8. **Story 3.2 / AC 8:** Ability to delete a custom trackable (with confirmation Dialog).
9. **Story 3.2 / AC 9:** The "workout" trackable is visible but not editable/deletable.

##### Story 3.3: Daily Tracking - Data Model & Backend

As a developer, I want to store daily tracking entries, so that users can log their daily habits and the system can calculate progress.

1. **Story 3.3 / AC 1:** `DailyEntry` model created (id, trackableId, date, value: number, notes nullable, createdAt).
2. **Story 3.3 / AC 2:** For boolean type: value = 1 (done) or 0 (not done).
3. **Story 3.3 / AC 3:** For number/duration type: value = entered value.
4. **Story 3.3 / AC 4:** Unique constraint on (trackableId, date) — only one entry per item per day.
5. **Story 3.3 / AC 5:** Endpoints: `GET /tracking/entries`, `GET /tracking/entries/:date`, `POST /tracking/entries` (upsert), `DELETE /tracking/entries/:id`.
6. **Story 3.3 / AC 6:** `GET /tracking/entries/:date` also returns calculated data (the day's workout sessions counted automatically).
7. **Story 3.3 / AC 7:** Summary endpoint: `GET /tracking/summary?period=week|month&date=YYYY-MM-DD` for a period with completion %.
8. **Story 3.3 / AC 8:** Filtering by trackableId, date range (from/to).

##### Story 3.4: Today Dashboard - UI

As a user, I want a clean daily dashboard showing my tasks and progress, so that I can quickly see what's left to do and log my activities.

1. **Story 3.4 / AC 1:** `/` page (home) = Today Dashboard (default landing page).
2. **Story 3.4 / AC 2:** Header with today's date and personalized greeting.
3. **Story 3.4 / AC 3:** StreakBadge component displayed prominently (e.g., "🔥 12 days").
4. **Story 3.4 / AC 4:** DailyProgressBar component with global completion percentage.
5. **Story 3.4 / AC 5:** "TO DO" section: uncompleted items at the top (TrackableCard components).
6. **Story 3.4 / AC 6:** "COMPLETED" section: completed items at the bottom (visually distinct, grayed out).
7. **Story 3.4 / AC 7:** For boolean items: clickable checkbox to toggle done (optimistic update).
8. **Story 3.4 / AC 8:** For number/duration items: tapping opens a quick inline input with validation.
9. **Story 3.4 / AC 9:** "workout" item: displays the day's number of sessions (0/1), tapping navigates to `/workouts`.
10. **Story 3.4 / AC 10:** "Start a Workout" quick action clearly visible at the top.
11. **Story 3.4 / AC 11:** Real-time updates with optimistic updates and React Query invalidation.
12. **Story 3.4 / AC 12:** If no trackable is configured: prompt to `/settings/trackables`.

##### Story 3.5: Streaks Calculation System

As a developer, I want to calculate and store streak data, so that users can see their consistency over time.

1. **Story 3.5 / AC 1:** `Streak` model created (id, userId, trackableId nullable, currentStreak, longestStreak, lastActivityDate, updatedAt).
2. **Story 3.5 / AC 2:** trackableId = null for the global workout streak.
3. **Story 3.5 / AC 3:** Calculation logic: streak = consecutive days when the goal was achieved.
4. **Story 3.5 / AC 4:** For a daily goal: each day counts.
5. **Story 3.5 / AC 5:** For a weekly/monthly goal: streak = consecutive periods when the goal was achieved.
6. **Story 3.5 / AC 6:** Automatic streak updates on each tracking entry.
7. **Story 3.5 / AC 7:** Streak reset if a period is missed (according to goal frequency).
8. **Story 3.5 / AC 8:** Endpoints: `GET /streaks` (all streaks), `GET /streaks/:trackableId`, `GET /streaks/workout` (global workout streak).
9. **Story 3.5 / AC 9:** Edge case handling: the current day does not break the streak until it is over.

##### Story 3.6: Gamification UI - Streaks & Progress Display

As a user, I want to see my streaks and monthly progress visually, so that I stay motivated by seeing my consistency.

1. **Story 3.6 / AC 1:** Streak badge displayed on the dashboard (e.g., "🔥 12 jours").
2. **Story 3.6 / AC 2:** Individual streak visible per trackable item (flame icon + number).
3. **Story 3.6 / AC 3:** For monthly goals: display "X/Y jours ce mois" with a progress bar.
4. **Story 3.6 / AC 4:** Bar color changes according to progress (green if on track, orange if behind, red if the goal is impossible).
5. **Story 3.6 / AC 5:** "Mes stats" section or modal accessible from the dashboard.
6. **Story 3.6 / AC 6:** Statistics displayed: current streak, best streak, month's progress per item.
7. **Story 3.6 / AC 7:** Subtle animation when a new streak record is achieved.
8. **Story 3.6 / AC 8:** Fintech style: restrained, elegant, data-driven (no confetti or childish animations).

##### Story 3.7: Monthly Goals & Calendar View

As a user, I want to see my monthly progress in a calendar format, so that I can visualize which days I was active and plan my remaining days.

1. **Story 3.7 / AC 1:** Monthly calendar component accessible from the dashboard or statistics.
2. **Story 3.7 / AC 2:** Each day colored according to completion level (gradient or dots).
3. **Story 3.7 / AC 3:** Clear color legend.
4. **Story 3.7 / AC 4:** Number of active days displayed against the monthly goal.
5. **Story 3.7 / AC 5:** Projection: "Il te reste X jours pour atteindre ton objectif de Y jours".
6. **Story 3.7 / AC 6:** Navigation between months (history).
7. **Story 3.7 / AC 7:** Clicking a day displays that day's details (completed items).
8. **Story 3.7 / AC 8:** Responsive view: simplified on mobile, complete on desktop.

##### Story 4.1: Exercise Import ✅

**Status:** Completed. **Script:** `scripts/hercules-import-exercises.ts`.

21 exercises mapped (13 created + 8 existing), 3 ignored (stretching/rehabilitation).
Generates `scripts/hercules-exercise-mapping.json`.

##### Story 4.2: Program (Workout) Import ✅

**Status:** Completed. **Script:** `scripts/hercules-import-workouts.ts`.

5 workouts created (Bras, Fessiers, Pecs, Dos, Épaules) with 19 WorkoutItems
(including 2 supersets), 21 WorkoutItemExercises, 87 WorkoutSets.
Generates `scripts/hercules-workout-mapping.json`.

##### Story 4.3: Session History Import ✅

**Status:** Completed. **Script:** `scripts/hercules-import-history.ts`.

125 sessions imported (period 28/02/2024 → 04/01/2026), 508 exercises, 2121 sets.
4 performances with discrepancies ignored, 20 session notes imported.

##### Story 4.4: Measurement Import ✅

**Status:** Completed. **Script:** `scripts/hercules-import-measurements.ts`.

2 measurements imported (28/04/2024, 16/06/2024) with 18 fields each.

**Embedded-story totals:** 27 stories; 23 stories with **187 numbered ACs**
(Epic 1: 52; Epic 2: 74; Epic 3: 61), plus 4 migration stories with unnumbered
completion records. These are source declarations, not implementation verification.

#### Unlabeled Constraints, Assumptions, and Additional Obligations

##### Goals and Background Context (PRD lines 7–18)

- **PRD-C001 — Goal:** Simplify daily habit tracking with a streamlined "Today" interface and quick actions.
- **PRD-C002 — Goal:** Optimize fitness training through a module inspired by Hercules with intelligent progressive overload.
- **PRD-C003 — Goal:** Maintain a holistic view of well-being (physical, intellectual, artistic) without cognitive overload.
- **PRD-C004 — Goal:** Retain control of data through self-hosting and independence from external clouds.
- **PRD-C005 — Goal:** Motivate through subtle gamification (streaks, badges, decomposed monthly goals) without a childish aspect.
- **PRD-C006 — Goal:** Differentiate mobile/desktop usage: quick capture on mobile, analytics on desktop.
- **PRD-C007 — Background assumption:** Momentum arises from the need for a personal habit-tracking tool that goes beyond limitations of existing applications such as Hercules. The user seeks a solution combining detailed fitness tracking (5-session split programs, progressive overload) with broader tracking including nutrition, steps, yoga, and personal projects.
- **PRD-C008 — Background and design principle:** The current market offers either pure fitness apps (Hercules, Strong) or generic habit trackers (Habitica, Streaks), but no solution offers the desired holistic integration with progressive intelligence and self-hosting. The "Log first, analyze later" philosophy guides design: mobile for quick capture, desktop for reflection and advanced analytics.

##### User Interface Design Goals (PRD lines 107–152)

- **PRD-C009 — Overall UX vision:** A streamlined and focused application that respects the "Log first, analyze later" principle. The interface must allow quick capture of everyday data without friction, while offering motivating insights through subtle gamification inspired by fintech apps (elegant, not childish). The experience must be differentiated by device: mobile for quick action during sessions, desktop for reflection and progress analysis.
- **PRD-C010 — Quick Actions:** Shortcut buttons for frequent actions (start a session, log steps, mark yoga).
- **PRD-C011 — Today-Centric:** Focus on the present day; history is accessible but not in the foreground.
- **PRD-C012 — Progressive Disclosure:** Advanced functions/statistics hidden in secondary menus to avoid overload.
- **PRD-C013 — In-Session Flow:** Training interface optimized for use during effort (large buttons, visible timer, minimal taps).
- **PRD-C014 — Instant Feedback:** Immediate update of streaks/percentages after each action.
- **PRD-C015 — Core screen / MVP:** Today Dashboard — Main view with the day's goals, progress, quick actions.
- **PRD-C016 — Core screen / MVP:** Workout Session — Interface during training: timer, sets, reps/weight, current exercise.
- **PRD-C017 — Core screen / MVP:** Workout Builder — Program creation/editing with exercises, order, rest times.
- **PRD-C018 — Core screen / MVP:** Exercise Library — Exercise library with search, filters by muscle group.
- **PRD-C019 — Core screen / MVP:** Profile & Measurements — User profile and measurement history.
- **PRD-C020 — Core screen / MVP:** Tracking Configuration — Configuration of items to track (yoga, steps, sport...) and definition of associated goals.
- **PRD-C021 — Core screen / Phase 2:** Analytics Dashboard — Progress graphs, historical statistics (desktop-focused).
- **PRD-C022 — Core screen / MVP (minimal):** Settings — App configuration, preferences, active modules.
- **PRD-C023 — Accessibility:** WCAG AA — Standard accessibility level: sufficient contrast for readability; functional keyboard navigation; appropriate labels for screen readers.
- **PRD-C024 — Mandatory dark mode:** Dark theme by default, pure Shadcn UI style with restrained and modern color accents.
- **PRD-C025 — Palette:** Dark tones with color accents for gamification (streaks, badges).
- **PRD-C026 — Typography:** Modern sans-serif, readable on mobile.
- **PRD-C027 — No childish elements:** Avoid excessive animations, mascots, or gamification too reminiscent of a "mobile game".
- **PRD-C028 — Fintech style:** Elegant, professional, data-driven.
- **PRD-C029 — Responsive Web (PWA), Mobile (PWA):** Main usage: daily logging, training sessions, installation via PWA. UI priority: quick actions, large touch targets.
- **PRD-C030 — Responsive Web (PWA), Desktop:** Main usage: analytics, program configuration, reflection. UI priority: rich visualizations, complete navigation.

##### Technical Assumptions (PRD lines 160–231)

- **PRD-C031 — Repository structure:** Monorepo — All code in a single repository:

  ```text
  momentum/
  ├── apps/
  │   ├── web/          # Next.js frontend
  │   └── api/          # Express.js backend
  ├── packages/
  │   └── shared/       # Shared types, utilities
  ├── prisma/           # Schema and migrations
  ├── docker/           # Docker configs
  └── docs/             # Documentation
  ```

- **PRD-C032 — Service architecture:** Modular monolith with frontend/backend separation:

  | Component   | Technology               | Description                    |
  | ----------- | ------------------------ | ------------------------------ |
  | Frontend    | Next.js 14+ (App Router) | React 18+, hybrid SSR/CSR, PWA |
  | Backend     | Express.js               | REST API, business logic       |
  | ORM         | Prisma                   | Type-safe database access      |
  | Database    | PostgreSQL               | Persistent data                |
  | Styling     | Tailwind CSS + Shadcn UI | Dark mode, modern components   |
  | Dev Tooling | Vite                     | Fast HMR for development       |

- **PRD-C033 — Testing requirements:** Unit + Integration (pragmatic):

  | Type              | Scope                                                               | Suggested tools      |
  | ----------------- | ------------------------------------------------------------------- | -------------------- |
  | Unit Tests        | Critical business logic (progressive overload, streak calculations) | Vitest               |
  | Integration Tests | API endpoints, key workflows                                        | Vitest + Supertest   |
  | E2E               | Critical flows (training session)                                   | Playwright (Phase 2) |

- **PRD-C034 — Infrastructure and deployment:** Docker + Docker Compose for packaging.
- **PRD-C035 — Infrastructure and deployment:** GitHub Actions for CI/CD.
- **PRD-C036 — Infrastructure and deployment:** DockerHub as image registry.
- **PRD-C037 — Infrastructure and deployment:** Deployment on Proxmox LXC via Portainer.
- **PRD-C038 — Infrastructure and deployment:** Exclusively self-hosted (no public cloud).
- **PRD-C039 — Infrastructure and deployment:** Backup managed manually through Proxmox LXC backup.
- **PRD-C040 — Authentication / MVP:** Simple authentication (session-based or basic JWT).
- **PRD-C041 — Authentication / Phase 2:** Authentik integration (SSO).
- **PRD-C042 — Authentication:** Single-user assumed for the MVP.
- **PRD-C043 — TypeScript:** Strict mode mandatory.
- **PRD-C044 — TypeScript:** No `any` allowed.
- **PRD-C045 — TypeScript:** Shared types between frontend and backend through the shared package.
- **PRD-C046 — Code conventions:** ESLint + Prettier configured.
- **PRD-C047 — Code conventions:** Shadcn UI components exclusively (no raw HTML).
- **PRD-C048 — Code conventions:** Tailwind for all styling (no custom CSS).
- **PRD-C049 — PWA:** Service Worker for mobile installation.
- **PRD-C050 — PWA:** No offline-first strategy (internet connection assumed).
- **PRD-C051 — PWA:** Manifest for icon and splash screen.
- **PRD-C052 — Future integration, outside MVP:** Samsung Health API (steps, sleep).
- **PRD-C053 — Future integration, outside MVP:** Google Calendar API.
- **PRD-C054 — Integration declared already implemented:** OpenAI API for the AI Coach (GPT-4o-mini) — see Story 2.9.

##### Epic Goals and Expanded Scope (PRD lines 237–254, 371–372, 528–529, 652–655)

- **PRD-C055 — Epic 1 goal:** Establish the technical foundations (project, auth, DB, CI/CD, base components) and deliver a functional user profile with measurements.
- **PRD-C056 — Epic 2 goal:** Implement the complete fitness module: exercise library, program creation, real-time session interface, and progressive overload suggestions.
- **PRD-C057 — Epic 3 goal:** Create the "Today" dashboard, configuration of items to track, and gamification system (streaks, percentages, monthly goals).
- **PRD-C058 — Epic 4 goal, marked completed:** Migrate all data from the Hercules application (exercises, programs, session history, measurements) through idempotent CLI scripts.
- **PRD-C059 — Epic 1 expanded goal:** Establish the complete technical foundations of Momentum: monorepo structure, strict TypeScript configuration, PostgreSQL database with Prisma, simple authentication, and base UI components with Shadcn in dark mode. At the end of this epic, the application will be deployable via Docker with functional CI/CD, and the user will be able to authenticate, manage their profile, and track their measurements.
- **PRD-C060 — Epic 2 expanded goal:** Implement the complete fitness tracking system inspired by Hercules: an extensible exercise library (with custom exercise addition), a training program builder with rest-time configuration, a real-time session interface optimized for use during effort (timer with audio notification, quick logging), and the progressive overload algorithm that detects plateaus and suggests progression. This epic delivers Momentum's principal differentiating value.
- **PRD-C061 — Epic 3 expanded goal:** Create the customizable daily tracking system and the "Today" dashboard that will be the application's primary entry point. The user will be able to configure what they want to track (yoga, steps, sport, etc.) with flexible goals (daily or decomposed monthly goals). The subtle gamification system (streaks, progress percentages, monthly goals) will motivate the user without being childish. This dashboard unifies all tracked activities, including Epic 2 workout sessions.
- **PRD-C062 — Epic 4 expanded goal and source:** Migrate all training data from the Android Hercules application to Momentum. The migration covers exercises, training programs (with supersets), the complete session history (520 performances → 125 sessions), and body measurements. Each step is performed through an idempotent TypeScript CLI script that reads the Hercules SQLite database and writes to PostgreSQL. Data source: `docs/features/Hercule_18-01-2026_19h33m23s_v34.db` (SQLite).

##### Business-Rule References and Integration Dependencies (PRD lines 506, 522)

- **PRD-C063 — Story 2.8 detailed business rules:** See `docs/features/progressive-overload.md`.
- **PRD-C064 — Story 2.9 dependencies:** Story 2.8 (reuses stagnation detection), OpenAI API.

##### Technical Risks to Investigate (PRD lines 716–719)

- **PRD-C065 — Investigation requirement:** Timer with audio notification (Web Audio API vs library).
- **PRD-C066 — Investigation requirement:** Screen wake lock during workout session (Wake Lock API).
- **PRD-C067 — Investigation requirement:** PWA service worker setup with Next.js.
- **PRD-C068 — Investigation requirement:** Streak calculation performance on long history.

##### Historical Next-Step Requests (PRD lines 735–753)

These are retained as PRD process obligations, not executed by this step.

- **PRD-C069 — UX Expert request 1:** Review the UI Design Goals and Core Screens.
- **PRD-C070 — UX Expert request 2:** Propose wireframes or mockups for the key screens (Today Dashboard, Workout Session).
- **PRD-C071 — UX Expert request 3:** Validate the interaction paradigms and suggest UX improvements.
- **PRD-C072 — UX Expert request 4:** Ensure the mobile-first experience is optimized for quick logging.
- **PRD-C073 — Architect request 1:** Create the detailed technical architecture based on the PRD.
- **PRD-C074 — Architect request 2:** Validate/refine the conceptual database schema.
- **PRD-C075 — Architect request 3:** Define API design (endpoints, payloads, error handling).
- **PRD-C076 — Architect request 4:** Document code patterns and conventions.
- **PRD-C077 — Architect request 5:** Produce architecture documents by domain in `docs/architecture/`, with `docs/architecture/index.md` as the entry point.

**Total locally identified constraints/additional obligations: 77.** This count
excludes the 187 separately extracted ACs and 27 story blocks; composite source
declarations such as the architecture table and accessibility list count once
under their local ID, with all constituent text retained. Business constraints
inside ACs (uniqueness, deletion restrictions, ownership, goal calculation,
cooldown, conditional coach access, etc.) remain identified by their source ACs.

### PRD Completeness Assessment

#### Historical Baseline

The PRD is a broad historical product baseline with explicit goals, functional
and non-functional requirements, screen priorities, technical assumptions,
four epics, 27 embedded stories, 187 numbered acceptance criteria, and completed
migration records. It specifies concrete API routes, model fields, conditional
business rules, progressive-overload thresholds, and measurable interaction
limits (session response <100 ms, logging ≤3 taps, button ≥60 px). Its original
checklist claims **92% completeness**, **Just Right** MVP scope, and **Ready** for
architecture; those are historical self-assessment statements, not a readiness
result from this analysis.

The historical checklist marks problem/context, MVP scope, FRs, NFRs, epic/story
structure, technical guidance, and clarity as PASS; UX requirements and
cross-functional requirements as PARTIAL. It reports "23 FR" and "26 stories",
which do not match the complete current text (**29 labeled FRs**, **27 embedded
stories**). Its **12 NFRs** and **4 epics** remain consistent with extraction.
The change log records initial drafting on 2026-01-16, story alignment on
2026-01-17, and AI Coach/FR24–28/Story 2.9/progressive-overload changes on
2026-02-02, ending at version 0.3. The mismatch is evidence of stale internal
metadata; it does not establish that any implementation is missing.

#### Completeness for Increment 3.8 — Daily Home Navigation

The PRD describes the baseline intent relevant to daily home navigation:
FR11–FR14, FR15–FR17, FR22–FR23; NFR8–NFR10; Today-centricity, progressive
disclosure, instant feedback, responsive/PWA use, accessibility; and the complete
Story 3.4 acceptance criteria. Story 1.5 / AC 7 also establishes profile access
from bottom navigation, and Story 2.6 / AC 1 establishes a navigation-free active
session. These are extracted source obligations, not a coverage mapping.

The PRD itself contains **no Story 3.8**, no increment-specific change statement,
and no dedicated acceptance criteria for revised daily-home navigation. Epic 3
stops at Story 3.7. Consequently, it is usable as a historical baseline but is
not independently complete as the specification of increment 3.8. It does not
state which existing home/navigation obligations are retained, replaced, or
extended, the intended revised navigation destinations/order, active-route and
back-navigation behavior, or increment-specific acceptance boundaries. The
confirmed Story 3.8 and other corpus documents may supply those details; their
content and consistency have not been assessed in this PRD-only step.

#### Principal Clarity and Completeness Issues

1. **Requirement inventory is stale.** The PRD's own checklist undercounts FRs and
   stories. Preserve FR10bis rather than renumbering source IDs; the requirement
   order is nonsequential because the optional coach block precedes FR11–FR23.
2. **Baseline versus increment authority is unspecified within the PRD.** The
   document does not identify a 3.8 delta or resolve which historical Today and
   navigation statements govern that increment. This prevents a PRD-only
   increment-readiness conclusion.
3. **Daily completion and period semantics lack a complete formula.** FR16 and
   Story 3.4 call for global daily completion, while goals can be daily, weekly,
   or monthly. The denominator, weighting, numeric/duration thresholds, monthly
   decomposition, disabled items, goal changes, missing entries, and handling of
   historical edits are not fully specified. Story 3.4 / AC 9 says "number of
   sessions" but uses `(0/1)`; multiple sessions and which statuses count are not
   explicitly resolved. Story 3.5 supplies period-based streak rules but does
   not specify timezone, week boundaries, or workout-streak goal semantics.
4. **Progression terminology and inputs require clarification.** FR8 requires
   goals achieved at the same level; Story 2.8 / AC 1 emphasizes identical
   reps/weight for three sessions, without explicitly repeating goal achievement.
   "Stagnation", "plateau", and "stabilization" are used without a fully local
   definition distinguishing them. Bodyweight/isolation/compound classification
   is required by suggestion rules but absent from the listed Exercise fields;
   workout scoping and which sessions count toward cooldown are not fully
   specified. Detailed rules are referenced externally in PRD-C063 and were not
   imported into this extraction.
5. **Some top-level requirements exceed the embedded model/UI description.**
   FR1 and Story 2.7 filtering mention workout type, but Story 2.3's model does
   not list it. FR2 mentions equipment and optional seat position, but Story
   2.1's model and Story 2.2's form do not list those fields. Epic 4 refers to
   supersets, WorkoutItems, and WorkoutSets, whereas earlier workout stories use
   WorkoutExercise. These are internal PRD specification gaps, not a code audit.
6. **Performance and usability are only partly operationalized.** The <100 ms
   target lacks measurement boundaries, reference device, network conditions,
   and percentile. "No lag", "without friction", "minimal taps", and "immediate"
   are unquantified outside the session-specific limits. No daily-home-specific
   latency or interaction budget is stated. Long-history streak performance is
   listed as an investigation without workload size or acceptance threshold.
   WCAG AA has no version or explicit evaluation scope; browser/platform support
   and audio/wake-lock fallback behavior are unspecified.
7. **Security, external data flow, and authentication choices are incomplete.**
   NFR6 keeps user data on personal infrastructure, while the optional AI Coach
   analyzes workout history through OpenAI. The intended permitted external data
   subset, retention, and failure handling are not defined. MVP authentication
   allows session-based or JWT in assumptions, while Story 1.4 specifies JWT;
   "secure storage" is not defined, nor are token expiry/logout semantics and
   the exact future Authentik integration boundary. Single-user scope coexists
   with registration, per-user ownership, and shared library data without an
   explicit tenancy policy.
8. **Technical assumptions mix hard mandates, suggestions, and historical
   declarations.** Next.js 14+/React 18+ minimums, Vite development tooling,
   DockerHub, Portainer, React Query invalidation, and the illustrated repository
   paths are stated without a revision/precedence policy. UI exclusivity/no raw
   HTML/no custom CSS constraints are broader than a component-library choice
   and need a clear permitted boundary. Unit/integration testing is required but
   tool choices are suggested, and the pipeline AC does not explicitly include
   a test stage despite the story asking for an automated test pipeline. No
   cross-document or repository comparison was performed here.
9. **Reliability and integration acceptance are sparse.** The PRD does not set
   availability, error-rate, recovery-time, recovery-point, capacity, or data-growth
   targets. Backup is described as manual LXC backup without a restore criterion.
   Samsung Health and Calendar are deferred without contracts; OpenAI is declared
   implemented without quota/timeout/error acceptance. PWA connectivity is assumed
   without a stated disconnected/error-state behavior. Migration completion
   numbers and exceptions are historical records rather than executable
   acceptance criteria for idempotency and reconciliation.
10. **Product goals include incompletely bounded future scope.** Badges,
    nutrition, intellectual/artistic well-being, and personal projects appear in
    goals/context, while meals/projects are deferred through modular architecture;
    badges have no dedicated acceptance definition. The PRD does not fully state
    whether these are current obligations or longer-term intent.

**Step 02 conclusion:** Complete PRD extraction is recorded: **29 FRs**, **12
NFRs**, **187 numbered ACs across 23 stories**, **4 additional migration stories**,
and **77 locally identified constraints/additional obligations**. The PRD provides
a substantial historical baseline but does not independently specify increment
3.8. No epic-coverage validation, UX alignment audit, implementation audit, or
overall readiness decision has been performed. Step 03 was not loaded or started.

## Epic Coverage Validation

### Scope, Sources, and Counting Rules

Only step 03 was executed. Its complete instruction file, `docs/epics.md`, the
canonical Story 3.8, Document Discovery and PRD Analysis above, and the complete
754-line `docs/prd.md` were read. Existing story ACs and relevant compatibility
notes were consulted where needed to qualify documentary mappings. No future
workflow step was loaded. No source code, runtime behavior, build, or acceptance
test was used to establish implementation coverage.

The assessment is **incremental**, as confirmed by the user and by
`docs/epics.md:23,38–43,138–149`. The PRD and existing stories remain the historical
backlog; the epic file adds Story 3.8 rather than reproducing that backlog.
Its `validationStatus: passed` and Story 3.8's approved scope are source
declarations, not evidence that the feature is implemented
(`docs/epics.md:24–28`; `docs/stories/3.8.daily-home-navigation.md:3–5`).

Counting distinguishes:

- **Map coverage:** an explicit historical FR-to-epic assignment in the incremental
  file, even when detailed delivery stays in the existing backlog.
- **Story traceability:** a cited documentary path to specific ACs; partial or
  divergent paths remain identified rather than counted as verified compliance.
- **Increment coverage:** the eight approved new FRs, assigned to Story 3.8.
  Preservation of baseline behavior is not new delivery of all historical FRs.
- `FR-DHN-01`–`FR-DHN-08` below are local aliases for source **FR29–FR36**.
  `NFR-DHN-01`–`NFR-DHN-08` are local traceability labels for existing additional
  increment constraints. Neither set renumbers the PRD or introduces requirements.
  The NFR aliases are cross-references only, not a separate UX or NFR-quality audit.

In the historical matrix, `P` means an embedded story in `docs/prd.md`; `S3.8`
means `docs/stories/3.8.daily-home-navigation.md`. Each requirement retains the
complete English translation extracted in step 02. All historical epic assignments
come from `docs/epics.md:126–134`.

### Epic FR Coverage Extracted

| Source mapping    | Assigned epic               | Historical FR count | Role                                                |
| ----------------- | --------------------------- | ------------------: | --------------------------------------------------- |
| FR1–FR10, FR10bis | Existing Epic 2             |                  11 | Workout tracking and progression context            |
| FR11–FR17         | Existing Epic 3             |                   7 | Daily tracking and gamification baseline            |
| FR18–FR20         | Existing Epic 1             |                   3 | Profile and measurements context                    |
| FR21              | Existing Epic 2             |                   1 | Exercise creation context                           |
| FR22–FR23         | Existing Epic 3             |                   2 | Tracking configuration baseline                     |
| FR24–FR28         | Existing Epic 2             |                   5 | Optional AI coaching context                        |
| FR29–FR36         | Epic 3 addition / Story 3.8 |                   0 | Eight new increment FRs, absent from historical PRD |

**Total identifiers in the epic map: 37 = 29 historical FRs + 8 increment FRs.**
Historical assignment totals: Epic 1 = 3; Epic 2 = 17; Epic 3 = 9.
The increment adds eight further requirements to Epic 3 only.

### Coverage Matrix — All 29 Historical PRD FRs

| FR      | PRD requirement                                                                                                                                                           | Epic / exact documentary story path                                   | Coverage status and increment boundary                                                                                                                                              |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR1     | The system must allow creating and managing training programs (Workouts) with a name and a type (chest/back/shoulders/arms/legs).                                         | Epic 2; P2.3 AC1,3–4; P2.4 AC1–4; P2.7 AC3.                           | Mapped; partial detailed coverage: name/CRUD covered, workout type has a filter reference but no creation/model/form AC. Outside increment.                                         |
| FR2     | The system must provide an exercise library with name, muscle group, equipment, and optional seat position.                                                               | Epic 2; P2.1 AC1–4; P2.2 AC1–4,6.                                     | Mapped; partial detailed coverage: name/muscle groups covered, equipment/optional seat position absent from those ACs. Outside increment.                                           |
| FR3     | The system must allow adding exercises to a program with a defined order, goals (target sets/reps), a rest time between sets, and a rest time before the next exercise.   | Epic 2; P2.3 AC2,4; P2.4 AC5–8.                                       | Covered documentary path; existing standalone 2.3 AC2–6 and 2.4 AC11,16–20,26–29 retain intent with item/superset structures. Outside increment.                                    |
| FR4     | The system must allow starting a training session based on a program.                                                                                                     | Epic 2; P2.5 AC1,3; P2.6 AC2; P3.4 AC10.                              | Covered documentary path; S3.8 AC7 preserves real execution date and planned/ad_hoc support, without new program-session functionality.                                             |
| FR5     | The system must allow logging sets in real time (reps, weight) during a session.                                                                                          | Epic 2; P2.5 AC2,4; P2.6 AC5–6.                                       | Covered documentary path; outside increment.                                                                                                                                        |
| FR6     | The system must provide a rest timer between sets with an audio notification at the end.                                                                                  | Epic 2; P2.6 AC7–10.                                                  | Covered documentary path; outside increment.                                                                                                                                        |
| FR7     | The system must retain the complete history of training sessions.                                                                                                         | Epic 2; P2.5 AC3,6; P2.7 AC1–8.                                       | Covered documentary path; outside increment.                                                                                                                                        |
| FR8     | The system must detect performance stabilization (3 consecutive sessions where goals are achieved at the same level).                                                     | Epic 2; P2.8 AC1; standalone 2.8 AC4–6.                               | Documentary path exists; PRD AC omits explicit goal achievement; standalone ACs introduce tolerance/history and additional triggers. Historical rule divergence, outside increment. |
| FR9     | The system must suggest progression (+2 reps for bodyweight exercises, +2.5 kg for isolation / +5 kg for compound exercises with weights) when stabilization is detected. | Epic 2; P2.8 AC1–2; standalone 2.8 AC6–7.                             | Covered in embedded PRD ACs; standalone specifies +1–2 reps and additional triggers. Historical rule divergence, outside increment.                                                 |
| FR10    | The user must be able to accept or ignore a progression suggestion.                                                                                                       | Epic 2; P2.8 AC5–6; standalone 2.8 AC3,9.                             | Covered documentary path; outside increment.                                                                                                                                        |
| FR10bis | An ignored suggestion triggers a cooldown of 3 sessions before a new suggestion for the same exercise.                                                                    | Epic 2; P2.8 AC7; standalone 2.8 AC11.                                | Covered in embedded PRD AC; standalone says 2–3 sessions and the same progression type. Historical rule divergence, outside increment.                                              |
| FR11    | The system must display a "Today" home page showing the day's tasks/goals.                                                                                                | Epic 3; P3.4 AC1–2,5–6; S3.8 AC1–2,4–5.                               | Covered baseline path; increment initializes today and extends the same home to the selected past day.                                                                              |
| FR12    | The system must allow manually entering daily steps.                                                                                                                      | Epic 3; P3.1 AC3,6; P3.3 AC3,5; P3.4 AC8; S3.8 AC6–7.                 | Covered baseline path; selected-date manual numeric edits extend it, subject to current synchronized-data restrictions. No new right to override synchronized steps is claimed.     |
| FR13    | The system must allow marking yoga as done/not done (checkbox).                                                                                                           | Epic 3; P3.1 AC3,6; P3.3 AC2,5; P3.4 AC7; S3.8 AC5–6.                 | Covered baseline path; increment supports both checking and unchecking on the selected date. Yoga-specific scenario: S3.8 Testing 4.                                                |
| FR14    | The system must display remaining tasks at the top and completed tasks at the bottom.                                                                                     | Epic 3; P3.4 AC5–6; S3.8 AC1,4.                                       | Covered baseline path; ordering is preserved rather than redesigned; completion uses selected-day values.                                                                           |
| FR15    | The system must calculate and display streaks (consecutive days of activity).                                                                                             | Epic 3; P3.5 AC3–9; P3.6 AC1–2; P3.4 AC3.                             | Covered documentary path; standalone 3.5/3.6 are Draft. S3.8 AC1,4 preserves/date-anchors content only if currently present; it does not deliver new streaks.                       |
| FR16    | The system must calculate and display the daily completion percentage.                                                                                                    | Epic 3; P3.4 AC4; P3.3 AC7; S3.8 AC4,6.                               | Covered baseline path; increment explicitly renders selected-day daily progress and updates completion after edits, retaining current calculation rules.                            |
| FR17    | The system must support decomposed monthly goals (X days/month to achieve).                                                                                               | Epic 3; P3.1 AC2,5; P3.2 AC5–6; P3.6 AC3,6; P3.7 AC4–5.               | Covered documentary path; standalone 3.6/3.7 are Draft. S3.8 AC4–5 anchors existing counters only; no new monthly-goal UI or calendar is required.                                  |
| FR18    | The system must allow creating and modifying a user profile (name, age, height, goals).                                                                                   | Epic 1; P1.4 AC6; P1.5 AC1–4.                                         | Covered documentary path; outside increment.                                                                                                                                        |
| FR19    | The system must allow recording dated body measurements (weight, chest circumference, waist, arms, legs).                                                                 | Epic 1; P1.6 AC1–2,4–6.                                               | Covered documentary path; outside increment.                                                                                                                                        |
| FR20    | The system must retain measurement history for visualizing progress.                                                                                                      | Epic 1; P1.6 AC2–3, including progress endpoint.                      | Covered documentary path for history/progress data; no claim that a particular graph is implemented. Outside increment.                                                             |
| FR21    | The system must allow the user to create custom exercises in the library.                                                                                                 | Epic 2; P2.1 AC3,5–6; P2.2 AC5–8; standalone 2.1 AC3,5 and 2.2 AC5–7. | Creation has a documentary path; standalone stories replace custom/user-owned distinction with a shared library. Historical semantic divergence, outside increment.                 |
| FR22    | The system must allow the user to configure the items they wish to track daily (types and goals).                                                                         | Epic 3; P3.1 AC1–5; P3.2 AC1–6; S3.8 AC4–5.                           | Covered baseline path; increment consumes current configuration, not historical activation/goal snapshots or a new settings workflow.                                               |
| FR23    | The system must allow defining goals for each tracked item (e.g., 10,000 steps/day, yoga 5 times/week, sport 4 times/week).                                               | Epic 3; P3.1 AC2,5; P3.2 AC5–6; S3.8 AC4–5.                           | Covered baseline path; current goals are inputs to selected-date rendering; no new goal-definition functionality.                                                                   |
| FR24    | The system must offer access to the AI Coach when at least one exercise is stagnating.                                                                                    | Epic 2; P2.9 AC1–2.                                                   | Covered documentary path; outside increment.                                                                                                                                        |
| FR25    | The AI Coach must analyze the history of the last 10 sessions of the same workout.                                                                                        | Epic 2; P2.9 AC3.                                                     | Covered documentary path; outside increment.                                                                                                                                        |
| FR26    | The AI Coach must propose personalized set-by-set adjustments with analysis and justification.                                                                            | Epic 2; P2.9 AC4.                                                     | Covered documentary path; outside increment.                                                                                                                                        |
| FR27    | The user must be able to adjust the AI Coach's proposals before applying them.                                                                                            | Epic 2; P2.9 AC5–6.                                                   | Covered documentary path; outside increment.                                                                                                                                        |
| FR28    | The AI Coach is available only if the OpenAI API key is configured.                                                                                                       | Epic 2; P2.9 AC1.                                                     | Covered documentary path; outside increment.                                                                                                                                        |

Historical AC source ranges: P1.4–1.6 `docs/prd.md:301–349`; P2.1–2.9
`:374–522`; P3.1–3.7 `:531–646`. Exact standalone exceptions are recorded under
Traceability Risks below. These mappings do not rely on story completion labels.

### Coverage Matrix — New FR-DHN Requirements Against Canonical Story 3.8

Source requirement text: `docs/epics.md:79–87`. All eight requirements are assigned
to Epic 3 / Story 3.8 by `docs/epics.md:134,143,147,204`.

| Local alias / source ID | Complete source requirement                                                                                                                                                               | Exact canonical AC evidence                                                                                                                                                                                                                                                                                 | Status                                                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| FR-DHN-01 / FR29        | Display previous-day and next-day icon buttons at the top of the home dashboard.                                                                                                          | AC1: “only two icon buttons, previous day (`<`) and next day (`>`), are added at the top” (lines 15–20); AC9 supplies labels and input modes (75–80).                                                                                                                                                       | Covered                                                                                                                |
| FR-DHN-02 / FR30        | Initialize the home to today and navigate one calendar day per activation.                                                                                                                | AC2: “a fresh opening of the home initialized to today”; “exactly one calendar day backward or forward”; month/year/leap-day/DST boundaries (22–27).                                                                                                                                                        | Covered                                                                                                                |
| FR-DHN-03 / FR31        | Disable and visibly gray out the next-day button on today; never navigate into the future.                                                                                                | AC3: “visibly grayed out and actually disabled for pointer and keyboard activation”; enabled only until returning to today (29–34); AC2 forward navigation requires an enabled button.                                                                                                                      | Covered                                                                                                                |
| FR-DHN-04 / FR32        | Update the existing displayed date and render the same home layout and components using the selected day's tracking values and completion state.                                          | AC1 preserves layout/components (15–20); AC4 explicitly lists “existing date display, tracking values, completion states and daily progress” for the selected day (36–42).                                                                                                                                  | Covered                                                                                                                |
| FR-DHN-05 / FR33        | Allow adding and correcting manual boolean, numeric and duration entries for the selected past day, including toggling yoga in either direction.                                          | AC6: “checks or unchecks a boolean habit, or saves a numeric or duration value for a past selected day” and selected-date persistence (51–57). New-entry creation is explicit in Dev Notes line 119; yoga check/uncheck is explicit in Testing scenario 4 (136).                                            | Covered by AC6 with documentary detail in notes/scenario; AC6 uses generic editable habits, not a yoga-specific label. |
| FR-DHN-06 / FR34        | Persist edits against the selected date without changing entries on other dates, and retain them when revisiting that day.                                                                | AC6: “selected day only”, “other days' entries are unchanged”, saved edit remains after revisit/reload (51–57); AC8 isolates original-date mutations/responses/rollback (67–73).                                                                                                                            | Covered                                                                                                                |
| FR-DHN-07 / FR35        | Keep the current home unchanged except for the two top navigation buttons and date-dependent content; do not add a return-to-today control, redesign sections or change existing actions. | AC1 permits only two new buttons and preserves layout/components/ordering/actions (15–20); AC7 preserves editing restrictions and real-date workout starts (59–65); AC9 preserves theme/accent (75–80). Dev Notes line 112 explicitly excludes return-to-today, picker, calendar, sections and changed CTA. | Covered                                                                                                                |
| FR-DHN-08 / FR36        | Use current habits and goals with entries for the selected date; an entry checked on a later day must not mark a trackable completed on an earlier day.                                   | AC4: “currently configured habits and goals, not a historical configuration snapshot” (36–42); AC5: later-only completion stays unchecked and in the configured list; counters exclude later accomplishments (44–49).                                                                                       | Covered                                                                                                                |

The epic's embedded story summarizes **eight Given/When blocks**
(`docs/epics.md:161–200`), while its canonical reference explicitly identifies
**nine approved ACs** (`:202–204`). Canonical AC4 and AC5 separately cover rendering
and exclusion of later accomplishments. The difference is summary granularity,
not a missing ninth criterion; the canonical file controls exact AC numbering.

### NFR-DHN Constraint Traceability — Exact AC Boundaries

These eight local rows group only constraints already present in the increment.
They do not replace or inflate the PRD's twelve NFRs. “Partial AC expression”
means the complete documentary path includes notes/tasks/scenarios, not that a
new product requirement or an implementation failure has been found.

| Local ID   | Existing increment constraint and source                                                                                                 | Exact Story 3.8 path                                                                                                                                                                                                                                       | AC traceability result                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| NFR-DHN-01 | Stable calendar date across serialization, month/year boundaries and DST (`epics.md:108`).                                               | AC2 (22–27) explicitly covers calendar boundaries; Dev Notes 115 requires date-only read/write identity without UTC shifts; Testing 3 (135) checks non-UTC serialization.                                                                                  | Partial AC expression: boundaries explicit; serialization identity is specified in notes/scenario.                          |
| NFR-DHN-02 | Asynchronous reads/mutations isolated by date; stale responses must not populate another day (`epics.md:109`).                           | AC8 (67–73): response cannot replace another day's data; mutation stays on original edited date; rollback is original-date scoped.                                                                                                                         | Explicit AC coverage                                                                                                        |
| NFR-DHN-03 | Loading, empty and error states; rollback failed optimistic edits (`epics.md:110`).                                                      | AC8 (69–73) covers loading/errors, failed persistence and rollback; AC1 preserves components; Testing 9 (141) covers absent entries/defaults and empty feedback; Dev Notes 119 forbids browsing writes.                                                    | Partial AC expression: empty/missing-entry cases rely on preservation and scenario/notes.                                   |
| NFR-DHN-04 | Authenticated date-based reads/upserts, one entry per trackable/date, ownership and date/value validation (`epics.md:107,111`).          | AC6 (53–57) gives selected-date isolation; AC7 (61–63) retains editing restrictions; Tasks 84–86,95–98 and Dev Notes 114 require authenticated reuse, uniqueness, ownership and validation. Existing 3.3 AC4–5 and 5.1 AC3 supply documentary foundations. | Partial AC expression: security/uniqueness obligations explicit in notes/foundations, not individually restated in 3.8 ACs. |
| NFR-DHN-05 | Accessible labels, keyboard activation, visible focus and 48 px targets on mobile/desktop (`epics.md:112`).                              | AC9 (75–79) specifies “Jour précédent”, “Jour suivant”, visible focus for enabled buttons, keyboard activation and 48 px; AC3 (29–34) prohibits pointer/keyboard activation when disabled.                                                                 | Explicit AC coverage; no WCAG evaluation performed.                                                                         |
| NFR-DHN-06 | Existing responsive dark styling and dynamic accent; no hardcoded primary brand color (`epics.md:112–113`).                              | AC1 (15–20) preserves layout; AC9 (77–80) covers mobile/desktop, dark theme and user accent variables without hardcoded brand colors. Existing 1.11 AC4–5 (`1.11.user-accent-color-preference.md:16–17`) is compatibility context.                         | Explicit AC coverage; no visual audit performed.                                                                            |
| NFR-DHN-07 | Preserve Health Connect metadata, editability and synchronization behavior; no new read-only/override policy (`epics.md:114,122`).       | AC7 (61–63) preserves synchronized/calculated editing restrictions; Dev Notes 120 explicitly preserves source metadata and overwrite rules; Dependencies 107 cite 5.1–5.3. Existing 5.1 AC3 and 5.2 AC4 define source metadata/upserts.                    | Partial AC expression: restrictions explicit; metadata/overwrite behavior supplied by notes and compatibility references.   |
| NFR-DHN-08 | Preserve computed workout rules, real execution dates and planned/ad_hoc compatibility with nullable relationships (`epics.md:115,122`). | AC7 (59–65) explicitly covers restrictions, actual workout-start date and both session types; Dev Notes 121 retains count eligibility/date-attribution rules and nullable relationships. Existing 2.11 AC7–9 and notes 26–28 are compatibility context.    | Partial AC expression: action/type semantics explicit; nullable rendering and computation details supplied by notes.        |

Additional scope boundaries remain traceable without being counted as new NFRs:
no new draft-streak/calendar prerequisite (`epics.md:118,148`; S3.8 Dependencies
108), current configuration rather than snapshots (AC4), selected-day cutoff for
existing counters (AC5; Dev Notes 116–118), no new navigation limit (Dev Notes
123), and no new scaffolding/infrastructure (Dev Notes 125).

### Missing Requirements — Incremental File Versus Historical Backlog

**No historical PRD FR identifier is missing from the epic coverage map (0/29).**
**No new increment FR lacks a Story 3.8 documentary path (0/8).**

The file does not reproduce detailed delivery stories for historical requirements.
The following FRs are absent from its _new-delivery story scope_, which is expected
and is not a missing increment backlog:

| Historical FRs not newly delivered by the incremental story | Count | Existing owner / path                 | Scope disposition                                                  |
| ----------------------------------------------------------- | ----: | ------------------------------------- | ------------------------------------------------------------------ |
| FR1, FR2, FR3, FR4, FR5, FR6, FR7                           |     7 | Epic 2, P2.1–2.7; exact paths above   | Outside increment; FR4 has action-preservation compatibility only. |
| FR8, FR9, FR10, FR10bis                                     |     4 | Epic 2, P2.8 / standalone 2.8         | Outside increment; historical rule differences recorded below.     |
| FR18, FR19, FR20                                            |     3 | Epic 1, P1.4–1.6                      | Outside increment.                                                 |
| FR21                                                        |     1 | Epic 2, P2.1–2.2 / standalone 2.1–2.2 | Outside increment; library semantics differ between sources.       |
| FR24, FR25, FR26, FR27, FR28                                |     5 | Epic 2, P2.9                          | Outside increment.                                                 |

These **20 FRs** retain the full text in the historical matrix and remain mapped
context. The other **nine**, FR11–FR17 and FR22–FR23, are related baseline
requirements, not nine new deliverables: five are directly preserved/extended
(FR11–FR14, FR16), two are conditional existing-content context (FR15, FR17),
and two supply current configuration inputs (FR22, FR23).

**Partial historical requirement details:** FR1's workout-type creation/model/form
path and FR2's equipment/optional-seat-position path are not found in the cited
embedded or standalone story ACs. Their complete requirements are retained in the
matrix. Impact: a blanket assertion that all historical FR details are covered by
stories would be inaccurate. Disposition: retain these as Epic 2 documentary
traceability gaps outside Story 3.8; reconcile with existing owner artifacts if
that domain is later assessed. **Do not regenerate the backlog, add them to 3.8,
or infer that corresponding runtime features are absent.**

There is no critical missing _increment FR_ identified. The partial NFR-DHN AC
expressions above are documentary granularity risks, with existing notes/scenarios
as paths, rather than uncovered new FRs.

### Authorized Delta From the Historical PRD

FR29–FR36 are **eight epic FRs not present in the historical PRD**; they are an
authorized addition, not unexplained scope drift. Authority is explicit in the
user's current instruction, `docs/epics.md:40–43,79–87,149,204`, and the canonical
story's approval statement (`:3–5,149–151`). The PRD ends Epic 3 at Story 3.7
(`docs/prd.md:632–646`); this report records the delta without changing that file.

- **Today default retained, historical browsing added:** PRD FR11, Today-centric
  principle (`prd.md:57,112`) and Story 3.4 AC1–2 (`:586–587`) are extended by
  S3.8 AC2/4. Today remains the initial view; the header/content can represent a
  selected past day. No route-menu reorder, active-route behavior or new destination
  is required by this date-navigation increment.
- **Manual daily logging extended to retrospective corrections:** FR12/FR13,
  Story 3.3 AC2–5 and Story 3.4 AC7–8 extend through S3.8 AC6/8. Selected activity
  date controls persistence; creation time does not exclude a retroactive correction
  (S3.8 Dev Notes 116). Synchronized-data policies are retained, not replaced.
- **Existing presentation/actions retained:** FR14/FR16 and Story 3.4's current-home
  obligations are carried by AC1/4/7. The explicit limit is two top controls and
  date-dependent content, not reconstruction of historical wireframes or absent
  draft features. Missing baseline components cannot be inferred from documents.
- **Existing period content anchored to the selected date:** FR17/FR23 context is
  constrained by AC4/5 and Dev Notes 118: current goals, relevant selected-day
  period, no later accomplishments. No historical configuration store or new
  completion/streak formula is authorized.
- **Compatibility additions remain contextual:** accent preference and ad_hoc/Health
  Connect references do not become extra increment FRs, and do not pull the
  companion PRD into scope. Story 2.11 AC9's template/coach exclusions remain valid
  for ad_hoc sessions; no new coach/progression behavior is requested by 3.8.

This supplies the cross-document authority that step 02 intentionally did not
assess. It does not retroactively alter step 02's PRD-only findings.

### Traceability Risks and Source Evidence

1. **Historical map is broader than detailed AC coverage.** FR1 includes workout
   type, absent from P2.3 AC1 / P2.4 AC4 (`prd.md:35,414,431`) and standalone
   2.3 AC1 / 2.4 AC5–6 (`2.3.workout-program-backend.md:11`;
   `2.4.workout-builder-ui.md:19–20`). FR2 includes equipment/seat position, absent
   from P2.1 AC1 / P2.2 AC6 (`prd.md:36,381,402`) and standalone 2.1 AC1 / 2.2 AC6
   (`2.1.exercise-library-backend.md:11`; `2.2.exercise-library-ui.md:16`).
   These two FRs are partially mapped at detail level, outside the increment.
2. **Historical business-rule paths diverge.** FR8/FR9/FR10bis specify exact
   conditions/increments/three-session cooldown (`prd.md:44–47,498–504`), while
   standalone 2.8 AC5–7,11 specifies 3–4-session history, ±5% tolerance, alternative
   triggers, +1–2 reps and 2–3-session cooldown
   (`2.8.progressive-overload.md:21–30,38`). FR21 has a creation path but custom
   ownership/distinction in P2.1/P2.2 (`prd.md:385–386,403–404`) differs from shared
   library ACs (`2.1.exercise-library-backend.md:15`;
   `2.2.exercise-library-ui.md:11,17`). No historical change authorization for these
   four FR differences was established here; they are not Story 3.8 blockers.
3. **Foundation status cannot prove delivered coverage.** Standalone 3.3/3.4 say
   Completed but retain unchecked task lists (`3.3.daily-tracking-backend.md:3,20–47`;
   `3.4.today-dashboard-ui.md:3,24–74`). Standalone 3.5–3.7 say Draft (each line 3).
   Their ACs establish documentary paths only. S3.8 Dependencies 105–108 requires
   existing foundations and explicitly avoids new dependency on draft stories.
4. **“Unchanged baseline” must not erase the approved date delta.** The map labels
   FR11–FR17 unchanged (`epics.md:129`), while AC2/4/5/6 explicitly extends Today
   rendering and daily edits. Read “unchanged” as retained baseline intent,
   qualified by the approved selected-day delta, not today-only data access.
5. **Exact AC coverage sometimes depends on supporting text.** FR33 uses generic
   editable habits in AC6; adding missing entries and yoga are explicit in notes
   119 / Testing 4. NFR-DHN-01/03/04/07/08 have the specific notes/scenario paths
   shown above. The epic summary is insufficient alone to cite these finer
   obligations; use the canonical nine ACs plus their supporting text.
6. **Preservation contracts are intentionally not redefined.** S3.8 AC4/5/7 and
   Dev Notes 114–121 bind current goals, entry activity dates, counters, editability,
   metadata and workout rules. The historical PRD does not fully determine the
   current implementation of those contracts. Tasks 84–86 call for inspection
   before implementation; their documentary presence is not verification that
   current reads/upserts/counts satisfy the feature.

### Coverage Statistics

| Population / measure                                                               | Covered or traceable | Total | Percentage / interpretation                                               |
| ---------------------------------------------------------------------------------- | -------------------: | ----: | ------------------------------------------------------------------------- |
| Historical PRD FR identifiers explicitly assigned in epic map, including context   |                   29 |    29 | 100%; zero missing identifiers                                            |
| Historical FRs with a located embedded PRD story/AC path                           |                   29 |    29 | 100% path existence; not full-detail compliance                           |
| Historical FRs without the two identified partial-detail gaps in embedded AC paths |                   27 |    29 | 93.1%; FR1/FR2 partial; standalone divergence separately qualified        |
| Historical FRs related to increment baseline                                       |                    9 |    29 | 31.0%; FR11–FR17, FR22–FR23                                               |
| Historical FRs outside new-delivery scope                                          |                   20 |    29 | 69.0%; detailed stories intentionally not reproduced                      |
| New increment FRs mapped to Epic 3 / canonical Story 3.8                           |                    8 |     8 | 100%; zero missing FR paths                                               |
| Combined historical + increment epic-map identifiers                               |                   37 |    37 | 100%; not a full-backlog delivery metric                                  |
| Local NFR-DHN constraint groups with a documentary path                            |                    8 |     8 | 100%; 3 explicit AC groups, 5 partial AC expressions with supporting text |

Historical standalone semantic/rule differences affect **four FRs**:
FR8, FR9, FR10bis and FR21. They are distinct from the **two partial embedded-AC
detail gaps**, FR1/FR2. The percentages above do not establish current
implementation compliance for either group. The historical twelve NFRs were not
reassessed as a whole in this FR-only step.

**Step 03 conclusion:** All 29 historical FR identifiers are mapped, all eight
approved increment FRs have a canonical Story 3.8 path, and no increment FR is
missing. Historical partial/different paths and supporting-text dependencies are
recorded with source references. The incremental epic file is appropriate as an
addition to the existing backlog; no backlog regeneration is required. This is
an FR coverage result only, not UX alignment, story-quality assessment,
implementation verification or an overall readiness decision. Execution stops
after step 03 at the user's request; report status remains in-progress.

## UX Alignment Assessment

### UX Document Status

**Found — explicit UX documentation, not merely implied UI.** Searches for
`docs/*ux*.md` and `docs/*ux*/index.md` returned no matches, but
`docs/front-end-spec.md:1–3` explicitly identifies itself as the Momentum UI/UX
specification. Its complete contents define goals/personas (7–35), information
architecture (39–143), flows (147–318), wireframes (322–554), components (558–713),
visual design (717–785), accessibility (789–809), responsiveness (813–835),
motion (839–867), and performance (871–897). **No missing-UX warning applies.**
The uncreated external design files mentioned at line 324 do not make this
written specification absent or block a two-button incremental extension.

### Reading Scope and Evidence Method

Only step 04 was executed. Complete assessment-document reads: **25 distinct
Markdown documents, 8,840 source lines**, counted before this append:

| Fully read corpus                                                                                                                                                                         | Documents |     Lines |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------: | --------: |
| `step-04-ux-alignment.md`                                                                                                                                                                 |         1 |       133 |
| `docs/front-end-spec.md`                                                                                                                                                                  |         1 |       970 |
| Canonical Story 3.8                                                                                                                                                                       |         1 |       151 |
| `docs/epics.md`                                                                                                                                                                           |         1 |       204 |
| Existing IR report, including all steps 01–03                                                                                                                                             |         1 |     1,051 |
| Complete `docs/prd.md`                                                                                                                                                                    |         1 |       754 |
| All architecture shards: index, overview, tech-stack, coding-standards, source-tree, deployment, data-models, api-spec, components-workflows, frontend-architecture, backend-architecture |        11 |     3,258 |
| Supplemental `docs/epic-3-implementation-plan.md`                                                                                                                                         |         1 |       581 |
| Compatibility/foundation stories 3.3, 3.4, 5.1, 5.2, 5.3, 1.11, 2.11                                                                                                                      |         7 |     1,738 |
| **Total assessment documentation**                                                                                                                                                        |    **25** | **8,840** |

Targeted source inspection additionally read **13 complete source files / 2,800
lines**: home, TrackableCard, WorkoutSummaryCard, ActivityRings, SleepCard, web
tracking client, auth store, tracking service/schema, trackable service/schema/
routes, and HealthSync routes. Session routes were inspected at lines 300–619
(320 additional lines) and through timestamp searches; that file is **not**
counted as fully read. Mandatory environment memories were read separately:
`homelab.md`, `README.md`, and all 31 `session-*.md` files; these 33 context files
are excluded from assessment-document totals. Source references below refer to
the working tree, not a live deployment or executed acceptance test.

### Authority and UX ↔ PRD ↔ Architecture Alignment

- **Approved delta:** FR29–FR36 are explicitly confirmed in
  `docs/epics.md:79–88,138–149,202–204`; Story 3.8 records approved scope and
  unstarted implementation (`docs/stories/3.8.daily-home-navigation.md:3–5`).
  They extend the historical Today-centric PRD (`docs/prd.md:57–65,111–115`),
  retaining today's initial view and adding retrospective corrections. Their
  absence from the older PRD and UX wireframe is an authorized increment, not
  an uncovered requirement or unauthorized redesign. This confirms, rather
  than overwrites, step 03's delta analysis (report's pre-append lines 953–984).
- **Presentation authority:** Story 3.8 AC1/4/7 and notes 112–124 preserve the
  implemented home. The active architecture inventories rings → sleep → sport
  → custom habits and its completion heading, rather than the historical
  TO DO/COMPLETED/streak/CTA wireframe
  (`docs/architecture/frontend-architecture.md:54–70`). Recreating that old
  wireframe, Progress navigation, a calendar, a today shortcut or absent streaks
  would contradict this approved scope.
- **Interaction/accessibility alignment:** quick logging, dark/mobile-first
  design and WCAG keyboard/label intent are supported by PRD
  `:93–99,130–152`, UX `:28–35,779–809,826–831`, and Story 3.8 AC9 `:75–80`.
  Exact French labels, actual disabled semantics and 48 px targets are specified.
  Dynamic accent overrides the old blue-brand example; metric colors remain
  separate (`docs/stories/1.11.user-accent-color-preference.md:16–24`).
- **Architecture support:** authenticated daily upserts, unique calendar keys,
  current configuration, nullable planned/ad_hoc relationships, existing UI
  primitives and direct-fetch/local-state ownership support the increment.
  The architecture explicitly records the required date-aware aggregate,
  cutoff and concurrency changes as unimplemented target work
  (`docs/architecture/overview.md:131–147`;
  `docs/architecture/components-workflows.md:280–308`;
  `docs/architecture/api-spec.md:558–599`). Their absence today is expected
  implementation scope, **not an architectural feasibility blocker**. No new
  migration, timezone preference, query library or infrastructure is required.

### Alignment Issues — Stable Findings

Severity expresses impact within Story 3.8. **High / clarification blocker**
means competing observable outcomes remain unresolved. **Implementation
obligation** means an approved requirement is already clear but must be delivered;
it does not block planning merely because the draft feature is unimplemented.
Medium/Low warnings below must not be promoted into new product requirements.

#### UX-01 — High — Clarification blocker: authoritative calendar day and lifecycle

**Evidence:** Story 3.8 requires today initialization, DST-safe calendar steps,
future prevention and a stable displayed/read/write day (`:22–34,115,135`).
The architecture distinguishes API-local today and workout instant bounds from
browser-local headings (`docs/architecture/components-workflows.md:187–200`)
and explicitly calls out hydration/midnight (`docs/architecture/overview.md:136–140`).
Code generates API today from server now
(`apps/api/src/services/tracking.service.ts:9–18`), but renders browser now in
all heading branches (`apps/web/src/app/(app)/page.tsx:113–144`) and saves
response `data.date` (`:55–59,98–102`). Auth has different server/browser storage
initialization (`apps/web/src/stores/auth.ts:13–16,49–55,135–143`).

**Gap/impact:** "existing conventions" does not select a single authority when
browser and API disagree around midnight. Which day is initially "today", which
timezone bounds completion timestamps, and when the future cap refreshes on an
open/resumed page are not resolved. DST/no-shift intent is clear; these lifecycle
choices are not. A correct-looking heading could label edits to another day.

**Precise remediation:** before implementation, record the chosen calendar-day
authority and matching workout instant-boundary timezone; define initialization
after client hydration and midnight/resume recomputation without silently changing
an in-flight edit's date. Use one viewed `YYYY-MM-DD` identity for heading, read,
save and cap; step calendar days rather than fixed 24-hour instants. Add expected
outcomes for browser/API disagreement, server-render/client-hydration disagreement,
midnight/resume and both DST transitions to the existing verification scenarios.
Do not add a timezone-preference feature or infer a server-wide future-write ban.

#### UX-02 — High — Clarification blocker: open numeric editor at day navigation

**Evidence:** historical UX uses explicit validation (`docs/front-end-spec.md:230–234`),
whereas the supplemental plan preserves blur/Enter submission
(`docs/epic-3-implementation-plan.md:367–370`). Actual TrackableCard holds local
draft/update state (`apps/web/src/components/tracking/trackable-card.tsx:63–67`),
submits on Enter and blur (`:90–118,212–222`), and lacks an immediate duplicate
submission guard in that submit handler. Home keys it only by trackable ID
(`apps/web/src/app/(app)/page.tsx:168–174`). Story 3.8 snapshots a date when an
action starts (`:122`) and isolates submitted saves (`:67–73`), but never states
the lifetime/date ownership of an editor opened before navigation.

**Gap/impact:** clicking a new day can blur a dirty input; remounting or reusing
the card can respectively lose the draft or carry it into another day. Snapshotting
only at submit may already be too late if the viewed date changed. Pointer blur,
keyboard Enter and disabling the input can produce overlapping submit paths.
Cross-date response isolation alone does not specify the intended UX for that draft.

**Precise remediation:** define the navigation-while-editing outcome explicitly.
The minimal preservation recommendation is to retain existing blur-save semantics,
bind the draft to the day on which editing began, submit at most once to that day,
then navigate with date-isolated pending feedback. Confirm that outcome rather
than silently choosing discard, carry-forward or blocked navigation. Verify
pointer/touch arrows, keyboard navigation, Enter followed by blur, empty/invalid
drafts and a failed pending save. No extra modal or control is implied.

#### UX-03 — Medium — Non-blocking specification warning: URL/history restoration

**Evidence:** a "fresh opening" starts today (Story 3.8 `:24`); persistence means
the saved edit remains after leaving, revisiting, reloading and navigating back
(`:53–57`, scenario `:137`). Home has no current viewed-date/URL state
(`apps/web/src/app/(app)/page.tsx:14–34`), and architecture documents local-state
ownership (`docs/architecture/frontend-architecture.md:132–143`).

**Disposition/remediation:** this is not a requirement for deep links, a date query
parameter or one browser-history entry per day. Saved-entry durability is explicit;
selected-date restoration is not. Document whether refresh, returning from another
route and browser Back/Forward reset to today or restore a viewed day. A local
date state with fresh openings at today can satisfy current text. If URL/history
state is chosen, apply the same calendar validation/future cap and define push vs
replace; do not treat URL persistence as an already approved FR.

#### UX-04 — Medium — Historical UX mismatch, resolved for the approved increment

**Evidence:** UX requires TO DO/COMPLETED grouping, streak/progress bar and a
workout link (`docs/front-end-spec.md:326–365`); PRD repeats these
(`docs/prd.md:585–597`). Actual home mounts rings/sleep/sport and maps configured
custom habits without completion sorting or a new empty prompt
(`apps/web/src/app/(app)/page.tsx:146–178`). WorkoutSummaryCard has no start
button/link (`apps/web/src/components/tracking/workout-summary-card.tsx:23–79`).
Story 3.8 explicitly selects the implemented baseline and forbids new sections/
changed CTA/streak/calendar (`:105–113`); architecture corroborates it
(`docs/architecture/frontend-architecture.md:65–70`).

**Disposition/remediation:** retain this as historical documentation debt, not
missing Story 3.8 delivery. Capture today's actual component/order/action baseline
for regression; add only two top day controls and date-dependent content. Preserve
actual existing workout actions wherever present, without inventing a home CTA.
The supplemental plan's 12-month calendar limit (`:441–445`) is not applicable:
Story 3.8 explicitly rejects arbitrary history limits (`:123`).

#### UX-05 — High — Implementation obligation: coherent date-aware aggregates and cutoff

**Evidence:** Story 3.8 AC4/5 and notes 116–121 define current configuration,
selected-day values, containing periods and exclusion of later accomplishments.
Current custom period queries use full server-current weeks/months
(`apps/api/src/services/tracking.service.ts:56–91`); workout counts also use full
periods (`:164–198`). Current progress counts custom active habits only (`:209–218`),
with daily thresholds/non-daily positive values (`:107–147`). The standalone
summary instead uses entry-row denominator/threshold rules (`:407–470`).

**Disposition/remediation:** implement a selected-day complete aggregate or
deliberate equivalent composition; raw history and summary are not interchangeable
home responses (`docs/architecture/api-spec.md:448–451,563–578`). Preserve daily
completion/denominator and period math: boolean positive-entry-day counts,
numeric/duration positive-value sums; selected day included, later activity dates
excluded, current targets retained. Monday-first weeks and containing months are
already established (`docs/architecture/components-workflows.md:163–196`).
Retroactive corrections count by `DailyEntry.date`, not createdAt/updatedAt.
This is clear target work, not a missing formula requiring a new gamification design.

Workout eligibility/date attribution is **resolved**, not an additional blocker:
count only `status=completed` using `completedAt`, both planned and ad_hoc,
excluding separate HealthActivity rows
(`docs/architecture/components-workflows.md:177–179,300–302`;
`apps/api/src/services/tracking.service.ts:176–198`). Historical 3.3's startedAt
example (`docs/stories/3.3.daily-tracking-backend.md:124–143`) and the session list's
startedAt range (`apps/api/src/routes/session.routes.ts:318–340`) must not replace
that dashboard rule. Verify midnight-spanning sessions, a start before cutoff
completed after cutoff, abandoned/in-progress exclusion and multiple same-day
sessions. Starts remain real execution time (Story 3.8 `:63–65`;
`docs/architecture/data-models.md:152–165`); no start/creation/sync receipt timestamp
is an alternate accomplishment source.

#### UX-06 — High — Implementation obligation: stale reads, optimistic races and failure

**Evidence:** AC8 explicitly requires original-date mutation/rollback and no
wrong-day values during loading (`Story 3.8:67–73`). Home unconditionally accepts
reads (`apps/web/src/app/(app)/page.tsx:19–30`); optimistic handlers spread captured
data, refetch on both success/failure and consume errors (`:36–110`). A failed
reload also consumes its error, so the optimistic value can remain visible. Card
callbacks consequently resolve even when persistence failed
(`apps/web/src/components/tracking/trackable-card.tsx:102–108`).

**Disposition/remediation:** implement date/request identities, explicit loading
ownership, original-date mutation context and reliable rollback independent of
successful refetch. Protect same-day concurrent edits/refetches as well as A→B→A
navigation: an older snapshot/rollback must not erase a newer successful edit.
Preserve authoritative entry IDs/source metadata and update completion/period
feedback coherently. Verify overlapping edits to two habits, delayed reads,
save-plus-navigation, save failure plus recovery-read failure and repeated visits.
No React Query adoption or offline queue is required; outcome is specified even
though the existing mechanism is insufficient.

#### UX-07 — Medium — Resolved preservation boundary: HealthSync is provenance, not icon policy

**Evidence:** Story 3.8 `:63,120` retains synchronization/editability, not a new
manual-over-sync priority. Home's rings/sleep/sport have no manual callbacks;
custom cards receive callbacks (`apps/web/src/app/(app)/page.tsx:146–174`).
Icons are display/configuration fields
(`apps/web/src/components/tracking/trackable-card.tsx:37–39,69,149`), and any
nonempty icon is accepted by CRUD (`apps/api/src/schemas/trackable.schema.ts:5–10`).
Manual upsert rejects an existing `health_connect` row by source
(`apps/api/src/services/tracking.service.ts:347–374`); sync overwrites metric/sleep
rows and their source, while null metrics skip writes
(`apps/api/src/routes/health-sync.routes.ts:153–185`).

**Disposition/remediation:** preserve selected-date provenance and backend 403
behavior; never infer calculated/synchronized status from footprints/dumbbell/
moon icons, names of custom habits or absent data. A custom numeric habit with
a health-looking icon remains manual under current home rules. Do not enable
ring edits because the selected past date has no synchronized row, or disable
all past-day habits. Sync activity date comes from payload `date`; device
`syncedAt` is latest-device metadata, not a historical-value cutoff
(`:130–156,301–304`). No new sync-status widget or sleep-score reconstruction is
required; sleep-duration replacement is recorded in story 5.3 `:395–415`.
The manual/source precheck is non-atomic (architecture backend `:125–143`):
record that existing concurrent-sync debt, without inventing a priority policy
or making its separate repair a Story 3.8 prerequisite.

#### UX-08 — Medium — Current configuration boundary and reference-period wording

**Evidence:** Story 3.8 `:40–42,117–118` explicitly rules out historical habit/goal
snapshots. Current custom list filters `!isSystem && isActive`, goals use
`endDate=null`, but system lookup uses current names without an isActive filter
(`apps/api/src/services/tracking.service.ts:20–44,173–174`). System names,
icons, activation and daily/weekly/monthly goals can be edited
(`apps/api/src/schemas/trackable.schema.ts:15–36`). Sport currently projects only
weekly/monthly goal semantics (`tracking.service.ts:200–206`) and displays
"ce mois"/"cette sem." (`apps/web/src/components/tracking/workout-summary-card.tsx:19–27,59–64`).

**Disposition/remediation:** use current names/icons/order/goals and existing
custom/system visibility rules, including habits created after the viewed date;
do not filter using goal startDate or resurrect deleted/inactive custom habits.
System activation/name lookup and a configured daily sport goal expose existing
inconsistencies, not authorization to redesign the card or expand frequencies.
For past views, make existing date-dependent period wording refer to the selected
period as required by AC4; preserve component/order/actions. Record baseline
exceptions and clarify any intended change to system filtering or daily sport
presentation separately rather than silently broadening 3.8.

#### UX-09 — Low — Resolved numeric zero/empty semantics; preserve validation boundary

**Evidence:** actual input accepts nonnegative parseInt values; blank or invalid
input closes editing without a write, Escape cancels, explicit zero is submitted
(`apps/web/src/components/tracking/trackable-card.tsx:90–118`). Missing entry is
displayed as "—", a saved zero displays zero (`:232–245`); missing system data
defaults to zero (`apps/api/src/services/tracking.service.ts:475–513`). The API
validates any numeric value, not identical frontend bounds
(`apps/api/src/schemas/tracking.schema.ts:20–25`).

**Disposition/remediation:** include 0 vs blank vs absent vs Escape in original-
date editor verification. Saving zero changes only that day's row and makes an
ordinary positive-goal habit incomplete; clearing input does not delete it or
implicitly save zero. Preserve current integer/nonnegative frontend behavior;
do not invent decimal support, a delete-entry affordance, new limits or blanket
API-validation changes. These outcomes are inspectable existing rules, not a
new unresolved numeric-domain requirement. Draft ownership remains UX-02.

#### UX-10 — Low — Historical performance/cache assumptions require qualification

**Evidence:** UX defines <100 ms interactions, dashboard interactive <1.5 s on
4G, <200 KB gzipped JS and React Query five-minute caching
(`docs/front-end-spec.md:873–897`). PRD's numeric <100 ms requirement is session-
specific (`docs/prd.md:79–81`); Story 3.8 has no new latency budget. Active
architecture explicitly uses direct fetch/local state without that cache
(`docs/architecture/overview.md:85,94–97`;
`docs/architecture/frontend-architecture.md:132–151`).

**Disposition/remediation:** retain quick feedback/mobile usability as regression
goals and verify rapid navigation/loading with existing components. Qualify the
historical performance targets' measurement context before asserting compliance;
neither documentation nor static inspection proves latency/bundle performance.
Do not require React Query, a new cache, benchmark infrastructure or a new SLA
as a prerequisite for this increment.

### Warnings and Step 04 Conclusion

**10 stable findings:** **2 High clarification blockers** (UX-01, UX-02),
**2 High implementation obligations** (UX-05, UX-06), **4 Medium warnings/
preservation qualifications** (UX-03, UX-04, UX-07, UX-08), and **2 Low
verification/documentation qualifications** (UX-09, UX-10). No Critical-severity
issue, missing UX document or architectural feasibility blocker was established.
The two clarification blockers require explicit expected outcomes before the
affected implementation can be considered unambiguous; they do not negate the
product owner's approval of FR29–FR36.

UX/PRD intent and active architecture are aligned for the approved incremental
scope. Historical Today-only wireframes, fixed brand color, React Query,
startedAt examples, missing draft streak/calendar features and old initialization
plans are not new delivery requirements. Stale statements that IR is awaiting
corpus selection (`docs/architecture/components-workflows.md:285–286`;
`docs/architecture/deployment.md:433–435`) are documentation metadata debt, not
an assessment dependency. Eager optional-SDK startup, broader auth hardening,
import recovery and other architecture risks have not been elevated into 3.8
UX blockers without an increment-specific causal link.

Assessment complete for **step-04-ux-alignment only**. No later step was loaded,
no code or other document was changed, and no build, runtime mutation, staging,
commit or overall implementation-readiness verdict was performed. Report status
remains **in-progress**; `stepsCompleted` now includes step 04.

## Epic Quality Review

### Step 05 Scope, Authority, and Evidence

Only `step-05-epic-quality-review` was executed. Its complete 245-line instruction
file, the complete existing 1,386-line IR report (including the continuation after
both large-read output caps), canonical Story 3.8 (151 lines), epics (204 lines),
historical PRD (754 lines), UX specification (970 lines), supplemental Epic 3 plan
(581 lines), and all eleven active architecture shards (3,258 lines) were read.
Foundation/compatibility stories 3.1–3.7, 5.1–5.3, 1.11 and 2.11 were also read in
full. Source inspection covered the complete home, tracking card/client/service/
routes/schema, auth store/middleware, HealthSync routes, configuration service/page,
Prisma schema, relevant SQL migrations, accent provider and workout summary.
Session routes were read at lines 1–719; no claim of a full session-route audit is
made. All mandatory environment memories were read separately.

Evidence refers to the current working tree. Completed/Ready for Review labels
are compared with actual code; they are not acceptance-test results. No library
API investigation, runtime test, live deployment inspection or implementation was
performed. Source paths and line ranges below refer to files as read; earlier IR
line references use the **pre-step-05 report** to remain unambiguous after adding
the frontmatter entry.

Source shorthand in this section: “story” / “Story 3.8” means
`docs/stories/3.8.daily-home-navigation.md`; “home” / “home page” means
`apps/web/src/app/(app)/page.tsx`; “TrackableCard” / “trackable-card.tsx” means
`apps/web/src/components/tracking/trackable-card.tsx`; “tracking routes/service/
schema” means `apps/api/src/routes/tracking.routes.ts`,
`apps/api/src/services/tracking.service.ts`, and
`apps/api/src/schemas/tracking.schema.ts`; “client” means
`apps/web/src/lib/api/tracking.ts`; “Prisma schema” means
`apps/api/prisma/schema.prisma`; “configuration page” means
`apps/web/src/app/(app)/profile/trackables/page.tsx`; “auth store/middleware” means
`apps/web/src/stores/auth.ts` / `apps/api/src/middleware/auth.middleware.ts`;
“accent provider” means `apps/web/src/components/theme/accent-color-provider.tsx`.
In the 1.11/2.11 rows, “SQL migration” means
`apps/api/prisma/migrations/20260731120000_add_preferences_and_ad_hoc_sessions/migration.sql`;
“HealthSync SQL migration” means
`apps/api/prisma/migrations/20260205220218_health_sync_schema/migration.sql`.
Historical story-number shorthand resolves to the full paths in the dependency
map; architecture API/workflows/deployment resolve to their named files under
`docs/architecture/`.

The reviewed delivery unit is the approved **Epic 3 addition / Story 3.8**, not
the complete historical product backlog (`docs/epics.md:23–28,38–43,138–149`).
Story 3.8 is explicitly Draft with approved scope and implementation not started
(`docs/stories/3.8.daily-home-navigation.md:3–5`). Its nine canonical ACs, rather
than the epic's eight summarized BDD blocks, govern acceptance
(`docs/epics.md:161–204`). Approval is not a claim of implemented quality.

### Epic Structure, Value, Independence, and Sizing

**Epic 3 addition: PASS for user value.** The retained title “Daily Tracking &
Gamification” is broad, but the incremental goal is concrete: revisit and correct
past tracking from the existing home (`docs/epics.md:138–159`). Users benefit from
accurate retrospective daily records without a redesign or a separate calendar.
This is a user outcome, not an API/database milestone.

**Story 3.8: appropriately bounded vertical slice.** Navigation, selected-day
reads, period cutoff, dated edits and race protection jointly deliver that outcome
(`docs/stories/3.8.daily-home-navigation.md:15–80,84–101`). Nine ACs and work across
web/API do not by themselves make an epic-sized story. Existing persistence,
configuration and components substantially bound the work. A read-only slice
alone would omit the approved correction value; splitting into separate technical
API/UI milestones is unnecessary. No evidence establishes an unfinishable story,
although no effort estimate or delivery-duration guarantee is asserted.

**Independence: PASS against the implemented brownfield baseline.** The increment
can be completed using existing Epic 1/2 capabilities and Epic 3/5 foundations;
it does not need future streaks, gamification or a habit calendar. Cross-epic
reuse is valid here because availability precedes this increment, regardless of
numeric epic order. No circular or unavailable prerequisite was found.

**Brownfield integration: PASS with implementation obligations.** Current home
composition, authenticated upserts, SQL DATE uniqueness, synchronization provenance,
accent variables, real-time session starts and nullable ad_hoc relations are
explicitly preserved. Today/rings currently lack a selected-date contract; a
complete date-aware aggregate or equivalent composition is required feature work,
not proof that the story lacks an implementable foundation
(`docs/architecture/api-spec.md:558–581`). Existing no-date consumers must retain
today behavior and response compatibility if that contract is extended; this
follows from preservation, not a requirement for a particular new endpoint.

**Database/starter checks:** no new table, migration, historical goal store,
scaffolding, starter-template setup or CI/CD story is needed
(`docs/stories/3.8.daily-home-navigation.md:124–125`). Tracking tables were created
for actual HealthSync use in 5.1/5.2, then reused by Epic 3; this is not “create
all future tables in Epic 1 Story 1.” Existing SQL DATE and unique entries suffice
(`apps/api/prisma/migrations/20260205220218_health_sync_schema/migration.sql:7–97`).

### Verified Dependency Map

Arrows mean **consumer → already available prerequisite**, unless marked excluded.

| Relationship                                                    | Documentary state                                                                                                                    | Source verification / role                                                                                                                                                         | Disposition                                                                                                                                                   |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.8 → 3.3                                                       | Completed, with stale unchecked tasks (`docs/stories/3.3.daily-tracking-backend.md:3,20–47`)                                         | Tracking routes `:35–43,72–146`; service `:268–374`; schema `:20–25`; Prisma schema `:291–303`. Owned date-range history and explicit-date unique-key upserts exist.               | Available foundation; the documented GET `/entries/:date` is absent, so do not call it. Selected-day home aggregation is 3.8 work.                            |
| 3.8 → 3.4                                                       | Completed, with stale unchecked tasks (`docs/stories/3.4.today-dashboard-ui.md:3,24–74`)                                             | `apps/web/src/app/(app)/page.tsx:14–34,139–178`; TrackableCard `:72–118,203–245`. Implemented home and manual controls exist.                                                      | Available foundation; old streak/grouping/CTA/React Query ACs do not define the regression baseline.                                                          |
| 3.3 / 3.4 → 3.1; configuration compatibility → 3.2              | Both Done (`docs/stories/3.1.trackable-items-backend.md:3,192–204`; `3.2.tracking-configuration-ui.md:3,186–201`)                    | `apps/api/src/services/trackable.service.ts:11–35,40–71,130–163`; configuration page `:63–98,155–246`. Current goals/order/activation and existing configuration UI are available. | Reuse current configuration, not a new configuration story or snapshots.                                                                                      |
| 3.8 compatibility → 5.1 → 1.2                                   | 5.1 Ready for Review, implemented task/record evidence (`docs/stories/5.1.health-sync-data-schema.md:3,20–58,257–266`)               | HealthSync SQL migration `:7–112`; current Prisma schema `:239–339`.                                                                                                               | Existing persistence, not future Epic 5 work.                                                                                                                 |
| 3.8 compatibility → 5.2 → 5.1                                   | 5.2 Ready for Review; dependency marked completed (`docs/stories/5.2.health-sync-endpoint.md:3,63–64,529–540`)                       | `apps/api/src/routes/health-sync.routes.ts:121–239`: authenticated transactional sync, payload activity dates, source writes and duration-based sleep.                             | Existing sync behavior; old score-sleep examples superseded.                                                                                                  |
| 3.8 compatibility → 5.3 → 5.1 / 5.2                             | 5.3 Ready for Review; completed tasks and implementation log (`docs/stories/5.3.health-sync-status-and-activities.md:17–43,395–419`) | `apps/api/src/routes/health-sync.routes.ts:260–388`: both authenticated, user-scoped status/activity handlers exist.                                                               | **Implemented**, not a forward dependency; no new status/activity widget is requested. QA Pending is distinct from absent implementation.                     |
| 3.8 compatibility → 1.11                                        | Completed (`docs/stories/1.11.user-accent-color-preference.md:3,20–34`)                                                              | Prisma schema `:22`; preference route matches `apps/api/src/routes/profile.routes.ts:118–162`; accent provider `:27–41`; SQL migration `:1–2`.                                     | **Implemented** accent contract; use existing semantic CSS variables.                                                                                         |
| 3.8 compatibility → 2.11 → existing exercise/session foundation | Completed (`docs/stories/2.11.ad-hoc-workout-sessions.md:3,13–28`)                                                                   | Session routes `:67–97,253–289,393–423`; Prisma schema `:175–193`; SQL migration `:4–38`; tracking service `:176–198` has no planned-only filter.                                  | **Implemented** ad_hoc support; preserve nullable relations and real start/completion timestamps.                                                             |
| 3.8 → 3.5 / 3.6 / 3.7                                           | Explicitly excluded (`docs/stories/3.8.daily-home-navigation.md:108,112`)                                                            | Each historical story is Draft at line 3; no Streak model in complete schema; actual home `:139–178` mounts neither streak nor habit calendar.                                     | No dependency. Their legacy sequence 3.5 → 3.3, 3.6 → 3.4/3.5, 3.7 → 3.3/3.5 is future historical backlog only (`docs/epic-3-implementation-plan.md:84–115`). |

Within the historical Epic 3, 3.4's streak AC and 3.3's streak-update example
reference later 3.5 functionality (`docs/stories/3.4.today-dashboard-ui.md:13,33–36`;
`docs/stories/3.3.daily-tracking-backend.md:40–43,169–170`). This is a real historical
sequencing/documentation defect, not a prerequisite introduced by 3.8. The approved
increment explicitly overrides that inference. No waiting for 3.5–3.7 is warranted.

### Acceptance Criteria Quality and Concrete Verification Oracles

All **9/9 ACs use Given/When/Then** and trace to FR29–FR36. Supporting notes make
preservation criteria inspectable rather than reopening existing business rules.
The following cases operationalize approved behavior; they are not executed tests
or additional product policies. Calendar-authority-dependent expected keys remain
conditional on EQ-01.

Use a controlled clock at or after the latest date in each navigation fixture;
in particular, October 25/26 DST fixtures do not authorize navigating beyond real
today on October 11. Timestamp examples are isolated acceptance fixtures, not
instructions to change production records or clocks.

| AC / source                      | Testability and concrete oracle                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC1 — story `:15–20`             | Compare actual today's baseline rings → sleep → sport → custom cards (`home page:139–178`), same order/actions, with only two top controls added. “Ordering unchanged” preserves the existing ordering rule, not an immutable completion list or a restoration of old wireframes. No new CTA, stats section or empty-state redesign.                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| AC2 — `:22–27`                   | Explicit transitions: 2026-10-01 → 2026-09-30; 2026-01-01 → 2025-12-31; 2024-03-01 → 2024-02-29 → 2024-02-28. In Europe/Paris, navigate 2026-03-28/29/30 and 2026-10-24/25/26 in both directions. Heading, selected key, read key and edit key must be identical calendar dates; fixed 24-hour subtraction or local-date `toISOString()` slicing is not an oracle.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| AC3 — `:29–34`                   | Freeze authoritative today at 2026-10-11: next on 11 disabled for click/touch/Enter/Space; next on 10 reaches 11, repeated activation never reaches 12. The API currently has no global future-write ban; this AC constrains navigation, not unrelated clients. Midnight/resume authority is EQ-01, not permission to add a historical limit.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| AC4 — `:36–42`                   | Select 2026-10-08 while actual today is 2026-10-11. Rings, sleep, custom entries, completion count and existing sport/goal counters reference 08. An active custom habit created on 10 remains present and incomplete on 08; a current changed goal applies on 08 even if its startDate is later. Current inactive/deleted custom habits are not resurrected. Existing custom-only progress denominator is preserved (`tracking.service.ts:107–162,209–218`); no new formula.                                                                                                                                                                                                                                                                                                                                      |
| AC5 — `:44–49`; notes `:116–118` | Week of 2026-10-08 starts Monday 05: boolean positives on 05,08,09 yield **2**, not 3; monthly positives on 01,05,08,09 yield **3**, not 4. Numeric values 10,20,99 on 05,08,09 yield **30** through 08; duration uses the same positive-value sum. On 2026-10-01, weekly entries on Sep 28 and Oct 01 count, Oct 02 does not; monthly Sep 30 does not count. A row entered/corrected on Oct 11 with activity date Oct 08 belongs to Oct 08. Cutoff is the whole selected day, not noon or entry creation/correction time.                                                                                                                                                                                                                                                                                         |
| AC6 — `:51–57`                   | On selected 2026-10-08, yoga check/uncheck persists 1/0 for `(habit,08)`; Oct 11 unchanged. Save number 42 or duration 30; revisit, reload (fresh today), then navigate back to 08 and obtain saved values. Explicit 0 is a saved row and ordinarily incomplete; blank/invalid/Escape is no write, not deletion or implicit zero (`trackable-card.tsx:90–118,232–245`). Keep nonnegative parseInt frontend semantics and existing API schema; do not infer decimal support/new bounds.                                                                                                                                                                                                                                                                                                                             |
| AC7 — `:59–65`; notes `:120–121` | Rings/sleep/sport remain display-only even without a synchronized row; custom manual cards keep existing actions. A selected-date `health_connect` entry retains source and backend overwrite 403; a custom habit with footprints/moon/dumbbell icon remains manual. Planned and ad_hoc counts use completed status and completedAt, not startedAt, set timestamps or HealthActivity rows. A session started Oct 07 23:50 and completed Oct 08 00:10 counts on 08; one started Oct 08 and completed Oct 09 does not. Abandoned with completedAt, in_progress, completed with null completedAt, and separate synced activities contribute zero; multiple eligible same-day sessions each count. Starting via existing workout actions while viewing 08 uses actual execution time on 11; no date field is injected. |
| AC8 — `:67–73`; notes `:114,122` | Delay Oct 08 read, navigate to 09, finish 08 last: no 08 values under 09 heading. Include 08→09→08 with two different read generations, overlapping saves, and failed save plus failed recovery fetch: rollback original entry/date without erasing a newer successful edit. Retain request auth context on logout/token change: a late old-user read/save/refetch must not populate the new user's view. Missing/expired token → existing 401; foreign trackable →404; synchronized overwrite →403; malformed date shape/non-number →400; transport/500 failures show existing error feedback, never success. These are ownership/error preservation checks, not new JWT revocation, retry, offline or sync-priority policies.                                                                                    |
| AC9 — `:75–80`                   | Inspect French labels exactly, enabled keyboard focus/activation, disabled semantics, 48 px targets and mobile/desktop layout. Compare two existing user accents; use `--primary`, `--primary-foreground`, `--ring`, preserving metric colors. No claim that all legacy inputs already meet the new-control target or that static inspection proves WCAG compliance.                                                                                                                                                                                                                                                                                                                                                                                                                                               |

For AC5/7, selected **2026-10-08 at noon** still means the entire calendar day:
completedAt at 00:00, 12:00 and 23:59:59.999 qualify when completed; the next day's
00:00 does not. A UTC-midnight DATE encoding must not become noon/end-of-day
timestamp logic. Once authority is resolved, verify its instant bounds: if the
existing API-local Europe/Paris convention is retained, Oct 08 is
`[2026-10-07T22:00Z,2026-10-08T22:00Z)`; Mar 29 DST day is
`[2026-03-28T23:00Z,2026-03-29T22:00Z)` (23 hours), and Oct 25 is
`[2026-10-24T22:00Z,2026-10-25T23:00Z)` (25 hours). Both occurrences of local 02:30
on Oct 25 qualify. Half-open bounds here describe the observable full-day oracle;
existing inclusive end-of-day logic can be equivalent at stored millisecond precision.
No new session timestamp fallback or eligibility policy is approved.

### Findings by Severity, Source, and Minimal Action

#### EQ-01 — Major / High — Confirmed narrow clarification blocker: calendar authority

**Sources:** Story 3.8 `:24–34,115,135`; active architecture
`docs/architecture/components-workflows.md:187–200`; tracking service `:9–18,164–198`;
home `:113–144`; previous **UX-01** at pre-step-05 IR `:1138–1164`.

The story already fixes date-only identity, DST-safe navigation, selected-day
attribution and no timezone-preference scope. Those points are **not missing**.
However, “existing calendar-date conventions” describes two different authorities:
server-local aggregate today and browser-local displayed today. At instant
2026-10-10T22:30Z, an API in Europe/Paris considers it Oct 11 while a browser in
America/Los_Angeles considers it Oct 10. The existing code does not select one
shared today/cap/instant-boundary contract. Two coherent implementations could
choose different initial days and session buckets; no text resolves that choice.

**Minimal action:** record which existing convention is authoritative for today,
future cap and workout completion-day bounds; give the expected displayed/read/
write key for that disagreement example. Using the API-local convention would
minimize changes to established computed-session attribution, but is a recommendation,
not an approval assumed by this review. Specify cap refresh at midnight/resume
without retargeting a draft or submitted mutation. Exact effect/hydration mechanisms
are engineering choices: do not require a new hydration framework, auto-follow-today
policy, timezone preference or API-wide future-write restriction.

**UX-01 disposition:** confirmed only for this observable authority ambiguity.
Its broader SSR/midnight verification requests are implementation checks; their
mere absence from AC prose does not independently establish more blockers.

#### EQ-02 — High implementation obligation / not a blocker — UX-02 preservation rebuttal

**Sources:** Story 3.8 AC1 `:19–20`, AC6 `:53–57`, AC7 `:61–65`, AC8 `:69–73`, notes
`:112–113,122`; TrackableCard `:63–118,212–222`; home key `:168–174`;
`docs/front-end-spec.md:230–234`; supplemental plan `:367–370`; previous **UX-02**
at pre-step-05 IR `:1166–1190`.

UX-02 correctly identifies a technical draft/date race, but overstates the missing
product decision when read against the whole story. Actual valid numeric/duration
input submits on blur/Enter; AC1 and notes 112–113 preserve existing actions and
select implemented home over old explicit-Validate wireframes. Therefore arrow-
induced blur must preserve a valid draft save to its original editing day; silently
discarding a valid dirty draft, carrying it to the next day or blocking otherwise
enabled navigation changes existing action semantics. “Snapshot at submit” alone
can be too late; binding the editor to its originating day is the implementation
needed to satisfy the combined preservation/isolation contract.

**Minimal action:** implement original-day editor ownership and at-most-once
submission for Enter/blur/disable overlap; verify mouse/touch arrow, Tab/keyboard
activation, blank/invalid/0/Escape and failed pending save. Blank/invalid/Escape
already close/cancel without writing; “discard” is appropriate only for those
existing cases. No new modal, save control or PO decision between arbitrary draft
policies is necessary. If deliberately changing blur-save, obtain separate scope
approval rather than calling the current approved story unspecified.

**UX-02 disposition:** rebutted as a clarification blocker by canonical preservation
text plus actual code; retained as a high implementation/regression obligation.
Earlier step-04 content is preserved for audit history, not silently rewritten.

#### EQ-03 — High implementation obligation / not a blocker — aggregate and compatibility work

**Sources:** Story 3.8 `:36–73,91–98,114–125`; tracking routes `:38–59`; service
`:56–91,107–218,329–374,407–470`; client `:131–165`; home `:19–110`;
architecture API `:397–451,558–599`; previous UX-05/06/07/08/09.

Today-only reads, full-period totals, unguarded responses and refetch-only rollback
currently do not meet approved 3.8 behavior. The story explicitly assigns these
changes, so they are neither missing future dependencies nor architectural blockers.
Raw paginated entries omit habits with no rows; summary has a different formula;
merely adding an ignored `?date` or consuming summary does not deliver a home.
Date isolation must include request generation and existing auth ownership, not
only an equality check on selected date.

**Minimal action:** implement complete selected-day data with containing-period
cutoff, original-date edits/rollback, current configuration/provenance and no-date
backward compatibility; verify the AC table. Keep actual/selected dates separate.
Do not require repairs to unrelated sync/source-check atomicity, mutable system
names, daily sport-goal presentation, broad API validation, SDK startup, auth
hardening or session-history calendar filters as new 3.8 prerequisites. Those are
existing debt unless the implementation changes their behavior.

#### EQ-04 — Minor — Concrete acceptance fixtures need strengthening

**Sources:** Story 3.8 Testing `:131–145`; AC8 `:67–73`; notes `:114–122`;
TrackableCard `:90–118`; auth store `:13–16,95–125`; auth middleware `:14–38`.

Manual scenarios cover the main boundaries but lack concrete keys, numeric totals,
noon/full-day completedAt variants, auth-context races, 0/blank/Escape and editor
blur overlap. Existing rules resolve these except EQ-01; no additional scope
policy is required. This is verification-detail debt, not an untestable entire story.

**Minimal action:** use the concrete oracles above in the existing manual verification
record during implementation. Keep auth/schema behavior as implemented; no new
test framework or generic security program is prerequisite. Results remain pending.

#### EQ-05 — Minor / historical documentary debt — Status and legacy contract discrepancies

**Sources:** `docs/epics.md:24–28,129,202–204`; Story 3.8 `:3–5,149–151`;
3.1 `:14–16,43,192–198`; 3.2 `:11,21–55,186–195`; 3.3 `:3,15–16,20–47,124–143`;
3.4 `:3,13–22,24–74`; 5.3 `:3,395–423`; architecture workflows `:282–286`;
deployment `:433–435`; PRD `:693–709`; previous coverage/UX sections.

“Approved” in epics and “Draft, scope/AC approved, not started” in the canonical
story describe different lifecycle dimensions, not contradictory approval. Eight
summary blocks versus nine canonical ACs is intentional condensation. Completed
3.3/3.4 with unchecked tasks do not prove all old ACs exist: `/entries/:date`,
startedAt dashboard counting, mounted streaks/grouped sections/home CTA and React
Query claims are contradicted by code. 5.3's Ready for Review/QA Pending does not
mean its handlers are future work. The supplemental plan's placeholder home,
missing CRUD, 12-month calendar cap and React Query guidance are historical.
Architecture “awaiting corpus selection” and PRD 23-FR/26-story checklist counts
are stale metadata already qualified in this report.

**Minimal action:** use canonical 3.8 plus source-backed architecture/current code
for this increment and preserve approval-versus-delivery distinctions. Retain the
discrepancies in this report; do not regenerate, “complete” legacy checklists or
edit historical artifacts as part of step 05. A later authorized documentation
reconciliation can update their owners.

#### EQ-06 — Critical under greenfield standards / historical out of scope — technical decomposition

**Sources:** `docs/prd.md:237–254,256–284,351–365,531–577,599–614`;
`docs/stories/3.3.daily-tracking-backend.md:169–170`;
`docs/stories/3.4.today-dashboard-ui.md:13,33–36`;
`docs/epics.md:38–43`; Story 3.8 `:103–125`.

Historical Epic 1 “Foundation & Infrastructure” is a technical-milestone title
with developer scaffolding/database/CI stories, although its expanded goal also
contains authentic user profile/measurement value. It is not a clean user-outcome
epic under step-05 standards. Historical Epic 3 backend-first developer stories
and later-streak references are also technical-layer/sequencing defects. These
are identified, **not accepted as a model for new epic design**. They do not turn
the approved user-facing brownfield 3.8 slice into a technical epic or demand a
rebuild/restructure of implemented foundations. Historical Epic 2 has workout
user value and Epic 4 preserves users' imported history, though both contain
technical delivery detail; neither is a new epic in this increment.

**Minimal action:** no increment prerequisite or backlog regeneration. Preserve
the historical record and assess/restructure those artifacts only in a separately
authorized full-backlog review. No Critical violation applies to the new Epic 3
addition itself.

### Best-Practices Compliance Checklist — Epic 3 Increment

| Step-05 check                                     | Result                                      | Evidence / qualification                                                                                                                           |
| ------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Epic delivers user value                          | PASS                                        | Past-day review/correction, `docs/epics.md:138–159`.                                                                                               |
| Epic can function independently                   | PASS on existing baseline                   | Verified dependency map; no unavailable Epic N+1 prerequisite.                                                                                     |
| Stories appropriately sized                       | PASS                                        | One bounded vertical slice, canonical story `:84–125`; no forced technical splitting.                                                              |
| No forward dependencies                           | PASS for increment                          | 5.3/1.11/2.11 implemented; draft 3.5–3.7 explicitly excluded. Historical defects retained as EQ-06.                                                |
| Database tables created when needed               | PASS / no new DDL needed                    | HealthSync first-use migration and existing unique DATE entries; no upfront future-model creation requested.                                       |
| Clear acceptance criteria                         | PARTIAL                                     | 9/9 BDD; outcomes and preservation rules inspectable. EQ-01 is the one unresolved calendar-authority oracle; EQ-04 is non-blocking fixture detail. |
| Traceability to FRs maintained                    | PASS                                        | FR29–FR36 → canonical AC1–9; historical FR11–17/22–23 are retained context, not redelivery.                                                        |
| Brownfield integration and backward compatibility | PASS specification / pending implementation | Current home/API/source/accent/session boundaries explicitly preserved; EQ-03 lists clear target work.                                             |
| Starter/scaffolding requirement                   | NOT APPLICABLE                              | Existing app; no new initial-project setup or infrastructure task.                                                                                 |

### Step 05 Quality Result and Minimal Actions

**No Critical structural violation or future dependency was found in the approved
Epic 3 increment.** Six EQ IDs are recorded: **one Major clarification blocker
(EQ-01)**, **two High implementation obligations, non-blocking (EQ-02/EQ-03)**,
**two Minor documentary/verification concerns (EQ-04/EQ-05)**, and **one historical
Critical-standard defect excluded from increment gating (EQ-06)**. Severity and
scope are separate; historical technical-epic debt is not concealed or promoted
into a 3.8 release prerequisite.

The only certain pre-implementation clarification is a shared calendar authority
with a concrete browser/API disagreement outcome and compatible day bounds/cap
lifecycle. UX-02 does not require an additional product policy: preserve existing
valid blur-save and original-day ownership. Then implement the approved date-aware
aggregate/cutoff/edit isolation and run the existing manual checks with the explicit
oracles above, lint and scoped compiler checks during implementation. Feature work
remaining is expected for a Draft story, not evidence of failed epic quality.

**Quality validation performed here:** complete source/authority comparison,
9-AC testability review, dependency verification including implementation/status
distinction, historical scope qualification, checklist and source-referenced actions.
Acceptance execution, runtime quality and overall implementation readiness remain
unassessed. Step 05 is complete; report status remains **in-progress**. No step 06
or other future step was loaded or executed, and only this IR report was modified.

## Summary and Recommendations — Initial Assessment Before Clarification

**Assessment date:** 2026-10-11

**Assessor:** Winston — Architect

**Scope:** approved Epic 3 increment / Story 3.8 — daily home navigation.

### Overall Readiness Status

**Initial verdict: NEEDS WORK — superseded by the product clarification addendum below.**

The approved increment has supported user value, a bounded vertical slice, available
brownfield dependencies and an implementable architecture. All **8/8 increment FRs
(FR29–FR36)** have canonical Story 3.8 paths; **9/9 canonical ACs** use BDD form.
All **29/29 historical FR identifiers** are mapped, with the previously documented
detail gaps and divergences retained rather than represented as verified compliance.
No missing increment FR, unavailable future dependency, Critical structural violation
or architectural feasibility blocker was established for this increment.

The remaining gate is the shared calendar authority, not the fact that an approved
Draft feature still needs implementation. Once its observable contract is confirmed,
the specified aggregate, cutoff, editor ownership and asynchronous isolation work
can proceed within the existing scope. Implementation and acceptance results remain
pending; completing this assessment does not complete Story 3.8.

**Final disposition authority:** this section supersedes earlier provisional blocker
classifications and assessment-state statements. Steps 02–05 remain intact as dated
review history: their statements that overall readiness was unassessed or the report
was in progress describe those stages only. The final report state is **completed**,
with readiness **needs-work**. In particular, UX-02 is **not** a clarification blocker;
the EQ-02 preservation rebuttal governs. UX-01 and EQ-01 identify the **same single
blocker**, narrowed to calendar authority and its compatible lifecycle/day bounds.

### Critical Issues Requiring Immediate Action

**P1 — Calendar authority and compatible lifecycle (EQ-01 / UX-01).**

Story 3.8 AC2–4 and Dev Notes 115 require today initialization, future prevention
and agreement between the displayed, read and written calendar day. They do not
choose between the two existing conventions:

- API-local today and workout timestamp bounds:
  `apps/api/src/services/tracking.service.ts:9–18,164–198`;
  `docs/architecture/components-workflows.md:187–200`.
- Browser-local home headings:
  `apps/web/src/app/(app)/page.tsx:113–144`, while the current home stores/saves
  the response date (`:55–59,98–102`).

At **2026-10-10T22:30Z**, an API using Europe/Paris considers today **2026-10-11**,
while a browser using America/Los_Angeles considers it **2026-10-10**. Both are
coherent local days, but the approved artifacts do not select the common initial
day, future cap and compatible completion-day bounds. A heading and an edit could
otherwise refer to different days. This concrete ambiguity justifies NEEDS WORK.

**Minimal product action:** obtain and record which existing convention governs
today: browser-local day or API-local day. Record the expected displayed/read/write
key and cap for the disagreement fixture, the compatible timezone bounds used to
attribute `completedAt` to a calendar day, and the observable initialization and
midnight/resume cap-refresh behavior without retargeting an editor or pending
mutation. This assessment does **not** assume that either convention was chosen;
the earlier API-local recommendation is not product approval.

Workout eligibility and timestamp selection are already resolved: count completed
planned/ad_hoc sessions by **`completedAt`**, including the whole selected day;
exclude abandoned/in-progress sessions, null completion timestamps and separate
HealthActivity rows. The unresolved point is the calendar bounds applied to that
instant, not a choice between `startedAt` and `completedAt`. Date-only entry identity,
DST-safe calendar stepping and real execution dates for workout starts are already
approved. No timezone preference, new timestamp fallback or dashboard redesign is
needed.

### Consolidated Findings, Priorities, and Superseding Dispositions

The following **eight thematic disposition groups** partition all sixteen stable
UX/EQ source IDs exactly once. They consolidate overlapping review findings rather
than claim eight independent defects or eight blockers. P1 denotes the clarification
gate; P2 denotes approved implementation work; P3 denotes non-gating verification
or documentation follow-up.

| Group                                                    | Source IDs                               | Priority / final category                                 | Final disposition and minimal action                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Calendar authority and lifecycle                      | UX-01, EQ-01                             | P1 / clarification blocker                                | One shared blocker. Obtain the product convention, disagreement key, compatible completedAt day bounds and initialization/midnight/resume outcomes described above. Broader hydration/DST checks do not become separate blockers.                                                                                                                                                                                                     |
| 2. Original-day editor ownership                         | UX-02, EQ-02                             | P2 / implementation obligation                            | UX-02 blocker classification rebutted. AC1/6/7/8 and notes 112–113/122 preserve implemented valid blur/Enter saving. Bind the draft to its originating day and submit at most once; preserve blank/invalid/Escape no-write behavior. No additional product decision among discard/carry/block policies is required.                                                                                                                   |
| 3. Selected-day aggregate, isolation and compatibility   | UX-05, UX-06, UX-07, UX-08, UX-09, EQ-03 | P2 / implementation obligation                            | Deliver the already specified complete selected-day data, containing-period cutoff, original-date mutations/rollback and request/auth-generation isolation. Preserve current configuration, formulas, provenance, editability, zero/empty semantics, nullable sessions and no-date API compatibility. UX-07/08/09 supply resolved preservation boundaries and existing-debt qualifications, not three extra blockers or new policies. |
| 4. Fresh opening and navigation restoration wording      | UX-03                                    | P3 / non-blocking specification or verification follow-up | Saved-entry durability is required; date deep links/history persistence are not. Use the fresh-today interpretation supported by EQ-04's AC6 oracle for verification; qualify route-return/Back/Forward behavior during implementation without introducing URL state as a prerequisite.                                                                                                                                               |
| 5. Concrete acceptance fixtures                          | EQ-04                                    | P3 / non-blocking specification or verification follow-up | Use step 05's concrete date keys, totals, full-day completedAt, editor overlap, zero/blank/Escape and auth-race oracles in the existing manual record. Calendar-dependent outcomes remain conditional on group 1. No new test framework is required.                                                                                                                                                                                  |
| 6. Historical baseline and status/contract discrepancies | UX-04, EQ-05                             | P3 / historical or documentation qualification            | Canonical 3.8 and source-backed current architecture govern. Old grouping/streak/CTA/React Query/route examples, unchecked completed-story tasks, stale corpus metadata and PRD checklist counts remain historical debt. Approval is distinct from delivery; eight epic summaries are not nine canonical ACs. No backlog regeneration or legacy UI restoration.                                                                       |
| 7. Historical performance/cache claims                   | UX-10                                    | P3 / historical or documentation qualification            | Preserve quick feedback/mobile usability and verify loading/navigation. Static review does not prove historical latency/bundle targets; no new cache, benchmark infrastructure or SLA is an increment prerequisite.                                                                                                                                                                                                                   |
| 8. Historical technical decomposition/sequencing         | EQ-06                                    | P3 / historical or documentation qualification            | Retain the Critical-under-greenfield-standard defect as out of scope for increment gating. No Critical structural violation applies to the approved brownfield addition; no restructuring of implemented foundations is required.                                                                                                                                                                                                     |

**Steps 02–03 disposition:** the PRD-only absence of 3.8/delta authority is resolved
by the approved incremental epic and canonical story. Broader historical formula,
model, security, reliability, stack and future-scope concerns are baseline context,
not additional 3.8 prerequisites without an increment-specific causal link.
Step 03 retains **two historical partial-detail FR gaps (FR1/FR2)** and
**four historical divergent FR paths (FR8/FR9/FR10bis/FR21)** outside this increment.
Its five partial local NFR-DHN AC expressions have supporting documentary paths;
they are not five uncovered FRs. Current aggregate rules, source restrictions and
dependency availability are qualified by steps 04–05. These conclusions support
scope/structure/coverage/architecture without claiming runtime acceptance.

### Issue Counts and Population Boundaries

| Population                                     | Exact count and category breakdown                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Step 04 source findings                        | **10 UX IDs:** 2 High clarification-blocker classifications (UX-01/02), 2 High implementation obligations (UX-05/06), 4 Medium warnings/preservation qualifications (UX-03/04/07/08), 2 Low verification/documentation qualifications (UX-09/10). These are the original, superseded classifications where applicable. |
| Step 05 source findings                        | **6 EQ IDs:** 1 Major clarification blocker (EQ-01), 2 High non-blocking implementation obligations (EQ-02/03), 2 Minor documentary/verification concerns (EQ-04/05), 1 historical Critical-standard defect excluded from increment gating (EQ-06).                                                                    |
| Combined stable source inventory               | **16 IDs = 10 UX + 6 EQ**, from two review populations. Overlap and rebuttal prevent summing their blocker/severity counts as unique issues.                                                                                                                                                                           |
| Final deduplicated thematic disposition groups | **8 groups across 4 final categories:** **1 clarification blocker**, **2 implementation-obligation groups**, **2 non-blocking specification/verification groups**, **3 historical/documentation-qualification groups**. The table above defines the grouping and exhaustively assigns the 16 IDs.                      |
| Current increment gating                       | **1 unique unresolved clarification blocker** (EQ-01/UX-01); **0 Critical structural violations**, **0 architectural feasibility blockers**, **0 unavailable forward prerequisites**, **0 missing increment FR paths**.                                                                                                |

These are explicitly defined source-ID and thematic-group counts, not an atomic
defect estimate. Step 02's ten broad clarity/completeness paragraphs and step 03's
six traceability-risk paragraphs mix repeated baseline observations, scope
qualifications and requirement populations; they are reviewed and disposed above,
but are **not added** to the sixteen stable IDs or asserted to be independent
increment defects. FR/NFR/AC inventories, affected FRs and partial-expression groups
are coverage measures, not additional issue counts. No full-product unique-defect
total or measured implementation compliance percentage is asserted.

### Recommended Next Steps

1. **Product owner + Architect:** resolve group 1 with one explicit calendar
   convention and concrete today/cap/completedAt-boundary/lifecycle outcomes.
   Do not silently adopt either browser-local or API-local authority.
2. **Implementation:** after that clarification, deliver canonical AC1–9 using
   the current home baseline: two top controls, selected-day data/cutoff, preserved
   original-day blur-save, reliable date/request/auth isolation and compatibility.
   The scope requires neither a timezone preference nor a redesign.
3. **Verification:** execute the existing manual scenarios with step 05's concrete
   oracles and the confirmed calendar contract, then run lint and appropriate
   scoped compiler checks during implementation. Record actual results before
   claiming acceptance; historical documentation follow-up is non-gating.

### Final Note

This completed assessment consolidates **16 stable source findings into 8 thematic
groups across 4 disposition categories**, with **one unique clarification blocker**
requiring immediate product input. NEEDS WORK is proportionate to that narrow gap;
the approved increment's structure, eight-FR coverage and architectural support
remain supported. Earlier sections are preserved, with the final dispositions above
controlling the overall state. Step 06 completes the readiness assessment only.

## Product Clarification and Final Readiness Addendum

**Date:** 2026-10-11. **Assessor:** Winston — Architect.

The product owner explicitly confirmed the recommended browser-local convention
in response to the final IR question. This addendum supersedes the initial
NEEDS WORK verdict and its pending calendar-authority statements; earlier findings
remain as review history.

### Approved Contract

- Browser-local calendar defines today, fresh-opening selected day, future cap,
  and calendar-day attribution for this feature's timestamp-based counters.
- Displayed, read, and written entry keys are the selected `YYYY-MM-DD`, supplied
  explicitly, never replaced with API-local today or UTC ISO date truncation.
- Completed sessions retain their real timestamps and existing eligibility.
  Browser-local day/period boundaries are serialized as UTC instants for queries;
  use `[localStart, nextLocalStart)` for a day and the next-local-day exclusive
  cutoff for containing-period counters. Calendar stepping handles 23/25-hour DST
  days without a persisted timezone preference.
- Refresh today/cap at local midnight and focus/visibility resume, and recheck on
  navigation. A fresh opening selects today; cap refresh does not automatically
  move an existing selected day, draft, or pending mutation. Hydration must not
  display contradictory server/client dates.

The canonical story now records these implementation consequences and concrete
disagreement, boundary, midnight/resume, and DST verification fixtures. At
`2026-10-10T22:30:00Z`, an America/Los_Angeles browser selects October 10 even if
the API's Europe/Paris calendar says October 11; that browser day's timestamp
interval is `[2026-10-10T07:00:00Z, 2026-10-11T07:00:00Z)`.

### Final Disposition

**READY for implementation planning.** EQ-01 / UX-01 is resolved by explicit
product confirmation and the documented contract. There are **zero remaining
clarification blockers**, missing increment FR paths, unavailable forward
prerequisites, or established architecture-feasibility blockers.

The initial 16 UX/EQ source findings and eight thematic groups are retained for
traceability. Group 1 is now resolved; the other groups remain non-blocking
implementation obligations, verification guidance, or historical qualifications.
READY does not mean implemented, tested, or delivered. Story 3.8 remains Draft
with implementation not started; no application changes or runtime acceptance
tests were performed by this clarification.

### Next Step

Proceed to Sprint Planning for this approved increment without regenerating the
existing backlog, then story implementation and acceptance verification. Preserve
the selected-date, editor, request, and rollback isolation requirements and run
the newly explicit calendar fixtures during implementation.
