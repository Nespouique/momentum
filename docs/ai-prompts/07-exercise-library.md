# AI Frontend Prompt: Exercise Library

> **Target Tools**: Google Stitch, Lovable, v0, Bolt
> **Complexity**: Medium - Searchable, filterable list with CRUD

---

## High-Level Goal

Create the Exercise Library - a searchable, filterable collection of exercises that users can browse, search, and add custom exercises to. This library is used when building workout programs. Users can view exercises by muscle group, search by name, and create their own custom exercises.

---

## Project Context

### Tech Stack
- **Framework**: Next.js 14+ with App Router
- **Styling**: Tailwind CSS + Shadcn UI (dark mode)
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod

### Design Philosophy
- Quick search and filter for finding exercises
- Visual muscle group indicators (badges)
- Clear distinction between system and custom exercises
- Easy to add custom exercises

### Muscle Groups

```typescript
const MUSCLE_GROUPS = [
  'abdos', 'biceps', 'dos', 'epaules', 'fessiers', 'ischios',
  'lombaires', 'mollets', 'pecs', 'quadriceps', 'trapezes', 'triceps'
] as const;
```

---

## Detailed Instructions

### 1. Page Header

- Title: "Exercise Library"
- Search bar (prominent, always visible)
- "+ Add" button for custom exercises

### 2. Search Functionality

- Real-time search as user types
- Search by exercise name
- Debounced (300ms) to avoid excessive queries
- Clear button when search has text

### 3. Muscle Group Filter

Filter pills/tabs for muscle groups:
- Horizontal scrollable row
- "All" option (default)
- Each muscle group as a pill
- Multi-select support (filter by multiple groups)
- Active filters visually highlighted

### 4. Exercise List

For each exercise, show a card with:
- Exercise name (bold)
- Muscle group badges (colored pills)
- Custom indicator (if user-created)
- For custom exercises: edit/delete actions

### 5. Empty States

- No exercises matching search: "No exercises found for '{query}'"
- No custom exercises: encouragement to create first one

### 6. Add Custom Exercise

Modal or drawer form:
- **Name** (required): Text input
- **Muscle Groups** (required): Multi-select with checkboxes or chips
- Save / Cancel buttons

### 7. Edit Custom Exercise

Same form as add, pre-filled with existing data.
Only available for custom (user-created) exercises.

### 8. Delete Custom Exercise

- Confirmation dialog
- Warning if exercise is used in any workout program
- Prevent deletion if in use (or offer to remove from programs)

---

## Code Examples & Constraints

### Data Types

```typescript
interface Exercise {
  id: string;
  name: string;
  muscleGroups: MuscleGroup[];
  isCustom: boolean;
  userId: string | null;
  createdAt: Date;
}

type MuscleGroup =
  | 'abdos' | 'biceps' | 'dos' | 'epaules' | 'fessiers' | 'ischios'
  | 'lombaires' | 'mollets' | 'pecs' | 'quadriceps' | 'trapezes' | 'triceps';
```

### Page Structure

```tsx
// app/exercises/page.tsx
export default function ExerciseLibraryPage() {
  const [search, setSearch] = useState('');
  const [selectedMuscles, setSelectedMuscles] = useState<MuscleGroup[]>([]);
  const debouncedSearch = useDebounce(search, 300);

  const { data: exercises } = useQuery(
    ['exercises', debouncedSearch, selectedMuscles],
    () => fetchExercises({ search: debouncedSearch, muscleGroups: selectedMuscles })
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Exercise Library</h1>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search exercises..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
        {search && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2"
            onClick={() => setSearch('')}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Muscle Group Filters */}
      <MuscleGroupFilter
        selected={selectedMuscles}
        onChange={setSelectedMuscles}
      />

      {/* Exercise List */}
      <div className="space-y-2">
        {exercises?.map(exercise => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            onEdit={() => handleEdit(exercise)}
            onDelete={() => handleDelete(exercise)}
          />
        ))}
      </div>

      {exercises?.length === 0 && (
        <EmptyState
          icon={Dumbbell}
          title="No exercises found"
          description={
            search
              ? `No exercises match "${search}"`
              : "No exercises in this category"
          }
        />
      )}

      {/* Add/Edit Modal */}
      <ExerciseFormModal
        open={showAddModal || !!editingExercise}
        exercise={editingExercise}
        onClose={() => {
          setShowAddModal(false);
          setEditingExercise(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}
```

### Muscle Group Filter Component

```tsx
function MuscleGroupFilter({ selected, onChange }: FilterProps) {
  const toggleMuscle = (muscle: MuscleGroup) => {
    if (selected.includes(muscle)) {
      onChange(selected.filter(m => m !== muscle));
    } else {
      onChange([...selected, muscle]);
    }
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
      <Button
        variant={selected.length === 0 ? "default" : "outline"}
        size="sm"
        onClick={() => onChange([])}
      >
        All
      </Button>
      {MUSCLE_GROUPS.map(muscle => (
        <Button
          key={muscle}
          variant={selected.includes(muscle) ? "default" : "outline"}
          size="sm"
          onClick={() => toggleMuscle(muscle)}
          className="whitespace-nowrap"
        >
          {formatMuscleGroup(muscle)}
        </Button>
      ))}
    </div>
  );
}
```

