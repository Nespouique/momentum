# AI Frontend Prompt: Tracking Configuration

> **Target Tools**: Google Stitch, Lovable, v0, Bolt
> **Complexity**: Medium - Configuration UI with drag & drop

---

## High-Level Goal

Create the Tracking Configuration page - where users set up what habits they want to track daily. Users can enable/disable trackable items, create custom ones, configure goals (daily, weekly, monthly), and reorder items. This controls what appears on the Today Dashboard.

---

## Project Context

### Tech Stack
- **Framework**: Next.js 14+ with App Router
- **Styling**: Tailwind CSS + Shadcn UI (dark mode)
- **Icons**: Lucide React (user selectable)
- **Forms**: React Hook Form + Zod
- **Drag & Drop**: @hello-pangea/dnd or dnd-kit

### Design Philosophy
- Clear on/off toggles for each item
- Visual preview of how items will appear
- Flexible goal configuration
- Easy reordering for dashboard priority

---

## Detailed Instructions

### 1. Page Header

- Title: "Tracking Configuration"
- Subtitle: "Configure what you want to track daily"
- "+ Add" button for new trackables

### 2. Trackable Items List

List of all trackable items (active and inactive):
- Drag handle for reordering
- Icon preview
- Item name
- Type indicator (checkbox, number, duration)
- Toggle switch (on/off)
- Settings button (gear icon)

### 3. Special "Workout" Item

One trackable is special:
- Name: "Workout"
- Type: linked to fitness module
- Cannot be deleted or edited (only toggled)
- Shows "Linked to fitness module" indicator

### 4. Trackable Item Card

Each item shows:
- Drag handle (≡)
- Colored icon
- Name
- Type badge (Boolean / Number / Duration)
- Goal summary (e.g., "10,000 daily" or "5x weekly")
- Active toggle
- Settings (gear) button

### 5. Add New Trackable

Modal/drawer form:
- **Name** (required): Text input
- **Icon** (required): Icon picker (Lucide icons)
- **Color** (required): Color picker (preset palette)
- **Type** (required): Select (Boolean, Number, Duration)
- **Unit** (if Number/Duration): Text input (e.g., "steps", "minutes")

### 6. Goal Configuration

Separate modal/section for goal setup:
- **Frequency**: Daily / Weekly / Monthly
- **Target Value**: Number input
- For Boolean: target is implicit (1 = done)
- For Number/Duration: explicit target

Examples:
- Yoga: Boolean, Daily, target = complete once/day
- Steps: Number, Daily, target = 10,000
- Reading: Duration, Weekly, target = 150 minutes

### 7. Edit Trackable

Same form as Add, pre-filled.
For system/workout item: only toggle is available.

### 8. Delete Trackable

- Confirmation dialog
- Warning about losing historical data
- Cannot delete "Workout" item

### 9. Reorder Items

- Drag and drop to reorder
- Order affects dashboard display order
- Top items appear first in "TO DO" section

---

## Code Examples & Constraints

### Data Types

```typescript
interface TrackableItem {
  id: string;
  userId: string;
  name: string;
  icon: string;           // Lucide icon name
  color: string;          // Hex color
  trackingType: 'boolean' | 'number' | 'duration';
  unit: string | null;    // e.g., "steps", "min"
  isActive: boolean;
  order: number;
  isSystem: boolean;      // true for "workout" item
  createdAt: Date;
}

interface TrackableGoal {
  id: string;
  trackableId: string;
  targetValue: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date | null;
}

interface TrackableWithGoal extends TrackableItem {
  currentGoal: TrackableGoal | null;
}
```

### Page Structure

```tsx
// app/settings/trackables/page.tsx
export default function TrackingConfigPage() {
  const { data: trackables } = useQuery(['trackables'], fetchTrackables);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<TrackableItem | null>(null);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const reordered = reorder(trackables, result.source.index, result.destination.index);
    updateOrder(reordered);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Tracking Configuration</h1>
        <p className="text-sm text-muted-foreground">
          Configure what you want to track daily
        </p>
      </div>

      {/* Add Button */}
      <Button onClick={() => setShowAddModal(true)} className="w-full">
        <Plus className="w-4 h-4 mr-2" />
        Add Trackable Item
      </Button>

      {/* Trackables List */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="trackables">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="space-y-2"
            >
              {trackables?.map((item, index) => (
                <TrackableConfigCard
                  key={item.id}
                  item={item}
                  index={index}
                  onToggle={() => toggleActive(item.id)}
                  onEdit={() => setEditingItem(item)}
                  onDelete={() => handleDelete(item)}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add/Edit Modal */}
      <TrackableFormModal
        open={showAddModal || !!editingItem}
        item={editingItem}
        onClose={() => {
          setShowAddModal(false);
          setEditingItem(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}
```

### Trackable Config Card

