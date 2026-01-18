# Momentum - Architecture Document

## 1. Introduction

### 1.1 Purpose

This document defines the comprehensive technical architecture for **Momentum**, a personal habit tracking web application with a strong focus on fitness and progressive overload tracking. It serves as the authoritative reference for all development decisions.

### 1.2 Scope

This architecture covers the MVP (Minimum Viable Product) implementation including:

- Full-stack web application (frontend + backend)
- Database design and data models
- API specification
- Deployment infrastructure
- Testing strategy

### 1.3 Project Type

**Greenfield** - New application built from scratch with modern technologies.

### 1.4 Monorepo Strategy

**npm workspaces** - Chosen for simplicity in a single-developer project. Provides:

- Unified dependency management
- Shared packages between frontend and backend
- Simple scripts orchestration
- No additional tooling complexity (vs Turborepo/Nx)

---

## 2. High-Level Architecture

### 2.1 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        PROXMOX LXC                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   DOCKER ENVIRONMENT                       │  │
│  │                                                            │  │
│  │  ┌─────────────┐    ┌─────────────┐    ┌──────────────┐  │  │
│  │  │   Next.js   │    │   Express   │    │  PostgreSQL  │  │  │
│  │  │  Frontend   │───▶│   Backend   │───▶│   Database   │  │  │
│  │  │  (Port 3000)│    │  (Port 3001)│    │  (Port 5432) │  │  │
│  │  └─────────────┘    └─────────────┘    └──────────────┘  │  │
│  │         │                  │                              │  │
│  └─────────│──────────────────│──────────────────────────────┘  │
│            │                  │                                  │
│  ┌─────────▼──────────────────▼──────────────────────────────┐  │
│  │              NGINX PROXY MANAGER                           │  │
│  │         (Reverse Proxy + SSL/Let's Encrypt)                │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                      PORTAINER                              │  │
│  │                  (Container Management)                     │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │     INTERNET    │
                    │   (HTTPS/443)   │
                    └─────────────────┘
```

### 2.2 Architecture Style

**Monolithe modulaire** avec séparation claire frontend/backend:

- **Frontend**: Next.js App Router (SSR + Client Components)
- **Backend**: Express.js API REST
- **Database**: PostgreSQL avec Prisma ORM

### 2.3 Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend Framework | Next.js 14+ (App Router) | SSR, excellent DX, Shadcn UI compatibility |
| Backend Framework | Express.js séparé | Découplage, flexibilité, pas de lock-in Next.js API |
| Database | PostgreSQL | ACID compliance, relations complexes, JSON support |
| ORM | Prisma 7 | Type-safety, migrations, excellent DX |
| State Management | Zustand + React Query | Simple, performant, séparation client/server state |
| Styling | Tailwind CSS + Shadcn UI | Dark mode natif, composants accessibles |

---

## 3. Tech Stack

### 3.1 Complete Technology Matrix

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Frontend** | Next.js | 14.x+ | React framework with App Router |
| | React | 18.x+ | UI library |
| | TypeScript | 5.x | Type safety |
| | Tailwind CSS | 3.x | Utility-first styling |
| | Shadcn UI | latest | Component library (dark mode) |
| | Zustand | 4.x | Client state management |
| | React Query | 5.x | Server state management |
| | React Hook Form | 7.x | Form management |
| | Zod | 3.x | Schema validation |
| | Lucide React | latest | Icons |
| **Backend** | Node.js | 20 LTS | Runtime |
| | Express.js | 4.x | Web framework |
| | TypeScript | 5.x | Type safety |
| | Prisma | 7.x | ORM & migrations |
| | Zod | 3.x | Request validation |
| | bcrypt | 5.x | Password hashing |
| | jsonwebtoken | 9.x | JWT authentication |
| | pino | 8.x | Structured logging |
| | helmet | 7.x | Security headers |
| | cors | 2.x | CORS handling |
| | express-rate-limit | 7.x | Rate limiting |
| **Database** | PostgreSQL | 16.x | Primary database |
| **Testing** | Vitest | 1.x | Unit & integration tests |
| | Supertest | 6.x | API testing |
| | Testing Library | 14.x | Component testing |
| | Playwright | 1.x | E2E testing (Phase 2) |
| **DevOps** | Docker | latest | Containerization |
| | Docker Compose | latest | Local orchestration |
| | GitHub Actions | - | CI/CD |
| | Nginx Proxy Manager | latest | Reverse proxy & SSL |

---

## 4. Data Models

### 4.1 Core TypeScript Interfaces

```typescript
// packages/shared/src/types/index.ts

// ============================================
// USER & AUTH
// ============================================

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  expiresAt: Date;
}

// ============================================
// MEASUREMENTS (Body Tracking)
// ============================================

export interface Measurement {
  id: string;
  userId: string;
  date: Date;
  // Weight in kg
  weight: number | null;
  // All measurements in cm
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
  createdAt: Date;
}

// ============================================
// EXERCISES
// ============================================

