---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - docs/prd.md
  - docs/archive/architecture-original.md
  - docs/front-end-spec.md
  - docs/stories/3.1.trackable-items-backend.md
  - docs/stories/3.2.tracking-configuration-ui.md
  - docs/stories/3.3.daily-tracking-backend.md
  - docs/stories/3.4.today-dashboard-ui.md
  - docs/stories/3.5.streaks-calculation.md
  - docs/stories/3.6.gamification-ui.md
  - docs/stories/3.7.monthly-calendar-view.md
  - docs/stories/5.1.health-sync-data-schema.md
  - docs/stories/5.2.health-sync-endpoint.md
  - docs/stories/5.3.health-sync-status-and-activities.md
  - docs/stories/1.11.user-accent-color-preference.md
  - docs/stories/2.11.ad-hoc-workout-sessions.md
scope: incremental-daily-home-navigation
requirementsStatus: confirmed
storyStatus: approved
storyDocument: docs/stories/3.8.daily-home-navigation.md
validationStatus: passed
workflowStatus: completed
---

# momentum - Epic Breakdown

> Documentation migration: the original architecture input was moved from
> `docs/architecture.md` to `docs/archive/architecture-original.md`, preserving
> its technical content and adding an archival notice. The input list preserves
> the workflow's provenance.

## Overview

Incremental planning and delivery record for daily home navigation and retrospective habit
corrections. The existing backlog in docs/prd.md and docs/stories/ remains authoritative and must
not be regenerated. Existing requirements below provide context; new requirements have been
confirmed by the product owner. Story 3.8 implementation status is recorded below without changing
the planning-time workflow metadata above.

## Requirements Inventory

### Functional Requirements

FR1: Create and manage named workout programs and their types.
FR2: Provide an exercise library with muscle group, equipment and optional seat position.
FR3: Configure ordered workout exercises, targets and rest durations.
FR4: Start a workout session from a program.
FR5: Log repetitions and weights during a session.
FR6: Provide a rest timer with an audio completion notification.
FR7: Preserve complete workout session history.
FR8: Detect stabilization over three consecutive sessions at the same difficulty.
FR9: Suggest progressive increases in repetitions or weight after stabilization.
FR10: Allow accepting or ignoring progression suggestions.
FR10bis: Apply a three-session cooldown after ignoring a suggestion.
FR11: Display daily tasks and goals on the home dashboard.
FR12: Allow manual entry of daily steps.
FR13: Allow marking yoga as done or not done.
FR14: Display outstanding tasks above completed tasks.
FR15: Calculate and display activity streaks.
FR16: Calculate and display daily completion percentage.
FR17: Support monthly goals expressed as a number of days to achieve.
FR18: Create and edit the user profile.
FR19: Record dated body measurements.
FR20: Preserve measurement history for progress visualization.
FR21: Create custom exercises in the library.
FR22: Configure daily trackables and their types and goals.
FR23: Define individual daily, weekly or monthly tracking targets.
FR24: Offer AI coaching when at least one exercise is stagnating.
FR25: Analyze the last ten sessions of the same workout for AI coaching.
FR26: Suggest individualized per-set adjustments with explanations.
FR27: Allow editing AI proposals before applying them.
FR28: Offer AI coaching only when an OpenAI API key is configured.

Confirmed incremental requirements from the user's request:

FR29: Display previous-day and next-day icon buttons at the top of the home dashboard.
FR30: Initialize the home to today and navigate one calendar day per activation.
FR31: Disable and visibly gray out the next-day button on today; never navigate into the future.
FR32: Update the existing displayed date and render the same home layout and components using the selected day's tracking values and completion state.
FR33: Allow adding and correcting manual boolean, numeric and duration entries for the selected past day, including toggling yoga in either direction.
FR34: Persist edits against the selected date without changing entries on other dates, and retain them when revisiting that day.
FR35: Keep the current home unchanged except for the two top navigation buttons and date-dependent content; do not add a return-to-today control, redesign sections or change existing actions.
FR36: Use current habits and goals with entries for the selected date; an entry checked on a later day must not mark a trackable completed on an earlier day.

### NonFunctional Requirements

NFR1: Workout session interactions respond in less than 100 ms.
NFR2: Maintain fluid mobile performance during workouts.
NFR3: Support self-hosting through Docker and Docker Compose.
NFR4: Keep a modular architecture for progressive feature activation.
NFR5: Use PostgreSQL.
NFR6: Keep user data on personal infrastructure without a mandatory external cloud.
NFR7: Prepare authentication for future Authentik integration.
NFR8: Prioritize quick mobile logging actions.
NFR9: Prioritize analytics and visualization on desktop.
NFR10: Use subtle, professional gamification.
NFR11: Use strict TypeScript without any.
NFR12: Use Shadcn UI and Tailwind CSS for UI components.

### Additional Requirements

