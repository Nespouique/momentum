# Brainstorming Session Results

**Session Date:** 2026-01-16
**Facilitator:** Business Analyst Mary
**Participant:** Elliot

---

## Executive Summary

**Topic:** Application web de suivi d'habitudes "Momentum" - Focus sur fitness, nutrition, et objectifs de vie holistiques

**Session Goals:**
- Explorer les fonctionnalités qui seraient utiles au quotidien
- Concevoir l'UX et les interactions principales
- Définir l'ordre de développement (MVP d'abord)
- Créer une vision complète incluant l'intégration IA future

**Techniques Used:** SCAMPER (Substitute, Combine, Adapt, Modify, Put to other uses, Eliminate, Reverse/Rearrange)

**Total Ideas Generated:** 50+ fonctionnalités identifiées et organisées en 9 catégories

### Key Themes Identified:

- **Simplicité d'usage** : Quick logging, interface épurée, focus "today"
- **Intelligence progressive** : Surcharge progressive, suggestions basées sur l'historique
- **Vision holistique** : Équilibre physique/intellectuel/artistique
- **Gamification motivante** : Streaks, badges, objectifs mensuels décomposés
- **Mobile-first avec analytics desktop** : Différenciation claire des usages
- **Self-hosting et contrôle des données** : Indépendance du cloud externe
- **Modularité** : Activation progressive des modules selon besoins

---

## Technique Sessions

### SCAMPER Technique - 30 minutes

**Description:** Méthode structurée d'exploration créative en 7 dimensions (Substitute, Combine, Adapt, Modify, Put to other uses, Eliminate, Reverse/Rearrange)

#### Ideas Generated:

**S - SUBSTITUTE (Remplacer)**
1. API Samsung Health pour auto-import des steps (vs saisie manuelle)
2. Timer multimodal : visuel + audio (notifications sonores fin de repos)
3. Input vocal ou Telegram bot pour logger les repas rapidement
4. Bouton "Je me sens bien aujourd'hui" → boost ponctuel des objectifs de séance

**C - COMBINE (Combiner)**
5. Calories totales intelligentes : Montre + séances = dépense réelle complète
6. Timing optimal des séances : Algorithme repas→entraînement (ex: protéines élevées → séance polyarticulaire lourde le lendemain)
7. Dashboard unifié multi-badges : Tous les objectifs/succès visibles en un coup d'œil
8. Graphes de progression multi-semaines : Courbes mensurations, poids, charges soulevées
9. Projections avec objectifs : Définir cibles + prédiction basée sur âge et historique

**A - ADAPT (Adapter)**
10. Système achievements/progression (inspiré jeux vidéo)
11. Partage récaps mensuels stylisés (Instagram-style)
12. Input vocal rapide pour logging
13. Quick actions/boutons raccourcis pour actions fréquentes
14. Graphiques financiers-style (visualisations élégantes type fintech)

**M - MODIFY (Modifier/Magnifier)**
15. Mode minimaliste : 3 checkboxes essentielles (sport ✓, pas ✓, yoga ✓)
16. Wear OS app/widget : Actions rapides depuis la montre Android
17. IA Coach global : Prompt avec toutes les données → coaching holistique multi-domaines

**P - PUT TO OTHER USES (Détourner)**
18. Mode multi-utilisateurs : Groupes famille/proches (partage optionnel)
19. Self-hosting : Application déployable par n'importe qui
20. Export médical : Données formatées pour médecins/nutritionnistes
21. Module fitness standalone : Interface entraînement utilisable indépendamment, partage de programmes

**E - ELIMINATE (Éliminer)**
22. Auto-sync Samsung Health : Pas + sommeil importés automatiquement
23. Tracking du sommeil : Données récupérées de la montre
24. Page d'accueil épurée : Focus uniquement sur les actions du jour
25. Menus secondaires : Fonctions avancées/stats cachées pour éviter la surcharge