export const MUSCLE_GROUPS = [
  'abdos',
  'biceps',
  'dos',
  'epaules',
  'fessiers',
  'ischios',
  'lombaires',
  'mollets',
  'pecs',
  'quadriceps',
  'trapezes',
  'triceps',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export interface Exercise {
  id: string;
  name: string;
  muscleGroups: MuscleGroup[];
  isCustom: boolean;
  userId: string | null; // null for system exercises
  createdAt: Date;
}

// ============================================
// WORKOUTS (Templates)
// ============================================

export interface Workout {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  exercises: WorkoutExercise[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkoutExercise {
  id: string;
  workoutId: string;
  exerciseId: string;
  exercise?: Exercise;
  order: number;
  targetSets: number;
  targetReps: number;
  targetWeight: number | null;
  restBetweenSets: number; // seconds
  restAfterExercise: number; // seconds
}

// ============================================
// WORKOUT SESSIONS (Actual Performances)
// ============================================

export type SessionStatus = 'in_progress' | 'completed' | 'abandoned';

export interface WorkoutSession {
  id: string;
  userId: string;
  workoutId: string;
  workout?: Workout;
  status: SessionStatus;
  startedAt: Date;
  completedAt: Date | null;
  sets: Set[];
  notes: string | null;
}

export interface Set {
  id: string;
  sessionId: string;
  exerciseId: string;
  exercise?: Exercise;
  setNumber: number;
  reps: number;
  weight: number;
  rpe: number | null; // Rate of Perceived Exertion (1-10)
  completedAt: Date;
}

// ============================================
// PROGRESSION
// ============================================

export type SuggestionType = 'increase_weight' | 'increase_reps' | 'increase_sets';
export type SuggestionStatus = 'pending' | 'accepted' | 'dismissed';

export interface ProgressionSuggestion {
  id: string;
  userId: string;
  exerciseId: string;
  exercise?: Exercise;
  suggestionType: SuggestionType;
  currentValue: number;
  suggestedValue: number;
  reason: string;
  status: SuggestionStatus;
  createdAt: Date;
}

// ============================================
// CUSTOM TRACKING (Habits)
// ============================================

export type TrackingType = 'boolean' | 'number' | 'duration';
export type GoalFrequency = 'daily' | 'weekly' | 'monthly';

export interface TrackableItem {
  id: string;
  userId: string;
  name: string;
  icon: string;
  color: string;
  trackingType: TrackingType;
  unit: string | null; // e.g., "steps", "minutes"
  isActive: boolean;
  createdAt: Date;
}

export interface TrackableGoal {
  id: string;
  trackableId: string;
  targetValue: number;
  frequency: GoalFrequency;
  startDate: Date;
  endDate: Date | null;
}

export interface DailyEntry {
  id: string;
  trackableId: string;
  trackable?: TrackableItem;
  date: Date;
  value: number; // boolean=0/1, number=value, duration=minutes
  notes: string | null;
  createdAt: Date;
}

// ============================================
// STREAKS
// ============================================

export interface Streak {
  id: string;
  userId: string;
  trackableId: string | null; // null for global workout streak
  trackable?: TrackableItem;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date;
  updatedAt: Date;
}
```

### 4.2 Data Relationships Diagram

```
┌──────────┐       ┌─────────────┐       ┌──────────────────┐
│   User   │──────<│   Workout   │──────<│ WorkoutExercise  │
└──────────┘  1:N  └─────────────┘  1:N  └──────────────────┘
     │                   │                        │
     │                   │                        │
     │              ┌────▼────────┐         ┌─────▼─────┐
     │              │WorkoutSession│────────<│    Set    │
     │              └─────────────┘   1:N   └───────────┘
     │                                            │
     │         ┌──────────┐                       │
     └────────<│ Exercise │<──────────────────────┘
     │    1:N  └──────────┘
     │
     │         ┌─────────────┐       ┌──────────────┐
     └────────<│TrackableItem│──────<│  DailyEntry  │
     │    1:N  └─────────────┘  1:N  └──────────────┘
     │              │
     │              │         ┌──────────────┐
     │              └────────<│ TrackableGoal│
     │                   1:N  └──────────────┘
     │
     │         ┌─────────────┐
     └────────<│ Measurement │
     │    1:N  └─────────────┘
     │
     │         ┌─────────────┐
     └────────<│   Streak    │
          1:N  └─────────────┘
```

---

## 5. API Specification

### 5.1 Base Configuration

- **Base URL**: `/api/v1`
- **Content-Type**: `application/json`
- **Authentication**: Bearer token in `Authorization` header

### 5.2 Authentication Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Create new account | No |
| POST | `/auth/login` | Authenticate user | No |
| POST | `/auth/logout` | Invalidate token | Yes |
| GET | `/auth/me` | Get current user | Yes |

#### Request/Response Examples

```typescript
// POST /auth/register
// Request
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
// Response 201
{
  "user": { "id": "uuid", "email": "...", "name": "..." },
  "accessToken": "jwt...",
  "expiresAt": "2024-01-15T..."
}

// POST /auth/login
// Request
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
// Response 200
{
  "user": { "id": "uuid", "email": "...", "name": "..." },
  "accessToken": "jwt...",
  "expiresAt": "2024-01-15T..."
}
```

### 5.3 User Profile Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/profile` | Get user profile | Yes |
| PATCH | `/profile` | Update profile | Yes |
| PUT | `/profile/password` | Change password | Yes |

### 5.4 Measurements Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/measurements` | List measurements | Yes |
| GET | `/measurements/:id` | Get single measurement | Yes |
| POST | `/measurements` | Create measurement | Yes |
| PUT | `/measurements/:id` | Update measurement | Yes |
| DELETE | `/measurements/:id` | Delete measurement | Yes |
| GET | `/measurements/latest` | Get most recent | Yes |
| GET | `/measurements/progress` | Get progress data | Yes |

#### Request/Response Examples

```typescript
// POST /measurements
// Request
{
  "date": "2024-01-15",
  "weight": 75.5,
  "neck": 38,
  "shoulders": 115,
  "chest": 100,
  "bicepsLeft": 35,
  "bicepsRight": 35.5,
  "forearmLeft": 28,
  "forearmRight": 28,
  "wristLeft": 17,
  "wristRight": 17,
  "waist": 82,
  "hips": 95,
  "thighLeft": 58,
  "thighRight": 58,
  "calfLeft": 38,
  "calfRight": 38,
  "ankleLeft": 23,
  "ankleRight": 23,
  "notes": "Morning measurement"
}
// Response 201
{
  "id": "uuid",
  "userId": "uuid",
  "date": "2024-01-15T00:00:00Z",
  ...
}

// GET /measurements/progress?field=weight&period=3months
// Response 200
{
  "field": "weight",
  "period": "3months",
  "data": [
    { "date": "2024-01-01", "value": 77 },
    { "date": "2024-01-08", "value": 76.5 },
    { "date": "2024-01-15", "value": 75.5 }
  ],
  "change": -1.5,
  "changePercent": -1.95
}
```

### 5.5 Exercise Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/exercises` | List all exercises | Yes |
| GET | `/exercises/:id` | Get single exercise | Yes |
| POST | `/exercises` | Create custom exercise | Yes |
| PUT | `/exercises/:id` | Update custom exercise | Yes |
| DELETE | `/exercises/:id` | Delete custom exercise | Yes |
| GET | `/exercises/muscle-groups` | List muscle groups | Yes |

#### Query Parameters

- `muscleGroup`: Filter by muscle group
- `isCustom`: Filter custom/system exercises

#### Request/Response Examples

```typescript
// GET /exercises?muscleGroup=pecs
// Response 200
{
  "data": [
    {
      "id": "uuid",
      "name": "Développé couché",
      "muscleGroups": ["pecs", "triceps", "epaules"],
      "isCustom": false,
      "userId": null
    },
    {
      "id": "uuid",
      "name": "Pompes",
      "muscleGroups": ["pecs", "triceps"],
      "isCustom": false,
      "userId": null
    }
  ],
  "total": 2
}

// POST /exercises
// Request
{
  "name": "Dips lestés",
  "muscleGroups": ["pecs", "triceps"]
}
// Response 201
{
  "id": "uuid",
  "name": "Dips lestés",
  "muscleGroups": ["pecs", "triceps"],
  "isCustom": true,
  "userId": "user-uuid",
  "createdAt": "2024-01-15T..."
}
```

### 5.6 Workout Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/workouts` | List workout templates | Yes |
| GET | `/workouts/:id` | Get workout with exercises | Yes |
| POST | `/workouts` | Create workout template | Yes |
| PUT | `/workouts/:id` | Update workout | Yes |
| DELETE | `/workouts/:id` | Delete workout | Yes |
| POST | `/workouts/:id/duplicate` | Duplicate workout | Yes |

#### Request/Response Examples

```typescript
// POST /workouts
// Request
{
  "name": "Push Day",
  "description": "Chest, shoulders, triceps",
  "exercises": [
    {
      "exerciseId": "uuid",
      "order": 1,
      "targetSets": 4,
      "targetReps": 10,
      "targetWeight": 60,
      "restBetweenSets": 90,
      "restAfterExercise": 180
    },
    {
      "exerciseId": "uuid",
      "order": 2,
      "targetSets": 3,
      "targetReps": 12,
      "targetWeight": null,
      "restBetweenSets": 60,
      "restAfterExercise": 120
    }
  ]
}
// Response 201
{
  "id": "uuid",
  "userId": "uuid",
  "name": "Push Day",
  "description": "Chest, shoulders, triceps",
  "exercises": [...],
  "createdAt": "...",
  "updatedAt": "..."
}
```

### 5.7 Workout Session Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/sessions` | List sessions | Yes |
| GET | `/sessions/:id` | Get session details | Yes |
| POST | `/sessions` | Start new session | Yes |
| PATCH | `/sessions/:id` | Update session (status) | Yes |
| DELETE | `/sessions/:id` | Delete session | Yes |
| POST | `/sessions/:id/sets` | Add set to session | Yes |
| PUT | `/sessions/:id/sets/:setId` | Update set | Yes |
| DELETE | `/sessions/:id/sets/:setId` | Delete set | Yes |
| GET | `/sessions/active` | Get current active session | Yes |

#### Query Parameters (GET /sessions)

- `status`: Filter by status
- `workoutId`: Filter by workout
- `from`: Start date
- `to`: End date
- `limit`: Page size (default 20)
- `offset`: Pagination offset

#### Request/Response Examples

```typescript
// POST /sessions
// Request
{
  "workoutId": "uuid"
}
// Response 201
{
  "id": "uuid",
  "userId": "uuid",
  "workoutId": "uuid",
  "workout": { ... },
  "status": "in_progress",
  "startedAt": "2024-01-15T10:00:00Z",
  "completedAt": null,
  "sets": [],
  "notes": null
}

// POST /sessions/:id/sets
// Request
{
  "exerciseId": "uuid",
  "setNumber": 1,
  "reps": 10,
  "weight": 60,
  "rpe": 7
}
// Response 201
{
  "id": "uuid",
  "sessionId": "uuid",
  "exerciseId": "uuid",
  "setNumber": 1,
  "reps": 10,
  "weight": 60,
  "rpe": 7,
  "completedAt": "2024-01-15T10:05:00Z"
}

// PATCH /sessions/:id
// Request
{
  "status": "completed",
  "notes": "Great session!"
}
// Response 200
{
  "id": "uuid",
  "status": "completed",
  "completedAt": "2024-01-15T11:30:00Z",
  "notes": "Great session!",
  ...
}
```

### 5.8 Progression Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/progression/suggestions` | Get pending suggestions | Yes |
| PATCH | `/progression/suggestions/:id` | Accept/dismiss suggestion | Yes |
| GET | `/progression/history/:exerciseId` | Exercise progression history | Yes |
| GET | `/progression/analysis` | Overall progression analysis | Yes |

#### Request/Response Examples

```typescript
// GET /progression/suggestions
// Response 200
{
  "data": [
    {
      "id": "uuid",
      "exerciseId": "uuid",
      "exercise": { "name": "Développé couché", ... },
      "suggestionType": "increase_weight",
      "currentValue": 60,
      "suggestedValue": 62.5,
      "reason": "Vous avez atteint 10 reps sur 4 séances consécutives",
      "status": "pending",
      "createdAt": "..."
    }
  ]
}

// PATCH /progression/suggestions/:id
// Request
{
  "status": "accepted" // or "dismissed"
}
// Response 200
{
  "id": "uuid",
  "status": "accepted",
  ...
}

// GET /progression/history/:exerciseId?period=6months
// Response 200
{
  "exercise": { "id": "uuid", "name": "Développé couché" },
  "period": "6months",
  "data": [
    { "date": "2024-01-15", "maxWeight": 60, "totalVolume": 2400 },
    { "date": "2024-01-08", "maxWeight": 57.5, "totalVolume": 2300 },
    ...
  ],
  "improvement": {
    "weightGain": 10,
    "weightGainPercent": 20,
    "volumeGain": 500
  }
}
```

### 5.9 Trackable Items Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/trackables` | List trackable items | Yes |
| GET | `/trackables/:id` | Get trackable item | Yes |
| POST | `/trackables` | Create trackable item | Yes |
| PUT | `/trackables/:id` | Update trackable item | Yes |
| DELETE | `/trackables/:id` | Delete trackable item | Yes |
| POST | `/trackables/:id/goals` | Set goal for trackable | Yes |
| PUT | `/trackables/:id/goals/:goalId` | Update goal | Yes |

#### Request/Response Examples

```typescript
// POST /trackables
// Request
{
  "name": "Yoga",
  "icon": "lotus",
  "color": "#8B5CF6",
  "trackingType": "boolean",
  "unit": null
}
// Response 201
{
  "id": "uuid",
  "userId": "uuid",
  "name": "Yoga",
  "icon": "lotus",
  "color": "#8B5CF6",
  "trackingType": "boolean",
  "unit": null,
  "isActive": true,
  "createdAt": "..."
}

// POST /trackables/:id/goals
// Request
{
  "targetValue": 5,
  "frequency": "weekly",
  "startDate": "2024-01-15"
}
// Response 201
{
  "id": "uuid",
  "trackableId": "uuid",
  "targetValue": 5,
  "frequency": "weekly",
  "startDate": "2024-01-15",
  "endDate": null
}
```

### 5.10 Daily Tracking Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/tracking/entries` | List entries | Yes |
| GET | `/tracking/entries/:date` | Get entries for date | Yes |
| POST | `/tracking/entries` | Create/update entry | Yes |
| DELETE | `/tracking/entries/:id` | Delete entry | Yes |
| GET | `/tracking/summary` | Weekly/monthly summary | Yes |

#### Query Parameters (GET /tracking/entries)

- `trackableId`: Filter by trackable
- `from`: Start date
- `to`: End date

#### Request/Response Examples

```typescript
// POST /tracking/entries
// Request
{
  "trackableId": "uuid",
  "date": "2024-01-15",
  "value": 1, // boolean: 0 or 1
  "notes": "Morning session"
}
// Response 201
{
  "id": "uuid",
  "trackableId": "uuid",
  "date": "2024-01-15T00:00:00Z",
  "value": 1,
  "notes": "Morning session",
  "createdAt": "..."
}

// GET /tracking/entries/2024-01-15
// Response 200
{
  "date": "2024-01-15",
  "entries": [
    {
      "id": "uuid",
      "trackable": { "id": "uuid", "name": "Yoga", "icon": "lotus" },
      "value": 1,
      "notes": "Morning session"
    },
    {
      "id": "uuid",
      "trackable": { "id": "uuid", "name": "Pas", "icon": "footprints" },
      "value": 8500,
      "notes": null
    }
  ]
}

// GET /tracking/summary?period=week&date=2024-01-15
// Response 200
{
  "period": "week",
  "startDate": "2024-01-08",
  "endDate": "2024-01-14",
  "trackables": [
    {
      "id": "uuid",
      "name": "Yoga",
      "goal": { "targetValue": 5, "frequency": "weekly" },
      "achieved": 4,
      "completion": 80
    },
    {
      "id": "uuid",
      "name": "Pas",
      "goal": { "targetValue": 10000, "frequency": "daily" },
      "averageValue": 8500,
      "daysAchieved": 5
    }
  ]
}
```

### 5.11 Streak Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/streaks` | Get all user streaks | Yes |
| GET | `/streaks/:trackableId` | Get streak for trackable | Yes |
| GET | `/streaks/workout` | Get global workout streak | Yes |

#### Request/Response Examples

```typescript
// GET /streaks
// Response 200
{
  "data": [
    {
      "id": "uuid",
      "trackableId": null,
      "trackable": null,
      "type": "workout",
      "currentStreak": 12,
      "longestStreak": 15,
      "lastActivityDate": "2024-01-15"
    },
    {
      "id": "uuid",
      "trackableId": "uuid",
      "trackable": { "name": "Yoga", "icon": "lotus" },
      "type": "trackable",
      "currentStreak": 7,
      "longestStreak": 21,
      "lastActivityDate": "2024-01-15"
    }
  ]
}
```

### 5.12 Error Response Format

All errors follow this structure:

```typescript
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

#### Error Codes

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid input data |
| 400 | `BAD_REQUEST` | Malformed request |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource already exists |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |

---

## 6. Components

### 6.1 Backend Components (Services)

```
┌─────────────────────────────────────────────────────────────────┐
│                        EXPRESS APP                              │
├─────────────────────────────────────────────────────────────────┤
│  Middleware Layer                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │  CORS    │ │  Helmet  │ │Rate Limit│ │  Error Handler    │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  Auth Middleware                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  JWT Validation → User Context → Request Enrichment      │  │
│  └──────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  Controller Layer (Route Handlers)                              │
│  ┌────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐ ┌───────────┐  │
│  │  Auth  │ │ Workout │ │ Session │ │Tracking│ │Progression│  │
│  └────────┘ └─────────┘ └─────────┘ └────────┘ └───────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  Service Layer (Business Logic)                                 │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  │AuthService │ │WorkoutSvc  │ │SessionSvc  │ │TrackingSvc │  │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                  │
│  │ExerciseSvc │ │MeasureSvc  │ │ProgressSvc │                  │
│  └────────────┘ └────────────┘ └────────────┘                  │
├─────────────────────────────────────────────────────────────────┤
│  Data Access Layer                                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    PRISMA CLIENT                          │  │
│  │  (Type-safe queries, transactions, migrations)            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    └─────────────────┘
```

### 6.2 Frontend Components

```
┌─────────────────────────────────────────────────────────────────┐
│                       NEXT.JS APP                               │
├─────────────────────────────────────────────────────────────────┤
│  Layout Components                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │   Header     │ │   Sidebar    │ │  MobileNav   │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
├─────────────────────────────────────────────────────────────────┤
│  Page Components                                                │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  │ Dashboard  │ │  Workouts  │ │  Session   │ │  Tracking  │  │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  │ Exercises  │ │Measurements│ │  Progress  │ │  Settings  │  │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  Feature Components                                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐  │
│  │ WorkoutBuilder  │ │  SessionTimer   │ │  SetInputForm   │  │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐  │
│  │  StreakDisplay  │ │ ProgressChart   │ │ TrackableCard   │  │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  UI Components (Shadcn)                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
│  │Button│ │ Card │ │Dialog│ │ Form │ │Input │ │Select│ ...  │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘      │
├─────────────────────────────────────────────────────────────────┤
│  State Management                                               │
│  ┌─────────────────────────┐ ┌─────────────────────────────┐  │
│  │  Zustand (Client State) │ │  React Query (Server State) │  │
│  │  - Auth Store           │ │  - Workouts Query           │  │
│  │  - Session Store        │ │  - Exercises Query          │  │
│  │  - UI Store             │ │  - Tracking Query           │  │
│  └─────────────────────────┘ └─────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  API Layer                                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    API CLIENT                             │  │
│  │  (Fetch wrapper, auth headers, error handling)            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Component Inventory

#### Dashboard Components

| Component | Description | Props |
|-----------|-------------|-------|
| `DailyOverview` | Today's summary card | `date: Date` |
| `StreakDisplay` | Current streak with fire animation | `streak: Streak` |
| `QuickActions` | Start workout, log tracking buttons | `onAction: (type) => void` |
| `RecentActivity` | Last 5 activities list | `activities: Activity[]` |
| `WeeklyProgress` | 7-day mini heatmap | `data: DayData[]` |

#### Workout Components

| Component | Description | Props |
|-----------|-------------|-------|
| `WorkoutCard` | Workout template preview | `workout: Workout` |
| `WorkoutBuilder` | Create/edit workout form | `workout?: Workout, onSave: (w) => void` |
| `ExerciseSelector` | Search and add exercises | `onSelect: (e) => void` |
| `ExerciseRow` | Single exercise in builder | `exercise: WorkoutExercise, onUpdate, onRemove` |

#### Session Components

| Component | Description | Props |
|-----------|-------------|-------|
| `ActiveSession` | Full session view | `session: WorkoutSession` |
| `SetInputForm` | Reps/weight/RPE input | `onSubmit: (set) => void` |
| `SessionTimer` | Rest timer with notification | `duration: number, onComplete: () => void` |
| `ExerciseProgress` | Sets completed indicator | `completed: number, total: number` |
| `SessionSummary` | Post-workout stats | `session: WorkoutSession` |

#### Tracking Components

| Component | Description | Props |
|-----------|-------------|-------|
| `TrackableCard` | Single trackable with quick log | `trackable: TrackableItem, entry?: DailyEntry` |
| `TrackableForm` | Create/edit trackable | `trackable?: TrackableItem, onSave` |
| `DailyCheckIn` | All trackables for today | `date: Date` |
| `TrackingCalendar` | Monthly view with entries | `trackableId: string` |

#### Progress Components

| Component | Description | Props |
|-----------|-------------|-------|
| `ProgressChart` | Line chart for metric | `data: DataPoint[], metric: string` |
| `MeasurementForm` | Body measurements input | `measurement?: Measurement, onSave` |
| `MeasurementComparison` | Before/after comparison | `from: Measurement, to: Measurement` |
| `ProgressionSuggestion` | Accept/dismiss suggestion | `suggestion: ProgressionSuggestion` |

---

## 7. Core Workflows

### 7.1 Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │  Next.js │     │  Express │     │PostgreSQL│
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ 1. Login Form  │                │                │
     │───────────────>│                │                │
     │                │                │                │
     │                │ 2. POST /auth/login             │
     │                │───────────────>│                │
     │                │                │                │
     │                │                │ 3. Find user   │
     │                │                │───────────────>│
     │                │                │                │
     │                │                │<───────────────│
     │                │                │  4. User data  │
     │                │                │                │
     │                │                │ 5. Verify password (bcrypt)
     │                │                │────────┐       │
     │                │                │        │       │
     │                │                │<───────┘       │
     │                │                │                │
     │                │                │ 6. Generate JWT│
     │                │                │────────┐       │
     │                │                │        │       │
     │                │                │<───────┘       │
     │                │                │                │
     │                │<───────────────│                │
     │                │ 7. { user, accessToken }        │
     │                │                │                │
     │<───────────────│                │                │
     │ 8. Store token │                │                │
     │    (Zustand +  │                │                │
     │    localStorage)                │                │
     │                │                │                │
     │ 9. Redirect to │                │                │
     │    Dashboard   │                │                │
     │───────────────>│                │                │
     │                │                │                │
```

### 7.2 Workout Session Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │  Zustand │     │  Express │     │PostgreSQL│
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ 1. Start Workout               │                │
     │───────────────────────────────>│                │
     │         POST /sessions          │                │
     │                │                │                │
     │                │                │ 2. Create      │
     │                │                │───────────────>│
     │                │                │                │
     │<───────────────────────────────│                │
     │ 3. Session { status: in_progress }              │
     │                │                │                │
     │ 4. Store in    │                │                │
     │    SessionStore│                │                │
     │───────────────>│                │                │
     │                │                │                │
     │ ═══════════════╪════════════════╪════════════════│
     │ ║ LOOP: For each set            ║                │
     │ ═══════════════╪════════════════╪════════════════│
     │                │                │                │
     │ 5. Log Set     │                │                │
     │    (reps, weight, rpe)          │                │
     │───────────────────────────────>│                │
     │         POST /sessions/:id/sets │                │
     │                │                │                │
     │                │                │ 6. Save set    │
     │                │                │───────────────>│
     │                │                │                │
     │<───────────────────────────────│                │
     │ 7. Set confirmed                │                │
     │                │                │                │
     │ 8. Update local│                │                │
     │    state       │                │                │
     │───────────────>│                │                │
     │                │                │                │
     │ 9. Start rest  │                │                │
     │    timer       │                │                │
     │────────┐       │                │                │
     │        │       │                │                │
     │<───────┘       │                │                │
     │                │                │                │
     │ ═══════════════╪════════════════╪════════════════│
     │ ║ END LOOP                      ║                │
     │ ═══════════════╪════════════════╪════════════════│
     │                │                │                │
     │ 10. Complete   │                │                │
     │     Session    │                │                │
     │───────────────────────────────>│                │
     │   PATCH /sessions/:id           │                │
     │   { status: completed }         │                │
     │                │                │                │
     │                │                │ 11. Update     │
     │                │                │───────────────>│
     │                │                │                │
     │                │                │ 12. Trigger    │
     │                │                │     progression│
     │                │                │     analysis   │
     │                │                │────────┐       │
     │                │                │        │       │
     │                │                │<───────┘       │
     │                │                │                │
     │<───────────────────────────────│                │
     │ 13. Session summary +           │                │
     │     progression suggestions     │                │
     │                │                │                │
     │ 14. Clear      │                │                │
     │     SessionStore                │                │
     │───────────────>│                │                │
     │                │                │                │
```

### 7.3 Daily Tracking Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │React Query│    │  Express │     │PostgreSQL│
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ 1. Open Dashboard               │                │
     │───────────────>│                │                │
     │                │                │                │
     │                │ 2. GET /tracking/entries/today  │
     │                │───────────────>│                │
     │                │                │                │
     │                │                │ 3. Query       │
     │                │                │───────────────>│
     │                │                │                │
     │                │<───────────────│<───────────────│
     │<───────────────│ 4. Today's entries              │
     │                │                │                │
     │ 5. Display trackables with status               │
     │────────┐       │                │                │
     │        │       │                │                │
     │<───────┘       │                │                │
     │                │                │                │
     │ 6. Toggle trackable (e.g., Yoga done)           │
     │───────────────>│                │                │
     │                │                │                │
     │                │ 7. POST /tracking/entries       │
     │                │   { trackableId, date, value }  │
     │                │───────────────>│                │
     │                │                │                │
     │                │                │ 8. Upsert entry│
     │                │                │───────────────>│
     │                │                │                │
     │                │                │ 9. Update      │
     │                │                │    streak      │
     │                │                │────────┐       │
     │                │                │        │       │
     │                │                │<───────┘       │
     │                │                │                │
     │                │<───────────────│<───────────────│
     │<───────────────│ 10. Entry + updated streak     │
     │                │                │                │
     │ 11. Optimistic │                │                │
     │     UI update  │                │                │
     │────────┐       │                │                │
     │        │       │                │                │
     │<───────┘       │                │                │
     │                │                │                │
```

### 7.4 Progression Detection Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Express │     │ Progress │     │PostgreSQL│
│ (trigger)│     │ Service  │     │          │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │
     │ 1. Session completed            │
     │───────────────>│                │
     │                │                │
     │                │ 2. Get last N sessions for each exercise
     │                │───────────────>│
     │                │                │
     │                │<───────────────│
     │                │ 3. Session history
     │                │                │
     │                │ 4. Analyze each exercise
     │                │────────┐       │
     │                │        │       │
     │                │   ┌────▼────────────────────────────┐
     │                │   │ For each exercise:              │
     │                │   │                                 │
     │                │   │ a. Calculate average performance│
     │                │   │    (reps × weight × sets)       │
     │                │   │                                 │
     │                │   │ b. Check stabilization          │
     │                │   │    (3-4 sessions at same level) │
     │                │   │                                 │
     │                │   │ c. If stable + target achieved: │
     │                │   │    → Generate suggestion        │
     │                │   │                                 │
     │                │   │ d. Suggestion logic:            │
     │                │   │    - Weight: +2.5kg (small)     │
     │                │   │            or +5kg (compound)   │
     │                │   │    - Reps: +2 if weight stuck   │
     │                │   │    - Sets: +1 if reps maxed     │
     │                │   └─────────────────────────────────┘
     │                │        │       │
     │                │<───────┘       │
     │                │                │
     │                │ 5. Save suggestions
     │                │───────────────>│
     │                │                │
     │<───────────────│                │
     │ 6. Return suggestions           │
     │                │                │
```

### 7.5 Streak Calculation Logic

```
┌─────────────────────────────────────────────────────────────────┐
│                    STREAK CALCULATION                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  On new entry (workout session OR trackable entry):             │
│                                                                 │
│  1. Get streak record for user + trackable (or workout)         │
│                                                                 │
│  2. Calculate days since last activity:                         │
│     daysDiff = today - lastActivityDate                         │
│                                                                 │
│  3. Apply logic based on goal frequency:                        │
│                                                                 │
│     ┌─────────────────────────────────────────────────────┐     │
│     │ DAILY GOAL:                                          │     │
│     │   if (daysDiff === 0) → same day, no change          │     │
│     │   if (daysDiff === 1) → consecutive, streak++        │     │
│     │   if (daysDiff > 1)   → broken, streak = 1           │     │
│     └─────────────────────────────────────────────────────┘     │
│                                                                 │
│     ┌─────────────────────────────────────────────────────┐     │
│     │ WEEKLY/MONTHLY GOAL:                                 │     │
│     │   Check if goal was met in previous period           │     │
│     │   if (goalMet) → streak++ at period end              │     │
│     │   if (!goalMet) → streak = 0 at period end           │     │
│     └─────────────────────────────────────────────────────┘     │
│                                                                 │
│  4. Update longest streak if current > longest                  │
│                                                                 │
│  5. Update lastActivityDate = today                             │
│                                                                 │
│  IMPORTANT: Streak is NOT broken until END of day               │
│  (user has until midnight to maintain streak)                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.6 Error Handling Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │  Next.js │     │  Express │     │  Error   │
│          │     │          │     │          │     │Middleware│
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ 1. API Request │                │                │
     │───────────────>│                │                │
     │                │───────────────>│                │
     │                │                │                │
     │                │                │ 2. Error occurs│
     │                │                │   (validation, │
     │                │                │    auth, db)   │
     │                │                │───────────────>│
     │                │                │                │
     │                │                │                │ 3. Classify error
     │                │                │                │────────┐
     │                │                │                │        │
     │                │                │                │<───────┘
     │                │                │                │
     │                │                │                │ 4. Format response
     │                │                │<───────────────│
     │                │                │  {             │
     │                │                │    error: {    │
     │                │                │      code,     │
     │                │                │      message,  │
     │                │                │      details   │
     │                │                │    }           │
     │                │                │  }             │
     │                │                │                │
     │                │<───────────────│                │
     │<───────────────│                │                │
     │                │                │                │
     │ 5. React Query │                │                │
     │    error state │                │                │
     │────────┐       │                │                │
     │        │       │                │                │
     │<───────┘       │                │                │
     │                │                │                │
     │ 6. Display     │                │                │
     │    toast/error │                │                │
     │    component   │                │                │
     │────────┐       │                │                │
     │        │       │                │                │
     │<───────┘       │                │                │
     │                │                │                │
```

---

## 8. Database Schema

### 8.1 Complete Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// USER & AUTH
// ============================================

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  name         String
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  // Relations
  measurements            Measurement[]
  exercises               Exercise[]
  workouts                Workout[]
  workoutSessions         WorkoutSession[]
  trackableItems          TrackableItem[]
  streaks                 Streak[]
  progressionSuggestions  ProgressionSuggestion[]

  @@map("users")
}

// ============================================
// MEASUREMENTS
// ============================================

model Measurement {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  date      DateTime @db.Date

  // Weight in kg
  weight    Float?

  // All measurements in cm
  neck          Float?
  shoulders     Float?
  chest         Float?
  bicepsLeft    Float?    @map("biceps_left")
  bicepsRight   Float?    @map("biceps_right")
  forearmLeft   Float?    @map("forearm_left")
  forearmRight  Float?    @map("forearm_right")
  wristLeft     Float?    @map("wrist_left")
  wristRight    Float?    @map("wrist_right")
  waist         Float?
  hips          Float?
  thighLeft     Float?    @map("thigh_left")
  thighRight    Float?    @map("thigh_right")
  calfLeft      Float?    @map("calf_left")
  calfRight     Float?    @map("calf_right")
  ankleLeft     Float?    @map("ankle_left")
  ankleRight    Float?    @map("ankle_right")

  notes     String?
  createdAt DateTime @default(now()) @map("created_at")

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
  @@index([userId, date])
  @@map("measurements")
}

// ============================================
// EXERCISES
// ============================================

model Exercise {
  id           String   @id @default(cuid())
  name         String
  muscleGroups String[] @map("muscle_groups")
  isCustom     Boolean  @default(false) @map("is_custom")
  userId       String?  @map("user_id")
  createdAt    DateTime @default(now()) @map("created_at")

  // Relations
  user                   User?                   @relation(fields: [userId], references: [id], onDelete: Cascade)
  workoutExercises       WorkoutExercise[]
  sets                   Set[]
  progressionSuggestions ProgressionSuggestion[]

  @@index([userId])
  @@index([muscleGroups])
  @@map("exercises")
}

// ============================================
// WORKOUTS (Templates)
// ============================================

model Workout {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  name        String
  description String?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Relations
  user      User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  exercises WorkoutExercise[]
  sessions  WorkoutSession[]

  @@index([userId])
  @@map("workouts")
}

model WorkoutExercise {
  id                String @id @default(cuid())
  workoutId         String @map("workout_id")
  exerciseId        String @map("exercise_id")
  order             Int
  targetSets        Int    @map("target_sets")
  targetReps        Int    @map("target_reps")
  targetWeight      Float? @map("target_weight")
  restBetweenSets   Int    @default(90) @map("rest_between_sets")   // seconds
  restAfterExercise Int    @default(120) @map("rest_after_exercise") // seconds

  // Relations
  workout  Workout  @relation(fields: [workoutId], references: [id], onDelete: Cascade)
  exercise Exercise @relation(fields: [exerciseId], references: [id], onDelete: Cascade)

  @@unique([workoutId, order])
  @@index([workoutId])
  @@map("workout_exercises")
}

// ============================================
// WORKOUT SESSIONS
// ============================================

enum SessionStatus {
  in_progress
  completed
  abandoned
}

model WorkoutSession {
  id          String        @id @default(cuid())
  userId      String        @map("user_id")
  workoutId   String        @map("workout_id")
  status      SessionStatus @default(in_progress)
  startedAt   DateTime      @default(now()) @map("started_at")
  completedAt DateTime?     @map("completed_at")
  notes       String?

  // Relations
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  workout Workout @relation(fields: [workoutId], references: [id], onDelete: Cascade)
  sets    Set[]

  @@index([userId, startedAt])
  @@index([workoutId])
  @@map("workout_sessions")
}

model Set {
  id          String   @id @default(cuid())
  sessionId   String   @map("session_id")
  exerciseId  String   @map("exercise_id")
  setNumber   Int      @map("set_number")
  reps        Int
  weight      Float
  rpe         Int?     // Rate of Perceived Exertion (1-10)
  completedAt DateTime @default(now()) @map("completed_at")

  // Relations
  session  WorkoutSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  exercise Exercise       @relation(fields: [exerciseId], references: [id], onDelete: Cascade)

  @@index([sessionId])
  @@index([exerciseId, completedAt])
  @@map("sets")
}

// ============================================
// PROGRESSION
// ============================================

enum SuggestionType {
  increase_weight
  increase_reps
  increase_sets
}

enum SuggestionStatus {
  pending
  accepted
  dismissed
}

model ProgressionSuggestion {
  id             String           @id @default(cuid())
  userId         String           @map("user_id")
  exerciseId     String           @map("exercise_id")
  suggestionType SuggestionType   @map("suggestion_type")
  currentValue   Float            @map("current_value")
  suggestedValue Float            @map("suggested_value")
  reason         String
  status         SuggestionStatus @default(pending)
  createdAt      DateTime         @default(now()) @map("created_at")

  // Relations
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  exercise Exercise @relation(fields: [exerciseId], references: [id], onDelete: Cascade)

  @@index([userId, status])
  @@index([exerciseId])
  @@map("progression_suggestions")
}

// ============================================
// CUSTOM TRACKING
// ============================================

enum TrackingType {
  boolean  // Yes/No (e.g., Did yoga today?)
  number   // Numeric value (e.g., Steps: 8500)
  duration // Time in minutes (e.g., Meditation: 15min)
}

enum GoalFrequency {
  daily
  weekly
  monthly
}

model TrackableItem {
  id           String       @id @default(cuid())
  userId       String       @map("user_id")
  name         String
  icon         String
  color        String
  trackingType TrackingType @map("tracking_type")
  unit         String?
  isActive     Boolean      @default(true) @map("is_active")
  createdAt    DateTime     @default(now()) @map("created_at")

  // Relations
  user    User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  goals   TrackableGoal[]
  entries DailyEntry[]
  streaks Streak[]

  @@index([userId, isActive])
  @@map("trackable_items")
}

model TrackableGoal {
  id          String        @id @default(cuid())
  trackableId String        @map("trackable_id")
  targetValue Float         @map("target_value")
  frequency   GoalFrequency
  startDate   DateTime      @map("start_date") @db.Date
  endDate     DateTime?     @map("end_date") @db.Date

  // Relations
  trackable TrackableItem @relation(fields: [trackableId], references: [id], onDelete: Cascade)

  @@index([trackableId])
  @@map("trackable_goals")
}

model DailyEntry {
  id          String   @id @default(cuid())
  trackableId String   @map("trackable_id")
  date        DateTime @db.Date
  value       Float    // boolean=0/1, number=value, duration=minutes
  notes       String?
  createdAt   DateTime @default(now()) @map("created_at")

  // Relations
  trackable TrackableItem @relation(fields: [trackableId], references: [id], onDelete: Cascade)

  @@unique([trackableId, date])
  @@index([trackableId, date])
  @@map("daily_entries")
}

// ============================================
// STREAKS
// ============================================

model Streak {
  id               String    @id @default(cuid())
  userId           String    @map("user_id")
  trackableId      String?   @map("trackable_id") // null = global workout streak
  currentStreak    Int       @default(0) @map("current_streak")
  longestStreak    Int       @default(0) @map("longest_streak")
  lastActivityDate DateTime  @map("last_activity_date") @db.Date
  updatedAt        DateTime  @updatedAt @map("updated_at")

  // Relations
  user      User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  trackable TrackableItem? @relation(fields: [trackableId], references: [id], onDelete: Cascade)

  @@unique([userId, trackableId])
  @@index([userId])
  @@map("streaks")
}
```

### 8.2 Database Indexes Summary

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| measurements | Primary lookup | `userId, date` | Fast date-range queries |
| exercises | Filter | `userId` | User's custom exercises |
| exercises | Filter | `muscleGroups` | Filter by muscle group |
| workouts | User lookup | `userId` | User's workout templates |
| workout_sessions | History | `userId, startedAt` | Session history queries |
| sets | Session lookup | `sessionId` | All sets in a session |
| sets | Progress analysis | `exerciseId, completedAt` | Progression analysis |
| progression_suggestions | User pending | `userId, status` | Show pending suggestions |
| trackable_items | Active items | `userId, isActive` | Dashboard display |
| daily_entries | Entry lookup | `trackableId, date` | Daily tracking |
| streaks | User streaks | `userId` | All user streaks |

---

## 9. Frontend Architecture

### 9.1 Next.js App Router Structure

```
apps/web/src/app/
├── (auth)/                    # Auth route group (no layout)
│   ├── login/
│   │   └── page.tsx
│   └── register/
│       └── page.tsx
├── (dashboard)/               # Dashboard route group (with sidebar)
│   ├── layout.tsx            # Sidebar + Header layout
│   ├── page.tsx              # Dashboard home
│   ├── workouts/
│   │   ├── page.tsx          # Workout list
│   │   ├── new/
│   │   │   └── page.tsx      # Create workout
│   │   └── [id]/
│   │       ├── page.tsx      # Workout detail
│   │       └── edit/
│   │           └── page.tsx  # Edit workout
│   ├── session/
│   │   └── [id]/
│   │       └── page.tsx      # Active workout session
│   ├── exercises/
│   │   └── page.tsx          # Exercise library
│   ├── measurements/
│   │   └── page.tsx          # Body measurements
│   ├── tracking/
│   │   └── page.tsx          # Daily tracking
│   ├── progress/
│   │   └── page.tsx          # Progress charts
│   └── settings/
│       ├── page.tsx          # Profile settings
│       └── trackables/
│           └── page.tsx      # Trackable configuration
├── layout.tsx                # Root layout (providers)
└── globals.css               # Tailwind imports
```

### 9.2 State Management Strategy

#### Zustand Stores

```typescript
// stores/auth-store.ts
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: async (email, password) => {
        const response = await apiClient.post('/auth/login', { email, password });
        set({
          user: response.user,
          token: response.accessToken,
          isAuthenticated: true,
        });
      },
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },
      setUser: (user) => set({ user }),
    }),
    { name: 'auth-storage' }
  )
);

