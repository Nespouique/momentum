# Web Push Notifications (Locked Screen)

## Problème

Les notifications de fin de repos ne fonctionnent pas quand l'écran est verrouillé. L'approche actuelle (setTimeout dans la page + Service Worker avec waitUntil) ne survit pas au gel du processus Chrome par Android.

## Solution : Web Push via FCM

Le serveur envoie un push via Firebase Cloud Messaging (FCM), qui **réveille** le Service Worker même si le navigateur est gelé. C'est le seul mécanisme fiable pour les notifications avec écran verrouillé (identique pour PWA et app native — les deux passent par FCM sur Android).

## Implémentation

### Frontend

1. **Générer des clés VAPID** (Voluntary Application Server Identification)
2. **Souscrire au push** via `PushManager.subscribe()` au démarrage de session
3. **Envoyer la subscription au backend** (endpoint, keys)
4. **Écouter les push dans le SW** (`self.addEventListener("push", ...)`) pour afficher la notification

### Backend

1. **Stocker les push subscriptions** par utilisateur (nouvelle table)
2. **Programmer un job différé** quand un repos commence (reçoit `restEndAt` du frontend)
3. **Envoyer le push** au moment du `restEndAt` via la lib `web-push` (Node.js)
4. **Annuler le job** si l'utilisateur skip le repos manuellement

### Flow

```
Repos démarre
  → Frontend: POST /api/push/schedule { restEndAt, subscriptionId }
  → Backend: programme un delayed job

restEndAt atteint
  → Backend: envoie Web Push via FCM
  → FCM: délivre au téléphone (même écran verrouillé)
  → SW: reçoit event "push" → affiche notification

Skip manuel
  → Frontend: POST /api/push/cancel { subscriptionId }
  → Backend: annule le job
```

## Dépendances

- `web-push` (npm) côté backend pour l'envoi des push
- Job queue ou scheduler côté backend (BullMQ, setTimeout serveur, ou cron)
- Table `push_subscriptions` en base

## Notes

- Les clés VAPID sont gratuites et ne nécessitent pas de compte Firebase
- Le protocole Web Push est un standard W3C, pas propriétaire Google
- Fonctionne sur Chrome, Edge, Firefox (pas Safari iOS < 16.4)
- L'approche actuelle (SW setTimeout + page setTimeout) reste en place comme fallback quand l'écran est allumé