**R - REVERSE/REARRANGE (Inverser/Réorganiser)**
26. Objectifs mensuels décomposés : X jours/mois à tenir → progression quotidienne vers cible mensuelle
27. Priorisation visuelle : Tâches restantes EN HAUT, complétées en bas
28. Log first, analyze later : Focus capture de données, analytics dans écran séparé

#### Insights Discovered:

- L'utilisateur valorise fortement la **simplicité d'interaction** : quick logging, input vocal, boutons raccourcis
- Le système d'**objectifs mensuels décomposés** évite la pression quotidienne tout en maintenant la motivation
- La **différenciation mobile/desktop** est claire : mobile pour action, desktop pour réflexion
- L'inspiration d'**autres domaines** (fintech, gaming, social) apporte de la valeur UX
- Le **timing optimal basé sur nutrition** est une innovation différenciante

#### Notable Connections:

- Gamification + objectifs mensuels → système de badges "X/31 jours" (inspiré Samsung Health)
- Surcharge progressive + boost ponctuel → adaptation dynamique à la forme du jour
- IA coach + données multiples (repas, séances, sommeil) → suggestions holistiques
- Module fitness standalone + partage programmes → potentiel communautaire futur

---

## Idea Categorization

### Immediate Opportunities
*Ideas ready to implement now (MVP - Phase 1)*

1. **Module Fitness Core (inspiré Hercules)**
   - Description: Programme split 5 séances, bibliothèque d'exercices, timer repos, saisie en temps réel, historique
   - Why immediate: Base de l'application, fonctionnalités bien définies, référence existante (Hercules)
   - Resources needed: Prisma schema (Exercise, Workout, WorkoutSession, Set), composants Shadcn (Timer, Form, Card)

2. **Surcharge Progressive Intelligente**
   - Description: Algorithme de détection de stabilisation (3-4 séances identiques) + suggestion +reps ou +poids
   - Why immediate: Fonctionnalité différenciante du MVP, relativement simple à implémenter
   - Resources needed: Logique backend (analyse historique), UI suggestion avec validation

3. **Dashboard "Today" avec tracking basique**
   - Description: Page d'accueil épurée montrant tâches restantes/complétées, steps manuels, compteur yoga
   - Why immediate: Point d'entrée de l'app, essentiel pour engagement quotidien
   - Resources needed: Composant DailyTracking, modèle DB pour objectifs quotidiens

4. **Gamification minimale (Streaks + Pourcentages)**
   - Description: Affichage jours consécutifs et pourcentage d'avancement quotidien
   - Why immediate: Motivation immédiate, calculs simples
   - Resources needed: Logique de calcul, composants visuels (progress bar, badge counter)

5. **Profil + Mensurations**
   - Description: CRUD profil utilisateur avec historique des mensurations
   - Why immediate: Donnée de base pour tracking progression physique
   - Resources needed: Modèle User, Measurement, formulaire de saisie

### Future Innovations
*Ideas requiring development/research (Phases 2-3)*

1. **IA Coach Global avec Suggestions Multi-Domaines**
   - Description: Agent IA analysant toutes les données (fitness, repas, sommeil) pour coaching holistique
   - Development needed: Intégration API LLM, prompt engineering, système de contexte
   - Timeline estimate: Phase 2

2. **Timing Optimal des Séances basé sur Nutrition**
   - Description: Algorithme suggérant meilleur moment d'entraînement selon macros consommées
   - Development needed: Recherche scientifique sur timing nutriments-performance, modèle prédictif
   - Timeline estimate: Phase 2 (après module repas)

3. **Module Repas avec Quick Capture Photo + IA**
   - Description: Scanner photo de repas, extraction automatique des macros via IA vision
   - Development needed: Intégration API vision (GPT-4V, Claude Vision), base de données nutritionnelles
   - Timeline estimate: Phase 2

4. **Intégrations Samsung Health & Google Calendar**
   - Description: Auto-sync quotidien steps/sommeil/calories + affichage événements calendrier
   - Development needed: OAuth, API Samsung Health, Google Calendar API
   - Timeline estimate: Phase 2

