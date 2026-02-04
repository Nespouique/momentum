# Analyse de Migration Hercules → Momentum

## Vue d'ensemble

| Aspect | Hercules | Momentum |
|--------|----------|----------|
| **Base de données** | SQLite (Android) | PostgreSQL |
| **Exercices** | 251 | Variable (seed initial) |
| **Programmes (Workouts)** | 27 | Variable |
| **Historique (Performances)** | 1103 entrées | Sessions + Sets |
| **Mensurations** | 13 entrées | Measurement table |
| **Poids** | 4 entrées | Inclus dans Measurement |

---

## 1. Mapping des Exercices

### Hercules `exercises`
```
_id (INTEGER) PK
name (TEXT)
description (TEXT)
muscle_group_id (INTEGER) - FK vers muscle_groups
picture (TEXT)
equipment (TEXT)
```

### Momentum `Exercise`
```
id (UUID)
name (String)
muscleGroups (String[]) - Array de groupes musculaires
createdAt (DateTime)
```

### Transformation requise

| Hercules | Momentum | Notes |
|----------|----------|-------|
| `_id` | Générer UUID | Garder mapping ancien ID → nouveau UUID pour les FK |
| `name` | `name` | Direct |
| `description` | ❌ Pas de champ | Peut être ignoré ou stocké en notes |
| `muscle_group_id` | `muscleGroups[]` | Transformer en array avec le nom du groupe |
| `picture` | ❌ Pas de champ | Ignoré |
| `equipment` | ❌ Pas de champ | Ignoré (future feature?) |

### Mapping des Groupes Musculaires

| Hercules ID | Hercules Name | Momentum Constant |
|-------------|---------------|-------------------|
| 1 | Non classés | *(ignorer ou "autre")* |
| 2 | Abdos | `abdos` |
| 3 | Avant-bras | *(pas dans Momentum)* → `biceps` ? |
| 4 | Biceps | `biceps` |
| 5 | Quadriceps | `quadriceps` |
| 6 | Dos | `dos` |
| 7 | Epaules | `epaules` |
| 8 | Fessiers | `fessiers` |
| 9 | Ischios-jambiers | `ischios` |
| 10 | Lombaires | `lombaires` |
| 11 | Mollets | `mollets` |
| 12 | Pectoraux | `pecs` |
| 13 | Trapèzes | `trapezes` |
| 14 | Triceps | `triceps` |
| 15 | Cardio | *(pas dans Momentum)* → ajouter ? |

**Action requise:** Décider si on ajoute `avant-bras` et `cardio` aux constantes Momentum.

---

## 2. Mapping des Workouts (Programmes)

### Hercules `sessions` + `sessions_groups`
```
sessions:
  _id, name, description, id_sessions_group

sessions_groups:
  _id, name (ex: "Full body", "Bas du corps", "Haut du corps")
```

### Momentum `Workout`
```
id, userId, name, description, createdAt, updatedAt
```

### Transformation

| Hercules | Momentum | Notes |
|----------|----------|-------|
| `sessions._id` | Générer UUID | Mapping pour FK |
| `sessions.name` | `name` | Direct |
| `sessions.description` | `description` | Direct |
| `sessions_groups.name` | ❌ Pas de catégorie | Peut être ajouté au nom ou description |

**27 programmes Hercules** incluent :
- 8 prédéfinis (Séance en 7 minutes, débutant, abdos, pec, jambes, épaules, bras, dos)
- 19 personnalisés (Bas du corps, Haut du corps, Parcours, etc.)

---

## 3. Mapping des Exercices dans un Workout

### Hercules `session_exercises`
```
_id, id_session, id_exercise, position
nb_reps (TEXT) - Format: "10-10-10" (par série)
nb_sets (INTEGER)
rest_time_between_sets (TEXT) - Format: "90" ou "90-90-90"
rest_time_end_of_exercise (INTEGER) - secondes
loads (TEXT) - Format: "20-25-30" (poids par série)
type (INTEGER) - 0=normal, 1=temps
countdown (INTEGER) - durée si type=1
id_superset (INTEGER) - 0 ou ID du superset
superset_type (INTEGER)
superset_countdown (INTEGER)
```

### Momentum `WorkoutItem` + `WorkoutItemExercise` + `WorkoutSet`
```
WorkoutItem:
  id, workoutId, type ('exercise'|'superset'), position, rounds, restAfter

WorkoutItemExercise:
  id, workoutItemId, exerciseId, position, restBetweenSets

WorkoutSet:
  id, workoutItemExerciseId, setNumber, targetReps, targetWeight
```

### Transformation complexe

1. **Exercice simple** (id_superset = 0):
   - Créer 1 `WorkoutItem` (type='exercise')
   - Créer 1 `WorkoutItemExercise`
   - Parser `nb_reps` et `loads` pour créer N `WorkoutSet`

2. **Superset** (id_superset > 0):
   - Regrouper les exercices avec le même `id_superset`
   - Créer 1 `WorkoutItem` (type='superset', rounds=N)
   - Créer N `WorkoutItemExercise` pour chaque exercice du superset

### Parsing des valeurs string

```javascript
// Exemple: "10-12-10" → [10, 12, 10]
function parseHerculesArray(str) {
  if (!str) return [];
  return str.split('-').map(v => parseFloat(v));
}

// Hercules: nb_reps="10-10-10", loads="20-25-30"
// → WorkoutSet[0]: { setNumber: 1, targetReps: 10, targetWeight: 20 }
// → WorkoutSet[1]: { setNumber: 2, targetReps: 10, targetWeight: 25 }
// → WorkoutSet[2]: { setNumber: 3, targetReps: 10, targetWeight: 30 }
```

