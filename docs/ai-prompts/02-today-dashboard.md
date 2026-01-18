# AI Frontend Prompt: Today Dashboard

> **Target Tools**: Google Stitch, Lovable, v0, Bolt
> **Complexity**: High - Core feature, main landing page

---

## High-Level Goal

Create the "Today Dashboard" - the main landing page of Momentum, a fitness and habit tracking app. This dashboard displays the user's daily progress, streak count, and a list of trackable items (habits) they need to complete. The design should be dark-themed, motivating but not childish, with quick-action interactions.

---

## Project Context

### Tech Stack
- **Framework**: Next.js 14+ with App Router
- **Styling**: Tailwind CSS + Shadcn UI (dark mode default)
- **Icons**: Lucide React
- **Fonts**: Inter (UI), JetBrains Mono (numbers)
- **State**: React Query for server state, optimistic updates

### Design Philosophy
- "Log first, analyze later" - prioritize quick capture
- Subtle gamification (fintech style, not gamey)
- Touch-optimized for mobile use
- Immediate feedback on actions

---

## Detailed Instructions

### 1. Page Header Section

Create a header with:
- Current date formatted nicely (e.g., "Today, Jan 17")
- Personalized greeting: "Good morning, {userName}"
- Streak badge prominently displayed

### 2. Streak Badge Component

Create a `StreakBadge` component:
```tsx
interface StreakBadgeProps {
  count: number;
  isRecord?: boolean;  // Show special styling if personal best
  atRisk?: boolean;    // Show warning if streak might break today
}
```

Specifications:
- Fire emoji + number (e.g., "🔥 12 days")
- Orange color (`#f97316`) for the flame/number
- Subtle glow effect when count > 7
- "Personal best!" label if `isRecord` is true
- Yellow warning tint if `atRisk` is true

### 3. Daily Progress Bar Component

Create a `DailyProgressBar` component:
```tsx
interface DailyProgressBarProps {
  completed: number;
  total: number;
  showLabel?: boolean;
}
```

Specifications:
- Full-width progress bar
- Show percentage (e.g., "67%")
- Gradient fill from left to right
- Animate on value change (300ms ease-out)

### 4. Trackable Items List

Split into two sections:
- **TO DO**: Items not yet completed today (top)
- **COMPLETED**: Items already done (bottom, visually muted)

### 5. TrackableItem Component

Create a versatile `TrackableItem` component:
```tsx
interface TrackableItemProps {
  id: string;
  name: string;
  icon: string;           // Lucide icon name
  type: 'boolean' | 'number' | 'workout';
  value?: number;         // Current value for number type
  goal?: number;          // Target value
  unit?: string;          // e.g., "steps", "min"
  completed: boolean;
  onToggle?: () => void;
  onValueChange?: (value: number) => void;
  onClick?: () => void;   // For workout type - navigates
}
```

#### Boolean Type (Checkbox)
- Large checkbox on the right
- Tap anywhere to toggle
- Smooth check animation

#### Number Type (Value Input)
- Show current value / goal (e.g., "8,240 / 10,000")
- Tap to open quick input
- Progress indicator under the value

#### Workout Type (Navigation)
- Show "0/1" or "1/1" sessions today
- Arrow icon indicating navigation
- Tap navigates to `/workouts`

### 6. Quick Number Input

When tapping a number-type item:
- Inline input appears (no modal)
- Number input with +/- buttons
- "Save" button to confirm
- Auto-focus the input
- Dismiss on blur or save

### 7. Quick Action: Start Workout

Add a prominent CTA at the top:
- Button: "Start a Workout"
- Dumbbell icon
- Navigates to `/workouts`

---

## Code Examples & Constraints

### Color Palette

```css
/* Base (Shadcn Dark) */
--background: #0a0a0a;
--card: #0a0a0a;
--muted: #27272a;
--muted-foreground: #a1a1aa;
--border: #27272a;

/* Accents */
--streak-orange: #f97316;
--success-green: #22c55e;
--warning-yellow: #eab308;
--accent-blue: #3b82f6;
```

### Data Types

```typescript
// Types for the dashboard
interface DashboardData {
  user: {
    name: string;
  };
  streak: {
    current: number;
    longest: number;
    atRisk: boolean;
  };
  progress: {
    completed: number;
    total: number;
  };
  trackables: TrackableWithEntry[];
}

interface TrackableWithEntry {
  id: string;
  name: string;
  icon: string;
  color: string;
  trackingType: 'boolean' | 'number' | 'duration';
  unit: string | null;
  goal: number;
  todayEntry: {
    value: number;
    completed: boolean;
  } | null;
}
```

