# Momentum AI Frontend Prompts

Cette bibliothèque contient des prompts optimisés pour générer l'interface utilisateur de Momentum avec des outils AI comme **Google Stitch**, **Lovable**, **v0**, ou **Bolt**.

---

## Ordre de développement recommandé

| # | Fichier | Écran/Composant | Priorité | Dépendances |
|---|---------|-----------------|----------|-------------|
| 1 | `01-app-shell-layout.md` | App Shell & Navigation | 🔴 Critique | Aucune |
| 2 | `09-authentication-pages.md` | Login & Register | 🔴 Critique | App Shell |
| 3 | `02-today-dashboard.md` | Dashboard Today | 🔴 Critique | App Shell |
| 4 | `08-tracking-configuration.md` | Config Trackables | 🟡 Important | Dashboard |
| 5 | `07-exercise-library.md` | Bibliothèque Exercices | 🟡 Important | App Shell |
| 6 | `05-workouts-list.md` | Liste Programmes | 🟡 Important | Exercise Library |
| 7 | `04-workout-builder.md` | Builder Programme | 🟡 Important | Exercise Library |
| 8 | `03-active-workout-session.md` | Session Active | 🔴 Critique | Workout Builder |
| 9 | `06-profile-hub.md` | Profil & Mensurations | 🟢 Standard | App Shell |

---

## Structure des prompts

Chaque prompt suit le **Structured Prompting Framework** :

1. **High-Level Goal** - Objectif clair et concis
2. **Project Context** - Tech stack et philosophie design
3. **Detailed Instructions** - Instructions étape par étape
4. **Code Examples & Constraints** - Types TypeScript, exemples de code
5. **Constraints & What NOT To Do** - Ce qu'il faut éviter
6. **Scope Definition** - Fichiers à créer/ne pas modifier
7. **Visual Reference** - Wireframes ASCII

---

## Comment utiliser ces prompts

### Option 1: Google Stitch / Lovable / v0

1. Ouvrir l'outil AI de ton choix
2. Copier-coller le contenu complet du fichier `.md`
3. Laisser l'AI générer le code
4. Réviser et adapter au projet

### Option 2: Agent Dev BMAD avec frontend-design skill

```bash
# Dans Claude Code
/dev

# Puis demander:
"Utilise le skill frontend-design d'Anthropic pour créer [composant].
Réfère-toi aux specs dans docs/ai-prompts/[fichier].md"
```

### Option 3: Développement manuel

Utiliser les prompts comme **spécifications détaillées** pour le développement manuel, en suivant les types TypeScript et structures de composants proposées.

---

## Tech Stack de référence

| Catégorie | Technologie |
|-----------|-------------|
| Framework | Next.js 14+ (App Router) |
| Styling | Tailwind CSS + Shadcn UI |
| State | Zustand + React Query |
| Forms | React Hook Form + Zod |
| Icons | Lucide React |
| Drag & Drop | @hello-pangea/dnd ou dnd-kit |

---

## Thème Dark (Couleurs)

```css
/* Base Shadcn Dark */
--background: #0a0a0a;
--foreground: #fafafa;
--card: #0a0a0a;
--muted: #27272a;
--muted-foreground: #a1a1aa;
--border: #27272a;

/* Accents */
--accent-blue: #3b82f6;    /* Links, focus */
--accent-orange: #f97316;  /* Streaks */
--accent-green: #22c55e;   /* Success */
--accent-yellow: #eab308;  /* Warning */
--accent-red: #ef4444;     /* Error */
```

---

## Rappel important

> **Tout code généré par AI nécessite une révision humaine, des tests, et des ajustements pour être considéré production-ready.**

Les prompts fournissent une base solide, mais l'intégration finale dépend de :
- La structure exacte de ton projet
- Les conventions de nommage existantes
- Les APIs backend réelles
- Les edge cases spécifiques

---

## Fichiers inclus

```
docs/ai-prompts/
├── README.md                      # Ce fichier
├── 01-app-shell-layout.md         # Layout principal + navigation
├── 02-today-dashboard.md          # Dashboard quotidien
├── 03-active-workout-session.md   # Interface session workout
├── 04-workout-builder.md          # Création/édition programmes
├── 05-workouts-list.md            # Liste des programmes
├── 06-profile-hub.md              # Profil + mensurations
├── 07-exercise-library.md         # Bibliothèque exercices
├── 08-tracking-configuration.md   # Config trackables
└── 09-authentication-pages.md     # Login + Register
```
