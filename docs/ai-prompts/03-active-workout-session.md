# AI Frontend Prompt: Active Workout Session

> **Target Tools**: Google Stitch, Lovable, v0, Bolt
> **Complexity**: Very High - Critical user flow, real-time interaction

---

## High-Level Goal

Create the Active Workout Session interface - a full-screen, distraction-free UI for logging workout sets in real-time. This is the most critical flow in Momentum. The interface must be optimized for use during physical exercise: large touch targets, minimal taps to log a set, automatic rest timer with audio notification, and no interruptions from app navigation.

---

## Project Context

### Tech Stack
- **Framework**: Next.js 14+ with App Router
- **Styling**: Tailwind CSS + Shadcn UI (dark mode)
- **Icons**: Lucide React
- **Fonts**: JetBrains Mono for timer/numbers
- **Audio**: Web Audio API for timer notification
- **APIs**: Wake Lock API to prevent screen sleep

### Design Philosophy
- Full-screen takeover (hide navigation)
- Maximum 3 taps to log a set
- Large touch targets (minimum 48px, CTAs 60px+)
- No keyboard required - use steppers
- Instant visual feedback

---

## Detailed Instructions

### 1. Session States

The session has multiple states:

1. **Pre-Session**: Confirmation screen before starting
2. **Exercise Active**: Logging sets for current exercise
3. **Rest Timer**: Countdown between sets
4. **Inter-Exercise Rest**: Longer rest before next exercise
5. **Progression Suggestion**: Optional suggestion popup
6. **Session Summary**: End screen with stats

### 2. Pre-Session Screen

Before starting, show:
- Workout name and description
- List of exercises with targets
- Total estimated duration
- "Start Workout" button (large, prominent)
- "Cancel" option

### 3. Main Session Header

Minimal header with:
- "✕ Abandon" button (left) - requires confirmation
- Workout name (center)
- No other navigation

### 4. Exercise Display

Show current exercise info:
- Exercise name (large, prominent)
- Muscle groups as badges
- Target reminder: "4×10 @ 60kg"
- Progress dots showing set progress (○ ● ○ ○)

### 5. Set Input Component

Create a `SetInput` component:
```tsx
interface SetInputProps {
  targetReps: number;
  targetWeight: number;
  lastSessionReps?: number;
  lastSessionWeight?: number;
  onSubmit: (reps: number, weight: number) => void;
}
```

Specifications:
- Two large input areas: Reps and Weight
- Stepper buttons (+/-) instead of keyboard
- Pre-filled with target or last session values
- Increment: Reps ±1, Weight ±2.5kg
- Long-press for faster increment

### 6. "Set Done" Button

- HUGE button (minimum 60px height, full width)
- Clear label: "✓ SET DONE"
- High contrast (primary color)
- Haptic feedback if available
- Triggers rest timer automatically

### 7. Rest Timer Component

Create a `SessionTimer` component:
```tsx
interface SessionTimerProps {
  duration: number;          // seconds
  onComplete: () => void;
  onSkip: () => void;
  onAdjust: (delta: number) => void;
  autoStart?: boolean;
}
```

Full-screen timer display:
- Large countdown (72px font, JetBrains Mono)
- Circular or linear progress indicator
- "REST" label above timer
- Adjustment buttons: "+30s" and "-30s"
- "SKIP → NEXT SET" button
- Preview: "Next: Incline Press" (if changing exercise)

### 8. Audio Notification

At timer completion:
- Play a short, pleasant beep (Web Audio API)
- Vibration if available
- Visual pulse animation

### 9. Progression Suggestion Modal

If a progression is suggested:
```tsx
interface ProgressionSuggestionProps {
  exerciseName: string;
  currentReps: number;
  currentWeight: number;
  suggestedReps: number;
  suggestedWeight: number;
  onAccept: () => void;
  onModify: () => void;
  onDismiss: () => void;
}
```

Show before starting the exercise with suggestion.

### 10. Session Summary Screen

At completion:
- "Workout Complete!" header
- Duration
- Total sets completed
- Total volume (weight × reps)
- Option to add notes (textarea)
- "Save & Exit" button

