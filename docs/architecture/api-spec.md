# Momentum - API Specification

## 1. Base Configuration

- **Base URL**: `/api/v1`
- **Content-Type**: `application/json`
- **Authentication**: Bearer token in `Authorization` header

---

## 2. Authentication Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Create new account | No |
| POST | `/auth/login` | Authenticate user | No |
| POST | `/auth/logout` | Invalidate token | Yes |
| GET | `/auth/me` | Get current user | Yes |

### Request/Response Examples

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

---

## 3. User Profile Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/profile` | Get user profile | Yes |
| PATCH | `/profile` | Update profile | Yes |
| PUT | `/profile/password` | Change password | Yes |

---

## 4. Measurements Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/measurements` | List measurements | Yes |
| GET | `/measurements/:id` | Get single measurement | Yes |
| POST | `/measurements` | Create measurement | Yes |
| PUT | `/measurements/:id` | Update measurement | Yes |
| DELETE | `/measurements/:id` | Delete measurement | Yes |
| GET | `/measurements/latest` | Get most recent | Yes |
| GET | `/measurements/progress` | Get progress data | Yes |

### Request/Response Examples

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

---

## 5. Exercise Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/exercises` | List all exercises | Yes |
| GET | `/exercises/:id` | Get single exercise | Yes |
| POST | `/exercises` | Create custom exercise | Yes |
| PUT | `/exercises/:id` | Update custom exercise | Yes |
| DELETE | `/exercises/:id` | Delete custom exercise | Yes |
| GET | `/exercises/muscle-groups` | List muscle groups | Yes |

### Query Parameters

- `muscleGroup`: Filter by muscle group
- `isCustom`: Filter custom/system exercises

### Request/Response Examples

```typescript
// GET /exercises?muscleGroup=pecs
// Response 200
{
  "data": [
    {
      "id": "uuid",
      "name": "Developpe couche",
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
  "name": "Dips lestes",
  "muscleGroups": ["pecs", "triceps"]
}
// Response 201
{
  "id": "uuid",
  "name": "Dips lestes",
  "muscleGroups": ["pecs", "triceps"],
  "isCustom": true,
  "userId": "user-uuid",
  "createdAt": "2024-01-15T..."
}
```

---

## 6. Workout Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/workouts` | List workout templates | Yes |
| GET | `/workouts/:id` | Get workout with exercises | Yes |
| POST | `/workouts` | Create workout template | Yes |
| PUT | `/workouts/:id` | Update workout | Yes |
| DELETE | `/workouts/:id` | Delete workout | Yes |
| POST | `/workouts/:id/duplicate` | Duplicate workout | Yes |

### Request/Response Examples

```typescript
// POST /workouts
// Request
{
  "name": "Push Day",
  "description": "Chest, shoulders, triceps",
  "items": [
    {
      "type": "exercise",
      "position": 1,
      "rounds": 1,
      "restAfter": 120,
      "exercises": [
        {
          "exerciseId": "uuid",
          "position": 1,
          "restBetweenSets": 90,
          "sets": [
            { "setNumber": 1, "targetReps": 10, "targetWeight": 60 },
            { "setNumber": 2, "targetReps": 10, "targetWeight": 60 },
            { "setNumber": 3, "targetReps": 10, "targetWeight": 60 }
          ]
        }
      ]
    },
    {
      "type": "superset",
      "position": 2,
      "rounds": 3,
      "restAfter": 90,
      "exercises": [
        {
          "exerciseId": "uuid-triceps",
          "position": 1,
          "restBetweenSets": 0,
          "sets": [
            { "setNumber": 1, "targetReps": 12, "targetWeight": null }
          ]
        },
        {
          "exerciseId": "uuid-biceps",
          "position": 2,
          "restBetweenSets": 0,
          "sets": [
            { "setNumber": 1, "targetReps": 12, "targetWeight": 10 }
          ]
        }
      ]
    }
  ]
}
// Response 201
{
  "id": "uuid",
  "userId": "uuid",
  "name": "Push Day",
  "description": "Chest, shoulders, triceps",
  "items": [...],
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

## 7. Workout Session Endpoints

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

### Query Parameters (GET /sessions)

- `status`: Filter by status
- `workoutId`: Filter by workout
- `from`: Start date
- `to`: End date
- `limit`: Page size (default 20)
- `offset`: Pagination offset

### Request/Response Examples

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

---

## 8. Progression Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/progression/suggestions` | Get pending suggestions | Yes |
| PATCH | `/progression/suggestions/:id` | Accept/dismiss suggestion | Yes |
| GET | `/progression/history/:exerciseId` | Exercise progression history | Yes |
| GET | `/progression/analysis` | Overall progression analysis | Yes |

### Request/Response Examples

```typescript
// GET /progression/suggestions
// Response 200
{
  "data": [
    {
      "id": "uuid",
      "exerciseId": "uuid",
      "exercise": { "name": "Developpe couche", ... },
      "suggestionType": "increase_weight",
      "currentValue": 60,
      "suggestedValue": 62.5,
      "reason": "Vous avez atteint 10 reps sur 4 seances consecutives",
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
  "exercise": { "id": "uuid", "name": "Developpe couche" },
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

---

## 9. Trackable Items Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/trackables` | List trackable items | Yes |
| GET | `/trackables/:id` | Get trackable item | Yes |
| POST | `/trackables` | Create trackable item | Yes |
| PUT | `/trackables/:id` | Update trackable item | Yes |
| DELETE | `/trackables/:id` | Delete trackable item | Yes |
| POST | `/trackables/:id/goals` | Set goal for trackable | Yes |
| PUT | `/trackables/:id/goals/:goalId` | Update goal | Yes |

### Request/Response Examples

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

---

## 10. Daily Tracking Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/tracking/entries` | List entries | Yes |
| GET | `/tracking/entries/:date` | Get entries for date | Yes |
| POST | `/tracking/entries` | Create/update entry | Yes |
| DELETE | `/tracking/entries/:id` | Delete entry | Yes |
| GET | `/tracking/summary` | Weekly/monthly summary | Yes |

### Query Parameters (GET /tracking/entries)

- `trackableId`: Filter by trackable
- `from`: Start date
- `to`: End date

### Request/Response Examples

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

---

## 11. Streak Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/streaks` | Get all user streaks | Yes |
| GET | `/streaks/:trackableId` | Get streak for trackable | Yes |
| GET | `/streaks/workout` | Get global workout streak | Yes |

### Request/Response Examples

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

---

## 12. Error Response Format

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

### Error Codes

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

## 13. Health Check

```typescript
// GET /health
// Response 200
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00Z",
  "version": "0.1.0"
}

// Response 503 (unhealthy)
{
  "status": "unhealthy",
  "error": "Database connection failed"
}
```