// stores/session-store.ts
interface SessionState {
  activeSession: WorkoutSession | null;
  currentExerciseIndex: number;
  timerSeconds: number;
  isTimerRunning: boolean;
  setActiveSession: (session: WorkoutSession | null) => void;
  nextExercise: () => void;
  addSet: (set: Set) => void;
  startTimer: (duration: number) => void;
  stopTimer: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  activeSession: null,
  currentExerciseIndex: 0,
  timerSeconds: 0,
  isTimerRunning: false,
  setActiveSession: (session) => set({
    activeSession: session,
    currentExerciseIndex: 0
  }),
  nextExercise: () => set((state) => ({
    currentExerciseIndex: state.currentExerciseIndex + 1
  })),
  addSet: (newSet) => set((state) => ({
    activeSession: state.activeSession ? {
      ...state.activeSession,
      sets: [...state.activeSession.sets, newSet]
    } : null
  })),
  startTimer: (duration) => set({ timerSeconds: duration, isTimerRunning: true }),
  stopTimer: () => set({ isTimerRunning: false }),
}));
```

#### React Query Hooks

```typescript
// hooks/queries/use-workouts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Workout, CreateWorkoutInput } from '@momentum/shared';

export const workoutKeys = {
  all: ['workouts'] as const,
  lists: () => [...workoutKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...workoutKeys.lists(), filters] as const,
  details: () => [...workoutKeys.all, 'detail'] as const,
  detail: (id: string) => [...workoutKeys.details(), id] as const,
};

