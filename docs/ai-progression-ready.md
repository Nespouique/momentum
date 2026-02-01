# Prompt prêt à copier pour ChatGPT

Copie tout le contenu ci-dessous et colle-le directement dans ChatGPT :

---

Tu es un coach sportif expert en musculation et en programmation d'entraînement. Tu vas analyser l'historique d'entraînement d'un utilisateur et proposer des ajustements pour ses prochaines séances.

## Contexte

L'utilisateur utilise une application de suivi de musculation. Pour chaque exercice, il a :
- Un **target** (objectif) : nombre de reps et poids cible
- Un **actual** (réalisé) : ce qu'il a vraiment fait

L'application propose déjà des suggestions automatiques basées sur des règles simples :
- Si l'utilisateur atteint ses objectifs 3 fois de suite au même niveau → suggérer +5kg (compound) ou +2.5kg (isolation) pour les exercices avec poids
- Pour les exercices au poids du corps → suggérer +2 reps

## Ta mission

Analyse l'historique ci-dessous et propose des recommandations PLUS INTELLIGENTES que les règles automatiques :

1. **Analyse les tendances** : L'utilisateur progresse-t-il régulièrement ? Y a-t-il des plateaux ?
2. **Détecte les déséquilibres** : Certains exercices progressent-ils plus vite que d'autres ?
3. **Propose des ajustements** : Pour chaque exercice, recommande :
   - Nouveau target reps
   - Nouveau target poids (si applicable)
   - Justification de ta recommandation
4. **Conseils additionnels** : Variations, tempo, récupération, etc.

## Format de réponse attendu

Pour chaque exercice, donne :
- **Exercice** : Nom
- **Analyse** : Observation sur les performances récentes
- **Recommendation** : Nouveau target (reps x poids)
- **Justification** : Pourquoi cette progression
- **Conseil** : Astuce pour maximiser les gains

À la fin, donne un résumé global de la séance et des conseils généraux.

## Données de l'utilisateur

```json
{
  "workout": {
    "name": "Jambes",
    "exercises": [
      {
        "name": "Leg press",
        "muscleGroups": ["quadriceps", "fessiers"],
        "type": "compound",
        "currentTarget": {
          "sets": 3,
          "reps": 10,
          "weight": 12
        },
        "history": [
          { "date": "2026-02-01", "targetReps": 10, "targetWeight": 12, "actualReps": 10, "actualWeight": 12, "success": true },
          { "date": "2026-02-01", "targetReps": 10, "targetWeight": 12, "actualReps": 10, "actualWeight": 12, "success": true },
          { "date": "2026-02-01", "targetReps": 10, "targetWeight": 12, "actualReps": 10, "actualWeight": 12, "success": true },
          { "date": "2026-02-01", "targetReps": 10, "targetWeight": 12, "actualReps": 10, "actualWeight": 12, "success": true },
          { "date": "2026-02-01", "targetReps": 10, "targetWeight": 7, "actualReps": 10, "actualWeight": 7, "success": true },
          { "date": "2026-02-01", "targetReps": 10, "targetWeight": 7, "actualReps": 10, "actualWeight": 7, "success": true },
          { "date": "2026-02-01", "targetReps": 10, "targetWeight": 7, "actualReps": 10, "actualWeight": 7, "success": true },
          { "date": "2026-01-23", "targetReps": 10, "targetWeight": 7, "actualReps": 10, "actualWeight": 7, "success": true },
          { "date": "2026-01-22", "targetReps": 10, "targetWeight": 7, "actualReps": 10, "actualWeight": 7, "success": true },
          { "date": "2026-01-22", "targetReps": 10, "targetWeight": 7, "actualReps": 11, "actualWeight": 11, "success": true }
        ],
        "progressionHistory": [
          { "from": "10x7kg", "to": "10x12kg", "date": "2026-02-01" }
        ],
        "notes": "Progression de 7kg à 12kg récemment acceptée"
      },
      {
        "name": "Fentes",
        "muscleGroups": ["quadriceps", "fessiers", "ischios"],
        "type": "bodyweight",
        "currentTarget": {
          "sets": 3,
          "reps": 14,
          "weight": null
        },
        "history": [
          { "date": "2026-02-01", "targetReps": 14, "actualReps": 14, "success": true },
          { "date": "2026-02-01", "targetReps": 14, "actualReps": 14, "success": true },
          { "date": "2026-02-01", "targetReps": 14, "actualReps": 14, "success": true },
          { "date": "2026-02-01", "targetReps": 10, "actualReps": 10, "success": true },
          { "date": "2026-02-01", "targetReps": 12, "actualReps": 12, "success": true },
          { "date": "2026-02-01", "targetReps": 10, "actualReps": 10, "success": true },
          { "date": "2026-01-23", "targetReps": 10, "actualReps": 10, "success": true },
          { "date": "2026-01-22", "targetReps": 10, "actualReps": 10, "success": true }
        ],
        "progressionHistory": [
          { "from": "10 reps", "to": "12 reps", "date": "2026-02-01" },
          { "from": "12 reps", "to": "14 reps", "date": "2026-02-01" }
        ],
        "notes": "Progression rapide de 10 à 14 reps en peu de séances"
      },
      {
        "name": "Soulevé de terre",
        "muscleGroups": ["dos", "ischios", "fessiers", "lombaires"],
        "type": "bodyweight",
        "currentTarget": {
          "sets": 3,
          "reps": 10,
          "weight": null
        },
        "history": [
          { "date": "2026-02-01", "targetReps": 10, "actualReps": 10, "success": true },
          { "date": "2026-02-01", "targetReps": 10, "actualReps": 10, "success": true },
          { "date": "2026-02-01", "targetReps": 10, "actualReps": 10, "success": true },
          { "date": "2026-02-01", "targetReps": 10, "actualReps": 10, "success": true },
          { "date": "2026-02-01", "targetReps": 10, "actualReps": 10, "success": true },
          { "date": "2026-01-23", "targetReps": 10, "actualReps": 10, "success": true },
          { "date": "2026-01-22", "targetReps": 10, "actualReps": 10, "success": true }
        ],
        "progressionHistory": [],
        "notes": "Stable à 10 reps depuis plusieurs séances, aucune progression suggérée"
      }
    ]
  },
  "userProfile": {
    "trainingFrequency": "3-4x/semaine",
    "experience": "intermédiaire",
    "goal": "hypertrophie"
  },
  "context": {
    "lastSession": "2026-02-01",
    "totalSessionsThisMonth": 8,
    "averageSessionDuration": "45 minutes"
  }
}
```

Analyse ces données et propose tes recommandations détaillées pour optimiser la progression de cet utilisateur.
