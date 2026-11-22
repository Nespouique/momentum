# Serveur MCP Momentum

Le serveur MCP (Story 6.1) donne à un LLM un accès **en lecture seule** aux données de l'utilisateur
connecté : séances, performances, mensurations et suivi quotidien. Il est servi par l'API Express
(`apps/api`), sans service supplémentaire, et n'utilise aucune clé OpenAI côté serveur : c'est le
client LLM de l'utilisateur qui comprend la question et met en forme la réponse.

## Deux modes d'authentification

| Mode                    | Pour qui                                           | Fonctionnement                                                                                                                                       |
| ----------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **OAuth** (identifiant) | ChatGPT, Claude (web/desktop), clients interactifs | Le client ouvre une page Momentum où l'on saisit son email et son mot de passe puis « Autoriser ». Mot de passe jamais transmis au LLM.              |
| **Jeton personnel**     | Claude Code, OpenCode, scripts, agents             | Créé dans Paramètres > Connexions MCP, affiché une seule fois, envoyé en `Authorization: Bearer`. Expiration 30 j / 90 j / 1 an / jamais, révocable. |

Les deux donnent le même scope `momentum:read` et sont révocables immédiatement depuis les paramètres.

## Déploiement

1. Choisir l'origine publique du MCP (recommandé : sous-domaine dédié, ex.
   `https://momentum-mcp.hallais.bzh`) et la déclarer dans l'API : `MCP_PUBLIC_URL=<origine>` (origine
   seule, sans chemin). **Tant que cette variable est vide en production, le serveur MCP est désactivé.**
2. Faire pointer cet hôte en HTTPS vers le conteneur API (port 3001 du LXC 197) via Nginx Proxy Manager.
   Le serveur répond en JSON (pas de SSE long), aucun réglage de buffering particulier n'est requis.
   Routes à exposer : `/mcp`, `/oauth/*` et `/.well-known/oauth-*`.
3. Désactiver « Block Common Exploits » sur cet hôte NPM : sa règle anti-RFI bloque (403) les requêtes dont
   la query string contient `param=https://…`, ce que font `redirect_uri` et `resource` dans `/oauth/authorize`.
4. Derrière Nginx Proxy Manager (un saut), `TRUST_PROXY=1` est la valeur par défaut en production ; elle
   sert à identifier l'IP cliente pour les limites de débit.
5. Les migrations sont appliquées au démarrage de l'API (`20261031120000_add_mcp_access`).

Un sous-domaine pointant vers l'API expose aussi les autres routes de l'API (déjà joignables via le proxy
`/backend` du site). Pour ne publier que le MCP, ajouter dans l'hôte NPM une configuration avancée qui ne
laisse passer que `/mcp`, `/oauth/` et `/.well-known/oauth-`.

Vérifications :

```bash
curl -s https://<mcp-host>/.well-known/oauth-protected-resource/mcp
curl -s https://<mcp-host>/.well-known/oauth-authorization-server
curl -si -X POST https://<mcp-host>/mcp   # 401 + en-tête WWW-Authenticate: Bearer resource_metadata=...
```

## Connecter un client

URL à renseigner : `<MCP_PUBLIC_URL>/mcp`. Les intitulés des menus évoluent selon les clients et les offres.

- **ChatGPT (web / desktop)** : ajouter un connecteur/serveur MCP personnalisé (mode développeur),
  coller l'URL, choisir l'authentification OAuth, puis se connecter avec son compte Momentum.
- **Claude (web / desktop)** : Paramètres > Connecteurs > ajouter un connecteur personnalisé, coller l'URL,
  puis se connecter avec son compte Momentum.
- **Claude Code** :
  `claude mcp add --transport http momentum <URL>/mcp` puis `/mcp` pour s'authentifier (OAuth), ou avec un
  jeton personnel : `claude mcp add --transport http momentum <URL>/mcp --header "Authorization: Bearer <jeton>"`.
- **OpenCode** (`opencode.json`) :

  ```json
  {
    "mcp": {
      "momentum": {
        "type": "remote",
        "url": "https://<mcp-host>/mcp",
        "headers": { "Authorization": "Bearer <jeton>" }
      }
    }
  }
  ```

  Sans `headers`, OpenCode lance le flux OAuth (`opencode mcp auth momentum`). Stocker le jeton dans un
  fichier secret (ex. `{file:...}`) plutôt qu'en clair dans la configuration.

Le serveur expose aussi deux prompts : `synthese_mensuelle` et `dashboard_performances`.

## Outils (tous en lecture seule)