export function useWorkouts() {
  return useQuery({
    queryKey: workoutKeys.lists(),
    queryFn: () => apiClient.get<{ data: Workout[] }>('/workouts'),
    select: (data) => data.data,
  });
}

export function useWorkout(id: string) {
  return useQuery({
    queryKey: workoutKeys.detail(id),
    queryFn: () => apiClient.get<Workout>(`/workouts/${id}`),
    enabled: !!id,
  });
}

export function useCreateWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorkoutInput) =>
      apiClient.post<Workout>('/workouts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutKeys.lists() });
    },
  });
}

export function useUpdateWorkout(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<CreateWorkoutInput>) =>
      apiClient.put<Workout>(`/workouts/${id}`, data),
    onSuccess: (data) => {
      queryClient.setQueryData(workoutKeys.detail(id), data);
      queryClient.invalidateQueries({ queryKey: workoutKeys.lists() });
    },
  });
}

export function useDeleteWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/workouts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutKeys.lists() });
    },
  });
}
```

### 9.3 API Client

```typescript
// lib/api-client.ts
import { useAuthStore } from '@/stores/auth-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = useAuthStore.getState().token;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));

      if (response.status === 401) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }

      throw new ApiError(
        error.error?.message || 'An error occurred',
        error.error?.code || 'UNKNOWN_ERROR',
        response.status
      );
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async put<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<T>(response);
  }

  async patch<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<T>(response);
  }
}