### Exercise Card Component

```tsx
function ExerciseCard({ exercise, onEdit, onDelete }: ExerciseCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium">{exercise.name}</p>
            {exercise.isCustom && (
              <Badge variant="secondary" className="text-xs">
                Custom
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {exercise.muscleGroups.map(muscle => (
              <Badge
                key={muscle}
                variant="outline"
                className="text-xs"
                style={{ borderColor: getMuscleColor(muscle) }}
              >
                {formatMuscleGroup(muscle)}
              </Badge>
            ))}
          </div>
        </div>

        {exercise.isCustom && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </Card>
  );
}
```

### Exercise Form Modal

```tsx
function ExerciseFormModal({ open, exercise, onClose, onSave }: ModalProps) {
  const form = useForm<ExerciseFormData>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: exercise || {
      name: '',
      muscleGroups: [],
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {exercise ? 'Edit Exercise' : 'Add Custom Exercise'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
            <FormField
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exercise Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Bulgarian Split Squat" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="muscleGroups"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Muscle Groups</FormLabel>
                  <div className="grid grid-cols-3 gap-2">
                    {MUSCLE_GROUPS.map(muscle => (
                      <label
                        key={muscle}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded border cursor-pointer",
                          field.value.includes(muscle)
                            ? "bg-primary/10 border-primary"
                            : "border-border hover:bg-muted"
                        )}
                      >
                        <Checkbox
                          checked={field.value.includes(muscle)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              field.onChange([...field.value, muscle]);
                            } else {
                              field.onChange(field.value.filter(m => m !== muscle));
                            }
                          }}
                        />
                        <span className="text-sm">{formatMuscleGroup(muscle)}</span>
                      </label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {exercise ? 'Save Changes' : 'Add Exercise'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

### Muscle Group Colors (Helper)

```typescript
const MUSCLE_COLORS: Record<MuscleGroup, string> = {
  abdos: '#ef4444',      // red
  biceps: '#f97316',     // orange
  dos: '#eab308',        // yellow
  epaules: '#22c55e',    // green
  fessiers: '#14b8a6',   // teal
  ischios: '#06b6d4',    // cyan
  lombaires: '#3b82f6',  // blue
  mollets: '#8b5cf6',    // violet
  pecs: '#d946ef',       // fuchsia
  quadriceps: '#ec4899', // pink
  trapezes: '#f43f5e',   // rose
  triceps: '#6366f1',    // indigo
};
```

---

## Constraints & What NOT To Do

- Do NOT allow editing/deleting system (non-custom) exercises
- Do NOT require equipment or seat position fields (simplified model)
- Do NOT make muscle group selection a dropdown - use checkboxes for visibility
- Do NOT delete exercises that are used in workout programs without warning
- Do NOT use heavy animations on the filter pills

---

## Scope Definition

### Files to Create
- `app/exercises/page.tsx` - Exercise library page
- `components/exercises/exercise-card.tsx`
- `components/exercises/muscle-group-filter.tsx`
- `components/exercises/exercise-form-modal.tsx`
- `lib/constants/muscle-groups.ts`
- `lib/validations/exercise.ts`

### Files NOT to Modify
- Workout pages
- Session pages
- Other feature pages

---

## Expected Output

A complete Exercise Library that:
1. Shows all exercises (system + custom)
2. Has prominent search bar with real-time filtering
3. Has muscle group filter pills (scrollable)
4. Shows exercise cards with muscle group badges
5. Distinguishes custom exercises visually
6. Allows adding new custom exercises via modal
7. Allows editing/deleting custom exercises only
8. Has appropriate empty states

---

## Visual Reference (ASCII Wireframe)

```
┌─────────────────────────────────┐
│  Exercise Library        + Add │
├─────────────────────────────────┤
│  ┌─────────────────────────┐   │
│  │ 🔍 Search exercises...  │   │
│  └─────────────────────────┘   │
│                                 │
│  [All][Pecs][Dos][Biceps][...] │
│                                 │
├─────────────────────────────────┤
│  ┌─────────────────────────┐   │
│  │ Bench Press             │   │
│  │ [Pecs] [Triceps]        │   │
│  ├─────────────────────────┤   │
│  │ Incline Dumbbell Press  │   │
│  │ [Pecs] [Epaules]        │   │
│  ├─────────────────────────┤   │
│  │ Cable Flyes             │   │
│  │ [Pecs]                  │   │
│  ├─────────────────────────┤   │
│  │ My Custom Exercise  ⋮   │   │
│  │ [Dos] [Biceps]  Custom  │   │
│  └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```
