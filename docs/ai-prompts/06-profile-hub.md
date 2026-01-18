# AI Frontend Prompt: Profile Hub & Measurements

> **Target Tools**: Google Stitch, Lovable, v0, Bolt
> **Complexity**: Medium - Profile management with nested pages

---

## High-Level Goal

Create the Profile Hub - a central place for user settings, profile information, and body measurements tracking. This includes the main profile page with navigation to sub-pages, profile editing, measurements history, and the measurements entry form.

---

## Project Context

### Tech Stack
- **Framework**: Next.js 14+ with App Router
- **Styling**: Tailwind CSS + Shadcn UI (dark mode)
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod validation

### Design Philosophy
- Clean, organized settings layout
- Easy navigation to sub-sections
- Measurements should be easy to enter (many optional fields)

---

## Detailed Instructions

### 1. Profile Hub Page (`/profile`)

Main profile page showing:
- User avatar (placeholder or initials)
- User name and email
- Navigation links to sub-pages:
  - Measurements
  - Tracking Config
  - Edit Profile
  - Settings
- Logout button at bottom

### 2. Navigation Links

Each link should be a card/row with:
- Icon on the left
- Label
- Arrow (→) on the right
- Tap to navigate

Navigation items:
| Icon | Label | Route |
|------|-------|-------|
| `Ruler` | Measurements | `/profile/measurements` |
| `BarChart3` | Tracking Config | `/settings/trackables` |
| `User` | Edit Profile | `/profile/edit` |
| `Settings` | Settings | `/settings` |

### 3. Edit Profile Page (`/profile/edit`)

Form fields:
- **Name** (required)
- **Email** (read-only, shown but not editable)
- **Age** (optional, number)
- **Height** (optional, in cm)
- **Goal description** (optional, textarea)

Save button with loading state.

### 4. Change Password Section

Either on the edit page or separate:
- Current password
- New password
- Confirm new password
- Submit button

### 5. Measurements Page (`/profile/measurements`)

List of measurement entries:
- Sorted by date (most recent first)
- Each card shows: date, weight, key highlights
- Tap to view/edit details
- "Add Measurement" button (floating or at top)

### 6. Add/Edit Measurement Form

Comprehensive form with all body measurements:
- **Date** (date picker, default today)
- **Weight** (kg)

Grouped by body area:
- **Upper Body**: neck, shoulders, chest
- **Arms**: biceps L/R, forearm L/R, wrist L/R
- **Core**: waist, hips
- **Legs**: thigh L/R, calf L/R, ankle L/R

All measurements in cm, all optional except date.
- **Notes** (optional textarea)

### 7. Measurement Detail View

When viewing a measurement:
- Show all recorded values
- Group by body area
- Show comparison with previous measurement (delta)
- Edit and Delete buttons

---

## Code Examples & Constraints

### Data Types

```typescript
interface UserProfile {
  id: string;
  email: string;
  name: string;
  age: number | null;
  height: number | null;
  goalDescription: string | null;
}

interface Measurement {
  id: string;
  date: Date;
  weight: number | null;
  neck: number | null;
  shoulders: number | null;
  chest: number | null;
  bicepsLeft: number | null;
  bicepsRight: number | null;
  forearmLeft: number | null;
  forearmRight: number | null;
  wristLeft: number | null;
  wristRight: number | null;
  waist: number | null;
  hips: number | null;
  thighLeft: number | null;
  thighRight: number | null;
  calfLeft: number | null;
  calfRight: number | null;
  ankleLeft: number | null;
  ankleRight: number | null;
  notes: string | null;
}
```

### Profile Hub Page