class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export { ApiError };
```

---

## 10. Backend Architecture

### 10.1 Service Architecture

```typescript
// src/controllers/workout.controller.ts
import { Router } from 'express';
import { WorkoutService } from '../services/workout.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createWorkoutSchema, updateWorkoutSchema } from '../validators/workout.schema';

const router = Router();
const workoutService = new WorkoutService();

router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try {
    const workouts = await workoutService.findAllByUser(req.user.id);
    res.json({ data: workouts });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const workout = await workoutService.findById(req.params.id, req.user.id);
    res.json(workout);
  } catch (error) {
    next(error);
  }
});

router.post('/', validate(createWorkoutSchema), async (req, res, next) => {
  try {
    const workout = await workoutService.create(req.user.id, req.body);
    res.status(201).json(workout);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', validate(updateWorkoutSchema), async (req, res, next) => {
  try {
    const workout = await workoutService.update(req.params.id, req.user.id, req.body);
    res.json(workout);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await workoutService.delete(req.params.id, req.user.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export const workoutRouter = router;
```

### 10.2 Database Architecture

```typescript
// src/services/workout.service.ts
import { prisma } from '../lib/prisma';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import type { CreateWorkoutInput, UpdateWorkoutInput } from '../validators/workout.schema';

export class WorkoutService {
  async findAllByUser(userId: string) {
    return prisma.workout.findMany({
      where: { userId },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findById(id: string, userId: string) {
    const workout = await prisma.workout.findUnique({
      where: { id },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!workout) {
      throw new NotFoundError('Workout not found');
    }

    if (workout.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    return workout;
  }

  async create(userId: string, data: CreateWorkoutInput) {
    return prisma.workout.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        exercises: {
          create: data.exercises.map((e, index) => ({
            exerciseId: e.exerciseId,
            order: e.order ?? index + 1,
            targetSets: e.targetSets,
            targetReps: e.targetReps,
            targetWeight: e.targetWeight,
            restBetweenSets: e.restBetweenSets ?? 90,
            restAfterExercise: e.restAfterExercise ?? 120,
          })),
        },
      },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async update(id: string, userId: string, data: UpdateWorkoutInput) {
    await this.findById(id, userId); // Verify ownership

    return prisma.$transaction(async (tx) => {
      // Delete existing exercises if new ones provided
      if (data.exercises) {
        await tx.workoutExercise.deleteMany({
          where: { workoutId: id },
        });
      }

      return tx.workout.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          exercises: data.exercises
            ? {
                create: data.exercises.map((e, index) => ({
                  exerciseId: e.exerciseId,
                  order: e.order ?? index + 1,
                  targetSets: e.targetSets,
                  targetReps: e.targetReps,
                  targetWeight: e.targetWeight,
                  restBetweenSets: e.restBetweenSets ?? 90,
                  restAfterExercise: e.restAfterExercise ?? 120,
                })),
              }
            : undefined,
        },
        include: {
          exercises: {
            include: { exercise: true },
            orderBy: { order: 'asc' },
          },
        },
      });
    });
  }

  async delete(id: string, userId: string) {
    await this.findById(id, userId); // Verify ownership
    await prisma.workout.delete({ where: { id } });
  }
}
```

### 10.3 Authentication & Authorization

```typescript
// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../utils/errors';

interface JwtPayload {
  userId: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        email: string;
      };
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    req.user = {
      id: payload.userId,
      email: payload.email,
    };
    next();
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token');
  }
}
```

### 10.4 Error Handling

```typescript
// src/utils/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: Array<{ field: string; message: string }>) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409, 'CONFLICT');
  }
}

// src/middleware/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../utils/errors';
import { ZodError } from 'zod';
import { logger } from '../lib/logger';

export function errorMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error({
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error instanceof ValidationError && error.details
          ? { details: error.details }
          : {}),
      },
    });
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    });
  }

  // Unexpected errors
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
```

### 10.5 Validation Layer

```typescript
// src/validators/workout.schema.ts
import { z } from 'zod';

