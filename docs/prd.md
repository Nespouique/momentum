# Momentum Product Requirements Document (PRD)

## Goals and Background Context

### Goals

- **Simplifier le suivi quotidien des habitudes** avec une interface "Today" épurée et des actions rapides
- **Optimiser l'entraînement fitness** via un module inspiré d'Hercules avec surcharge progressive intelligente
- **Maintenir une vision holistique** du bien-être (physique, intellectuel, artistique) sans surcharge cognitive
- **Garder le contrôle des données** via self-hosting et indépendance des clouds externes
- **Motiver par gamification subtile** (streaks, badges, objectifs mensuels décomposés) sans aspect enfantin
- **Différencier les usages mobile/desktop** : capture rapide sur mobile, analytics sur desktop

### Background Context

Momentum naît du besoin d'un outil personnel de suivi d'habitudes qui dépasse les limitations des applications existantes comme Hercules. L'utilisateur recherche une solution qui combine le tracking fitness détaillé (programmes split 5 séances, surcharge progressive) avec un suivi plus large incluant nutrition, steps, yoga, et projets personnels.

Le marché actuel propose soit des apps fitness pures (Hercules, Strong), soit des trackers d'habitudes génériques (Habitica, Streaks) - mais aucune solution n'offre l'intégration holistique souhaitée avec intelligence progressive et self-hosting. La philosophie "Log first, analyze later" guide le design : mobile pour la capture rapide, desktop pour la réflexion et les analytics avancés.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-01-16 | 0.1 | Initial draft from brainstorming session | PM John |
| 2026-01-17 | 0.2 | Alignement stories avec Architecture et Front-end Spec | PO Sarah |
| 2026-02-02 | 0.3 | Ajout Coach IA (FR24-28, Story 2.9), mise à jour RG Progressive Overload | Dev James |

---

## Requirements

### Functional Requirements

**Module Fitness Core**
- **FR1:** Le système doit permettre de créer et gérer des programmes d'entraînement (Workouts) avec un nom et un type (pec/dos/épaules/bras/jambes)
- **FR2:** Le système doit fournir une bibliothèque d'exercices avec nom, groupe musculaire, équipement, et position de siège optionnelle
- **FR3:** Le système doit permettre d'ajouter des exercices à un programme avec un ordre défini, des objectifs (sets/reps cibles), un temps de repos entre séries, et un temps de repos avant l'exercice suivant
- **FR4:** Le système doit permettre de démarrer une session d'entraînement basée sur un programme
- **FR5:** Le système doit permettre de logger les séries en temps réel (reps, poids) pendant une session
- **FR6:** Le système doit fournir un timer de repos entre les séries avec notification audio de fin
- **FR7:** Le système doit conserver l'historique complet des sessions d'entraînement

**Surcharge Progressive**
- **FR8:** Le système doit détecter la stabilisation des performances (3 séances consécutives où les objectifs sont atteints au même niveau)
- **FR9:** Le système doit suggérer une progression (+2 reps pour exercices poids du corps, +2.5kg isolation / +5kg compound pour exercices avec poids) lorsqu'une stabilisation est détectée
- **FR10:** L'utilisateur doit pouvoir accepter ou ignorer une suggestion de progression
- **FR10bis:** Une suggestion ignorée déclenche un cooldown de 3 sessions avant une nouvelle suggestion pour le même exercice

**Coach IA (optionnel)**
- **FR24:** Le système doit proposer un accès au Coach IA lorsqu'au moins un exercice est en stagnation
- **FR25:** Le Coach IA doit analyser l'historique des 10 dernières séances du même workout
- **FR26:** Le Coach IA doit proposer des ajustements personnalisés série par série avec analyse et justification
- **FR27:** L'utilisateur doit pouvoir ajuster les propositions du Coach IA avant de les appliquer
- **FR28:** Le Coach IA n'est disponible que si la clé API OpenAI est configurée

**Dashboard Today**
- **FR11:** Le système doit afficher une page d'accueil "Today" montrant les tâches/objectifs du jour
- **FR12:** Le système doit permettre de saisir manuellement les steps quotidiens
- **FR13:** Le système doit permettre de marquer le yoga comme fait/non fait (checkbox)
- **FR14:** Le système doit afficher les tâches restantes en haut et les complétées en bas

