# Momentum - Data Models

## 1. Overview

This document defines the data models and database schema for Momentum. It serves as the authoritative reference for all data structures.

---

## 2. Core TypeScript Interfaces

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
  birthDate?: Date;
  height?: number; // in cm
  goalDescription?: string;
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
  items: WorkoutItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkoutItem {
  id: string;
  workoutId: string;
  type: 'exercise' | 'superset';
  position: number;
  rounds: number; // 1 for simple exercise, N for superset
  restAfter: number; // seconds
  exercises: WorkoutItemExercise[];
}

export interface WorkoutItemExercise {
  id: string;
  workoutItemId: string;
  exerciseId: string;
  exercise?: Exercise;
  position: number;
  restBetweenSets: number; // seconds
  sets: WorkoutSet[];
}

export interface WorkoutSet {
  id: string;
  workoutItemExerciseId: string;
  setNumber: number;
  targetReps: number;
  targetWeight: number | null; // kg
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

---

## 3. Data Relationships Diagram

```
┌──────────┐       ┌─────────────┐       ┌──────────────────┐
│   User   │──────<│   Workout   │──────<│   WorkoutItem    │
└──────────┘  1:N  └─────────────┘  1:N  └──────────────────┘
     │                   │                        │
     │                   │                        │
     │              ┌────▼────────┐         ┌─────▼─────────────┐
     │              │WorkoutSession│        │WorkoutItemExercise│
     │              └─────────────┘        └───────────────────┘
     │                    │                        │
     │                    │                   ┌────▼────┐
     │                    └──────────────────<│   Set   │
     │                                   1:N  └─────────┘
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

## 4. Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "cjs"
}

datasource db {
  provider = "postgresql"
}

// ============================================
// USER & AUTH
// ============================================

model User {
  id              String    @id @default(uuid())
  email           String    @unique
  passwordHash    String    @map("password_hash")
  name            String
  birthDate       DateTime? @map("birth_date") @db.Date
  height          Float?    // in cm
  goalDescription String?   @map("goal_description")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  measurements Measurement[]
  workouts     Workout[]

  @@map("users")
}

// ============================================
// MEASUREMENTS
// ============================================

model Measurement {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id])
  date      DateTime @db.Date

  // Weight in kg
  weight Float?

  // Upper body (cm)
  neck      Float?
  shoulders Float?
  chest     Float?

  // Arms (cm) - bilateral
  bicepsLeft   Float? @map("biceps_left")
  bicepsRight  Float? @map("biceps_right")
  forearmLeft  Float? @map("forearm_left")
  forearmRight Float? @map("forearm_right")
  wristLeft    Float? @map("wrist_left")
  wristRight   Float? @map("wrist_right")

  // Core (cm)
  waist Float?
  hips  Float?

  // Legs (cm) - bilateral
  thighLeft  Float? @map("thigh_left")
  thighRight Float? @map("thigh_right")
  calfLeft   Float? @map("calf_left")
  calfRight  Float? @map("calf_right")
  ankleLeft  Float? @map("ankle_left")
  ankleRight Float? @map("ankle_right")

  notes     String?
  createdAt DateTime @default(now()) @map("created_at")

  @@unique([userId, date])
  @@map("measurements")
}

// ============================================
// EXERCISES
// ============================================

model Exercise {
  id           String   @id @default(uuid())
  name         String
  muscleGroups String[] @map("muscle_groups")
  createdAt    DateTime @default(now()) @map("created_at")

  workoutItemExercises WorkoutItemExercise[]

  @@map("exercises")
}

// ============================================
// WORKOUTS (Templates with Superset Support)
// ============================================

model Workout {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  user        User     @relation(fields: [userId], references: [id])
  name        String
  description String?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  items WorkoutItem[]

  @@map("workouts")
}

model WorkoutItem {
  id        String  @id @default(uuid())
  workoutId String  @map("workout_id")
  workout   Workout @relation(fields: [workoutId], references: [id], onDelete: Cascade)
  type      String  // 'exercise' | 'superset'
  position  Int     // order in workout
  rounds    Int     @default(1) // number of rounds (1 for simple exercise, N for superset)
  restAfter Int     @map("rest_after") // seconds, rest after this item

  exercises WorkoutItemExercise[]

  @@index([workoutId, position])
  @@map("workout_items")
}

model WorkoutItemExercise {
  id              String      @id @default(uuid())
  workoutItemId   String      @map("workout_item_id")
  workoutItem     WorkoutItem @relation(fields: [workoutItemId], references: [id], onDelete: Cascade)
  exerciseId      String      @map("exercise_id")
  exercise        Exercise    @relation(fields: [exerciseId], references: [id])
  position        Int         // order in item (1 for simple, 1-N for superset)
  restBetweenSets Int         @map("rest_between_sets") // seconds

  sets WorkoutSet[]

  @@index([workoutItemId, position])
  @@map("workout_item_exercises")
}

model WorkoutSet {
  id                    String              @id @default(uuid())
  workoutItemExerciseId String              @map("workout_item_exercise_id")
  workoutItemExercise   WorkoutItemExercise @relation(fields: [workoutItemExerciseId], references: [id], onDelete: Cascade)
  setNumber             Int                 @map("set_number")
  targetReps            Int                 @map("target_reps")
  targetWeight          Float?              @map("target_weight") // kg, nullable

  @@index([workoutItemExerciseId, setNumber])
  @@map("workout_sets")
}
```

---

## 5. Database Indexes Summary

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| measurements | Primary lookup | `userId, date` | Fast date-range queries |
| exercises | Filter | `muscleGroups` | Filter by muscle group |
| workouts | User lookup | `userId` | User's workout templates |
| workout_items | Position | `workoutId, position` | Ordered retrieval |
| workout_item_exercises | Position | `workoutItemId, position` | Ordered retrieval |
| workout_sets | Set lookup | `workoutItemExerciseId, setNumber` | Ordered sets |

---

## 6. Glossary

| Term | Definition |
|------|------------|
| **Workout** | A template defining a sequence of exercises with targets |
| **WorkoutItem** | A container that can hold either a single exercise or a superset |
| **Superset** | Multiple exercises performed back-to-back without rest |
| **Session** | An actual performance of a workout with recorded sets |
| **Set** | One instance of performing an exercise (reps x weight) |
| **Trackable** | A custom item the user wants to track (yoga, steps, etc.) |
| **Streak** | Consecutive days/periods of achieving a goal |
| **Progressive Overload** | Gradually increasing training stimulus |
| **RPE** | Rate of Perceived Exertion (1-10 difficulty scale) |