const workoutExerciseSchema = z.object({
  exerciseId: z.string().cuid(),
  order: z.number().int().positive().optional(),
  targetSets: z.number().int().min(1).max(20),
  targetReps: z.number().int().min(1).max(100),
  targetWeight: z.number().min(0).max(1000).nullable().optional(),
  restBetweenSets: z.number().int().min(0).max(600).optional().default(90),
  restAfterExercise: z.number().int().min(0).max(600).optional().default(120),
});

export const createWorkoutSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  exercises: z.array(workoutExerciseSchema).min(1).max(30),
});

export const updateWorkoutSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  exercises: z.array(workoutExerciseSchema).min(1).max(30).optional(),
});

export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;
export type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;

// src/middleware/validate.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return next(result.error);
    }

    req.body = result.data;
    next();
  };
}
```

### 10.6 Progression Service

```typescript
// src/services/progression.service.ts
import { prisma } from '../lib/prisma';
import type { SuggestionType } from '@prisma/client';

const STABILIZATION_THRESHOLD = 4; // sessions needed
const WEIGHT_INCREMENT_SMALL = 2.5; // kg for isolation
const WEIGHT_INCREMENT_LARGE = 5; // kg for compound
const COMPOUND_EXERCISES = ['squat', 'deadlift', 'bench', 'row', 'press'];