```tsx
// app/profile/page.tsx
export default function ProfileHub() {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-6">
      {/* User Info */}
      <div className="flex flex-col items-center py-6">
        <Avatar className="w-20 h-20 mb-4">
          <AvatarFallback className="text-2xl">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
        <h1 className="text-xl font-semibold">{user.name}</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>

      {/* Navigation Links */}
      <div className="space-y-2">
        <ProfileNavLink
          href="/profile/measurements"
          icon={Ruler}
          label="Measurements"
        />
        <ProfileNavLink
          href="/settings/trackables"
          icon={BarChart3}
          label="Tracking Config"
        />
        <ProfileNavLink
          href="/profile/edit"
          icon={User}
          label="Edit Profile"
        />
        <ProfileNavLink
          href="/settings"
          icon={Settings}
          label="Settings"
        />
      </div>

      {/* Logout */}
      <Button
        variant="outline"
        className="w-full text-destructive"
        onClick={logout}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Logout
      </Button>
    </div>
  );
}

function ProfileNavLink({ href, icon: Icon, label }: NavLinkProps) {
  return (
    <Link href={href}>
      <Card className="p-4 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-muted-foreground" />
          <span className="flex-1 font-medium">{label}</span>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </Card>
    </Link>
  );
}
```

### Measurements List Page

```tsx
// app/profile/measurements/page.tsx
export default function MeasurementsPage() {
  const { data: measurements } = useQuery(['measurements'], fetchMeasurements);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Measurements</h1>
          <p className="text-sm text-muted-foreground">
            Track your body changes over time
          </p>
        </div>
        <Button asChild>
          <Link href="/profile/measurements/new">
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Link>
        </Button>
      </div>

      {/* Latest Summary */}
      {measurements?.[0] && (
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Latest</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {measurements[0].weight}
            </span>
            <span className="text-muted-foreground">kg</span>
            {/* Delta from previous */}
            {measurements[1] && (
              <DeltaBadge
                current={measurements[0].weight}
                previous={measurements[1].weight}
              />
            )}
          </div>
        </Card>
      )}

      {/* History List */}
      <div className="space-y-2">
        {measurements?.map(m => (
          <MeasurementCard key={m.id} measurement={m} />
        ))}
      </div>

      {(!measurements || measurements.length === 0) && (
        <EmptyState
          icon={Ruler}
          title="No measurements yet"
          description="Start tracking your body measurements"
          action={
            <Button asChild>
              <Link href="/profile/measurements/new">Add First Measurement</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
```

### Measurement Form

```tsx
// components/profile/measurement-form.tsx
export function MeasurementForm({ defaultValues, onSubmit }: FormProps) {
  const form = useForm<MeasurementFormData>({
    resolver: zodResolver(measurementSchema),
    defaultValues: defaultValues || {
      date: new Date(),
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Date */}
        <FormField
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <DatePicker value={field.value} onChange={field.onChange} />
            </FormItem>
          )}
        />

        {/* Weight */}
        <FormField
          name="weight"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Weight (kg)</FormLabel>
              <Input type="number" step={0.1} {...field} />
            </FormItem>
          )}
        />

        {/* Upper Body */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium">
            <ChevronDown className="w-4 h-4" />
            Upper Body
          </CollapsibleTrigger>
          <CollapsibleContent className="grid grid-cols-2 gap-4 pt-4">
            <MeasurementInput name="neck" label="Neck (cm)" />
            <MeasurementInput name="shoulders" label="Shoulders (cm)" />
            <MeasurementInput name="chest" label="Chest (cm)" className="col-span-2" />
          </CollapsibleContent>
        </Collapsible>

        {/* Arms */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium">
            <ChevronDown className="w-4 h-4" />
            Arms
          </CollapsibleTrigger>
          <CollapsibleContent className="grid grid-cols-2 gap-4 pt-4">
            <MeasurementInput name="bicepsLeft" label="Biceps L (cm)" />
            <MeasurementInput name="bicepsRight" label="Biceps R (cm)" />
            <MeasurementInput name="forearmLeft" label="Forearm L (cm)" />
            <MeasurementInput name="forearmRight" label="Forearm R (cm)" />
            <MeasurementInput name="wristLeft" label="Wrist L (cm)" />
            <MeasurementInput name="wristRight" label="Wrist R (cm)" />
          </CollapsibleContent>
        </Collapsible>

        {/* Core */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium">
            <ChevronDown className="w-4 h-4" />
            Core
          </CollapsibleTrigger>
          <CollapsibleContent className="grid grid-cols-2 gap-4 pt-4">
            <MeasurementInput name="waist" label="Waist (cm)" />
            <MeasurementInput name="hips" label="Hips (cm)" />
          </CollapsibleContent>
        </Collapsible>

        {/* Legs */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium">
            <ChevronDown className="w-4 h-4" />
            Legs
          </CollapsibleTrigger>
          <CollapsibleContent className="grid grid-cols-2 gap-4 pt-4">
            <MeasurementInput name="thighLeft" label="Thigh L (cm)" />
            <MeasurementInput name="thighRight" label="Thigh R (cm)" />
            <MeasurementInput name="calfLeft" label="Calf L (cm)" />
            <MeasurementInput name="calfRight" label="Calf R (cm)" />
            <MeasurementInput name="ankleLeft" label="Ankle L (cm)" />
            <MeasurementInput name="ankleRight" label="Ankle R (cm)" />
          </CollapsibleContent>
        </Collapsible>

        {/* Notes */}
        <FormField
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optional)</FormLabel>
              <Textarea {...field} placeholder="Morning measurement, fasted..." />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Save Measurement
        </Button>
      </form>
    </Form>
  );
}
```