### 11. Abandon Flow

"Abandon" button triggers:
- Confirmation dialog
- Options: "Continue Workout" / "Abandon"
- If abandoned: save partial data, mark session as "abandoned"

---

## Code Examples & Constraints

### Session Data Types

```typescript
interface ActiveSession {
  id: string;
  workout: {
    id: string;
    name: string;
    exercises: WorkoutExercise[];
  };
  status: 'in_progress' | 'completed' | 'abandoned';
  startedAt: Date;
  currentExerciseIndex: number;
  currentSetIndex: number;
  completedSets: CompletedSet[];
}

interface WorkoutExercise {
  id: string;
  exerciseId: string;
  exercise: {
    name: string;
    muscleGroups: string[];
  };
  order: number;
  targetSets: number;
  targetReps: number;
  targetWeight: number | null;
  restBetweenSets: number;    // seconds
  restAfterExercise: number;  // seconds
}

interface CompletedSet {
  exerciseId: string;
  setNumber: number;
  reps: number;
  weight: number;
  completedAt: Date;
}
```

### Page Structure

```tsx
// app/session/[id]/page.tsx
export default function ActiveSessionPage({ params }: { params: { id: string } }) {
  const [sessionState, setSessionState] = useState<SessionState>('pre-session');

  // Prevent screen sleep
  useWakeLock();

  // Hide bottom navigation
  useEffect(() => {
    document.body.classList.add('session-active');
    return () => document.body.classList.remove('session-active');
  }, []);

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Minimal Header */}
      <SessionHeader
        workoutName={session.workout.name}
        onAbandon={handleAbandon}
      />

      {/* Main Content - varies by state */}
      <main className="flex-1 flex flex-col">
        {sessionState === 'pre-session' && <PreSessionScreen />}
        {sessionState === 'exercise' && <ExerciseScreen />}
        {sessionState === 'rest' && <RestTimerScreen />}
        {sessionState === 'summary' && <SessionSummary />}
      </main>
    </div>
  );
}
```

### Set Input Component

```tsx
function SetInput({ targetReps, targetWeight, onSubmit }: SetInputProps) {
  const [reps, setReps] = useState(targetReps);
  const [weight, setWeight] = useState(targetWeight);

  return (
    <div className="space-y-6 p-4">
      {/* Reps Input */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="lg"
          className="w-14 h-14 text-2xl"
          onClick={() => setReps(r => Math.max(0, r - 1))}
        >
          -
        </Button>
        <div className="text-center min-w-[100px]">
          <p className="text-5xl font-mono font-bold">{reps}</p>
          <p className="text-sm text-muted-foreground">reps</p>
        </div>
        <Button
          variant="outline"
          size="lg"
          className="w-14 h-14 text-2xl"
          onClick={() => setReps(r => r + 1)}
        >
          +
        </Button>
      </div>

      {/* Weight Input */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="lg"
          className="w-14 h-14 text-2xl"
          onClick={() => setWeight(w => Math.max(0, w - 2.5))}
        >
          -
        </Button>
        <div className="text-center min-w-[100px]">
          <p className="text-5xl font-mono font-bold">{weight}</p>
          <p className="text-sm text-muted-foreground">kg</p>
        </div>
        <Button
          variant="outline"
          size="lg"
          className="w-14 h-14 text-2xl"
          onClick={() => setWeight(w => w + 2.5)}
        >
          +
        </Button>
      </div>

      {/* Submit Button */}
      <Button
        size="lg"
        className="w-full h-16 text-xl font-semibold"
        onClick={() => onSubmit(reps, weight)}
      >
        ✓ SET DONE
      </Button>
    </div>
  );
}
```

### Rest Timer Component

