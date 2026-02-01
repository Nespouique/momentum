# AI-Powered Progressive Overload - Prompt pour ChatGPT

## Instructions

Copie le contenu ci-dessous (le prompt + les données JSON) et colle-le dans ChatGPT pour obtenir des suggestions de progression personnalisées.

---

## Prompt

```
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
{DATA_PLACEHOLDER}
```

Analyse ces données et propose tes recommandations.
```

---

## Données JSON (Séance "Jambes")

Remplace `{DATA_PLACEHOLDER}` dans le prompt ci-dessus par ces données :

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
        ]
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
        ]
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
        "progressionHistory": []
      }
    ]
  },
  "userProfile": {
    "trainingFrequency": "3-4x/semaine",
    "experience": "intermédiaire",
    "goal": "hypertrophie"
  }
}
```

---

## Exemple d'utilisation

1. Copie tout le prompt (de "Tu es un coach sportif..." jusqu'à "...propose tes recommandations.")
2. Remplace `{DATA_PLACEHOLDER}` par le JSON ci-dessus
3. Colle dans ChatGPT
4. Reçois des recommandations personnalisées !

---

## Notes pour l'implémentation future

Pour intégrer ça dans l'app, il faudrait :

1. **Endpoint API** : `POST /api/ai-suggestions`
2. **Service** : Générer le JSON depuis la DB, appeler l'API OpenAI, parser la réponse
3. **UI** : Afficher les suggestions dans un format plus riche que les cartes actuelles
4. **Coût** : ~$0.01-0.05 par requête avec GPT-4o-mini

### Exemple de code (futur)

```typescript
async function getAISuggestions(workoutId: string, userId: string) {
  const data = await buildWorkoutHistoryJSON(workoutId, userId);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: COACH_SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(data) }
    ],
    response_format: { type: "json_object" }
  });

  return JSON.parse(response.choices[0].message.content);
}
```
