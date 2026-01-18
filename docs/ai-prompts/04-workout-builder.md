# AI Frontend Prompt: Workout Builder

> **Target Tools**: Google Stitch, Lovable, v0, Bolt
> **Complexity**: High - Form-heavy, drag & drop interaction

---

## High-Level Goal

Create the Workout Builder interface - a form to create and edit workout programs (templates). Users can name their program, add exercises from their library, configure sets/reps/rest times, and reorder exercises. This is used before starting actual workout sessions.

---

## Project Context

### Tech Stack
- **Framework**: Next.js 14+ with App Router
- **Styling**: Tailwind CSS + Shadcn UI (dark mode)
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod validation
- **Drag & Drop**: @hello-pangea/dnd or dnd-kit

### Design Philosophy
- Clear, structured form layout
- Visual feedback during reordering
- Inline editing where possible
- Mobile-friendly (but desktop is primary use case)

---

## Detailed Instructions

### 1. Page Header

Show:
- Back button (← Back to Workouts)
- Page title: "New Program" or "Edit: {programName}"
- Save button (disabled until valid)

### 2. Program Info Section

Basic info fields:
- **Name** (required): Text input, e.g., "Push Day"
- **Description** (optional): Textarea for notes

### 3. Exercises Section

Header: "EXERCISES" with count badge

For each exercise in the program, show a card with:
- Drag handle (≡) on the left
- Exercise name (bold)
- Configuration: "4×10 · 90s · 120s" (sets × reps · rest · inter-exercise rest)
- Edit button (pencil icon)
- Delete button (trash icon)

### 4. Add Exercise Button

At the bottom of the exercises list:
- "+ Add Exercise" button
- Opens Exercise Selector modal/drawer

### 5. Exercise Selector Modal

A searchable, filterable modal to pick exercises:
- Search bar at top
- Filter by muscle group (tabs or pills)
- List of matching exercises
- Each item shows: name + muscle group badges
- Tap to select and close modal
- Option to "Create New Exercise" at bottom

### 6. Exercise Configuration Form

When adding or editing an exercise, show inline or modal form:
- Exercise name (read-only, already selected)
- **Target Sets**: Number input (default: 4)
- **Target Reps**: Number input (default: 10)
- **Target Weight**: Number input, optional (kg)
- **Rest Between Sets**: Number input in seconds (default: 90)
- **Rest After Exercise**: Number input in seconds (default: 120)
- Save / Cancel buttons

### 7. Drag & Drop Reordering

Allow reordering exercises:
- Visual drag handle on each card
- Highlight drop zone while dragging
- Update order on drop
- Mobile: consider move up/down buttons as fallback

### 8. Form Validation

- Program must have a name
- Program must have at least 1 exercise
- Each exercise must have sets > 0, reps > 0
- Rest times must be >= 0

### 9. Save Flow

- "Save" button in header
- Loading state while saving
- Toast notification on success
- Navigate back to workouts list

---

## Code Examples & Constraints

### Data Types

```typescript
// Create/Edit workout form
interface WorkoutFormData {
  name: string;
  description: string | null;
  exercises: WorkoutExerciseFormData[];
}

interface WorkoutExerciseFormData {
  id?: string;           // Existing ID if editing
  exerciseId: string;
  exercise: {
    name: string;
    muscleGroups: string[];
  };
  order: number;
  targetSets: number;
  targetReps: number;
  targetWeight: number | null;
  restBetweenSets: number;
  restAfterExercise: number;
}
```

### Page Structure

```tsx
// app/workouts/new/page.tsx and app/workouts/[id]/edit/page.tsx
export default function WorkoutBuilderPage() {
  const form = useForm<WorkoutFormData>({
    resolver: zodResolver(workoutSchema),
    defaultValues: existingWorkout || {
      name: '',
      description: '',
      exercises: [],
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-xl font-semibold">
          {isEditing ? `Edit: ${workout.name}` : 'New Program'}
        </h1>
        <Button
          onClick={form.handleSubmit(onSubmit)}
          disabled={!form.formState.isValid || isSubmitting}
        >
          Save
        </Button>
      </div>

      <Form {...form}>
        {/* Program Info */}
        <Card className="p-4 space-y-4">
          <FormField
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Program Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Push Day" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Notes about this program..."
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </Card>

        {/* Exercises */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted-foreground">
              EXERCISES
            </h2>
            <Badge variant="secondary">
              {exercises.length}
            </Badge>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="exercises">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-2"
                >
                  {exercises.map((exercise, index) => (
                    <ExerciseCard
                      key={exercise.id || index}
                      exercise={exercise}
                      index={index}
                      onEdit={() => openEditModal(index)}
                      onRemove={() => removeExercise(index)}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={() => setShowExerciseSelector(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Exercise
          </Button>
        </div>
      </Form>

      {/* Modals */}
      <ExerciseSelectorModal
        open={showExerciseSelector}
        onClose={() => setShowExerciseSelector(false)}
        onSelect={handleAddExercise}
      />
      <ExerciseConfigModal
        open={showExerciseConfig}
        exercise={editingExercise}
        onClose={() => setShowExerciseConfig(false)}
        onSave={handleSaveExerciseConfig}
      />
    </div>
  );
}
```

