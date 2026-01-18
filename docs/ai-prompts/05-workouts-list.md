# AI Frontend Prompt: Workouts List

> **Target Tools**: Google Stitch, Lovable, v0, Bolt
> **Complexity**: Medium - List view with quick actions

---

## High-Level Goal

Create the Workouts List page - the hub for managing workout programs and viewing recent sessions. Users can see their programs, start a workout quickly, create new programs, and access their session history. This is the entry point to the fitness module.

---

## Project Context

### Tech Stack
- **Framework**: Next.js 14+ with App Router
- **Styling**: Tailwind CSS + Shadcn UI (dark mode)
- **Icons**: Lucide React
- **State**: React Query for data fetching

### Design Philosophy
- Quick access to start workouts
- Clear distinction between programs (templates) and sessions (executions)
- Mobile-optimized with large touch targets

---

## Detailed Instructions

### 1. Page Header

- Title: "Workouts"
- Action button: "+ New" to create a program

### 2. Quick Start Section

Prominent CTA at the top:
- Large card or button: "Start a Workout"
- Dumbbell icon
- Tapping opens a bottom sheet or navigates to program selection

### 3. My Programs Section

List of user's workout programs:

For each program card:
- Program name (bold)
- Brief info: number of exercises
- "▶ Start" button (primary action)
- Overflow menu (⋮) with: Edit, Duplicate, Delete

### 4. Recent Sessions Section

List of recently completed sessions:

For each session:
- Date (relative: "Today", "Yesterday", "Jan 15")
- Workout name
- Duration
- Status indicator (completed ✓ or abandoned ⚠)
- Tap to view details (navigate to session detail)

### 5. Empty States

If no programs:
- Illustration or icon
- "Create your first workout program"
- CTA button to create

If no recent sessions:
- "No sessions yet"
- "Start a workout to see your history here"

### 6. Program Actions

The overflow menu should include:
- **Edit**: Navigate to workout builder
- **Duplicate**: Create a copy with "(Copy)" suffix
- **Delete**: Confirmation dialog, then delete

### 7. Start Workout Flow

When tapping "Start" on a program:
- Navigate directly to `/session/new?workoutId={id}`
- Or show a quick confirmation sheet before starting

---

## Code Examples & Constraints

### Data Types

```typescript
interface WorkoutProgram {
  id: string;
  name: string;
  description: string | null;
  exerciseCount: number;
  lastUsedAt: Date | null;
  createdAt: Date;
}

interface RecentSession {
  id: string;
  workout: {
    id: string;
    name: string;
  };
  status: 'completed' | 'abandoned';
  startedAt: Date;
  completedAt: Date | null;
  duration: number; // minutes
}
```

### Page Structure

```tsx
// app/workouts/page.tsx
export default function WorkoutsPage() {
  const { data: programs } = useQuery(['workouts'], fetchWorkouts);
  const { data: recentSessions } = useQuery(['sessions', 'recent'], fetchRecentSessions);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workouts</h1>
        <Button asChild>
          <Link href="/workouts/new">
            <Plus className="w-4 h-4 mr-2" />
            New
          </Link>
        </Button>
      </div>

      {/* Quick Start */}
      <Card className="p-6 bg-primary/5 border-primary/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Dumbbell className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Start a Workout</p>
            <p className="text-sm text-muted-foreground">
              Pick a program and begin your session
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </Card>

      {/* My Programs */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          MY PROGRAMS
        </h2>
        {programs?.length === 0 ? (
          <EmptyPrograms />
        ) : (
          <div className="space-y-2">
            {programs?.map(program => (
              <ProgramCard key={program.id} program={program} />
            ))}
          </div>
        )}
      </section>

      {/* Recent Sessions */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          RECENT SESSIONS
        </h2>
        {recentSessions?.length === 0 ? (
          <EmptySessions />
        ) : (
          <div className="space-y-2">
            {recentSessions?.map(session => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
        {recentSessions && recentSessions.length > 0 && (
          <Button variant="link" className="mt-2" asChild>
            <Link href="/sessions">View all sessions →</Link>
          </Button>
        )}
      </section>
    </div>
  );
}
```