---

## 4. Mapping de l'Historique des Séances

### Hercules `performances`
```
_id, date (INTEGER - timestamp ms)
session_duration (INTEGER - secondes)
id_session_exercice, id_session, id_exercise, position
type, countdown
reps_goal (TEXT) - "20-20-20"
reps_done (TEXT) - "20-18-15"
loads_goal (TEXT) - "30-30-30"
loads_done (TEXT) - "30-30-25"
id_superset, superset_type, superset_countdown
duration_done (TEXT) - "45-50-48" (si type temps)
```

### Momentum `WorkoutSession` + `SessionExercise` + `SessionSet`
```
WorkoutSession:
  id, userId, workoutId, status, startedAt, completedAt, notes

SessionExercise:
  id, sessionId, exerciseId, status, position, workoutItemExerciseId

SessionSet:
  id, sessionExerciseId, setNumber
  targetReps, targetWeight, actualReps, actualWeight
  rpe, completedAt
```

### Transformation

1. **Regrouper les performances par date + id_session** → 1 `WorkoutSession`
2. **Chaque ligne performance** → 1 `SessionExercise` + N `SessionSet`
3. **Parser reps/loads** goal et done pour chaque set

### Calculs à faire

```javascript
// Date Hercules (timestamp ms) → Date JS
const date = new Date(hercules.date);

// Durée session
const completedAt = new Date(date.getTime() + (session_duration * 1000));

// Status: toutes les sessions Hercules sont "completed"
```

### Données disponibles: 1103 performances

---

## 5. Mapping des Mensurations

### Hercules `user_body_measurements`
```
_id, date (INTEGER - timestamp ms)
neck, shoulders, chest
biceps_left, biceps_right, forearm_left, forearm_right
wrist_left, wrist_right, waist, hips
thigh_left, thigh_right, calf_left, calf_right
ankle_left, ankle_right
```

### Hercules `user_body_mass`
```
_id, date (INTEGER - timestamp ms)
weight, muscle_mass, body_fat, body_water, bone_mass
```

### Momentum `Measurement`
```
id, userId, date
weight
neck, shoulders, chest
bicepsLeft, bicepsRight, forearmLeft, forearmRight
wristLeft, wristRight, waist, hips
thighLeft, thighRight, calfLeft, calfRight
ankleLeft, ankleRight
notes, createdAt
```

### Transformation

**Problème:** Hercules a 2 tables séparées avec des dates différentes :
- `user_body_measurements`: 13 entrées (dates de 2012 à 2024)
- `user_body_mass`: 4 entrées (dates de 2018 à 2020)

**Solution proposée:**
1. Importer toutes les `user_body_measurements` → `Measurement`
2. Pour chaque `user_body_mass`, chercher une `Measurement` à la même date
   - Si trouvée: ajouter le `weight`
   - Sinon: créer une nouvelle `Measurement` avec juste le `weight`

### Conversion dates

```javascript
// Timestamp Hercules → Date Momentum
const herculesTimestamp = 1346486400000; // ms depuis epoch
const date = new Date(herculesTimestamp);
// → 2012-09-01T00:00:00.000Z
```

---

## 6. Données non migrées

| Hercules Table | Raison |
|----------------|--------|
| `android_metadata` | Métadonnées Android |
| `reminders` | Pas de système de rappels dans Momentum |
| `sessions_notes` | Pourrait être ajouté aux notes de session |
| `user_profile` | Profil déjà existant dans Momentum |
| `sqlite_sequence` | Interne SQLite |

---

## 7. Statistiques de migration

| Donnée | Quantité | Complexité |
|--------|----------|------------|
| Exercices | 251 | Faible |
| Groupes musculaires | 18 → 12 | Mapping requis |
| Workouts (programmes) | 27 | Moyenne |
| Exercices dans workouts | 142 | Élevée (supersets) |
| Historique performances | 1103 | Élevée (parsing) |
| Mensurations | 13 + 4 | Faible (merge) |

---

## 8. Stories créées

| Story | Description | Points | Status |
|-------|-------------|--------|--------|
| [4.1](../stories/4.1.hercules-import-exercises.md) | Import des exercices | 2 | Ready |
| [4.2](../stories/4.2.hercules-import-workouts.md) | Import des workouts (programmes) | 3 | Ready |
| [4.3](../stories/4.3.hercules-import-history.md) | Import de l'historique des séances | 5 | Ready |
| [4.4](../stories/4.4.hercules-import-measurements.md) | Import des mensurations | 1 | Ready |
| [4.5](../stories/4.5.hercules-import-ui.md) | UI d'import (optionnel) | 8 | Deferred |

---

## 9. Décisions prises

| Question | Décision |
|----------|----------|
| Groupes musculaires manquants | Pas de création (avant-bras, cardio ignorés) |
| Exercices en double | Fusion avec existants (mapping) |
| Sessions notes | Importées quand présentes |
| Import one-shot ou récurrent | Script CLI (UI reportée) |
| Mapping workout | Créer de nouveaux workouts "templates" |
| Données anciennes | Supprimées (< 28/02/2024) |
| Séances avec notes d'écart | Simplifier ou ignorer |
