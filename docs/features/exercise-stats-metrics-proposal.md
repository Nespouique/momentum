# Proposition de métriques pour les statistiques d'exercices

## Contexte

On veut afficher l'évolution des performances sur un exercice dans le temps via un graphique. Le problème : chaque séance contient plusieurs séries avec des poids/reps différents. **Quelle valeur afficher sur le graphique ?**

---

## Les métriques possibles

| # | Métrique | Description | Formule |
|---|----------|-------------|---------|
| A | **Poids max** | La charge la plus lourde soulevée dans la séance | `max(poids)` |
| B | **E1RM estimé** | Force théorique sur 1 rep (permet de comparer 6@80kg vs 10@70kg) | `poids × (1 + reps/30)` |
| C | **Volume total** | Travail total de la séance sur cet exercice | `Σ (poids × reps)` |
| D | **Reps totales** | Nombre total de répétitions | `Σ reps` |
| E | **Poids moyen** | Moyenne des charges utilisées | `moyenne(poids)` |
| F | **Meilleure série** | La série avec le meilleur E1RM | Série avec `max(poids × (1 + reps/30))` |

---

## Exemple 1 : Développé couché barre (polyarticulaire)

### Données brutes

| Séance 1 (15/01) | Séance 2 (22/01) | Séance 3 (29/01) |
|------------------|------------------|------------------|
| 10 reps @ 70kg | 12 reps @ 70kg | 10 reps @ 70kg |
| 8 reps @ 80kg | 8 reps @ 85kg | 8 reps @ 85kg |
| 6 reps @ 85kg | 6 reps @ 90kg | 8 reps @ 90kg |
| 6 reps @ 85kg | 3 reps @ 90kg | 6 reps @ 90kg |
| 9 reps @ 70kg | 9 reps @ 70kg | 6 reps @ 85kg |

### Calcul des métriques

| Métrique | Séance 1 | Séance 2 | Séance 3 | Tendance |
|----------|----------|----------|----------|----------|
| **A. Poids max** | 85 kg | 90 kg | 90 kg | ↗ +5kg puis stable |
| **B. E1RM** | 102 kg | 108 kg | 114 kg | ↗ Progression constante |
| **C. Volume** | 2 990 kg | 2 960 kg | 3 230 kg | ↗ Variable |
| **D. Reps totales** | 39 | 38 | 38 | → Stable |
| **E. Poids moyen** | 77 kg | 78 kg | 84 kg | ↗ Progression |

**Observation** : L'E1RM montre une progression constante même quand le poids max stagne (séance 2→3), car les reps à 90kg passent de 6 à 8.

---

## Exemple 2 : Squat barre (polyarticulaire)

### Données brutes

| Séance 1 (16/01) | Séance 2 (23/01) | Séance 3 (30/01) |
|------------------|------------------|------------------|
| 10 reps @ 60kg | 10 reps @ 60kg | 8 reps @ 60kg |
| 8 reps @ 80kg | 8 reps @ 80kg | 8 reps @ 85kg |
| 5 reps @ 100kg | 6 reps @ 100kg | 5 reps @ 105kg |
| 5 reps @ 100kg | 5 reps @ 100kg | 5 reps @ 105kg |
| 3 reps @ 110kg | 4 reps @ 110kg | 3 reps @ 115kg |

### Calcul des métriques

| Métrique | Séance 1 | Séance 2 | Séance 3 | Tendance |
|----------|----------|----------|----------|----------|
| **A. Poids max** | 110 kg | 110 kg | 115 kg | ↗ +5kg |
| **B. E1RM** | 121 kg | 125 kg | 127 kg | ↗ Progression constante |
| **C. Volume** | 2 630 kg | 2 740 kg | 2 780 kg | ↗ Progression |
| **D. Reps totales** | 31 | 33 | 29 | → Variable |
| **E. Poids moyen** | 85 kg | 83 kg | 96 kg | ↗ Variable |

**Observation** : Le poids max stagne séance 1→2 mais l'E1RM progresse grâce aux reps supplémentaires (3→4 reps à 110kg).

---

## Exemple 3 : Curl biceps haltères (isolation)

### Données brutes

| Séance 1 (15/01) | Séance 2 (22/01) | Séance 3 (29/01) |
|------------------|------------------|------------------|
| 12 reps @ 10kg | 12 reps @ 10kg | 12 reps @ 10kg |
| 10 reps @ 12kg | 12 reps @ 12kg | 10 reps @ 14kg |
| 8 reps @ 14kg | 10 reps @ 14kg | 8 reps @ 14kg |
| 8 reps @ 14kg | 8 reps @ 14kg | 8 reps @ 14kg |