### Program Card Component

```tsx
function ProgramCard({ program }: { program: WorkoutProgram }) {
  const router = useRouter();

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="font-medium">{program.name}</p>
          <p className="text-sm text-muted-foreground">
            {program.exerciseCount} exercises
          </p>
        </div>

        {/* Start Button */}
        <Button
          size="sm"
          onClick={() => router.push(`/session/new?workoutId=${program.id}`)}
        >
          <Play className="w-4 h-4 mr-1" />
          Start
        </Button>

        {/* Overflow Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/workouts/${program.id}/edit`}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDuplicate(program.id)}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => handleDelete(program.id)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
```

### Session Card Component

```tsx
function SessionCard({ session }: { session: RecentSession }) {
  return (
    <Link href={`/sessions/${session.id}`}>
      <Card className="p-4 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">{session.workout.name}</p>
              {session.status === 'completed' ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-yellow-500" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {formatRelativeDate(session.startedAt)} · {session.duration}min
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </Card>
    </Link>
  );
}
```

### Empty State Component

```tsx
function EmptyPrograms() {
  return (
    <Card className="p-8 text-center">
      <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
      <p className="font-medium mb-2">No programs yet</p>
      <p className="text-sm text-muted-foreground mb-4">
        Create your first workout program to get started
      </p>
      <Button asChild>
        <Link href="/workouts/new">Create Program</Link>
      </Button>
    </Card>
  );
}
```

---

## Constraints & What NOT To Do

- Do NOT show full program details on this page (that's for edit page)
- Do NOT allow starting a session without selecting a program
- Do NOT delete programs without confirmation
- Do NOT show more than 5-10 recent sessions (paginate or "View all")
- Do NOT make the "Start" button too small

---

## Scope Definition

### Files to Create
- `app/workouts/page.tsx` - Main workouts list
- `components/workouts/program-card.tsx`
- `components/workouts/session-card.tsx`
- `components/workouts/empty-programs.tsx`
- `components/workouts/empty-sessions.tsx`
- `components/workouts/delete-program-dialog.tsx`

### Files NOT to Modify
- Workout builder pages
- Session pages
- Layout components

---

## Expected Output

A complete Workouts List page that:
1. Shows prominent "Start a Workout" CTA
2. Lists all user's workout programs
3. Provides quick start button on each program
4. Shows overflow menu for edit/duplicate/delete
5. Lists recent sessions with status and duration
6. Has appropriate empty states
7. Navigates to relevant detail pages

---

## Visual Reference (ASCII Wireframe)

```
┌─────────────────────────────────┐
│  Workouts               + New  │
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐   │
│  │  💪 START A WORKOUT     │   │
│  │  Pick a program and go  →   │
│  └─────────────────────────┘   │
│                                 │
├─────────────────────────────────┤
│  MY PROGRAMS                    │
│  ┌─────────────────────────┐   │
│  │ Push Day                │   │
│  │ 6 exercises    ▶ Start ⋮│   │
│  ├─────────────────────────┤   │
│  │ Pull Day                │   │
│  │ 5 exercises    ▶ Start ⋮│   │
│  ├─────────────────────────┤   │
│  │ Leg Day                 │   │
│  │ 5 exercises    ▶ Start ⋮│   │
│  └─────────────────────────┘   │
│                                 │
├─────────────────────────────────┤
│  RECENT SESSIONS                │
│  ┌─────────────────────────┐   │
│  │ Today · Push Day   ✓    │   │
│  │ 45 min              →   │   │
│  ├─────────────────────────┤   │
│  │ Yesterday · Pull   ✓    │   │
│  │ 52 min              →   │   │
│  └─────────────────────────┘   │
│  View all sessions →           │
│                                 │
└─────────────────────────────────┘
```
