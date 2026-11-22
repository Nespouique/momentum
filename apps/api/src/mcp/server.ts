import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools, type McpContext } from "./tools.js";

const INSTRUCTIONS = `Momentum est une application de suivi de musculation et d'habitudes. Ce serveur donne un accès en LECTURE SEULE aux données de l'utilisateur connecté (séances, performances, mensurations, suivi quotidien).

Consignes :
- Réponds en français, de façon concise, en t'appuyant uniquement sur les résultats des outils. N'invente jamais de donnée : si un compte vaut 0 ou si la liste est vide, dis-le.
- Pour une question chiffrée rapide (nombre de séances, volume, moyenne), utilise get_stats_summary avec une période prédéfinie (ex. this_month, last_30_days).
- Pour un exercice précis, passe son nom dans "exercise". Si la réponse est "ambiguous", demande à l'utilisateur de choisir parmi les candidats ; ne choisis pas à sa place.
- Pour des graphiques/dashboards, utilise get_activity_timeseries, get_exercise_history, get_muscle_group_breakdown et get_body_measurements, puis construis les visuels côté client.
- Les périodes sont des jours calendaires locaux (fuseau Europe/Paris par défaut), bornes incluses ; les séries sans séance valent 0. Poids en kg, tours en cm, durées en minutes.
- Chaque réponse contient "definitions" et "period" : cite-les si la définition d'une métrique est utile (ex. volume = poids x reps, exercices au poids du corps exclus du volume).
- Ne présente jamais un résultat d'exercice sans sa cible : chaque série a une cible (reps/charge) et les exercices ont un bloc "target" (séries prévues, séries ayant atteint la cible, % du volume cible). Indique si la cible est atteinte, dépassée ou manquée.
- Les séances "ad_hoc" sont des séances à la volée sans programme ; "planned" suit un programme.`;

export function createMcpServer(ctx: McpContext): McpServer {
  const server = new McpServer(
    { name: "momentum", version: "1.0.0", title: "Momentum" },
    { instructions: INSTRUCTIONS }
  );

  registerTools(server, ctx);

  server.registerPrompt(
    "synthese_mensuelle",
    {
      title: "Synthèse du mois",
      description: "Synthèse de progression et de régularité du mois en cours.",
    },
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: "Fais une synthèse de mon mois d'entraînement avec Momentum : appelle get_stats_summary (this_month, avec comparaison au mois précédent), get_favorite_exercises et get_muscle_group_breakdown, puis résume en français ma régularité, mes progrès, les exercices les plus pratiqués et un point d'attention. Appuie-toi uniquement sur les données retournées.",
          },
        },
      ],
    })
  );

  server.registerPrompt(
    "dashboard_performances",
    {
      title: "Dashboard des performances",
      description: "Dashboard visuel des séances et performances sur 3 mois.",
    },
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: "Génère un dashboard visuel de mes séances et performances des 3 derniers mois avec Momentum : utilise get_activity_timeseries (last_90_days, granularité week), get_favorite_exercises, get_muscle_group_breakdown et, pour mes 3 exercices les plus pratiqués, get_exercise_history. Présente graphiques et tableaux avec les données exactes retournées.",
          },
        },
      ],
    })
  );

  return server;
}
