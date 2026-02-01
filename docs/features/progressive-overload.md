# Progressive Overload - Documentation technique

## Vue d'ensemble

Le système de Progressive Overload analyse automatiquement les performances de l'utilisateur à la fin de chaque séance et suggère des augmentations de poids ou de répétitions pour favoriser la progression.

---

## Algorithme de détection

### Diagramme de décision

```
┌─────────────────────────────────────────────────────────────┐
│                    DÉBUT DE L'ÉVALUATION                    │
│              (pour chaque exercice complété)                │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  RG1: Toutes les séries de la SESSION ACTUELLE              │
│       ont atteint leur cible ?                              │
│       - actualReps >= targetReps                            │
│       - actualWeight >= targetWeight (si applicable)        │
├─────────────────────────────────────────────────────────────┤
│  NON → Pas de suggestion (performance insuffisante)         │
│  OUI ↓                                                      │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  RG2: Suggestion ignorée récemment ?                        │
│       - Vérifie les 3 dernières sessions complétées         │
│       - Cherche une suggestion "dismissed" pour cet exo     │
├─────────────────────────────────────────────────────────────┤
│  OUI → Pas de suggestion (cooldown actif)                   │
│  NON ↓                                                      │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  RG3: STABILITÉ - Au moins 3 sessions PASSÉES où            │
│       les cibles ACTUELLES ont été atteintes ?              │
│                                                             │
│       ⚠️  IMPORTANT: Ne compte que les sessions où le       │
│       target était au MÊME NIVEAU que le target actuel.     │
│       Les sessions avec un target inférieur ne comptent pas.│
│                                                             │
│       Exemple: Si target actuel = 12 reps, seules les       │
│       sessions avec target >= 12 reps sont comptées.        │
├─────────────────────────────────────────────────────────────┤
│  NON → Pas de suggestion (pas encore assez stable)          │
│  OUI ↓                                                      │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  RG4: Type d'exercice ?                                     │
├─────────────────────────────────────────────────────────────┤
│  targetWeight > 0 → Exercice avec poids → SUGGESTION POIDS  │
│  targetWeight = 0 → Exercice poids du corps → SUGG. REPS    │
└──────────────┬─────────────────────────────┬────────────────┘
               ▼                             ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│  RG5: SUGGESTION POIDS       │ │  RG6: SUGGESTION REPS      │
│                              │ │                            │
│  Incrément basé sur le type: │ │  Incrément: +2 reps        │
│  • Compound: +5kg            │ │                            │
│  • Isolation: +2.5kg         │ │  Message:                  │
│                              │ │  "Objectifs atteints sur   │
│  Muscles compound:           │ │  N séances. Passez à       │
│  - pectoraux                 │ │  X reps !"                 │
│  - dos                       │ │                            │
│  - quadriceps                │ └────────────────────────────┘
│  - ischios                   │
│  - fessiers                  │
│                              │
│  Message:                    │
│  "Objectifs atteints sur     │
│  N séances. Prêt pour Xkg ?" │
└──────────────────────────────┘
```

---

## Règles de gestion détaillées

### RG1: Validation des cibles (session actuelle)

| Condition | Description |
|-----------|-------------|
| `actualReps >= targetReps` | Toutes les séries doivent atteindre ou dépasser les reps cibles |
| `actualWeight >= targetWeight` | Si un poids cible existe, il doit être atteint |

**Important**: Une seule série en dessous de la cible = pas de suggestion.

---

### RG2: Cooldown après refus

| Paramètre | Valeur |
|-----------|--------|
| Nombre de sessions vérifiées | 3 |
| Statut recherché | `dismissed` |

Si l'utilisateur a ignoré une suggestion pour cet exercice dans les 3 dernières sessions **complétées**, aucune nouvelle suggestion n'est générée.

---

### RG3: Stabilité (s'applique à TOUS les exercices)

| Paramètre | Valeur |
|-----------|--------|
| Minimum de sessions réussies | 3 |
| Définition de "réussi" | TOUTES les séries >= cibles (reps ET poids) |
| Niveau de comparaison | Target de la session passée >= target actuel |

**C'est la règle clé**: On vérifie que l'utilisateur a atteint ses objectifs sur **au moins 3 sessions passées AU MÊME NIVEAU** avant de suggérer une progression.

**Comparaison des niveaux**: Seules les sessions où le target était **au moins égal** au target actuel sont comptées. Cela évite de compter les anciennes sessions avec des targets inférieurs après une augmentation.

**Exemple concret**:
1. L'utilisateur avait 10 reps comme target, il réussit 5 sessions → suggestion acceptée → nouveau target = 12 reps
2. Session suivante : 12 reps atteints ✓
3. Vérification RG3 : les 5 anciennes sessions avaient target = 10 reps, donc < 12 → **ne comptent pas**
4. Résultat : 0 session réussie au niveau actuel → **pas de suggestion** (il faut encore 3 sessions à 12 reps)

**Important**: Cette règle s'applique autant aux exercices avec poids qu'aux exercices au poids du corps.

---

### RG4: Classification des exercices

#### Exercices avec poids
`targetWeight > 0`

#### Exercices au poids du corps (bodyweight)
`targetWeight = 0`