### Exercise Card Component

```tsx
function ExerciseCard({ exercise, index, onEdit, onRemove }: ExerciseCardProps) {
  return (
    <Draggable draggableId={exercise.id || `new-${index}`} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            "p-4",
            snapshot.isDragging && "ring-2 ring-primary"
          )}
        >
          <div className="flex items-center gap-3">
            {/* Drag Handle */}
            <div
              {...provided.dragHandleProps}
              className="text-muted-foreground hover:text-foreground cursor-grab"
            >
              <GripVertical className="w-5 h-5" />
            </div>

            {/* Exercise Info */}
            <div className="flex-1">
              <p className="font-medium">{exercise.exercise.name}</p>
              <p className="text-sm text-muted-foreground">
                {exercise.targetSets}×{exercise.targetReps}
                {exercise.targetWeight && ` @ ${exercise.targetWeight}kg`}
                {' · '}{exercise.restBetweenSets}s
                {' · '}{exercise.restAfterExercise}s
              </p>
            </div>

            {/* Actions */}
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onRemove}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </Card>
      )}
    </Draggable>
  );
}
```

### Exercise Config Form

```tsx
function ExerciseConfigForm({ exercise, onSave, onCancel }: ConfigFormProps) {
  return (
    <div className="space-y-4">
      <p className="font-medium">{exercise.exercise.name}</p>

      <div className="grid grid-cols-2 gap-4">
        <FormItem>
          <FormLabel>Sets</FormLabel>
          <Input type="number" min={1} defaultValue={exercise.targetSets} />
        </FormItem>
        <FormItem>
          <FormLabel>Reps</FormLabel>
          <Input type="number" min={1} defaultValue={exercise.targetReps} />
        </FormItem>
      </div>

      <FormItem>
        <FormLabel>Target Weight (kg, optional)</FormLabel>
        <Input type="number" step={2.5} defaultValue={exercise.targetWeight} />
      </FormItem>

      <div className="grid grid-cols-2 gap-4">
        <FormItem>
          <FormLabel>Rest Between Sets (s)</FormLabel>
          <Input type="number" min={0} defaultValue={exercise.restBetweenSets} />
        </FormItem>
        <FormItem>
          <FormLabel>Rest After Exercise (s)</FormLabel>
          <Input type="number" min={0} defaultValue={exercise.restAfterExercise} />
        </FormItem>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave}>Save</Button>
      </div>
    </div>
  );
}
```

---

## Constraints & What NOT To Do

- Do NOT allow saving a program with no exercises
- Do NOT require weight input (it's optional)
- Do NOT use dropdowns for small number inputs - use number inputs
- Do NOT forget drag handle touch area on mobile
- Do NOT close modals without confirmation if form is dirty
- Do NOT allow duplicate exercise selection (same exercise twice is OK)

---

## Scope Definition

### Files to Create
- `app/workouts/new/page.tsx` - New workout form
- `app/workouts/[id]/edit/page.tsx` - Edit workout form
- `components/workouts/workout-form.tsx` - Reusable form component
- `components/workouts/exercise-card.tsx` - Draggable exercise card
- `components/workouts/exercise-selector-modal.tsx` - Exercise picker
- `components/workouts/exercise-config-form.tsx` - Config inline/modal
- `lib/validations/workout.ts` - Zod schema

### Files NOT to Modify
- Exercise library pages
- Session pages
- API routes

---

## Expected Output

A complete Workout Builder that:
1. Creates new programs or edits existing ones
2. Has name and optional description fields
3. Allows adding exercises from library
4. Shows exercise configuration inline
5. Supports drag & drop reordering
6. Validates before saving
7. Shows loading and success feedback

---

## Visual Reference (ASCII Wireframe)

```
┌─────────────────────────────────┐
│  ← Back         Save           │
├─────────────────────────────────┤
│                                 │
│  Program Name                   │
│  ┌─────────────────────────┐   │
│  │ Push Day                │   │
│  └─────────────────────────┘   │
│                                 │
│  Description                    │
│  ┌─────────────────────────┐   │
│  │ Chest focused day...    │   │
│  └─────────────────────────┘   │
│                                 │
├─────────────────────────────────┤
│  EXERCISES                 [3] │
│  ┌─────────────────────────┐   │
│  │ ≡ 1. Bench Press        │   │
│  │    4×10 · 90s · 120s    │   │
│  │              ✎    🗑    │   │
│  ├─────────────────────────┤   │
│  │ ≡ 2. Incline Press      │   │
│  │    3×12 · 60s · 90s     │   │
│  │              ✎    🗑    │   │
│  ├─────────────────────────┤   │
│  │ ≡ 3. Cable Flyes        │   │
│  │    3×15 · 45s · 0s      │   │
│  │              ✎    🗑    │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │  + Add Exercise         │   │
│  └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```