---

## Constraints & What NOT To Do

- Do NOT require all measurement fields (only date is required)
- Do NOT show email as editable (it's the login identifier)
- Do NOT allow deleting the account from this page
- Do NOT make the measurement form overwhelming - use collapsible sections
- Do NOT forget to show units (kg, cm)

---

## Scope Definition

### Files to Create
- `app/profile/page.tsx` - Profile hub
- `app/profile/edit/page.tsx` - Edit profile form
- `app/profile/measurements/page.tsx` - Measurements list
- `app/profile/measurements/new/page.tsx` - New measurement
- `app/profile/measurements/[id]/page.tsx` - View/edit measurement
- `components/profile/profile-nav-link.tsx`
- `components/profile/measurement-form.tsx`
- `components/profile/measurement-card.tsx`
- `components/profile/delta-badge.tsx`

### Files NOT to Modify
- Layout components
- Auth pages
- Other feature pages

---

## Expected Output

A complete Profile Hub that:
1. Shows user info with avatar
2. Provides navigation to all profile sub-pages
3. Has logout functionality
4. Lists measurements with latest summary
5. Allows adding new measurements with collapsible form sections
6. Shows comparison with previous measurements
7. Supports editing and deleting measurements

---

## Visual Reference (ASCII Wireframe)

### Profile Hub
```
┌─────────────────────────────────┐
│  Profile                   ⚙   │
├─────────────────────────────────┤
│                                 │
│         ┌─────┐                │
│         │ EL  │                │
│         └─────┘                │
│         Elliot                  │
│    elliot@example.com          │
│                                 │
├─────────────────────────────────┤
│  ┌─────────────────────────┐   │
│  │ 📏  Measurements    →   │   │
│  ├─────────────────────────┤   │
│  │ 📊  Tracking Config →   │   │
│  ├─────────────────────────┤   │
│  │ 👤  Edit Profile    →   │   │
│  ├─────────────────────────┤   │
│  │ ⚙   Settings        →   │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ 🚪  Logout              │   │
│  └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

### Measurements List
```
┌─────────────────────────────────┐
│  Measurements            + Add │
│  Track your body changes       │
├─────────────────────────────────┤
│  ┌─────────────────────────┐   │
│  │ Latest                  │   │
│  │ 75.5 kg    ▼ -0.5      │   │
│  └─────────────────────────┘   │
├─────────────────────────────────┤
│  ┌─────────────────────────┐   │
│  │ Jan 17, 2026            │   │
│  │ 75.5 kg · Chest 100cm → │   │
│  ├─────────────────────────┤   │
│  │ Jan 10, 2026            │   │
│  │ 76.0 kg · Chest 99cm  → │   │
│  ├─────────────────────────┤   │
│  │ Jan 3, 2026             │   │
│  │ 76.5 kg · Chest 99cm  → │   │
│  └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```
