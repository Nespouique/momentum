# AI Frontend Prompt: Authentication Pages

> **Target Tools**: Google Stitch, Lovable, v0, Bolt
> **Complexity**: Low-Medium - Standard auth forms

---

## High-Level Goal

Create the authentication pages for Momentum - Login and Registration forms. These are the entry points for users who aren't authenticated. The design should be clean, dark-themed, and consistent with the rest of the app while being straightforward and secure.

---

## Project Context

### Tech Stack
- **Framework**: Next.js 14+ with App Router
- **Styling**: Tailwind CSS + Shadcn UI (dark mode)
- **Forms**: React Hook Form + Zod validation
- **Auth**: JWT-based authentication with httpOnly cookies

### Design Philosophy
- Simple, focused forms
- Clear error messages
- Consistent with app's dark theme
- Mobile-friendly

---

## Detailed Instructions

### 1. Login Page (`/login`)

Clean login form with:
- App logo/name at top
- Email input
- Password input
- "Login" button
- Link to registration: "Don't have an account? Sign up"
- Optional: "Forgot password?" link (can be placeholder for MVP)

### 2. Registration Page (`/register`)

Registration form with:
- App logo/name at top
- Name input
- Email input
- Password input
- Confirm password input
- "Create Account" button
- Link to login: "Already have an account? Log in"

### 3. Form Validation

Client-side validation:
- **Email**: Valid email format
- **Password**: Minimum 8 characters
- **Confirm Password**: Must match password
- **Name**: Required, minimum 2 characters

Show inline error messages under each field.

### 4. Loading States

- Button shows loading spinner during submission
- Inputs disabled while submitting
- Prevent double submission

### 5. Error Handling

- Display API errors at top of form (e.g., "Email already exists")
- Field-specific errors inline
- Clear error on input change

### 6. Success Flow

- Login: Redirect to dashboard (`/`)
- Register: Auto-login and redirect to dashboard
- Show brief toast on success (optional)

### 7. Layout

- Centered card on page
- Max width ~400px
- Generous padding
- Works on mobile (full width with margin)

---

## Code Examples & Constraints

### Data Types

```typescript
// Login
interface LoginFormData {
  email: string;
  password: string;
}

// Registration
interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// API Response
interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  accessToken: string;
  expiresAt: string;
}
```

### Login Page

```tsx
// app/(auth)/login/page.tsx
export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      await login(data);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Momentum</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Log in'
              )}
            </Button>
          </form>
        </Form>

        {/* Links */}
        <div className="mt-6 text-center text-sm">
          <p className="text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
```

### Registration Page

```tsx
// app/(auth)/register/page.tsx
export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setError(null);
      await register(data);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Momentum</h1>
          <p className="text-muted-foreground mt-2">
            Create your account
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Your name"
                      autoComplete="name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
        </Form>

        {/* Links */}
        <div className="mt-6 text-center text-sm">
          <p className="text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
```

### Validation Schemas

```typescript
// lib/validations/auth.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
```

### Auth Layout

```tsx
// app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
```

---

## Constraints & What NOT To Do

- Do NOT store passwords in plain text (backend handles hashing)
- Do NOT show password in plain text (use type="password")
- Do NOT allow form submission while loading
- Do NOT forget autocomplete attributes for password managers
- Do NOT redirect authenticated users to auth pages (middleware handles this)
- Do NOT add social login buttons (out of scope for MVP)

---

## Scope Definition

### Files to Create
- `app/(auth)/layout.tsx` - Auth pages layout
- `app/(auth)/login/page.tsx` - Login page
- `app/(auth)/register/page.tsx` - Registration page
- `lib/validations/auth.ts` - Zod schemas
- `lib/auth.ts` - Auth API functions

### Files NOT to Modify
- Main app layout
- Dashboard pages
- API routes (backend)

---

## Expected Output

Complete authentication pages that:
1. Have clean, centered login form
2. Have registration form with password confirmation
3. Show inline validation errors
4. Display API errors prominently
5. Have loading states on buttons
6. Link between login and register
7. Redirect to dashboard on success
8. Work well on mobile

---

## Visual Reference (ASCII Wireframes)

### Login Page
```
┌─────────────────────────────────┐
│                                 │
│                                 │
│         MOMENTUM                │
│         Welcome back            │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Email                   │   │
│  │ you@example.com         │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Password                │   │
│  │ ••••••••                │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │        Log in           │   │
│  └─────────────────────────┘   │
│                                 │
│  Don't have an account? Sign up │
│                                 │
└─────────────────────────────────┘
```

### Registration Page
```
┌─────────────────────────────────┐
│                                 │
│         MOMENTUM                │
│       Create your account       │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Name                    │   │
│  │ Your name               │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Email                   │   │
│  │ you@example.com         │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Password                │   │
│  │ ••••••••                │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Confirm Password        │   │
│  │ ••••••••                │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │    Create Account       │   │
│  └─────────────────────────┘   │
│                                 │
│  Already have an account? Log in│
│                                 │
└─────────────────────────────────┘
```