5. **Analytics Avancés avec Graphes Fintech-Style**
   - Description: Visualisations élégantes progression multi-semaines, projections basées sur historique
   - Development needed: Librairie de charts (Recharts, Chart.js), algorithmes de prédiction
   - Timeline estimate: Phase 2-3

6. **Wear OS App/Widget**
   - Description: Application companion sur montre Android pour quick actions
   - Development needed: Développement Wear OS, sync temps réel
   - Timeline estimate: Phase 3

### Moonshots
*Ambitious, transformative concepts*

1. **Écosystème Multi-Utilisateurs avec Partage de Programmes**
   - Description: Transformer l'app en plateforme où utilisateurs peuvent partager programmes d'entraînement
   - Transformative potential: Création de communauté, effet réseau, bibliothèque collaborative
   - Challenges to overcome: Modération contenu, gestion permissions, infrastructure scalable

2. **IA Proactive avec Notifications Contextuelles**
   - Description: Agent IA qui envoie suggestions en temps réel basées sur contexte (ex: "Tu as 2000 pas à faire, balade?")
   - Transformative potential: Passage d'un outil passif à un coach proactif 24/7
   - Challenges to overcome: Gestion notifications non-intrusives, privacy, batterie

3. **Vision Holistique Complète (Physique/Intellectuel/Artistique)**
   - Description: Tracking et coaching sur tous aspects de développement personnel
   - Transformative potential: App de "vie optimisée" au-delà du fitness
   - Challenges to overcome: Complexité de l'interface, éviter la surcharge, maintenir focus

### Insights & Learnings
*Key realizations from the session*

- **Hercules comme baseline solide** : L'utilisateur connaît bien ses besoins fitness, Hercules fournit une référence UX claire. L'innovation se fera sur la surcharge progressive et l'intégration multi-domaines.

- **Objectifs mensuels > objectifs quotidiens stricts** : Système plus flexible qui réduit la pression tout en maintenant la motivation. Évite le "j'ai raté une journée donc j'abandonne".

- **Log first, analyze later** : Philosophie claire de séparation des préoccupations. L'utilisateur veut un outil de capture rapide, l'analyse vient en second plan (desktop).

- **Self-hosting et contrôle des données** : Important pour l'utilisateur d'avoir ses données historiques indépendamment des clouds externes. Architecture Docker/Portainer déjà prévue.

- **Mobile ≠ Desktop** : Cas d'usage radicalement différents. Ne pas essayer de faire la même chose sur les deux devices.

- **Modularité essentielle** : L'app doit supporter l'activation progressive de modules (fitness → repas → side projects → artistique). Architecture doit le permettre dès le départ.

- **Gamification subtile** : L'utilisateur apprécie la gamification (streaks, badges) mais ne veut pas quelque chose d'enfantin. Inspiration fintech plutôt que jeux mobiles.

---

## Action Planning

### Top 3 Priority Ideas

#### #1 Priority: Module Fitness Core avec Surcharge Progressive

- **Rationale:** Cœur de l'application, fonctionnalité différenciante claire (vs Hercules), besoin immédiat de l'utilisateur
- **Next steps:**
  1. Concevoir schéma DB (Exercise, Workout, WorkoutSession, Set, ProgressionRule)
  2. Créer bibliothèque d'exercices (import initial depuis Hercules?)
  3. Développer interface d'entraînement en temps réel
  4. Implémenter algorithme de surcharge progressive
  5. Tester avec programmes réels de l'utilisateur
- **Resources needed:**
  - Shadcn UI components (Timer, Form, Card, Dialog)
  - Prisma schema design
  - Algorithme de détection de plateau + suggestion
  - Audio notifications (Web Audio API ou lib externe)
- **Timeline:** Sprint 2-3 (2-3 semaines après fondations)

#### #2 Priority: Dashboard "Today" avec Tracking Basique

