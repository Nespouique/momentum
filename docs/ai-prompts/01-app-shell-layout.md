# AI Frontend Prompt: App Shell & Layout

> **Target Tools**: Google Stitch, Lovable, v0, Bolt
> **Complexity**: Foundation - Build this first

---

## High-Level Goal

Create a responsive app shell layout for a fitness and habit tracking PWA called "Momentum". The layout should feature a bottom navigation bar on mobile and a sidebar on desktop, with a dark theme using Shadcn UI components.

---

## Project Context

### Tech Stack
- **Framework**: Next.js 14+ with App Router
- **Styling**: Tailwind CSS + Shadcn UI (dark mode default)
- **Icons**: Lucide React
- **Fonts**: Inter (UI text), JetBrains Mono (numbers/timers)
- **State**: Zustand + React Query

### Design Philosophy
- Dark mode native (no light mode toggle needed)
- Mobile-first, touch-optimized
- Subtle, fintech-style aesthetics (not gamey/childish)
- "Log first, analyze later" - prioritize quick actions

---

## Detailed Instructions

### 1. Create the Root Layout Structure

Create a layout component that:
- Wraps all authenticated pages
- Provides consistent navigation
- Adapts between mobile (bottom nav) and desktop (sidebar)
- Uses Shadcn UI's dark theme colors

### 2. Mobile Navigation (Bottom Tab Bar)

Create a fixed bottom navigation bar with 4 items:

| Icon | Label | Route | Description |
|------|-------|-------|-------------|
| `Home` | Today | `/` | Daily dashboard |
| `Dumbbell` | Workouts | `/workouts` | Programs & sessions |
| `TrendingUp` | Progress | `/progress` | Stats & charts |
| `User` | Profile | `/profile` | User settings |

Specifications:
- Fixed at bottom, height 64px
- Background: `--background` with subtle top border
- Active item: highlighted with accent color
- Touch targets: minimum 48px
- Hide during active workout session

### 3. Desktop Sidebar Navigation

Create a fixed left sidebar for screens >= 1024px:

Specifications:
- Width: 240px (collapsed: 64px with icons only)
- Same 4 navigation items as mobile
- App logo/name at top
- User avatar + name at bottom
- Subtle hover states

### 4. Main Content Area

- Mobile: full width with `px-4` padding
- Desktop: `max-w-4xl mx-auto` centered
- Scrollable content area
- Safe area insets for PWA

### 5. Page Header Component

Create a reusable `PageHeader` component:
```tsx
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  showBack?: boolean;
}
```

---

## Code Examples & Constraints

### Color Palette (Shadcn Dark Theme)

```css
--background: #0a0a0a;
--foreground: #fafafa;
--card: #0a0a0a;
--card-foreground: #fafafa;
--primary: #fafafa;
--primary-foreground: #0a0a0a;
--secondary: #27272a;
--secondary-foreground: #fafafa;
--muted: #27272a;
--muted-foreground: #a1a1aa;
--accent: #27272a;
--accent-foreground: #fafafa;
--border: #27272a;
```

### Accent Colors

```css
--accent-blue: #3b82f6;    /* Links, focus rings */
--accent-orange: #f97316;  /* Streaks, fire */
--accent-green: #22c55e;   /* Success, completed */
--accent-yellow: #eab308;  /* Warnings */
--accent-red: #ef4444;     /* Errors, destructive */
```

### Navigation Component Structure

```tsx
// components/layout/app-layout.tsx
export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar - hidden on mobile */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-60 lg:flex-col">
        <DesktopSidebar />
      </aside>

      {/* Main content */}
      <main className="lg:pl-60">
        <div className="mx-auto max-w-4xl px-4 py-6 pb-20 lg:pb-6">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav - hidden on desktop */}
      <nav className="fixed bottom-0 left-0 right-0 lg:hidden">
        <MobileBottomNav />
      </nav>
    </div>
  );
}
```

### Bottom Nav Item

```tsx
interface NavItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
}

function NavItem({ href, icon: Icon, label, isActive }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center gap-1 py-2 px-4 min-w-[64px]",
        isActive
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}
```

---

## Constraints & What NOT To Do

- Do NOT include a light mode toggle
- Do NOT use colors outside the defined palette
- Do NOT make the bottom nav taller than 64px
- Do NOT use custom CSS - only Tailwind utilities
- Do NOT add animations to navigation (keep it snappy)
- Do NOT include any workout session UI in the layout

---

## Scope Definition

### Files to Create
- `components/layout/app-layout.tsx` - Main layout wrapper
- `components/layout/mobile-bottom-nav.tsx` - Bottom navigation
- `components/layout/desktop-sidebar.tsx` - Desktop sidebar
- `components/layout/page-header.tsx` - Reusable header
- `components/layout/nav-item.tsx` - Navigation item component

### Files NOT to Modify
- Do not modify any page files
- Do not modify global styles beyond Shadcn theme
- Do not create any API routes

---

## Expected Output

A fully responsive app shell that:
1. Shows bottom nav on mobile (< 1024px)
2. Shows sidebar on desktop (>= 1024px)
3. Highlights the active navigation item
4. Provides consistent padding and max-width for content
5. Uses only Shadcn UI dark theme colors
6. Is ready to wrap authenticated pages

---

## Visual Reference (ASCII Wireframe)

### Mobile Layout
```
┌─────────────────────────────────┐
│  Page Header                    │
├─────────────────────────────────┤
│                                 │
│                                 │
│        Main Content             │
│        (scrollable)             │
│                                 │
│                                 │
├─────────────────────────────────┤
│  🏠    💪    📈    👤          │
│  Today Workouts Progress Profile│
└─────────────────────────────────┘
```

### Desktop Layout
```
┌────────────┬────────────────────────────────────┐
│            │                                    │
│  MOMENTUM  │  Page Header                       │
│            │                                    │
│  ─────────│────────────────────────────────────│
│            │                                    │
│  🏠 Today  │                                    │
│  💪 Workouts│       Main Content                │
│  📈 Progress│       (max-w-4xl centered)        │
│  👤 Profile │                                   │
│            │                                    │
│            │                                    │
│  ─────────│                                    │
│  👤 Elliot │                                    │
└────────────┴────────────────────────────────────┘
```