export class ProgressionService {
  async analyzeSession(userId: string, sessionId: string) {
    const session = await prisma.workoutSession.findUnique({
      where: { id: sessionId },
      include: {
        sets: { include: { exercise: true } },
        workout: { include: { exercises: true } },
      },
    });

    if (!session) return [];

    const suggestions: Array<{
      exerciseId: string;
      suggestionType: SuggestionType;
      currentValue: number;
      suggestedValue: number;
      reason: string;
    }> = [];

    // Group sets by exercise
    const exerciseSets = new Map<string, typeof session.sets>();
    for (const set of session.sets) {
      const existing = exerciseSets.get(set.exerciseId) || [];
      existing.push(set);
      exerciseSets.set(set.exerciseId, existing);
    }

    // Analyze each exercise
    for (const [exerciseId, sets] of exerciseSets) {
      const history = await this.getExerciseHistory(userId, exerciseId, 10);

      if (history.length < STABILIZATION_THRESHOLD) continue;

      const suggestion = this.calculateProgression(
        exerciseId,
        sets,
        history,
        session.workout.exercises.find(e => e.exerciseId === exerciseId)
      );

      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    // Save suggestions
    if (suggestions.length > 0) {
      await prisma.progressionSuggestion.createMany({
        data: suggestions.map(s => ({
          userId,
          ...s,
        })),
      });
    }

    return suggestions;
  }

  private async getExerciseHistory(userId: string, exerciseId: string, limit: number) {
    return prisma.set.findMany({
      where: {
        exerciseId,
        session: { userId },
      },
      orderBy: { completedAt: 'desc' },
      take: limit * 10, // Get enough sets to cover N sessions
    });
  }

  private calculateProgression(
    exerciseId: string,
    currentSets: Array<{ reps: number; weight: number }>,
    history: Array<{ reps: number; weight: number }>,
    target?: { targetSets: number; targetReps: number; targetWeight: number | null }
  ) {
    // Calculate current session performance
    const avgWeight = currentSets.reduce((sum, s) => sum + s.weight, 0) / currentSets.length;
    const avgReps = currentSets.reduce((sum, s) => sum + s.reps, 0) / currentSets.length;
    const totalSets = currentSets.length;

    // Check if target was achieved
    const targetAchieved = target &&
      totalSets >= target.targetSets &&
      avgReps >= target.targetReps;

    if (!targetAchieved) return null;

    // Check stabilization (last N sessions at same weight)
    const recentWeights = history.slice(0, STABILIZATION_THRESHOLD * 3);
    const weightVariance = this.calculateVariance(recentWeights.map(s => s.weight));

    if (weightVariance > 2.5) return null; // Not stable yet

    // Determine increment
    const isCompound = COMPOUND_EXERCISES.some(c =>
      exerciseId.toLowerCase().includes(c)
    );
    const increment = isCompound ? WEIGHT_INCREMENT_LARGE : WEIGHT_INCREMENT_SMALL;

    return {
      exerciseId,
      suggestionType: 'increase_weight' as SuggestionType,
      currentValue: avgWeight,
      suggestedValue: avgWeight + increment,
      reason: `Performance stable sur ${STABILIZATION_THRESHOLD} séances avec objectifs atteints`,
    };
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    );
  }
}
```

---

## 11. Project Structure

### 11.1 Unified Project Structure

```
momentum/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Tests + Lint on PR
│       └── deploy.yml                # Build & Push Docker images
├── apps/
│   ├── web/                          # Next.js Frontend
│   │   ├── public/
│   │   │   ├── manifest.json         # PWA manifest
│   │   │   ├── sw.js                 # Service Worker
│   │   │   └── icons/                # PWA icons
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/
│   │   │   │   │   ├── login/page.tsx
│   │   │   │   │   └── register/page.tsx
│   │   │   │   ├── (dashboard)/
│   │   │   │   │   ├── layout.tsx
│   │   │   │   │   ├── page.tsx              # Dashboard
│   │   │   │   │   ├── workouts/
│   │   │   │   │   │   ├── page.tsx          # Workout list
│   │   │   │   │   │   ├── [id]/page.tsx     # Workout detail
│   │   │   │   │   │   └── new/page.tsx      # Create workout
│   │   │   │   │   ├── session/
│   │   │   │   │   │   └── [id]/page.tsx     # Active session
│   │   │   │   │   ├── exercises/page.tsx
│   │   │   │   │   ├── measurements/page.tsx
│   │   │   │   │   ├── tracking/page.tsx
│   │   │   │   │   ├── settings/
│   │   │   │   │   │   ├── page.tsx          # Profile settings
│   │   │   │   │   │   └── trackables/page.tsx
│   │   │   │   │   └── progress/page.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   └── globals.css
│   │   │   ├── components/
│   │   │   │   ├── ui/                # Shadcn components
│   │   │   │   ├── layout/
│   │   │   │   │   ├── Header.tsx
│   │   │   │   │   ├── Sidebar.tsx
│   │   │   │   │   └── MobileNav.tsx
│   │   │   │   ├── dashboard/
│   │   │   │   ├── workout/
│   │   │   │   ├── session/
│   │   │   │   ├── tracking/
│   │   │   │   └── shared/
│   │   │   ├── hooks/
│   │   │   │   ├── queries/           # React Query hooks
│   │   │   │   └── use-*.ts           # Custom hooks
│   │   │   ├── lib/
│   │   │   │   ├── api-client.ts
│   │   │   │   ├── utils.ts
│   │   │   │   └── validators.ts
│   │   │   ├── stores/
│   │   │   │   ├── auth-store.ts
│   │   │   │   └── session-store.ts
│   │   │   └── types/
│   │   │       └── index.ts
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── api/                          # Express Backend
│       ├── src/
│       │   ├── controllers/
│       │   │   ├── auth.controller.ts
│       │   │   ├── workout.controller.ts
│       │   │   ├── session.controller.ts
│       │   │   ├── exercise.controller.ts
│       │   │   ├── measurement.controller.ts
│       │   │   ├── tracking.controller.ts
│       │   │   └── progression.controller.ts
│       │   ├── services/
│       │   │   ├── auth.service.ts
│       │   │   ├── workout.service.ts
│       │   │   ├── session.service.ts
│       │   │   ├── exercise.service.ts
│       │   │   ├── measurement.service.ts
│       │   │   ├── tracking.service.ts
│       │   │   ├── progression.service.ts
│       │   │   └── streak.service.ts
│       │   ├── middleware/
│       │   │   ├── auth.middleware.ts
│       │   │   ├── error.middleware.ts
│       │   │   └── validate.middleware.ts
│       │   ├── routes/
│       │   │   └── index.ts
│       │   ├── validators/
│       │   │   └── *.schema.ts
│       │   ├── utils/
│       │   │   ├── errors.ts
│       │   │   └── jwt.ts
│       │   ├── types/
│       │   │   └── index.ts
│       │   ├── app.ts
│       │   └── server.ts
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   └── shared/                       # Shared types/utils
│       ├── src/
│       │   ├── types/
│       │   │   └── index.ts
│       │   ├── constants/
│       │   │   └── index.ts
│       │   └── utils/
│       │       └── index.ts
│       ├── tsconfig.json
│       └── package.json
│
├── docker/
│   ├── web.Dockerfile
│   ├── api.Dockerfile
│   └── docker-compose.yml
│
├── .env.example
├── package.json                      # Workspace root
├── tsconfig.base.json
└── README.md
```

---

## 12. Development Workflow

### 12.1 Prerequisites

- Node.js 20 LTS
- npm 10+
- Docker & Docker Compose
- PostgreSQL 16 (ou via Docker)

### 12.2 Initial Setup

```bash
# Clone repository
git clone https://github.com/user/momentum.git
cd momentum