- **Rationale:** Point d'entrée quotidien de l'app, détermine l'engagement utilisateur, relativement simple à implémenter
- **Next steps:**
  1. Designer interface "Today" (mockups ou direct code avec Shadcn)
  2. Implémenter modèle DailyTracking (objectifs quotidiens, completion status)
  3. Créer composants de saisie rapide (steps, yoga checkbox)
  4. Intégrer calcul de pourcentage progression
  5. Ajouter système de streaks
- **Resources needed:**
  - Composants UI (ProgressBar, Badge, Checkbox, Input)
  - Logique de calcul progression quotidienne
  - Persistance des streaks (gérer resets minuit)
- **Timeline:** Sprint 3 (1-2 semaines)

#### #3 Priority: Infrastructure & Macro-Composants Réutilisables

- **Rationale:** Fondation technique, détermine la qualité du code et la vélocité future, doit être bien fait dès le départ
- **Next steps:**
  1. Setup projet (Next.js + Vite + Express + Prisma)
  2. Configuration MCPs (Context7 pour docs React/Next/Prisma, Shadcn MCP)
  3. Créer macro-composants réutilisables (Layout, PageHeader, StatCard, QuickAction, etc.)
  4. Établir guidelines pour IA : "Toujours utiliser Shadcn, pas de HTML brut"
  5. Setup Docker + GitHub Actions → DockerHub
- **Resources needed:**
  - Boilerplate Next.js/Express
  - Configuration Prisma + PostgreSQL
  - Docker compose file
  - Documentation architecture pour IA
- **Timeline:** Sprint 1 (1-2 semaines)

---

## Technical Architecture Overview

### Tech Stack Confirmed

**Frontend:**
- React 18+
- Next.js (App Router)
- Vite (dev tooling)
- Tailwind CSS
- Shadcn UI (component library)

**Backend:**
- Express.js
- Prisma ORM
- PostgreSQL

**Infrastructure:**
- Docker + Docker Compose
- GitHub Actions (CI/CD)
- DockerHub (registry)
- Portainer (deployment)
- Proxmox LXC (hosting)

**Future Integrations:**
- Samsung Health API
- Google Calendar API
- Authentik (authentication)
- LLM API pour IA Coach (Claude/GPT)

### Database Schema (High-Level Conceptual)

```
User
├── id
├── name, email
├── profile_data (age, height, goals)
└── created_at, updated_at

Exercise
├── id
├── name
├── muscle_group (pec, dos, épaules, bras, jambes)
├── equipment
├── seat_position (optional)
└── created_at

Workout (Programme)
├── id
├── user_id
├── name (ex: "Séance Pec")
├── workout_type (pec/dos/épaules/bras/jambes)
└── exercises[] (relation WorkoutExercise)

WorkoutExercise (Join table avec ordre)
├── workout_id
├── exercise_id
├── order
└── target_sets, target_reps

WorkoutSession (Instance d'entraînement)
├── id
├── user_id
├── workout_id
├── date
├── duration
├── notes
└── sets[] (relation Set)

Set (Série réalisée)
├── id
├── session_id
├── exercise_id
├── set_number
├── reps
├── weight
└── rest_time

Measurement
├── id
├── user_id
├── date
├── weight (poids corps)
├── chest, waist, arms, legs, etc.
└── notes

DailyTracking
├── id
├── user_id
├── date
├── steps
├── yoga_done (boolean)
├── calories (futur)
├── sleep_hours (futur)
└── side_project_minutes (futur)

ProgressionRule (pour surcharge progressive)
├── id
├── user_id
├── exercise_id
├── stabilization_threshold (ex: 3 séances)
├── progression_type (reps ou weight)
└── increment_value
```

### Component Architecture

**Macro-Composants Réutilisables:**