```tsx
function RestTimer({ duration, onComplete, onSkip, onAdjust }: SessionTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);

  // Countdown logic
  useEffect(() => {
    if (timeLeft <= 0) {
      playNotificationSound();
      onComplete();
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, onComplete]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <p className="text-2xl font-medium text-muted-foreground mb-4">REST</p>

      {/* Big Timer */}
      <p className="text-7xl font-mono font-bold tabular-nums">
        {minutes}:{seconds.toString().padStart(2, '0')}
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-xs mt-6">
        <Progress value={(1 - timeLeft / duration) * 100} />
      </div>

      {/* Adjust buttons */}
      <div className="flex gap-4 mt-8">
        <Button variant="outline" onClick={() => onAdjust(-30)}>
          -30s
        </Button>
        <Button variant="outline" onClick={() => onAdjust(30)}>
          +30s
        </Button>
      </div>

      {/* Skip button */}
      <Button
        variant="secondary"
        size="lg"
        className="mt-8"
        onClick={onSkip}
      >
        SKIP → NEXT SET
      </Button>
    </div>
  );
}
```

### Progress Dots Component

```tsx
function ProgressDots({ total, completed, current }: ProgressDotsProps) {
  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-3 h-3 rounded-full",
            i < completed && "bg-green-500",
            i === current && "bg-primary",
            i > current && "bg-muted"
          )}
        />
      ))}
    </div>
  );
}
```

---

## Constraints & What NOT To Do

- Do NOT show bottom navigation during session
- Do NOT require keyboard input - only steppers
- Do NOT allow accidental abandonment (require confirmation)
- Do NOT make buttons smaller than 48px
- Do NOT use complex animations that could lag
- Do NOT rely solely on visual timer - always have audio
- Do NOT auto-advance without user confirmation for sets

---

## Scope Definition

### Files to Create
- `app/session/[id]/page.tsx` - Main session page
- `components/session/session-header.tsx`
- `components/session/pre-session-screen.tsx`
- `components/session/exercise-display.tsx`
- `components/session/set-input.tsx`
- `components/session/progress-dots.tsx`
- `components/session/rest-timer.tsx`
- `components/session/session-summary.tsx`
- `components/session/abandon-dialog.tsx`
- `components/session/progression-suggestion.tsx`
- `hooks/use-wake-lock.ts`
- `hooks/use-audio-notification.ts`

### Files NOT to Modify
- Layout (session uses its own full-screen layout)
- Other pages
- API routes

---

## Expected Output

A complete workout session interface that:
1. Takes over full screen (no navigation)
2. Shows exercise info clearly
3. Allows set logging in ≤3 taps
4. Automatically starts rest timer after each set
5. Plays audio notification when rest ends
6. Prevents screen from sleeping
7. Handles abandonment gracefully
8. Shows summary with notes option at end

---

## Visual Reference (ASCII Wireframes)

### Set Input State
```
┌─────────────────────────────────┐
│  ✕ Abandon        Push Day     │
├─────────────────────────────────┤
│                                 │
│      BENCH PRESS                │
│      Pecs, Triceps              │
│                                 │
│  ┌───────────────────────────┐ │
│  │   Target: 4×10 @ 60kg     │ │
│  └───────────────────────────┘ │
│                                 │
│   Set 2 of 4                    │
│   ○ ● ○ ○                       │
│                                 │
├─────────────────────────────────┤
│                                 │
│      ┌─────┐    ┌─────┐        │
│      │ 10  │    │ 60  │        │
│      │reps │    │ kg  │        │
│      └──▲──┘    └──▲──┘        │
│     [- ] [+ ]  [- ] [+ ]       │
│                                 │
├─────────────────────────────────┤
│  ┌─────────────────────────┐   │
│  │                         │   │
│  │    ✓ SET DONE           │   │
│  │                         │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
```

### Rest Timer State
```
┌─────────────────────────────────┐
│  ✕ Abandon        Push Day     │
├─────────────────────────────────┤
│                                 │
│                                 │
│           REST                  │
│                                 │
│         ┌───────┐              │
│         │ 1:23  │              │
│         └───────┘              │
│                                 │
│     ▓▓▓▓▓▓▓▓▓▓░░░░░            │
│                                 │
│      Next: INCLINE PRESS        │
│                                 │
├─────────────────────────────────┤
│  ┌─────────────────────────┐   │
│  │    SKIP → NEXT SET      │   │
│  └─────────────────────────┘   │
│                                 │
│     [ +30s ]    [ -30s ]       │
└─────────────────────────────────┘
```