```tsx
function TrackableConfigCard({ item, index, onToggle, onEdit, onDelete }: CardProps) {
  const Icon = getLucideIcon(item.icon);

  return (
    <Draggable draggableId={item.id} index={index} isDragDisabled={item.isSystem}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            "p-4",
            snapshot.isDragging && "ring-2 ring-primary",
            !item.isActive && "opacity-50"
          )}
        >
          <div className="flex items-center gap-3">
            {/* Drag Handle */}
            {!item.isSystem && (
              <div
                {...provided.dragHandleProps}
                className="text-muted-foreground hover:text-foreground cursor-grab"
              >
                <GripVertical className="w-5 h-5" />
              </div>
            )}

            {/* Icon */}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${item.color}20` }}
            >
              <Icon className="w-5 h-5" style={{ color: item.color }} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{item.name}</p>
                {item.isSystem && (
                  <Badge variant="secondary" className="text-xs">
                    System
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatTrackingType(item.trackingType)}
                {item.currentGoal && ` · ${formatGoal(item.currentGoal)}`}
              </p>
            </div>

            {/* Toggle */}
            <Switch
              checked={item.isActive}
              onCheckedChange={onToggle}
            />

            {/* Settings */}
            {!item.isSystem && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowGoalModal(true)}>
                    <Target className="w-4 h-4 mr-2" />
                    Set Goal
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
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
      )}
    </Draggable>
  );
}
```

### Trackable Form Modal

```tsx
function TrackableFormModal({ open, item, onClose, onSave }: ModalProps) {
  const form = useForm<TrackableFormData>({
    defaultValues: item || {
      name: '',
      icon: 'circle',
      color: '#3b82f6',
      trackingType: 'boolean',
      unit: null,
    },
  });

  const trackingType = form.watch('trackingType');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {item ? 'Edit Trackable' : 'Add Trackable Item'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
            {/* Name */}
            <FormField
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <Input placeholder="e.g., Morning Yoga" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Icon & Color Row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <IconPicker value={field.value} onChange={field.onChange} />
                  </FormItem>
                )}
              />
              <FormField
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <ColorPicker value={field.value} onChange={field.onChange} />
                  </FormItem>
                )}
              />
            </div>

            {/* Tracking Type */}
            <FormField
              name="trackingType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="boolean">
                        Checkbox (done/not done)
                      </SelectItem>
                      <SelectItem value="number">
                        Number (e.g., steps, pages)
                      </SelectItem>
                      <SelectItem value="duration">
                        Duration (minutes)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {/* Unit (for number/duration) */}
            {(trackingType === 'number' || trackingType === 'duration') && (
              <FormField
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Input
                      placeholder={trackingType === 'duration' ? 'min' : 'e.g., steps'}
                      {...field}
                    />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {item ? 'Save Changes' : 'Add Item'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

### Icon Picker Component

```tsx
// Simple icon picker with common Lucide icons
const COMMON_ICONS = [
  'activity', 'heart', 'book', 'coffee', 'sun', 'moon',
  'footprints', 'dumbbell', 'bike', 'music', 'pen', 'code',
  'leaf', 'droplet', 'flame', 'zap', 'star', 'target',
];

function IconPicker({ value, onChange }: PickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          {React.createElement(getLucideIcon(value), { className: "w-4 h-4 mr-2" })}
          {value}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="grid grid-cols-6 gap-2">
          {COMMON_ICONS.map(icon => {
            const Icon = getLucideIcon(icon);
            return (
              <Button
                key={icon}
                variant={value === icon ? "default" : "ghost"}
                size="icon"
                onClick={() => onChange(icon)}
              >
                <Icon className="w-4 h-4" />
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

---

## Constraints & What NOT To Do

- Do NOT allow deleting or editing the "Workout" system item (only toggle)
- Do NOT allow duplicate names
- Do NOT make the icon picker too complex (limited preset icons is fine)
- Do NOT forget to persist order changes
- Do NOT show inactive items on the dashboard

---

## Scope Definition

### Files to Create
- `app/settings/trackables/page.tsx` - Configuration page
- `components/tracking/trackable-config-card.tsx`
- `components/tracking/trackable-form-modal.tsx`
- `components/tracking/goal-form-modal.tsx`
- `components/tracking/icon-picker.tsx`
- `components/tracking/color-picker.tsx`
- `lib/validations/trackable.ts`

### Files NOT to Modify
- Dashboard page
- Other settings pages
- Layout components

---

## Expected Output

A complete Tracking Configuration page that:
1. Lists all trackables with drag reordering
2. Shows icon, name, type, and goal summary
3. Has toggle switch for active/inactive
4. Allows adding new custom trackables
5. Has icon and color pickers
6. Supports goal configuration (daily/weekly/monthly)
7. Protects system items from deletion
8. Persists order for dashboard display

---

## Visual Reference (ASCII Wireframe)

```
┌─────────────────────────────────┐
│  Tracking Configuration        │
│  Configure what you track      │
├─────────────────────────────────┤
│  ┌─────────────────────────┐   │
│  │  + Add Trackable Item   │   │
│  └─────────────────────────┘   │
├─────────────────────────────────┤
│  ┌─────────────────────────┐   │
│  │ ≡ 💪 Workout    [ON]  ⚙│   │
│  │   System · 1x daily     │   │
│  ├─────────────────────────┤   │
│  │ ≡ 🧘 Yoga       [ON]  ⚙│   │
│  │   Boolean · Daily       │   │
│  ├─────────────────────────┤   │
│  │ ≡ 👟 Steps      [ON]  ⚙│   │
│  │   Number · 10,000 daily │   │
│  ├─────────────────────────┤   │
│  │ ≡ 📖 Reading    [ON]  ⚙│   │
│  │   Duration · 30min daily│   │
│  ├─────────────────────────┤   │
│  │ ≡ 🧘 Meditation [OFF] ⚙│   │
│  │   Duration · Inactive   │   │
│  └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```