### Calcul des métriques

| Métrique | Séance 1 | Séance 2 | Séance 3 | Tendance |
|----------|----------|----------|----------|----------|
| **A. Poids max** | 14 kg | 14 kg | 14 kg | → Stable |
| **B. E1RM** | 17.7 kg | 18.7 kg | 17.7 kg | → Variable |
| **C. Volume** | 476 kg | 532 kg | 504 kg | ↗ Variable |
| **D. Reps totales** | 38 | 42 | 38 | → Variable |
| **E. Poids moyen** | 12.5 kg | 12.7 kg | 13.3 kg | ↗ Légère hausse |

**Observation** : Pour l'isolation, le poids max bouge peu (incréments de 2kg). Le volume et les reps sont plus parlants pour voir la progression.

---

## Exemple 4 : Extension triceps corde (isolation)

### Données brutes

| Séance 1 (17/01) | Séance 2 (24/01) | Séance 3 (31/01) |
|------------------|------------------|------------------|
| 15 reps @ 15kg | 15 reps @ 15kg | 12 reps @ 17.5kg |
| 12 reps @ 17.5kg | 15 reps @ 17.5kg | 12 reps @ 17.5kg |
| 10 reps @ 20kg | 12 reps @ 20kg | 10 reps @ 22.5kg |
| 10 reps @ 20kg | 10 reps @ 20kg | 10 reps @ 22.5kg |

### Calcul des métriques

| Métrique | Séance 1 | Séance 2 | Séance 3 | Tendance |
|----------|----------|----------|----------|----------|
| **A. Poids max** | 20 kg | 20 kg | 22.5 kg | ↗ +2.5kg |
| **B. E1RM** | 26.7 kg | 28 kg | 30 kg | ↗ Progression |
| **C. Volume** | 810 kg | 897.5 kg | 882.5 kg | ↗ Variable |
| **D. Reps totales** | 47 | 52 | 44 | → Variable |
| **E. Poids moyen** | 17.2 kg | 17.3 kg | 20 kg | ↗ Progression |

**Observation** : L'E1RM montre une progression constante. Le volume fluctue selon le nombre de reps (fatigue, forme du jour).

---

## Résumé comparatif

| Métrique | Polyarticulaire (DC, Squat) | Isolation (Curl, Triceps) | Simplicité |
|----------|----------------------------|---------------------------|------------|
| **A. Poids max** | ✅ Très pertinent | ⚠️ Bouge peu (petits incréments) | ⭐⭐⭐ Très simple |
| **B. E1RM** | ✅ Le plus précis | ✅ Montre les micro-progressions | ⭐⭐ Technique |
| **C. Volume** | ✅ Bon pour hypertrophie | ✅ Pertinent | ⭐⭐⭐ Simple |
| **D. Reps totales** | ⚠️ Pas très parlant seul | ⚠️ Pas très parlant seul | ⭐⭐⭐ Simple |
| **E. Poids moyen** | ⚠️ Peut être trompeur | ⚠️ Peut être trompeur | ⭐⭐⭐ Simple |

---

## Propositions pour l'application

### Option 1 : Simple (2 métriques)
- **Vue par défaut** : Poids max
- **Vue alternative** : Volume total
- Toggle pour basculer entre les deux

### Option 2 : Intermédiaire (3 métriques)
- **Force** : Poids max OU E1RM
- **Volume** : Volume total
- **Fréquence** : Nombre de séances/semaine
- Tabs ou toggle pour choisir

### Option 3 : Complète (personnalisable)
- L'utilisateur choisit quelle métrique afficher
- Dropdown avec toutes les options
- Possibilité de superposer 2 métriques

---

## Questions pour recueillir les avis

1. **Quelle métrique regardes-tu en priorité pour savoir si tu progresses ?**
   - [ ] Le poids max que j'ai soulevé
   - [ ] Le nombre de reps que je fais à un certain poids
   - [ ] Le volume total (poids × reps)
   - [ ] Mon ressenti / la qualité des reps
   - [ ] Autre : _____________

2. **Est-ce que tu connais/utilises le concept de "1RM estimé" (E1RM) ?**
   - [ ] Oui, je l'utilise régulièrement
   - [ ] J'en ai entendu parler mais je ne l'utilise pas
   - [ ] Non, c'est quoi ?