### Component Structure

```tsx
// app/(dashboard)/page.tsx
export default function TodayDashboard() {
  return (
    <div className="space-y-6">
      {/* Header with date and greeting */}
      <DashboardHeader userName={user.name} />

      {/* Streak badge */}
      <StreakBadge
        count={streak.current}
        isRecord={streak.current >= streak.longest}
        atRisk={streak.atRisk}
      />

      {/* Progress bar */}
      <DailyProgressBar
        completed={progress.completed}
        total={progress.total}
      />

      {/* Quick action */}
      <QuickStartWorkout />

      {/* TO DO section */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          TO DO
        </h2>
        <div className="space-y-2">
          {todoItems.map(item => (
            <TrackableItem key={item.id} {...item} />
          ))}
        </div>
      </section>

      {/* COMPLETED section */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          COMPLETED
        </h2>
        <div className="space-y-2 opacity-60">
          {completedItems.map(item => (
            <TrackableItem key={item.id} {...item} />
          ))}
        </div>
      </section>
    </div>
  );
}
```

### TrackableItem Card

```tsx
<Card className="p-4">
  <div className="flex items-center gap-3">
    {/* Icon */}
    <div
      className="w-10 h-10 rounded-lg flex items-center justify-center"
      style={{ backgroundColor: `${item.color}20` }}
    >
      <Icon className="w-5 h-5" style={{ color: item.color }} />
    </div>

    {/* Content */}
    <div className="flex-1">
      <p className="font-medium">{item.name}</p>
      {item.type === 'number' && (
        <p className="text-sm text-muted-foreground">
          {formatNumber(item.value)} / {formatNumber(item.goal)} {item.unit}
        </p>
      )}
    </div>

    {/* Action */}
    {item.type === 'boolean' && (
      <Checkbox checked={item.completed} onCheckedChange={onToggle} />
    )}
    {item.type === 'workout' && (
      <ChevronRight className="w-5 h-5 text-muted-foreground" />
    )}
  </div>
</Card>
```

---

## Constraints & What NOT To Do

- Do NOT use confetti or excessive animations
- Do NOT show historical data on this page (that's for Progress page)
- Do NOT make the streak badge too large or distracting
- Do NOT require multiple taps to complete a boolean item
- Do NOT use modals for number input - keep it inline
- Do NOT show time-based greetings after 12pm as "Good morning"

---

## Scope Definition

### Files to Create
- `app/(dashboard)/page.tsx` - Main dashboard page
- `components/dashboard/dashboard-header.tsx`
- `components/dashboard/streak-badge.tsx`
- `components/dashboard/daily-progress-bar.tsx`
- `components/dashboard/trackable-item.tsx`
- `components/dashboard/quick-number-input.tsx`
- `components/dashboard/quick-start-workout.tsx`

### Files NOT to Modify
- Layout files (already created)
- API routes
- Other pages

---

## Expected Output

A complete Today Dashboard that:
1. Shows personalized greeting with current date
2. Displays streak count with appropriate styling
3. Shows daily progress as a percentage bar
4. Lists TO DO items at top, COMPLETED at bottom
5. Allows one-tap completion for boolean items
6. Provides inline editing for number items
7. Links to workouts page for workout items
8. Uses optimistic updates for instant feedback

---

## Visual Reference (ASCII Wireframe)

```
┌─────────────────────────────────┐
│  ☰  Today, Jan 17          🔔  │
├─────────────────────────────────┤
│                                 │
│   Good morning, Elliot          │
│   🔥 12 days streak             │
│                                 │
│   ▓▓▓▓▓▓▓▓░░░░  67%            │
│                                 │
│  ┌─────────────────────────┐   │
│  │ 💪 Start a Workout   →  │   │
│  └─────────────────────────┘   │
│                                 │
├─────────────────────────────────┤
│  TO DO                          │
│  ┌─────────────────────────┐   │
│  │ 🧘 Yoga            [ ]  │   │
│  ├─────────────────────────┤   │
│  │ 👟 Steps       [8,240]  │   │
│  │     ▓▓▓▓▓▓▓░░ / 10,000  │   │
│  ├─────────────────────────┤   │
│  │ 💪 Workout    0/1    →  │   │
│  └─────────────────────────┘   │
├─────────────────────────────────┤
│  COMPLETED ✓                    │
│  ┌─────────────────────────┐   │
│  │ 📖 Reading    30 min ✓  │   │
│  └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```