- Reuse existing authenticated date-based tracking reads and upserts, with one entry per trackable and date; verify current contracts before implementation.
- Keep the selected calendar date stable across serialization, month/year boundaries and daylight-saving transitions.
- Isolate asynchronous reads and mutations by date; stale responses must not populate another day's dashboard.
- Provide loading, empty and error states and roll back failed optimistic edits.
- Preserve user ownership checks and validation of dates and tracking values.
- Use accessible icon-button labels, keyboard activation, visible focus and 48 px touch targets, with responsive dark-theme styling.
- Respect the user's dynamic accent variables; do not hardcode a selected or primary brand color.
- Preserve Health Connect source metadata, existing editability rules and synchronization behavior; do not introduce new read-only restrictions or override policies.
- Preserve computed workout values and support both planned and ad_hoc sessions with nullable workout relationships; browsing history must not backdate new sessions or change existing home actions.
- Architecture and UX documents contain historical stack/API assumptions. Current repository conventions and recent stories override obsolete versions, routing and infrastructure examples.
- No scaffolding or infrastructure work is needed for this incremental feature, despite the original architecture's greenfield classification.
- Stories 3.5–3.7 are documented as Draft; do not assume streaks/calendar implementations or make them prerequisites without verification.
- Confirmed scope: current trackables and goals with the selected day's values, not a historical configuration snapshot.
- Later completion entries are excluded from the earlier day's completion state, not from the current configured trackable list. A habit completed only after the selected date remains incomplete for that selected date.
- Date-dependent period aggregates, if present on the current home, must not treat entries later than the selected date as already completed. Preserve current components and presentation.
- Keep all current home actions and editing restrictions unchanged. Only manual tracking edits target the selected date; existing session start actions retain their real execution date.
- No extra navigation affordance or calendar is requested. The existing next-day button returns to today one day at a time and becomes disabled there.
- No arbitrary historical navigation limit is requested; reuse any existing applicable data/date constraints rather than inventing a new product limit.
- Product owner confirmed browser-local calendar authority after IR: today, initial day, future cap and timestamp-counter boundaries use the browser's local calendar. The canonical story specifies explicit date keys, UTC-serialized half-open timestamp bounds, DST stepping, and midnight/resume behavior without a timezone preference or automatic retargeting of edits.

### FR Coverage Map

FR1–FR10 and FR10bis: Existing Epic 2 — workout tracking and progression (unchanged).
FR11–FR17: Existing Epic 3 — daily tracking and gamification (unchanged baseline).
FR18–FR20: Existing Epic 1 — profile and measurements (unchanged).
FR21: Existing Epic 2 — custom exercises (unchanged).
FR22–FR23: Existing Epic 3 — tracking configuration (unchanged).
FR24–FR28: Existing Epic 2 — AI coaching (unchanged).
FR29–FR36: Epic 3 incremental scope — daily home navigation and retrospective corrections.

## Epic List

### Epic 3: Daily Tracking & Gamification — Incremental Addition

Allow users to revisit and correct a past day's tracking from the existing home,
without changing its layout, components or actions beyond two date-navigation buttons.

**FRs covered by the addition:** FR29–FR36.
**Existing related FRs:** FR11–FR17, FR22–FR23.
**Existing foundations:** Stories 3.3 and 3.4, with compatibility for current tracking,
Health Connect, dynamic accents and planned/ad_hoc workout sessions.
**Delivery:** One incremental story, numbered 3.8, in docs/stories/.
**Dependencies:** No new dependency on draft calendar or gamification stories.
**Approval:** Product owner confirmed the existing Epic 3 attachment.

**Implementation status:** Story 3.8 is implemented and marked `done` in the scoped
[`sprint-status.yaml`](./stories/sprint-status.yaml), based on the user's overall report that manual
acceptance testing is OK against the local development server on `code` with a local copy of
production data. This is not a scenario-by-scenario report, formal BMAD/code review, or production
release. Epic 3 remains `in-progress`; the optional retrospective remains optional. The workflow
frontmatter above preserves the original planning-time metadata and is not a live completion marker.

## Epic 3: Daily Tracking & Gamification

Enable reviewing and correcting past tracking using the unchanged current home dashboard.

### Story 3.8: Daily Home Navigation

As a user,
I want to navigate the home dashboard one day at a time and edit a past day's habits,
So that I can review and correct my daily tracking without changing interfaces.

**Acceptance Criteria:**

**Given** the current home dashboard,
**When** this feature is added,
**Then** only previous-day and next-day icon buttons are added at the top,
**And** the existing layout, components, ordering and actions remain unchanged except for date-dependent content.

**Given** the home initially displays today,
**When** an enabled navigation button is activated,
**Then** the selected date moves exactly one calendar day, including calendar and daylight-saving boundaries.

**Given** today is selected,
**When** controls are rendered,
**Then** the next-day button is visibly gray and actually disabled for pointer and keyboard input,
**And** past dates allow advancing only as far as today.

**Given** a past date is selected,
**When** data is displayed,
**Then** existing date-dependent home content represents that day using current habits and goals,
**And** later accomplishments do not mark its habits complete or inflate existing period counters.

**Given** an editable daily habit,
**When** a boolean, numeric or duration entry is corrected,
**Then** it is saved only for the selected date and remains when that day is revisited,
**And** other dates are unchanged.

**Given** a past day is viewed,
**When** existing home actions are used,
**Then** existing synchronized/calculated-data editing restrictions are preserved,
**And** workout starts retain their real execution date with planned and ad_hoc compatibility.

**Given** rapid navigation, pending saves or failed requests,
**When** a request finishes,
**Then** its data and any rollback remain isolated to its original date,
**And** existing loading/error feedback is preserved without simulating successful saves.

**Given** the two navigation controls,
**When** used on mobile or desktop,
**Then** they expose the French labels "Jour précédent" and "Jour suivant", visible focus, keyboard activation and 48 px touch targets,
**And** they respect the existing dark theme and user accent.

The canonical story file contains the complete nine approved acceptance criteria,
implementation tasks, compatibility constraints and manual verification scenarios.
Coverage: FR29–FR36. Product-owner approval received before saving this story.