| Outil                        | Usage                                                                                               |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| `get_stats_summary`          | Séances, jours actifs, séries, reps, volume, durée sur une période + comparaison période précédente |
| `get_activity_timeseries`    | Série par jour/semaine/mois (séances, durée, séries, reps, volume) pour graphiques                  |
| `list_sessions`              | Séances paginées avec filtres (période, statut, type, exercice, programme)                          |
| `get_session`                | Détail d'une séance : séries, objectifs vs réel, RPE                                                |
| `search_exercises`           | Recherche d'exercices (sans accents) avec fréquence de pratique                                     |
| `get_exercise_history`       | Historique par séance, progression et records d'un exercice (nom ou id, ambiguïté signalée)         |
| `get_favorite_exercises`     | Classement des exercices (séances, séries, reps, volume)                                            |
| `get_personal_records`       | Charge max, 1RM estimé, max de reps, meilleur volume                                                |
| `get_muscle_group_breakdown` | Répartition par groupe musculaire                                                                   |
| `list_workouts`              | Programmes et nombre de séances réalisées                                                           |
| `get_body_measurements`      | Poids et mensurations, évolution                                                                    |
| `get_daily_tracking`         | Habitudes/pas/sommeil : objectifs, jours renseignés, totaux, série                                  |
| `get_profile`                | Profil, âge, taille, dernier poids, nombre de séances                                               |

Paramètres de période communs : `period` (`today`, `yesterday`, `this_week`, `last_week`, `last_7_days`,
`last_30_days`, `last_90_days`, `this_month`, `last_month`, `this_year`, `last_year`, `last_12_months`,
`all_time`) ou `from` / `to` (`YYYY-MM-DD`, bornes incluses), plus `timezone` (IANA, défaut
`Europe/Paris`, variable `MCP_DEFAULT_TIMEZONE`).

### Définitions des métriques

- Les agrégats ne comptent que les séances `completed`. La date d'une séance est le jour local de son démarrage.
- Une série compte uniquement avec un résultat réel (`actualReps`) ; les cibles ne servent jamais à calculer les résultats.
- **Les cibles sont toujours exposées à côté des résultats** : chaque série a ses reps/charge cibles et chaque exercice un bloc `target` (séries prévues y compris non réalisées, reps et volume cibles, charge cible max, `setsMetTarget` = séries réalisées avec reps >= cible et charge >= cible, `volumePercentOfTarget`). `get_stats_summary` ajoute `targets` sur la période. Les cibles sont celles fixées au démarrage de la séance (programme, ou choix pour une séance à la volée).
- Volume = somme poids x reps des séries avec charge > 0. Les exercices au poids du corps n'entrent pas dans
  le volume mais leurs répétitions sont comptées (`reps`, `maxReps`).
- 1RM estimé : formule d'Epley, identique aux statistiques de l'application.
- Durée = fin - début ; les durées > 360 min sont ignorées dans les agrégats (séance oubliée ouverte) et signalées.
- Une période sans séance vaut 0 ; une mesure absente reste `null`. Les réponses incluent `period`, les
  `definitions` et un indicateur `truncated` quand un plafond est atteint.

### Exemples de questions

- « Combien de séances ai-je faites ce mois-ci par rapport au mois dernier ? »
- « Quels sont mes exercices préférés ces 3 derniers mois ? »
- « Comment mon développé couché a-t-il évolué cette année ? »
- « Quel est mon record de tractions ? »
- « Génère un dashboard de mes séances des 90 derniers jours. »

## Sécurité

- OAuth 2.1 : code d'autorisation + PKCE `S256` obligatoire, enregistrement dynamique de client avec
  URI de redirection validées (https, loopback http, schémas applicatifs ; jamais de fragment), paramètre
  `resource` vérifié, codes à usage unique (rejouer un code révoque la connexion), rotation des refresh tokens
  avec détection de réutilisation.
- Jetons opaques stockés **hachés** (SHA-256). Access token : 1 h. Refresh token : 30 jours avec rotation.
  Un refresh token n'est jamais accepté comme jeton d'accès, et un JWT web n'est pas accepté sur `/mcp`.
- L'identité vient exclusivement du jeton : aucun outil n'accepte de `userId`. Tous les accès Prisma sont
  filtrés par l'utilisateur authentifié ; une séance d'un autre utilisateur apparaît comme introuvable.
- Pas de SQL libre, pas d'outil d'écriture, plafonds de pagination/payload/durée, 120 requêtes/min par
  connexion, tentatives de connexion limitées. Les journaux contiennent l'outil, l'utilisateur, la connexion,
  le résultat et la latence, jamais de jeton ni de mot de passe.
- Le serveur est sans état (un serveur MCP éphémère par requête) ; l'identifiant de session MCP n'est
  jamais une authentification.
- **Confidentialité** : les résultats des outils sont envoyés au fournisseur du LLM utilisé (OpenAI,
  Anthropic, etc.). Ne connecter que les clients auxquels on accepte de communiquer ces données.

## Vérification locale

```bash
export DATABASE_URL=postgresql://...   # base migrée jetable
npm run test -w @momentum/api           # unitaires + intégration (OAuth, isolation, révocation, outils)
```

Les tests d'intégration sont ignorés sans `DATABASE_URL`.