# Install dependencies (all workspaces)
npm install

# Copy environment files
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Start PostgreSQL (if using Docker)
docker compose -f docker/docker-compose.yml up -d postgres

# Run database migrations
npm run db:migrate -w apps/api

# Seed initial data (exercises, muscle groups)
npm run db:seed -w apps/api

# Start development servers
npm run dev
```

### 12.3 Environment Variables

**Root `.env`:**
```env
NODE_ENV=development
```

**`apps/api/.env`:**
```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://momentum:momentum@localhost:5432/momentum
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
```

**`apps/web/.env`:**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 12.4 NPM Scripts

```json
{
  "scripts": {
    "dev": "npm run dev --workspaces --if-present",
    "build": "npm run build --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "test:coverage": "npm run test:coverage --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "db:migrate": "npm run db:migrate -w apps/api",
    "db:seed": "npm run db:seed -w apps/api",
    "db:studio": "npm run db:studio -w apps/api",
    "clean": "npm run clean --workspaces --if-present && rm -rf node_modules"
  }
}
```

---

## 13. Deployment Architecture

### 13.1 Docker Configuration

**`docker/api.Dockerfile`:**
```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci --workspace=apps/api --workspace=packages/shared

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .
RUN npm run build -w packages/shared
RUN npm run build -w apps/api
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
USER expressjs
EXPOSE 3001
CMD ["node", "dist/server.js"]
```

**`docker/web.Dockerfile`:**
```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci --workspace=apps/web --workspace=packages/shared

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w packages/shared
RUN npm run build -w apps/web

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

**`docker/docker-compose.yml`:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: momentum-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: momentum
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: momentum
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U momentum"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    image: ghcr.io/user/momentum-api:latest
    container_name: momentum-api
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 3001
      DATABASE_URL: postgresql://momentum:${DB_PASSWORD}@postgres:5432/momentum
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGIN: https://momentum.example.com
    expose:
      - "3001"

  web:
    image: ghcr.io/user/momentum-web:latest
    container_name: momentum-web
    restart: unless-stopped
    depends_on:
      - api
    environment:
      NEXT_PUBLIC_API_URL: https://api.momentum.example.com/api
    expose:
      - "3000"

volumes:
  postgres_data:
```

### 13.2 CI/CD Pipeline

**`.github/workflows/ci.yml`:**
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: momentum_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linters
        run: npm run lint

      - name: Type check
        run: npm run typecheck

      - name: Run tests
        run: npm run test:coverage
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/momentum_test
          JWT_SECRET: test-secret

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./apps/api/coverage/lcov.info,./apps/web/coverage/lcov.info
```

**`.github/workflows/deploy.yml`:**
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-push:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push API
        uses: docker/build-push-action@v5
        with:
          context: .
          file: docker/api.Dockerfile
          push: true
          tags: ghcr.io/${{ github.repository }}-api:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push Web
        uses: docker/build-push-action@v5
        with:
          context: .
          file: docker/web.Dockerfile
          push: true
          tags: ghcr.io/${{ github.repository }}-web:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

---

## 14. Security & Performance

### 14.1 Security Considerations

| Aspect | Implementation |
|--------|----------------|
| Authentication | JWT avec bcrypt (12 rounds) pour hash passwords |
| Authorization | Single-user MVP, userId vérifié sur toutes les requêtes |
| Input Validation | Zod schemas sur tous les endpoints |
| SQL Injection | Prisma ORM (parameterized queries) |
| XSS | React escaping automatique, Content-Security-Policy headers |
| CORS | Origine restrictive en production |
| Rate Limiting | express-rate-limit (100 req/min) |
| HTTPS | Nginx Proxy Manager + Let's Encrypt |
| Secrets | Variables d'environnement, jamais en code |
| Headers | Helmet.js pour security headers |

### 14.2 Performance Considerations

| Aspect | Strategy |
|--------|----------|
| Database | Index sur userId + date pour requêtes fréquentes |
| API Response | Pagination sur listes (limit 50 default) |
| Caching | React Query staleTime (5min pour données statiques) |
| Bundle Size | Next.js code splitting automatique |
| Images | next/image optimization |
| PWA | Service Worker pour assets statiques |

---

## 15. Testing Strategy

### 15.1 Test Pyramid

```
         /\
        /E2E\        Playwright (Phase 2)
       /------\
      /  Integ  \    Supertest + Test DB
     /------------\
    / Unit Tests   \ Vitest
   /________________\
```

### 15.2 Backend Testing

```typescript
// Example: workout.service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkoutService } from './workout.service';
import { prismaMock } from '../test/prisma-mock';

describe('WorkoutService', () => {
  const service = new WorkoutService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a workout with exercises', async () => {
      const input = {
        name: 'Push Day',
        exercises: [
          { exerciseId: '1', order: 1, sets: 3, reps: 10 }
        ]
      };

      prismaMock.workout.create.mockResolvedValue({
        id: 'workout-1',
        ...input,
        userId: 'user-1',
        createdAt: new Date()
      });

      const result = await service.create('user-1', input);

      expect(result.name).toBe('Push Day');
      expect(prismaMock.workout.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-1' })
        })
      );
    });
  });
});
```

### 15.3 Frontend Testing

```typescript
// Example: Dashboard.test.tsx
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Dashboard } from './Dashboard';

describe('Dashboard', () => {
  it('should display streak counter', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    );

    expect(await screen.findByText(/streak/i)).toBeInTheDocument();
  });
});
```

---

## 16. Coding Standards

### 16.1 Critical Rules

1. **TypeScript Strict Mode** - No `any`, no implicit types
2. **Explicit Return Types** - All exported functions
3. **Error Handling** - No silent catches, use custom error classes
4. **Validation** - Zod on API boundaries
5. **Async/Await** - No raw promises chains
6. **Naming** - camelCase variables, PascalCase components/types

### 16.2 ESLint Configuration

```javascript
// .eslintrc.js (shared)
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/strict-type-checked',
    'plugin:@typescript-eslint/stylistic-type-checked',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
```

---

## 17. Monitoring & Observability

### 17.1 MVP Implementation

- **Logging**: Structured JSON logs via `pino`
- **Health Checks**: `/health` endpoint for Docker/Portainer
- **Error Tracking**: Console logging (upgrade to Sentry en Phase 2)

### 17.2 Health Check Endpoint

```typescript
// GET /health
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Database connection failed'
    });
  }
});
```

---

## 18. Appendix

### 18.1 Glossary

| Term | Definition |
|------|------------|
| **Workout** | A template defining a sequence of exercises with targets |
| **Session** | An actual performance of a workout with recorded sets |
| **Set** | One instance of performing an exercise (reps × weight) |
| **Trackable** | A custom item the user wants to track (yoga, steps, etc.) |
| **Streak** | Consecutive days/periods of achieving a goal |
| **Progressive Overload** | Gradually increasing training stimulus |
| **RPE** | Rate of Perceived Exertion (1-10 difficulty scale) |

### 18.2 References

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Shadcn UI](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Query](https://tanstack.com/query/latest)
- [Zustand](https://github.com/pmndrs/zustand)