3. **Pour un exercice d'isolation (curl, triceps...), qu'est-ce qui compte le plus ?**
   - [ ] Monter en poids (même de 1-2kg)
   - [ ] Faire plus de reps au même poids
   - [ ] Augmenter le volume total
   - [ ] La qualité de la contraction / le ressenti

4. **Si tu devais voir UN SEUL chiffre pour résumer ta progression sur un exercice, ce serait :**
   - [ ] Mon record de poids (PR)
   - [ ] Mon meilleur E1RM estimé
   - [ ] Mon volume moyen par séance
   - [ ] Le nombre de fois où j'ai battu un record

5. **Un graphique avec plusieurs courbes superposées (poids + volume), ça te semble :**
   - [ ] Utile, j'aime avoir plusieurs infos
   - [ ] Trop chargé, je préfère une info à la fois
   - [ ] Ça dépend, j'aimerais pouvoir choisir

---

## Lexique rapide

| Terme | Définition |
|-------|------------|
| **1RM** | One Rep Max - Le poids maximum que tu peux soulever 1 seule fois |
| **E1RM** | Estimated 1RM - Estimation du 1RM basée sur un set de plusieurs reps |
| **Volume** | Poids × Reps (parfois × Séries). Mesure le "travail total" |
| **PR** | Personal Record - Ton record personnel |
| **Polyarticulaire** | Exercice qui sollicite plusieurs articulations (squat, développé couché, rowing...) |
| **Isolation** | Exercice qui cible un seul muscle (curl, extension triceps, élévations latérales...) |

---

## Cas pratique : Profil intermédiaire/avancé

### Contexte du pratiquant

| Critère | Valeur |
|---------|--------|
| Expérience | ~7-8 ans de musculation (depuis 2017) |
| Fréquence | 3 à 5 séances/semaine |
| Régularité | Globalement assidu, avec parfois quelques mois moins réguliers |
| Objectif 1 | Maintenir un bon physique (composition corporelle) |
| Objectif 2 | Continuer à progresser en force |

### Analyse des besoins

| Critère | Impact sur le choix des métriques |
|---------|-----------------------------------|
| Expérience longue | Les gains sont **lents**, il faut une métrique sensible aux micro-progressions |
| Fréquence élevée | Assez de données pour avoir des courbes fiables |
| Objectif physique | Le **volume** est important (corrélé à l'hypertrophie) |
| Objectif force | L'**E1RM** est la métrique clé |
| Périodes creuses | La **fréquence** aide à contextualiser les baisses |

### Recommandation pour ce profil

| Priorité | Métrique | Nom suggéré dans l'app | Justification |
|----------|----------|------------------------|---------------|
| 1 | E1RM | "Force estimée" | Capte les micro-progressions (passer de 6@85kg à 8@85kg = progression visible) |
| 2 | Volume total | "Volume" | Vérifie qu'on maintient un niveau de travail suffisant pour le physique |
| 3 | Fréquence | "Fréquence" | Contextualise les périodes de baisse (moins assidu = normal que ça stagne) |
| Bonus | PR poids max | "Record" | Satisfaction quand on bat un vrai PR, même si c'est rare |

### Métriques déconseillées pour ce profil

| Métrique | Pourquoi pas adapté |
|----------|---------------------|
| **Poids max seul** | Frustrant après des années de pratique — le graphique stagne pendant des semaines/mois |
| **Reps totales** | Pas assez parlant, dépend trop du programme du jour |
| **Poids moyen** | Trompeur si on change de style de séries (pyramide vs séries droites) |

### Exemple de ce que verrait ce pratiquant

```
┌─────────────────────────────────────────────────────┐
│  ← Développé couché barre                           │
│                                                     │
│  🏆 PR Force: 108 kg (E1RM)     📅 12 jan 2026     │
│  🏋️ PR Poids: 95 kg             📅 8 jan 2026      │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  [Force ●] [Volume ○]        [3M] [6M] [1A] [Tout] │
│                                                     │
│      108 ┤                              ●           │
│      105 ┤                    ●    ●                │
│      102 ┤          ●    ●                          │
│       99 ┤    ●                                     │
│          └────┴────┴────┴────┴────┴────             │
│           Nov  Déc  Jan  Fév  Mar  Avr              │
│                                                     │
│  📊 Tendance: +4.2% sur 3 mois                      │
│  📅 Fréquence: 1.8×/semaine (cet exo)              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Interprétation** : Même si le poids max (95kg) n'a pas bougé depuis janvier, l'E1RM montre une progression constante grâce à l'amélioration des reps. C'est motivant et reflète la réalité d'un pratiquant expérimenté.

---

*Document créé le 03/02/2026 - Story 2.10*