**Gamification**
- **FR15:** Le système doit calculer et afficher les streaks (jours consécutifs d'activité)
- **FR16:** Le système doit calculer et afficher le pourcentage d'avancement quotidien
- **FR17:** Le système doit supporter des objectifs mensuels décomposés (X jours/mois à atteindre)

**Profil & Mensurations**
- **FR18:** Le système doit permettre de créer et modifier un profil utilisateur (nom, âge, taille, objectifs)
- **FR19:** Le système doit permettre d'enregistrer des mensurations avec date (poids, tour de poitrine, taille, bras, jambes)
- **FR20:** Le système doit conserver l'historique des mensurations pour visualisation de progression

**Exercices & Tracking Personnalisés**
- **FR21:** Le système doit permettre à l'utilisateur de créer des exercices personnalisés dans la bibliothèque
- **FR22:** Le système doit permettre à l'utilisateur de configurer les éléments qu'il souhaite tracker quotidiennement (types et objectifs)
- **FR23:** Le système doit permettre de définir des objectifs par élément tracké (ex: 10000 pas/jour, yoga 5x/semaine, sport 4x/semaine)

### Non-Functional Requirements

**Performance**
- **NFR1:** L'interface de session d'entraînement doit être réactive (<100ms) pour ne pas interrompre le flow de l'utilisateur
- **NFR2:** L'application doit fonctionner de manière fluide sur mobile pendant une séance (pas de lag)

**Architecture & Déploiement**
- **NFR3:** L'application doit être self-hostable via Docker/Docker Compose
- **NFR4:** L'architecture doit être modulaire permettant l'activation progressive de modules (fitness → repas → projets)
- **NFR5:** Le système doit utiliser PostgreSQL comme base de données

**Sécurité & Données**
- **NFR6:** Les données utilisateur doivent rester sur l'infrastructure personnelle (pas de cloud externe obligatoire)
- **NFR7:** L'authentification doit être préparée pour intégration future avec Authentik

**UX/UI**
- **NFR8:** L'interface mobile doit prioriser les actions rapides (quick logging)
- **NFR9:** L'interface desktop doit prioriser les analytics et la visualisation
- **NFR10:** La gamification doit être subtile (style fintech, pas enfantin)

**Maintenabilité**
- **NFR11:** Le code doit utiliser TypeScript strict (pas de `any`)
- **NFR12:** Les composants UI doivent utiliser exclusivement Shadcn UI et Tailwind CSS

---

## User Interface Design Goals

### Overall UX Vision

Une application **épurée et focalisée** qui respecte le principe "Log first, analyze later". L'interface doit permettre de capturer rapidement les données du quotidien sans friction, tout en offrant des insights motivants via une gamification subtile inspirée des apps fintech (élégante, pas enfantine). L'expérience doit être **différenciée par device** : mobile pour l'action rapide pendant les séances, desktop pour la réflexion et l'analyse des progressions.

### Key Interaction Paradigms

- **Quick Actions** : Boutons raccourcis pour les actions fréquentes (démarrer séance, logger steps, marquer yoga)
- **Today-Centric** : Focus sur le jour présent, historique accessible mais pas en avant-plan
- **Progressive Disclosure** : Fonctions avancées/stats cachées dans des menus secondaires pour éviter la surcharge
- **In-Session Flow** : Interface d'entraînement optimisée pour usage pendant l'effort (gros boutons, timer visible, minimal taps)
- **Feedback Instantané** : Mise à jour immédiate des streaks/pourcentages après chaque action

### Core Screens and Views

| Écran | Description | Priorité |
|-------|-------------|----------|
| **Today Dashboard** | Vue principale avec objectifs du jour, progression, quick actions | MVP |
| **Workout Session** | Interface pendant l'entraînement : timer, séries, reps/poids, exercice en cours | MVP |
| **Workout Builder** | Création/édition de programmes avec exercices, ordre, temps de repos | MVP |
| **Exercise Library** | Bibliothèque d'exercices avec recherche, filtres par groupe musculaire | MVP |
| **Profile & Measurements** | Profil utilisateur et historique des mensurations | MVP |
| **Tracking Configuration** | Configuration des éléments à tracker (yoga, pas, sport...) et définition des objectifs associés | MVP |
| **Analytics Dashboard** | Graphes de progression, stats historiques (desktop-focused) | Phase 2 |
| **Settings** | Configuration app, préférences, modules actifs | MVP (minimal) |

### Accessibility

**WCAG AA** - Niveau d'accessibilité standard :
- Contrastes suffisants pour lisibilité
- Navigation clavier fonctionnelle
- Labels appropriés pour screen readers

### Branding

- **Dark mode obligatoire** : Thème sombre par défaut, style Shadcn UI pur avec accents de couleur sobres et modernes
- **Palette** : Tons sombres avec accents de couleur pour gamification (streaks, badges)
- **Typographie** : Sans-serif moderne, lisible sur mobile
- **Pas d'éléments enfantins** : Éviter les animations excessives, mascots, ou gamification trop "jeu mobile"
- **Style fintech** : Élégant, professionnel, data-driven

### Target Device and Platforms

**Web Responsive (PWA)** avec différenciation d'usage :

| Device | Usage Principal | Priorité UI |
|--------|-----------------|-------------|
| **Mobile (PWA)** | Logging quotidien, sessions d'entraînement, installation via PWA | Actions rapides, gros touch targets |
| **Desktop** | Analytics, configuration programmes, réflexion | Visualisations riches, navigation complète |

---

## Technical Assumptions

### Repository Structure

**Monorepo** - Tout le code dans un seul repository :
```
momentum/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Express.js backend
├── packages/
│   └── shared/       # Types partagés, utils
├── prisma/           # Schema et migrations
├── docker/           # Docker configs
└── docs/             # Documentation
```

### Service Architecture

**Monolith modulaire** avec séparation frontend/backend :

| Composant | Technologie | Description |
|-----------|-------------|-------------|
| **Frontend** | Next.js 14+ (App Router) | React 18+, SSR/CSR hybride, PWA |
| **Backend** | Express.js | API REST, business logic |
| **ORM** | Prisma | Type-safe database access |
| **Database** | PostgreSQL | Données persistantes |
| **Styling** | Tailwind CSS + Shadcn UI | Dark mode, composants modernes |
| **Dev Tooling** | Vite | Fast HMR pour développement |

### Testing Requirements

**Unit + Integration** (pragmatique) :

| Type | Scope | Outils suggérés |
|------|-------|-----------------|
| **Unit Tests** | Logique métier critique (surcharge progressive, calculs streaks) | Vitest |
| **Integration Tests** | Endpoints API, workflows clés | Vitest + Supertest |
| **E2E** | Flows critiques (session d'entraînement) | Playwright (Phase 2) |

### Additional Technical Assumptions

**Infrastructure & Déploiement :**
- Docker + Docker Compose pour packaging
- GitHub Actions pour CI/CD
- DockerHub comme registry d'images
- Déploiement sur Proxmox LXC via Portainer
- Self-hosted exclusivement (pas de cloud public)
- Backup géré manuellement via backup du LXC Proxmox

**Authentification :**
- MVP : Authentification simple (session-based ou JWT basique)
- Phase 2 : Intégration Authentik (SSO)
- Single-user assumé pour le MVP

**TypeScript :**
- Mode strict obligatoire
- Pas de `any` autorisé
- Types partagés entre frontend et backend via package shared

**Conventions de code :**
- ESLint + Prettier configurés
- Composants Shadcn UI exclusivement (pas de HTML brut)
- Tailwind pour tout le styling (pas de CSS custom)

**PWA :**
- Service Worker pour installation mobile
- Pas de stratégie offline-first (connexion internet assumée)
- Manifest pour icône et splash screen

**Futures intégrations (hors MVP) :**
- Samsung Health API (steps, sommeil)
- Google Calendar API

**Intégrations déjà implémentées :**
- OpenAI API pour le Coach IA (GPT-4o-mini) - voir Story 2.9

---

## Epic List

### Epic 1: Foundation & Infrastructure
**Goal:** Établir les fondations techniques (projet, auth, DB, CI/CD, composants de base) et livrer un profil utilisateur fonctionnel avec mensurations.

### Epic 2: Fitness Core Module
**Goal:** Implémenter le module fitness complet : bibliothèque d'exercices, création de programmes, interface de session en temps réel, et suggestions de surcharge progressive.

### Epic 3: Daily Tracking & Gamification
**Goal:** Créer le dashboard "Today", la configuration des éléments à tracker, et le système de gamification (streaks, pourcentages, objectifs mensuels).

### Epic 4: Migration Hercules → Momentum ✅
**Goal:** Migrer l'intégralité des données depuis l'application Hercules (exercices, programmes, historique des séances, mensurations) via des scripts CLI idempotents.

---

## Epic 1: Foundation & Infrastructure

**Expanded Goal:**
Établir les fondations techniques complètes du projet Momentum : structure monorepo, configuration TypeScript stricte, base de données PostgreSQL avec Prisma, authentification simple, et composants UI de base avec Shadcn en dark mode. À la fin de cet epic, l'application sera déployable via Docker avec CI/CD fonctionnel, et l'utilisateur pourra s'authentifier, gérer son profil, et tracker ses mensurations.

### Story 1.1: Project Scaffolding & Monorepo Setup

**As a** developer,
**I want** a properly structured monorepo with Next.js frontend and Express backend,
**so that** I have a solid foundation to build upon with shared TypeScript types.

**Acceptance Criteria:**
1. Monorepo structure créée avec dossiers `apps/web`, `apps/api`, `packages/shared`
2. Next.js 14+ configuré avec App Router et TypeScript strict
3. Express.js configuré avec TypeScript strict
4. Package `shared` configuré pour types partagés entre frontend et backend
5. Scripts `dev`, `build`, `lint` fonctionnels à la racine
6. ESLint + Prettier configurés avec règles cohérentes
7. `.gitignore` approprié et README basique

### Story 1.2: Database & Prisma Setup

**As a** developer,
**I want** PostgreSQL configured with Prisma ORM,
**so that** I can define and migrate the database schema with type safety.

**Acceptance Criteria:**
1. Docker Compose configuré avec service PostgreSQL pour dev local
2. Prisma initialisé dans le projet avec connexion PostgreSQL
3. Modèle `User` créé avec champs de base (id, email, password hash, name, createdAt, updatedAt)
4. Première migration générée et applicable
5. Prisma Client généré et accessible depuis le backend
6. Script de seed basique pour données de test
7. Variables d'environnement documentées (`.env.example`)

### Story 1.3: Shadcn UI & Dark Theme Foundation

**As a** user,
**I want** a dark-themed modern interface,
**so that** the app is comfortable to use and visually consistent.

**Acceptance Criteria:**
1. Shadcn UI installé et configuré dans le frontend Next.js
2. Tailwind CSS configuré avec dark mode activé par défaut
3. Thème dark personnalisé avec accents de couleur sobres
4. Composant `AppLayout` créé (header, main content area, bottom nav placeholder)
5. Composant `PageHeader` réutilisable créé
6. Page d'accueil placeholder affichant "Momentum" avec le layout
7. Fonts configurées (sans-serif moderne)

### Story 1.4: Authentication System

**As a** user,
**I want** to register and login securely,
**so that** my data is protected and personal.

**Acceptance Criteria:**
1. Endpoints API : `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
2. Mots de passe hashés avec bcrypt
3. JWT tokens générés et validés
4. Middleware d'authentification protégeant les routes privées
5. Page `/login` avec formulaire (email, password)
6. Page `/register` avec formulaire (name, email, password, confirm password)
7. Redirection automatique vers login si non authentifié
8. Stockage sécurisé du token côté client (httpOnly cookie ou secure storage)
9. Validation des inputs côté serveur et messages d'erreur appropriés

### Story 1.5: User Profile Management

**As a** user,
**I want** to view and edit my profile information,
**so that** I can personalize my experience and track my baseline stats.

**Acceptance Criteria:**
1. Modèle `User` étendu avec champs profil (age, height, goal description)
2. Endpoints API : `GET /profile`, `PATCH /profile`, `PUT /profile/password`
3. Page `/profile` (Profile Hub) affichant les informations du profil
4. Formulaire d'édition du profil avec validation (React Hook Form + Zod)
5. Fonctionnalité de changement de mot de passe (formulaire séparé)
6. Feedback visuel lors de la sauvegarde (loading, success Toast, error)
7. Navigation vers profil depuis bottom nav (icône User)

### Story 1.6: Measurements Tracking

**As a** user,
**I want** to record and view my body measurements over time,
**so that** I can track my physical progress.

**Acceptance Criteria:**
1. Modèle `Measurement` créé avec champs bilatéraux complets :
   - `userId, date, notes`
   - `weight` (kg)
   - Mesures en cm : `neck, shoulders, chest, bicepsLeft, bicepsRight, forearmLeft, forearmRight, wristLeft, wristRight, waist, hips, thighLeft, thighRight, calfLeft, calfRight, ankleLeft, ankleRight`
2. Endpoints API : `GET /measurements`, `GET /measurements/:id`, `POST /measurements`, `PUT /measurements/:id`, `DELETE /measurements/:id`, `GET /measurements/latest`, `GET /measurements/progress`
3. Page `/profile/measurements` listant l'historique des mensurations (plus récentes en premier)
4. Formulaire d'ajout de mensuration avec date picker et champs optionnels groupés par zone corporelle
5. Possibilité de modifier et supprimer une entrée
6. Affichage des unités (kg, cm)
7. Navigation vers mensurations depuis le profil hub

### Story 1.7: CI/CD Pipeline & Production Docker

**As a** developer,
**I want** automated build, test, and deployment pipeline,
**so that** I can deploy reliably to my Proxmox server.

**Acceptance Criteria:**
1. Dockerfile multi-stage pour frontend (Next.js standalone)
2. Dockerfile pour backend (Express)
3. Docker Compose production avec services web, api, postgres
4. GitHub Actions workflow : lint, build, push images to DockerHub
5. Images taguées avec version (git sha ou semver)
6. Variables d'environnement production documentées
7. Health check endpoints (`/health`) sur frontend et backend
8. README avec instructions de déploiement

---

## Epic 2: Fitness Core Module

**Expanded Goal:**
Implémenter le système complet de tracking fitness inspiré d'Hercules : une bibliothèque d'exercices extensible (avec ajout d'exercices personnalisés), un builder de programmes d'entraînement avec configuration des temps de repos, une interface de session en temps réel optimisée pour l'usage pendant l'effort (timer avec notification audio, logging rapide), et l'algorithme de surcharge progressive qui détecte les plateaux et suggère des progressions. Cet epic livre la valeur différenciante principale de Momentum.

### Story 2.1: Exercise Library - Data Model & Backend

**As a** developer,
**I want** a complete exercise data model and API,
**so that** exercises can be managed and used in workout programs.

**Acceptance Criteria:**
1. Modèle `Exercise` créé (id, name, muscleGroups[], isCustom, userId nullable, createdAt)
2. Constantes pour `muscleGroups` (array multi-sélection) : `abdos, biceps, dos, epaules, fessiers, ischios, lombaires, mollets, pecs, quadriceps, trapezes, triceps`
3. Endpoints API : `GET /exercises`, `GET /exercises/:id`, `POST /exercises`, `PUT /exercises/:id`, `DELETE /exercises/:id`, `GET /exercises/muscle-groups`
4. Filtrage par muscleGroup sur `GET /exercises?muscleGroup=pecs`
5. Filtrage par type `GET /exercises?isCustom=true`
6. Exercices personnalisés liés à l'utilisateur, exercices de base partagés (userId null)
7. Seed avec bibliothèque initiale d'exercices courants (15-20 exercices de base avec groupes musculaires multiples)
8. Validation : impossible de supprimer un exercice utilisé dans un programme

### Story 2.2: Exercise Library - UI

**As a** user,
**I want** to browse, search, and add exercises to my library,
**so that** I can build my workout programs with the exercises I use.

**Acceptance Criteria:**
1. Page `/exercises` listant tous les exercices disponibles
2. Filtres par groupe musculaire (tabs ou dropdown multi-sélection)
3. Barre de recherche par nom
4. Affichage en cards ou liste avec nom et badges groupes musculaires
5. Bouton "Ajouter un exercice" ouvrant un formulaire modal/drawer
6. Formulaire : nom (requis), groupes musculaires (requis, multi-sélection avec chips)
7. Badge visuel distinguant exercices personnalisés vs bibliothèque de base
8. Actions edit/delete sur les exercices personnalisés uniquement
9. Navigation accessible depuis le menu principal

### Story 2.3: Workout Program - Data Model & Backend

**As a** developer,
**I want** workout program and workout-exercise relationship models,
**so that** users can create structured training programs.

**Acceptance Criteria:**
1. Modèle `Workout` créé (id, userId, name, description nullable, createdAt, updatedAt)
2. Modèle `WorkoutExercise` créé (id, workoutId, exerciseId, order, targetSets, targetReps, targetWeight nullable, restBetweenSets en secondes, restAfterExercise en secondes)
3. Endpoints API : `GET /workouts`, `GET /workouts/:id` (avec exercises), `POST /workouts`, `PUT /workouts/:id`, `DELETE /workouts/:id`, `POST /workouts/:id/duplicate`
4. Création de workout avec exercises en une seule requête (nested create)
5. Cascade delete : supprimer un workout supprime ses WorkoutExercises
6. Validation : workout doit avoir au moins 1 exercice pour être valide

### Story 2.4: Workout Builder - UI

**As a** user,
**I want** to create and edit my workout programs,
**so that** I can structure my training sessions according to my split.

**Acceptance Criteria:**
1. Page `/workouts` listant mes programmes avec nom et description
2. Bouton "Nouveau programme" créant un nouveau workout
3. Page `/workouts/new` et `/workouts/:id/edit` pour création/édition
4. Champs : nom du programme (requis), description (optionnel, texte libre)
5. Section "Exercices" avec liste ordonnée des exercices du programme
6. Bouton "Ajouter exercice" ouvrant sélecteur (ExerciseSelector) depuis la bibliothèque
7. Pour chaque exercice : sets cibles, reps cibles, poids cible (optionnel), repos entre séries (input en secondes), repos après exercice (input en secondes)
8. Possibilité de réordonner les exercices (drag & drop ou boutons up/down)
9. Possibilité de retirer un exercice du programme
10. Sauvegarde avec feedback visuel (loading, success, error)

### Story 2.5: Workout Session - Data Model & Backend

**As a** developer,
**I want** session and set tracking models,
**so that** workout execution can be recorded in detail.

**Acceptance Criteria:**
1. Modèle `WorkoutSession` créé (id, userId, workoutId, status: in_progress/completed/abandoned, startedAt, completedAt nullable, notes nullable)
2. Modèle `Set` créé (id, sessionId, exerciseId, setNumber, reps, weight, rpe nullable 1-10, completedAt)
3. Endpoints : `POST /sessions` (démarrer), `GET /sessions/:id`, `PATCH /sessions/:id` (compléter/abandonner/notes), `DELETE /sessions/:id`, `GET /sessions` (historique), `GET /sessions/active`
4. Endpoints sets : `POST /sessions/:id/sets`, `PUT /sessions/:id/sets/:setId`, `DELETE /sessions/:id/sets/:setId`
5. Calcul automatique de duration à la complétion (completedAt - startedAt)
6. Filtrage historique par status, workoutId, date range (from/to), pagination (limit/offset)

### Story 2.6: Active Workout Session - UI

**As a** user,
**I want** an optimized interface during my workout,
**so that** I can log my sets quickly without interrupting my training flow.

**Acceptance Criteria:**
1. Page `/session/:id` en mode full-screen (navigation principale masquée)
2. Écran Pre-Session avec confirmation avant démarrage
3. Affichage de l'exercice en cours avec nom, groupes musculaires, et objectifs (sets × reps @ poids)
4. Progress dots indiquant la série en cours (○ ● ○ ○)
5. Composant SetInput avec steppers +/- (pas de clavier) pour reps et poids, pré-remplis avec target ou dernière valeur
6. Bouton large "SET DONE" (≥60px) pour valider rapidement
7. Composant SessionTimer : timer de repos plein écran démarrant automatiquement après validation
8. Boutons d'ajustement timer (+30s, -30s) et "Skip"
9. Notification audio (Web Audio API) à la fin du temps de repos
10. Timer inter-exercice si configuré (restAfterExercise)
11. Interface optimisée mobile : gros boutons touch-friendly, ≤3 taps pour logger
12. Wake Lock API pour empêcher la mise en veille de l'écran
13. Bouton "Abandon" avec confirmation (session marquée abandoned)
14. Session Summary à la fin avec stats et possibilité d'ajouter des notes

### Story 2.7: Session History & Details

**As a** user,
**I want** to view my past workout sessions,
**so that** I can track my training consistency and review my performance.

**Acceptance Criteria:**
1. Page `/sessions` listant l'historique des sessions (plus récentes en premier)
2. Chaque entrée affiche : date, nom du workout, durée, statut (complété/abandonné)
3. Filtrage par workout type ou date range
4. Page `/sessions/:id` affichant le détail d'une session
5. Détail : liste des exercices avec sets réalisés (reps × poids pour chaque série)
6. Affichage des notes de session si présentes
7. Comparaison visuelle avec les objectifs (target vs réalisé)
8. Possibilité d'ajouter/modifier les notes d'une session passée

### Story 2.8: Progressive Overload System

**As a** user,
**I want** the app to detect when I'm plateauing and suggest progression,
**so that** I continuously improve without having to manually track patterns.

**Acceptance Criteria:**
1. Algorithme de détection de stabilisation : identifier quand un exercice a été fait avec mêmes reps/poids sur 3 sessions consécutives AU MÊME NIVEAU de difficulté
2. Logique de suggestion : proposer +2 reps (poids du corps) OU +2.5kg (isolation) / +5kg (compound) selon le type d'exercice
3. Modèle `ProgressionSuggestion` (exerciseId, sessionId, suggestionType, currentValue, suggestedValue, reason, status: pending/accepted/dismissed)
4. Affichage de la suggestion sur l'écran de fin de séance (Session Summary)
5. UI de suggestion : afficher progression actuelle → suggestion, avec boutons Appliquer/Ignorer
6. Si accepté : mise à jour automatique des objectifs dans le template du workout
7. Ne pas re-suggérer si l'utilisateur a ignoré récemment (cooldown de 3 sessions)

**Règles de gestion détaillées** : voir `docs/features/progressive-overload.md`

### Story 2.9: AI Coach

**As a** user experiencing stagnation,
**I want** personalized AI coaching advice,
**so that** I get intelligent recommendations to break through plateaus.

**Acceptance Criteria:**
1. Bouton Coach IA visible uniquement si stagnation détectée ET API key configurée
2. Page dédiée `/session/[id]/ai-coach` avec analyse contextuelle
3. L'IA analyse les 10 dernières séances du même workout
4. Propositions personnalisées série par série avec analyse et justification
5. L'utilisateur peut ajuster les valeurs suggérées avant d'appliquer
6. Actions : "Appliquer et terminer" ou "Ignorer et terminer"

**Dépendances** : Story 2.8 (réutilise la détection de stagnation), OpenAI API

---

## Epic 3: Daily Tracking & Gamification

**Expanded Goal:**
Créer le système de tracking quotidien personnalisable et le dashboard "Today" qui sera le point d'entrée principal de l'app. L'utilisateur pourra configurer ce qu'il veut tracker (yoga, steps, sport, etc.) avec des objectifs flexibles (quotidiens ou mensuels décomposés). Le système de gamification subtile (streaks, pourcentages de progression, objectifs mensuels) motivera l'utilisateur sans être enfantin. Ce dashboard unifie toutes les activités trackées, y compris les sessions de workout de l'Epic 2.

### Story 3.1: Trackable Items - Data Model & Backend

**As a** developer,
**I want** a flexible system for user-defined trackable items,
**so that** users can configure what habits they want to track with their goals.

**Acceptance Criteria:**
1. Modèle `TrackableItem` créé (id, userId, name, icon, color, trackingType: boolean/number/duration, unit nullable, isActive, createdAt)
2. Modèle `TrackableGoal` créé (id, trackableId, targetValue, frequency: daily/weekly/monthly, startDate, endDate nullable)
3. Types : `boolean` (checkbox), `number` (valeur numérique), `duration` (minutes)
4. Endpoints : `GET /trackables`, `GET /trackables/:id`, `POST /trackables`, `PUT /trackables/:id`, `DELETE /trackables/:id`
5. Endpoints goals : `POST /trackables/:id/goals`, `PUT /trackables/:id/goals/:goalId`
6. Seed avec items par défaut désactivés (suggestions : yoga, steps, méditation, lecture, side-project)
7. Un trackable spécial "workout" créé automatiquement et lié aux sessions de l'Epic 2 (non supprimable)

### Story 3.2: Tracking Configuration - UI

**As a** user,
**I want** to configure what I track and set my goals,
**so that** the app adapts to my personal habits and objectives.

**Acceptance Criteria:**
1. Page `/settings/trackables` pour configuration des trackables
2. Liste des items trackés avec toggle on/off pour chaque
3. Bouton "Ajouter un élément" pour créer un nouveau trackable
4. Formulaire TrackableForm : nom, icône (sélecteur Lucide icons), couleur (color picker), type (checkbox/nombre/durée), unité si nombre/durée
5. Pour chaque item actif : configuration de l'objectif via modal/drawer
6. Options d'objectif : fréquence (quotidien/hebdomadaire/mensuel) + valeur cible
7. Possibilité de réordonner les items (drag & drop, affecte l'ordre sur le dashboard)
8. Possibilité de supprimer un trackable personnalisé (avec confirmation Dialog)
9. Le trackable "workout" est visible mais non modifiable/supprimable

### Story 3.3: Daily Tracking - Data Model & Backend

**As a** developer,
**I want** to store daily tracking entries,
**so that** users can log their daily habits and the system can calculate progress.

**Acceptance Criteria:**
1. Modèle `DailyEntry` créé (id, trackableId, date, value: number, notes nullable, createdAt)
2. Pour type boolean : value = 1 (done) ou 0 (not done)
3. Pour type number/duration : value = la valeur saisie
4. Contrainte unique sur (trackableId, date) - une seule entrée par item par jour
5. Endpoints : `GET /tracking/entries`, `GET /tracking/entries/:date`, `POST /tracking/entries` (upsert), `DELETE /tracking/entries/:id`
6. `GET /tracking/entries/:date` retourne aussi les données calculées (workout sessions du jour comptées automatiquement)
7. Endpoint summary : `GET /tracking/summary?period=week|month&date=YYYY-MM-DD` pour période avec completion %
8. Filtrage par trackableId, date range (from/to)

### Story 3.4: Today Dashboard - UI

**As a** user,
**I want** a clean daily dashboard showing my tasks and progress,
**so that** I can quickly see what's left to do and log my activities.

**Acceptance Criteria:**
1. Page `/` (home) = Dashboard Today (landing page par défaut)
2. Header avec date du jour et salutation personnalisée
3. Composant StreakBadge affiché prominemment (ex: "🔥 12 days")
4. Composant DailyProgressBar avec pourcentage de progression global
5. Section "TO DO" : items non complétés en haut (composants TrackableCard)
6. Section "COMPLETED" : items faits en bas (visuellement distincts, grayed out)
7. Pour items boolean : checkbox cliquable pour toggle done (optimistic update)
8. Pour items number/duration : tap ouvre input rapide inline avec validation
9. Item "workout" : affiche nombre de sessions du jour (0/1), tap navigue vers `/workouts`
10. Quick action "Start a Workout" bien visible en haut
11. Mise à jour temps réel avec optimistic updates et React Query invalidation
12. Si aucun trackable configuré : prompt vers `/settings/trackables`

### Story 3.5: Streaks Calculation System

**As a** developer,
**I want** to calculate and store streak data,
**so that** users can see their consistency over time.

**Acceptance Criteria:**
1. Modèle `Streak` créé (id, userId, trackableId nullable, currentStreak, longestStreak, lastActivityDate, updatedAt)
2. trackableId = null pour le streak global workout
3. Logique de calcul : streak = jours consécutifs où l'objectif a été atteint
4. Pour objectif quotidien : chaque jour compte
5. Pour objectif hebdomadaire/mensuel : streak = périodes consécutives où l'objectif atteint
6. Mise à jour automatique des streaks lors de chaque entrée de tracking
7. Reset du streak si une période est manquée (selon frequency de l'objectif)
8. Endpoints : `GET /streaks` (tous les streaks), `GET /streaks/:trackableId`, `GET /streaks/workout` (streak global workout)
9. Gestion du edge case : jour en cours ne casse pas le streak tant qu'il n'est pas terminé

### Story 3.6: Gamification UI - Streaks & Progress Display

**As a** user,
**I want** to see my streaks and monthly progress visually,
**so that** I stay motivated by seeing my consistency.

**Acceptance Criteria:**
1. Badge streak affiché sur le dashboard (ex: "🔥 12 jours")
2. Streak individuel visible par trackable item (icône flamme + nombre)
3. Pour objectifs mensuels : affichage "X/Y jours ce mois" avec barre de progression
4. Couleur de la barre change selon progression (vert si on track, orange si en retard, rouge si objectif impossible)
5. Section ou modal "Mes stats" accessible depuis le dashboard
6. Stats affichées : streak actuel, meilleur streak, progression du mois par item
7. Animation subtile lors d'un nouveau record de streak
8. Style fintech : sobre, élégant, data-driven (pas de confettis ou animations enfantines)

### Story 3.7: Monthly Goals & Calendar View

**As a** user,
**I want** to see my monthly progress in a calendar format,
**so that** I can visualize which days I was active and plan my remaining days.

**Acceptance Criteria:**
1. Composant calendrier mensuel accessible depuis le dashboard ou stats
2. Chaque jour coloré selon le niveau de complétion (gradient ou dots)
3. Légende claire des couleurs
4. Affichage du nombre de jours actifs vs objectif mensuel
5. Projection : "Il te reste X jours pour atteindre ton objectif de Y jours"
6. Navigation entre les mois (historique)
7. Clic sur un jour affiche le détail de ce jour (items complétés)
8. Vue responsive : simplifié sur mobile, complet sur desktop

---

## Epic 4: Migration Hercules → Momentum ✅

**Expanded Goal:**
Migrer l'intégralité des données d'entraînement depuis l'application Android Hercules vers Momentum. La migration couvre les exercices, programmes d'entraînement (avec supersets), l'historique complet des séances (520 performances → 125 sessions), et les mensurations corporelles. Chaque étape est réalisée via un script CLI TypeScript idempotent qui lit la base SQLite Hercules et écrit dans PostgreSQL.

**Source de données:** `docs/features/Hercule_18-01-2026_19h33m23s_v34.db` (SQLite)

### Story 4.1: Import des exercices ✅

**Status:** Completed
**Script:** `scripts/hercules-import-exercises.ts`

21 exercices mappés (13 créés + 8 existants), 3 ignorés (étirements/rééducation).
Génère `scripts/hercules-exercise-mapping.json`.

### Story 4.2: Import des programmes (Workouts) ✅

**Status:** Completed
**Script:** `scripts/hercules-import-workouts.ts`

5 workouts créés (Bras, Fessiers, Pecs, Dos, Épaules) avec 19 WorkoutItems (incluant 2 supersets), 21 WorkoutItemExercises, 87 WorkoutSets.
Génère `scripts/hercules-workout-mapping.json`.

### Story 4.3: Import de l'historique des séances ✅

**Status:** Completed
**Script:** `scripts/hercules-import-history.ts`

125 sessions importées (période 28/02/2024 → 04/01/2026), 508 exercices, 2121 sets.
4 performances avec écarts ignorées, 20 notes de session importées.

### Story 4.4: Import des mensurations ✅

**Status:** Completed
**Script:** `scripts/hercules-import-measurements.ts`

2 mensurations importées (28/04/2024, 16/06/2024) avec 18 champs chacune.

---

## Checklist Results Report

### Executive Summary

| Metric | Result |
|--------|--------|
| **Overall PRD Completeness** | **92%** |
| **MVP Scope Appropriateness** | **Just Right** |
| **Readiness for Architecture Phase** | **Ready** |

### Category Statuses

| Category | Status | Notes |
|----------|--------|-------|
| 1. Problem Definition & Context | PASS | Clear problem, target user, differentiation |
| 2. MVP Scope Definition | PASS | Well-scoped, future phases separated |
| 3. User Experience Requirements | PARTIAL | Screens defined, detailed flows for UX Expert |
| 4. Functional Requirements | PASS | 23 FR clear and testable |
| 5. Non-Functional Requirements | PASS | 12 NFR covering all aspects |
| 6. Epic & Story Structure | PASS | 4 epics (3 feature + 1 migration), 26 stories, proper sequencing |
| 7. Technical Guidance | PASS | Complete stack, clear constraints |
| 8. Cross-Functional Requirements | PARTIAL | Conceptual DB schema, integrations identified |
| 9. Clarity & Communication | PASS | Well-structured document |

### Technical Risks to Investigate

1. Timer with audio notification (Web Audio API vs library)
2. Screen wake lock during workout session (Wake Lock API)
3. PWA service worker setup with Next.js
4. Streak calculation performance on long history

### Final Decision

**✅ READY FOR ARCHITECT** - PRD is complete and ready for architecture phase

---

## Next Steps

### UX Expert Prompt

```
Je travaille sur Momentum, une application web de suivi d'habitudes avec focus fitness.
Le PRD est disponible dans docs/prd.md.

Merci de :
1. Revoir les UI Design Goals et Core Screens
2. Proposer des wireframes ou mockups pour les écrans clés (Today Dashboard, Workout Session)
3. Valider les interaction paradigms et suggérer des améliorations UX
4. S'assurer que l'expérience mobile-first est optimisée pour le quick logging
```

### Architect Prompt

```
Je travaille sur Momentum, une application web de suivi d'habitudes avec focus fitness.
Le PRD est disponible dans docs/prd.md.

Merci de :
1. Créer l'architecture technique détaillée basée sur le PRD
2. Valider/affiner le schéma de base de données conceptuel
3. Définir l'API design (endpoints, payloads, error handling)
4. Documenter les patterns et conventions de code
5. Produire les documents d'architecture par domaine dans docs/architecture/, avec docs/architecture/index.md comme point d'entrée
```