```
src/components/
├── layout/
│   ├── AppLayout.tsx (layout global avec nav)
│   ├── PageHeader.tsx
│   └── BottomNav.tsx (mobile)
├── dashboard/
│   ├── TodayView.tsx
│   ├── TaskCard.tsx (tâches quotidiennes)
│   ├── ProgressBar.tsx
│   └── StreakBadge.tsx
├── fitness/
│   ├── WorkoutBuilder.tsx (créer programmes)
│   ├── ExerciseLibrary.tsx
│   ├── WorkoutSession.tsx (interface pendant séance)
│   ├── TimerCard.tsx (repos entre séries)
│   ├── SetLogger.tsx (saisie reps/poids)
│   └── ProgressiveSuggestion.tsx (suggestions surcharge)
├── profile/
│   ├── ProfileForm.tsx
│   └── MeasurementTracker.tsx
└── common/
    ├── StatCard.tsx (cartes de stats)
    ├── QuickAction.tsx (boutons raccourcis)
    └── EmptyState.tsx
```

**Guidelines pour IA:**
- **Toujours utiliser Shadcn UI components** : Button, Card, Input, Select, Dialog, etc.
- **Pas de HTML brut** : Utiliser les composants Shadcn ou créer des macro-composants
- **Composition over inheritance** : Assembler composants existants plutôt qu'en créer de nouveaux
- **Tailwind pour styling** : Pas de CSS custom sauf si absolument nécessaire
- **TypeScript strict** : Typage complet, pas de `any`

---

## Reflection & Follow-up

### What Worked Well

- Technique SCAMPER très productive pour explorer les 7 dimensions de l'application
- L'utilisateur avait une vision claire de ses besoins, facilitant l'exploration
- Référence Hercules comme baseline a permis de focaliser sur les différenciations
- Organisation en 9 catégories a bien structuré les 50+ idées générées
- Découpage MVP → Phase 2 → Phase 3 très clair

### Areas for Further Exploration

- **Architecture détaillée de l'algorithme de surcharge progressive** : Mérite une session dédiée avec l'Architect
- **UX flows détaillés pour l'interface d'entraînement** : Wireframes ou mockups à créer
- **Stratégie d'import de données initiales** : Comment récupérer historique depuis Hercules et Samsung Health?
- **API design pour le backend Express** : RESTful? GraphQL? Endpoints à définir
- **Gestion des états de l'app** : Redux? Zustand? Context API? React Query?
- **Progressive Web App (PWA)** : Fonctionnement offline souhaité?

### Recommended Follow-up Techniques

- **User Story Mapping** : Créer les stories utilisateur pour le MVP (avec le PO)
- **Wireframing** : Dessiner les écrans principaux (dashboard, workout session)
- **Technical Spike** : Tester l'algorithme de surcharge progressive sur données réelles
- **Database Schema Review** : Valider le schéma avec l'Architect avant implémentation

### Questions That Emerged

- Quelle stratégie pour gérer les données offline (PWA)?
- Comment gérer les timezones pour le tracking quotidien?
- Faut-il prévoir un système de backup automatique de la DB même si self-hosted?
- L'utilisateur veut-il pouvoir modifier l'historique des séances passées?
- Comment gérer les exercices personnalisés (pas dans la bibliothèque)?
- Faut-il un système de tags/catégories pour les exercices?
- Comment gérer les exercices bilatéraux (poids différents gauche/droite)?
- L'application doit-elle empêcher le phone de se mettre en veille pendant une séance?

### Next Session Planning

- **Suggested topics:**
  1. Session avec le PO pour créer les User Stories du MVP
  2. Session avec l'Architect pour valider schéma DB et architecture API
  3. Session de design UX pour wireframes des écrans principaux
  4. Session avec le Dev pour définir l'ordre précis des tâches techniques du Sprint 1

- **Recommended timeframe:** Dans les prochains jours avant de commencer le développement

- **Preparation needed:**
  - Lire la documentation Shadcn UI pour familiarisation
  - Explorer Hercules en détail et noter les flows UX précis
  - Exporter un échantillon de données de Samsung Health pour comprendre le format
  - Préparer quelques questions sur les cas limites (ex: séance interrompue, exercice sauté)

---

*Session facilitated using the BMAD-METHOD™ brainstorming framework*