---

### RG5: Suggestion d'augmentation de poids

| Type d'exercice | Incrément |
|-----------------|-----------|
| Compound | +5 kg |
| Isolation | +2.5 kg |

**Muscles compound**:
- `pectoraux`
- `dos`
- `quadriceps`
- `ischios`
- `fessiers`

**Déclencheur**: `targetWeight > 0` ET RG3 validée (3+ sessions réussies)

---

### RG6: Suggestion d'augmentation de reps

| Paramètre | Valeur |
|-----------|--------|
| Incrément | +2 reps |

**Déclencheur**: `targetWeight = 0` ET RG3 validée (3+ sessions réussies)

---

## Résumé simplifié

```
Pour suggérer une progression:

1. ✅ Session actuelle: toutes les séries >= cibles
2. ✅ Pas de suggestion ignorée dans les 3 dernières sessions
3. ✅ Au moins 3 sessions PASSÉES au MÊME NIVEAU de difficulté
   (les sessions avec un target inférieur ne comptent pas)
4. Alors:
   - Si poids > 0 → suggérer +poids
   - Si poids = 0 → suggérer +reps
```

---

## Modèle de données

```prisma
enum SuggestionType {
  increase_weight
  increase_reps
}

enum SuggestionStatus {
  pending
  accepted
  dismissed
}

model ProgressionSuggestion {
  id              String           @id @default(uuid())
  userId          String
  exerciseId      String
  sessionId       String

  suggestionType  SuggestionType   // Type de progression
  currentValue    Float            // Valeur actuelle (kg ou reps)
  suggestedValue  Float            // Valeur suggérée
  reason          String           // Message explicatif
  status          SuggestionStatus @default(pending)

  createdAt       DateTime         @default(now())
  respondedAt     DateTime?        // Quand l'utilisateur a répondu

  @@unique([sessionId, exerciseId]) // Une suggestion par exercice par session
}
```

---

## API Endpoints

### GET `/sessions/:id/progression-suggestions`

Génère et retourne les suggestions pour une session.

**Réponse**:
```json
{
  "data": [
    {
      "id": "uuid",
      "exerciseId": "uuid",
      "exerciseName": "Développé couché",
      "suggestionType": "increase_weight",
      "currentValue": 60,
      "suggestedValue": 65,
      "reason": "Objectifs atteints sur 3 séances. Prêt pour 65kg ?",
      "status": "pending"
    }
  ]
}
```

### PATCH `/progression-suggestions/:id`

Accepte ou refuse une suggestion.

**Body**:
```json
{
  "status": "accepted" | "dismissed"
}
```

**Si accepted**: Met à jour `WorkoutSet.targetWeight` ou `targetReps` dans le template du workout.

---

## Flow utilisateur

```
1. Utilisateur termine sa séance (arrive sur écran Summary)
          ↓
2. GET /sessions/:id/progression-suggestions
          ↓
3. Pour chaque exercice:
   - Vérifie session actuelle >= cibles
   - Vérifie pas de cooldown
   - Vérifie 3+ sessions passées réussies
   - Si OK → crée suggestion
          ↓
4. Affiche ProgressionSuggestionCard sous l'exercice
          ↓
5. Utilisateur clique "Appliquer" ou "Ignorer"
          ↓
6. PATCH /progression-suggestions/:id
          ↓
7. Si accepted:
   └─ Mise à jour du template workout
   └─ Toast "Objectif mis à jour !"
          ↓
8. Prochaine séance: nouvelles cibles appliquées
```

---

## Constantes de configuration

```typescript
// Groupes musculaires indiquant un exercice compound
const COMPOUND_MUSCLE_GROUPS = [
  "pectoraux", "dos", "quadriceps", "ischios", "fessiers"
];

// Incréments de poids
const WEIGHT_INCREMENT_COMPOUND = 5;    // kg
const WEIGHT_INCREMENT_ISOLATION = 2.5; // kg

// Incrément de reps
const REP_INCREMENT = 2;

// Cooldown après refus
const COOLDOWN_SESSIONS = 3;

// Minimum de sessions réussies pour suggérer
const MIN_SUCCESSFUL_SESSIONS = 3;
```

---

## Fichiers source

| Fichier | Rôle |
|---------|------|
| `apps/api/src/services/progression.service.ts` | Logique d'évaluation |
| `apps/api/src/routes/progression.routes.ts` | Endpoints API |
| `apps/api/src/schemas/progression.schema.ts` | Validation Zod |
| `apps/web/src/components/session/progression-suggestion-card.tsx` | Composant UI |
| `apps/web/src/lib/api/sessions.ts` | Client API (fonctions fetch) |

---

## Alternative future: Progressive Overload "Smart"

Une évolution possible serait d'utiliser l'IA pour analyser les performances:

1. Récupérer l'historique des X dernières séances
2. Appeler l'API ChatGPT avec un prompt pré-formulé
3. Recevoir des suggestions personnalisées et contextuelles

Avantages:
- Analyse plus fine des tendances
- Suggestions adaptées au contexte (fatigue, plateau, etc.)
- Possibilité de suggestions plus variées (décharges, variations, etc.)
