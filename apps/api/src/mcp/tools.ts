import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  bucketSessions,
  exerciseHistory,
  exerciseMetrics,
  muscleGroupBreakdown,
  personalRecords,
  rankExercises,
  sessionDate,
  sessionTotals,
  summarizeSessions,
  type LoadedSession,
  type PeriodSummary,
  type RankMetric,
} from "./aggregations.js";
import {
  firstSessionStart,
  loadExerciseLibrary,
  loadSession,
  loadSessionPage,
  loadSessions,
  matchExercises,
  type ExerciseRef,
} from "./analytics.service.js";
import type { McpConfig } from "./config.js";
import {
  MEASUREMENT_FIELDS,
  dateOnly,
  loadMeasurements,
  loadProfile,
  loadTracking,
  loadWorkouts,
} from "./data.service.js";
import {
  computeTargetMetrics,
  durationMinutes,
  normalizeText,
  percentChange,
  round1,
} from "./metrics.js";
import {
  McpToolError,
  PERIOD_PRESETS,
  autoGranularity,
  buildBuckets,
  clampAllTime,
  localDateKey,
  previousPeriod,
  resolvePeriod,
  type PeriodInput,
  type PeriodPreset,
  type ResolvedPeriod,
} from "./period.js";

export interface McpContext {
  userId: string;
  connectionId: string;
  config: McpConfig;
}

const TOOL_TIMEOUT_MS = 20_000;
const MAX_RESPONSE_CHARS = 200_000;
const MAX_TIMESERIES_BUCKETS = 400;
const MAX_SERIES_POINTS = 400;

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format attendu : YYYY-MM-DD");

const periodShape = {
  period: z
    .enum(PERIOD_PRESETS)
    .optional()
    .describe(
      "Période prédéfinie : today, yesterday, this_week (depuis lundi), last_week, last_7_days, last_30_days, last_90_days, this_month (mois en cours), last_month (mois précédent), this_year, last_year, last_12_months, all_time (10 dernières années). Ignoré si 'from' est fourni."
    ),
  from: dateKey
    .optional()
    .describe("Premier jour inclus (YYYY-MM-DD) pour une période personnalisée."),
  to: dateKey
    .optional()
    .describe("Dernier jour inclus (YYYY-MM-DD). Par défaut aujourd'hui. Nécessite 'from'."),
  timezone: z
    .string()
    .max(64)
    .optional()
    .describe("Fuseau IANA pour délimiter les jours (défaut : Europe/Paris)."),
};

const exerciseShape = {
  exerciseId: z
    .string()
    .uuid()
    .optional()
    .describe("Identifiant d'exercice (voir search_exercises)."),
  exercise: z
    .string()
    .min(1)
    .max(100)
    .optional()
    .describe(
      "Nom (ou partie du nom) de l'exercice, sans tenir compte des accents ni de la casse."
    ),
};

function ok(data: Record<string, unknown>): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data) }],
    structuredContent: data,
  };
}

function fail(message: string): CallToolResult {
  return { isError: true, content: [{ type: "text", text: message }] };
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new McpToolError("La requête a pris trop de temps. Réduis la période.")),
      ms
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function runTool(
  ctx: McpContext,
  name: string,
  handler: () => Promise<Record<string, unknown>>
): Promise<CallToolResult> {
  const startedAt = Date.now();
  let outcome = "ok";
  try {
    const data = await withTimeout(handler(), TOOL_TIMEOUT_MS);
    if (JSON.stringify(data).length > MAX_RESPONSE_CHARS) {
      outcome = "too_large";
      return fail(
        "Résultat trop volumineux. Réduis la période ou le paramètre 'limit', ou utilise un outil d'agrégation."
      );
    }
    return ok(data);
  } catch (error) {
    if (error instanceof McpToolError) {
      outcome = "invalid_request";
      return fail(error.message);
    }
    outcome = "error";
    console.error(`MCP tool ${name} failed:`, error);
    return fail("Erreur interne lors de la lecture des données.");
  } finally {
    console.info(
      JSON.stringify({
        event: "mcp_tool",
        tool: name,
        userId: ctx.userId,
        connectionId: ctx.connectionId,
        outcome,
        durationMs: Date.now() - startedAt,
      })
    );
  }
}

async function resolveSessionPeriod(
  ctx: McpContext,
  input: PeriodInput,
  defaultPeriod: PeriodPreset
): Promise<ResolvedPeriod> {
  const period = resolvePeriod(input, {
    defaultPeriod,
    defaultTimezone: ctx.config.defaultTimezone,
  });
  if (period.preset !== "all_time") return period;
  const first = await firstSessionStart(ctx.userId);
  return clampAllTime(period, first ? localDateKey(first, period.timezone) : null);
}

function resolveDatePeriod(
  ctx: McpContext,
  input: PeriodInput,
  defaultPeriod: PeriodPreset
): ResolvedPeriod {
  return resolvePeriod(input, { defaultPeriod, defaultTimezone: ctx.config.defaultTimezone });
}

function periodOut(period: ResolvedPeriod) {
  return {
    preset: period.preset,
    from: period.from,
    to: period.to,
    days: period.days,
    timezone: period.timezone,
  };
}

function exerciseOut(exercise: ExerciseRef) {
  return { exerciseId: exercise.id, name: exercise.name, muscleGroups: exercise.muscleGroups };
}

type ExerciseLookup = { resolved: ExerciseRef } | { response: Record<string, unknown> };

async function lookupExercise(input: {
  exerciseId?: string | undefined;
  exercise?: string | undefined;
}): Promise<ExerciseLookup> {
  const library = await loadExerciseLibrary();
  const match = matchExercises(library, { exerciseId: input.exerciseId, name: input.exercise });
  if (match.status === "found") return { resolved: match.exercise };
  if (match.status === "ambiguous") {
    return {
      response: {
        status: "ambiguous",
        message:
          "Plusieurs exercices correspondent. Demande à l'utilisateur lequel il veut, puis relance avec exerciseId.",
        candidates: match.candidates.map(exerciseOut),
      },
    };
  }
  return {
    response: {
      status: "not_found",
      message: "Aucun exercice ne correspond. Essaie search_exercises avec un autre terme.",
      suggestions: match.suggestions.map(exerciseOut),
    },
  };
}

function summaryOut(summary: PeriodSummary) {
  return {
    sessions: summary.sessions,
    totals: summary.totals,
    targets: summary.targets,
    distinctExercises: summary.distinctExercises,
    duration: summary.duration,
  };
}

function sessionListItem(session: LoadedSession, timezone: string) {
  const totals = sessionTotals(session);
  return {
    id: session.id,
    date: sessionDate(session, timezone),
    startedAt: session.startedAt.toISOString(),
    completedAt: session.completedAt?.toISOString() ?? null,
    type: session.type,
    status: session.status,
    workout: session.workoutId ? { id: session.workoutId, name: session.workoutName } : null,
    durationMinutes: durationMinutes(session.startedAt, session.completedAt),
    totals,
    exercises: session.exercises.map((exercise) => {
      const metrics = exerciseMetrics(exercise);
      return {
        exerciseId: exercise.exerciseId,
        name: exercise.name,
        status: exercise.status,
        sets: metrics.sets,
        reps: metrics.reps,
        volumeKg: metrics.volumeKg,
        maxWeightKg: metrics.maxWeightKg,
        repsAtMaxWeight: metrics.repsAtMaxWeight,
        maxReps: metrics.maxReps,
        target: computeTargetMetrics(exercise.sets),
      };
    }),
  };
}

const DEFINITIONS = {
  sessionDate: "Jour local (selon timezone) du démarrage de la séance.",
  aggregates: "Les agrégats ne comptent que les séances terminées (status=completed).",
  sets: "Série comptée seulement si un résultat réel (actualReps) est saisi ; les objectifs ne sont jamais utilisés.",
  volumeKg:
    "Somme poids x répétitions des séries avec charge > 0 ; exercices au poids du corps exclus du volume (leurs reps restent dans reps).",
  e1rm: "1RM estimé (formule d'Epley) = poids x (1 + reps/30), séries avec charge uniquement.",
  duration:
    "Durée = fin - début de séance ; durées > 360 min ignorées dans les agrégats (séance probablement oubliée ouverte).",
} as const;

export function registerTools(server: McpServer, ctx: McpContext): void {
  server.registerTool(
    "get_stats_summary",
    {
      title: "Résumé des statistiques d'entraînement",
      description:
        "Réponse rapide aux questions du type « combien de séances ce mois-ci ? », « mon volume cette semaine ? ». Retourne nombre de séances terminées (planifiées / à la volée), jours actifs, moyenne par semaine, séries, répétitions, volume (kg), cibles (séries prévues, séries ayant atteint leur cible, volume vs cible), durée, exercices distincts, avec comparaison à la période précédente équivalente.",
      inputSchema: {
        ...periodShape,
        compare: z
          .boolean()
          .optional()
          .describe(
            "Comparer à la période précédente équivalente (défaut true, ignoré pour all_time)."
          ),
      },
      annotations: READ_ONLY,
    },
    (input) =>
      runTool(ctx, "get_stats_summary", async () => {
        const period = await resolveSessionPeriod(ctx, input, "this_month");
        const current = await loadSessions(ctx.userId, {
          startUtc: period.startUtc,
          endUtc: period.endUtc,
        });
        const summary = summarizeSessions(current.sessions, period);

        let comparison: Record<string, unknown> | null = null;
        if ((input.compare ?? true) && period.preset !== "all_time") {
          const previous = previousPeriod(period);
          const loaded = await loadSessions(ctx.userId, {
            startUtc: previous.startUtc,
            endUtc: previous.endUtc,
          });
          const before = summarizeSessions(loaded.sessions, previous);
          comparison = {
            period: periodOut(previous),
            ...summaryOut(before),
            deltas: {
              completedSessions: summary.sessions.completed - before.sessions.completed,
              sets: summary.totals.sets - before.totals.sets,
              reps: summary.totals.reps - before.totals.reps,
              volumeKg: round1(summary.totals.volumeKg - before.totals.volumeKg),
              volumePercent: percentChange(summary.totals.volumeKg, before.totals.volumeKg),
              sessionsPercent: percentChange(summary.sessions.completed, before.sessions.completed),
            },
            truncated: loaded.truncated,
          };
        }

        return {
          period: periodOut(period),
          ...summaryOut(summary),
          comparison,
          truncated: current.truncated,
          definitions: DEFINITIONS,
        };
      })
  );

  server.registerTool(
    "get_activity_timeseries",
    {
      title: "Série temporelle d'activité",
      description:
        "Données prêtes pour un graphique ou dashboard : par jour, semaine (lundi) ou mois, nombre de séances, durée, séries, répétitions et volume. Les périodes sans séance valent 0 (zéro réel).",
      inputSchema: {
        ...periodShape,
        granularity: z
          .enum(["day", "week", "month"])
          .optional()
          .describe("Défaut : automatique selon la longueur de la période."),
      },
      annotations: READ_ONLY,
    },
    (input) =>
      runTool(ctx, "get_activity_timeseries", async () => {
        const period = await resolveSessionPeriod(ctx, input, "last_90_days");
        const granularity = input.granularity ?? autoGranularity(period.days);
        if (buildBuckets(period, granularity).length > MAX_TIMESERIES_BUCKETS) {
          throw new McpToolError(
            "Trop de points : choisis une granularité plus large ou une période plus courte."
          );
        }
        const loaded = await loadSessions(ctx.userId, {
          startUtc: period.startUtc,
          endUtc: period.endUtc,
          statuses: ["completed"],
        });
        return {
          period: periodOut(period),
          granularity,
          buckets: bucketSessions(loaded.sessions, period, granularity),
          truncated: loaded.truncated,
          definitions: {
            ...DEFINITIONS,
            partial: "partial=true : bucket tronqué par les bornes de la période.",
          },
        };
      })
  );

  server.registerTool(
    "list_sessions",
    {
      title: "Lister les séances",
      description:
        "Liste paginée des séances (les plus récentes d'abord par défaut) avec date, type (planned / ad_hoc), statut, programme, durée, totaux et résumé par exercice (résultat et cible). Filtres : période, statut, type, exercice, programme.",
      inputSchema: {
        ...periodShape,
        status: z.enum(["completed", "in_progress", "abandoned"]).optional(),
        type: z.enum(["planned", "ad_hoc"]).optional(),
        workoutId: z
          .string()
          .uuid()
          .optional()
          .describe("Identifiant de programme (voir list_workouts)."),
        ...exerciseShape,
        order: z.enum(["asc", "desc"]).optional().describe("Défaut desc (plus récentes d'abord)."),
        limit: z.number().int().min(1).max(50).optional().describe("Défaut 20, max 50."),
        offset: z.number().int().min(0).optional(),
      },
      annotations: READ_ONLY,
    },
    (input) =>
      runTool(ctx, "list_sessions", async () => {
        const period = resolveDatePeriod(ctx, input, "all_time");
        let exerciseId: string | undefined;
        if (input.exerciseId || input.exercise) {
          const lookup = await lookupExercise(input);
          if ("response" in lookup) return lookup.response;
          exerciseId = lookup.resolved.id;
        }
        const limit = input.limit ?? 20;
        const offset = input.offset ?? 0;
        const page = await loadSessionPage(
          ctx.userId,
          {
            startUtc: period.startUtc,
            endUtc: period.endUtc,
            statuses: input.status ? [input.status] : undefined,
            type: input.type,
            workoutId: input.workoutId,
            exerciseId,
          },
          { order: input.order ?? "desc", skip: offset, take: limit }
        );
        return {
          period: periodOut(period),
          total: page.total,
          limit,
          offset,
          hasMore: offset + page.sessions.length < page.total,
          sessions: page.sessions.map((session) => sessionListItem(session, period.timezone)),
        };
      })
  );

  server.registerTool(
    "get_session",
    {
      title: "Détail d'une séance",
      description:
        "Détail complet d'une séance : exercices dans l'ordre, séries avec cibles (target) et résultats réels (actual), synthèse cible par exercice, RPE, notes.",
      inputSchema: {
        sessionId: z.string().uuid().describe("Identifiant de séance (voir list_sessions)."),
        timezone: z.string().max(64).optional(),
      },
      annotations: READ_ONLY,
    },
    (input) =>
      runTool(ctx, "get_session", async () => {
        const period = resolveDatePeriod(ctx, { timezone: input.timezone }, "today");
        const session = await loadSession(ctx.userId, input.sessionId);
        if (!session) throw new McpToolError("Séance introuvable.");
        return {
          ...sessionListItem(session, period.timezone),
          notes: session.notes,
          exercises: session.exercises.map((exercise) => ({
            exerciseId: exercise.exerciseId,
            name: exercise.name,
            muscleGroups: exercise.muscleGroups,
            status: exercise.status,
            position: exercise.position,
            metrics: exerciseMetrics(exercise),
            target: computeTargetMetrics(exercise.sets),
            sets: exercise.sets.map((set) => ({
              setNumber: set.setNumber,
              target: { reps: set.targetReps, weightKg: set.targetWeight },
              actual:
                set.actualReps === null
                  ? null
                  : { reps: set.actualReps, weightKg: set.actualWeight },
              rpe: set.rpe ?? null,
            })),
          })),
          definitions: DEFINITIONS,
        };
      })
  );

  server.registerTool(
    "search_exercises",
    {
      title: "Chercher des exercices",
      description:
        "Recherche dans la bibliothèque d'exercices (insensible aux accents et à la casse) avec, pour chacun, le nombre de séances terminées de l'utilisateur et la dernière fois pratiqué. Sert à identifier un exerciseId ou à lever une ambiguïté.",
      inputSchema: {
        query: z.string().max(100).optional().describe("Terme de recherche dans le nom."),
        muscleGroup: z
          .string()
          .max(50)
          .optional()
          .describe("Filtre sur un groupe musculaire (ex. pectoraux)."),
        practicedOnly: z
          .boolean()
          .optional()
          .describe("Ne garder que les exercices déjà pratiqués."),
        limit: z.number().int().min(1).max(50).optional().describe("Défaut 20, max 50."),
        timezone: z.string().max(64).optional(),
      },
      annotations: READ_ONLY,
    },
    (input) =>
      runTool(ctx, "search_exercises", async () => {
        const period = resolveDatePeriod(ctx, { timezone: input.timezone }, "today");
        const [library, loaded] = await Promise.all([
          loadExerciseLibrary(),
          loadSessions(ctx.userId, { statuses: ["completed"] }),
        ]);
        const usage = new Map(
          rankExercises(loaded.sessions, "sessions", period.timezone).map((entry) => [
            entry.exerciseId,
            entry,
          ])
        );
        const query = normalizeText(input.query ?? "");
        const group = input.muscleGroup ? normalizeText(input.muscleGroup) : null;
        const tokens = query === "" ? [] : query.split(" ");

        const matches = library
          .filter((exercise) => {
            const name = normalizeText(exercise.name);
            if (!tokens.every((token) => name.includes(token))) return false;
            if (group && !exercise.muscleGroups.some((mg) => normalizeText(mg).includes(group)))
              return false;
            return !input.practicedOnly || usage.has(exercise.id);
          })
          .map((exercise) => ({
            ...exerciseOut(exercise),
            sessions: usage.get(exercise.id)?.sessions ?? 0,
            lastPerformed: usage.get(exercise.id)?.lastPerformed ?? null,
          }))
          .sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name, "fr"));

        const limit = input.limit ?? 20;
        return {
          total: matches.length,
          limit,
          exercises: matches.slice(0, limit),
          truncated: loaded.truncated,
        };
      })
  );

  server.registerTool(
    "get_exercise_history",
    {
      title: "Historique et progression d'un exercice",
      description:
        "Performances séance par séance pour un exercice : résultats (séries, reps, volume, charge max, 1RM estimé) TOUJOURS accompagnés de leurs cibles (`target` : séries/reps/charge prévues, séries ayant atteint la cible, % du volume cible ; avec includeSets, chaque série donne reps/charge réels et cible), progression entre la première et la dernière séance, et records de la période. Passe 'exercise' (nom) ou 'exerciseId'. Si le nom est ambigu, la réponse liste les candidats : demande à l'utilisateur de choisir. Pour un exercice au poids du corps, regarde reps / maxReps.",
      inputSchema: {
        ...periodShape,
        ...exerciseShape,
        includeSets: z
          .boolean()
          .optional()
          .describe("Inclure le détail des séries de chaque séance (défaut false)."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(200)
          .optional()
          .describe("Nombre max de séances (les plus récentes), défaut 100."),
      },
      annotations: READ_ONLY,
    },
    (input) =>
      runTool(ctx, "get_exercise_history", async () => {
        const lookup = await lookupExercise(input);
        if ("response" in lookup) return lookup.response;
        const exercise = lookup.resolved;
        const period = await resolveSessionPeriod(ctx, input, "all_time");
        const loaded = await loadSessions(ctx.userId, {
          startUtc: period.startUtc,
          endUtc: period.endUtc,
          statuses: ["completed"],
          exerciseId: exercise.id,
        });
        const all = exerciseHistory(loaded.sessions, exercise.id, period.timezone);
        const limit = input.limit ?? 100;
        const shown = all.slice(-limit);
        const first = all[0];
        const last = all[all.length - 1];
        const records = personalRecords(loaded.sessions, period.timezone).find(
          (record) => record.exerciseId === exercise.id
        );

        return {
          status: "ok",
          exercise: exerciseOut(exercise),
          period: periodOut(period),
          sessionsCount: all.length,
          returned: shown.length,
          truncated: loaded.truncated || all.length > shown.length,
          progression:
            first && last && all.length > 1
              ? {
                  firstDate: first.date,
                  lastDate: last.date,
                  maxWeightKg: { first: first.maxWeightKg, last: last.maxWeightKg },
                  targetMaxWeightKg: {
                    first: first.target.maxWeightKg,
                    last: last.target.maxWeightKg,
                  },
                  bestE1RMKg: {
                    first: first.bestE1RM,
                    last: last.bestE1RM,
                    changePercent:
                      first.bestE1RM !== null && last.bestE1RM !== null
                        ? percentChange(last.bestE1RM, first.bestE1RM)
                        : null,
                  },
                  volumeKg: {
                    first: first.volumeKg,
                    last: last.volumeKg,
                    changePercent: percentChange(last.volumeKg, first.volumeKg),
                  },
                  maxReps: { first: first.maxReps, last: last.maxReps },
                }
              : null,
          records: records ?? null,
          history: shown.map((entry) => {
            const { sessionSets, ...rest } = entry;
            return input.includeSets ? { ...rest, setsDetail: sessionSets } : rest;
          }),
          definitions: DEFINITIONS,
        };
      })
  );

  server.registerTool(
    "get_favorite_exercises",
    {
      title: "Exercices préférés / les plus pratiqués",
      description:
        "Classement des exercices les plus pratiqués sur une période, par nombre de séances (défaut), de séries, de répétitions ou par volume.",
      inputSchema: {
        ...periodShape,
        metric: z
          .enum(["sessions", "sets", "reps", "volume"])
          .optional()
          .describe("Critère de classement, défaut sessions."),
        limit: z.number().int().min(1).max(50).optional().describe("Défaut 10, max 50."),
      },
      annotations: READ_ONLY,
    },
    (input) =>
      runTool(ctx, "get_favorite_exercises", async () => {
        const period = await resolveSessionPeriod(ctx, input, "all_time");
        const metric: RankMetric = input.metric ?? "sessions";
        const loaded = await loadSessions(ctx.userId, {
          startUtc: period.startUtc,
          endUtc: period.endUtc,
          statuses: ["completed"],
        });
        const ranked = rankExercises(loaded.sessions, metric, period.timezone);
        const valueOf = (entry: (typeof ranked)[number]) =>
          metric === "volume"
            ? entry.volumeKg
            : metric === "sessions"
              ? entry.sessions
              : entry[metric];
        const total = ranked.reduce((sum, entry) => sum + valueOf(entry), 0);
        const limit = input.limit ?? 10;
        return {
          period: periodOut(period),
          metric,
          distinctExercises: ranked.length,
          exercises: ranked.slice(0, limit).map((entry, index) => ({
            rank: index + 1,
            ...entry,
            sharePercent: total > 0 ? round1((valueOf(entry) / total) * 100) : null,
          })),
          truncated: loaded.truncated,
          definitions: DEFINITIONS,
        };
      })
  );

  server.registerTool(
    "get_personal_records",
    {
      title: "Records personnels",
      description:
        "Records par exercice sur la période : charge max (avec reps), meilleur 1RM estimé, maximum de répétitions (utile au poids du corps) et meilleur volume sur une séance, avec les dates.",
      inputSchema: {
        ...periodShape,
        ...exerciseShape,
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe("Nombre d'exercices (les plus pratiqués), défaut 15."),
      },
      annotations: READ_ONLY,
    },
    (input) =>
      runTool(ctx, "get_personal_records", async () => {
        let exerciseId: string | undefined;
        if (input.exerciseId || input.exercise) {
          const lookup = await lookupExercise(input);
          if ("response" in lookup) return lookup.response;
          exerciseId = lookup.resolved.id;
        }
        const period = await resolveSessionPeriod(ctx, input, "all_time");
        const loaded = await loadSessions(ctx.userId, {
          startUtc: period.startUtc,
          endUtc: period.endUtc,
          statuses: ["completed"],
          exerciseId,
        });
        let records = personalRecords(loaded.sessions, period.timezone);
        if (exerciseId) records = records.filter((record) => record.exerciseId === exerciseId);
        const limit = input.limit ?? 15;
        return {
          status: "ok",
          period: periodOut(period),
          totalExercises: records.length,
          records: records.slice(0, limit),
          truncated: loaded.truncated,
          definitions: DEFINITIONS,
        };
      })
  );

  server.registerTool(
    "get_muscle_group_breakdown",
    {
      title: "Répartition par groupe musculaire",
      description:
        "Séances, séries, répétitions et volume par groupe musculaire sur la période. Un exercice compte entièrement pour chacun de ses groupes (les parts peuvent donc dépasser 100 % au total).",
      inputSchema: { ...periodShape },
      annotations: READ_ONLY,
    },
    (input) =>
      runTool(ctx, "get_muscle_group_breakdown", async () => {
        const period = await resolveSessionPeriod(ctx, input, "last_30_days");
        const loaded = await loadSessions(ctx.userId, {
          startUtc: period.startUtc,
          endUtc: period.endUtc,
          statuses: ["completed"],
        });
        const { groups, setsWithoutMuscleGroup } = muscleGroupBreakdown(loaded.sessions);
        const totalSets = groups.reduce((sum, group) => sum + group.sets, 0);
        return {
          period: periodOut(period),
          groups: groups.map((group) => ({
            ...group,
            setsSharePercent: totalSets > 0 ? round1((group.sets / totalSets) * 100) : null,
          })),
          setsWithoutMuscleGroup,
          truncated: loaded.truncated,
          definitions: DEFINITIONS,
        };
      })
  );

  server.registerTool(
    "list_workouts",
    {
      title: "Programmes d'entraînement",
      description:
        "Liste des programmes (workouts) de l'utilisateur avec leurs exercices, le nombre de séances terminées et la dernière réalisation.",
      inputSchema: { timezone: z.string().max(64).optional() },
      annotations: READ_ONLY,
    },
    (input) =>
      runTool(ctx, "list_workouts", async () => {
        const period = resolveDatePeriod(ctx, { timezone: input.timezone }, "today");
        const { workouts, usage } = await loadWorkouts(ctx.userId);
        const usageById = new Map(usage.map((entry) => [entry.workoutId, entry]));
        return {
          total: workouts.length,
          workouts: workouts.map((workout) => {
            const stats = usageById.get(workout.id);
            return {
              id: workout.id,
              name: workout.name,
              description: workout.description,
              completedSessions: stats?._count._all ?? 0,
              lastPerformed: stats?._max.startedAt
                ? localDateKey(stats._max.startedAt, period.timezone)
                : null,
              items: workout.items.map((item) => ({
                type: item.type,
                rounds: item.rounds,
                exercises: item.exercises.map((entry) => ({
                  exerciseId: entry.exercise.id,
                  name: entry.exercise.name,
                  targetSets: entry.sets.length,
                  targetReps: entry.sets.map((set) => set.targetReps),
                  targetWeightKg: entry.sets.map((set) => set.targetWeight),
                })),
              })),
            };
          }),
        };
      })
  );

  server.registerTool(
    "get_body_measurements",
    {
      title: "Mensurations et poids",
      description:
        "Mensurations datées (poids en kg, tours en cm) sur la période, dernière valeur et évolution première -> dernière valeur pour chaque champ renseigné. Les champs absents restent null (≠ 0).",
      inputSchema: {
        ...periodShape,
        fields: z
          .array(z.enum(MEASUREMENT_FIELDS))
          .max(18)
          .optional()
          .describe("Champs à retourner (défaut : tous)."),
      },
      annotations: READ_ONLY,
    },
    (input) =>
      runTool(ctx, "get_body_measurements", async () => {
        const period = resolveDatePeriod(ctx, input, "last_12_months");
        const rows = await loadMeasurements(ctx.userId, period);
        const fields = input.fields ?? [...MEASUREMENT_FIELDS];

        const entries = rows.map((row) => {
          const entry: Record<string, unknown> = { date: dateOnly(row.date) };
          for (const field of fields) entry[field] = row[field] ?? null;
          if (row.notes) entry["notes"] = row.notes;
          return entry;
        });

        const changes: Record<string, unknown> = {};
        for (const field of fields) {
          const points = rows.filter((row) => row[field] !== null);
          const first = points[0];
          const last = points[points.length - 1];
          if (first && last && points.length > 1) {
            changes[field] = {
              firstDate: dateOnly(first.date),
              firstValue: first[field],
              lastDate: dateOnly(last.date),
              lastValue: last[field],
              delta: round1((last[field] as number) - (first[field] as number)),
            };
          }
        }

        return {
          period: periodOut(period),
          units: { weight: "kg", others: "cm" },
          count: entries.length,
          latest: entries[entries.length - 1] ?? null,
          changes,
          entries: entries.slice(-MAX_SERIES_POINTS),
          truncated: entries.length > MAX_SERIES_POINTS,
        };
      })
  );

  server.registerTool(
    "get_daily_tracking",
    {
      title: "Suivi quotidien (habitudes, pas, sommeil…)",
      description:
        "Éléments suivis au quotidien (trackables : yoga, pas, calories, sommeil, personnalisés) avec objectif actif, jours renseignés, total, moyenne, min/max et, pour les objectifs quotidiens, nombre de jours où l'objectif est atteint. Série journalière optionnelle.",
      inputSchema: {
        ...periodShape,
        trackable: z
          .string()
          .max(100)
          .optional()
          .describe("Filtre par nom (insensible aux accents)."),
        includeSeries: z
          .boolean()
          .optional()
          .describe("Inclure les valeurs jour par jour (défaut true)."),
      },
      annotations: READ_ONLY,
    },
    (input) =>
      runTool(ctx, "get_daily_tracking", async () => {
        const period = resolveDatePeriod(ctx, input, "last_30_days");
        const wanted = input.trackable ? normalizeText(input.trackable) : null;
        const items = (await loadTracking(ctx.userId, period)).filter(
          (item) => !wanted || normalizeText(item.name).includes(wanted)
        );
        const includeSeries = input.includeSeries ?? true;

        return {
          period: periodOut(period),
          trackables: items.map((item) => {
            const values = item.entries.map((entry) => entry.value);
            const goal = item.goals[0] ?? null;
            const total = values.reduce((sum, value) => sum + value, 0);
            return {
              id: item.id,
              name: item.name,
              type: item.trackingType,
              unit: item.unit,
              isSystem: item.isSystem,
              isActive: item.isActive,
              goal: goal ? { targetValue: goal.targetValue, frequency: goal.frequency } : null,
              daysLogged: values.length,
              daysInPeriod: period.days,
              total: round1(total),
              average: values.length > 0 ? round1(total / values.length) : null,
              min: values.length > 0 ? Math.min(...values) : null,
              max: values.length > 0 ? Math.max(...values) : null,
              daysGoalMet:
                goal && goal.frequency === "daily" && goal.targetValue > 0
                  ? values.filter((value) => value >= goal.targetValue).length
                  : null,
              series: includeSeries
                ? item.entries.slice(-MAX_SERIES_POINTS).map((entry) => ({
                    date: dateOnly(entry.date),
                    value: entry.value,
                    source: entry.source,
                  }))
                : undefined,
            };
          }),
          definitions: {
            daysLogged: "Jours avec une entrée ; un jour sans entrée n'est pas compté comme zéro.",
            daysGoalMet: "Calculé uniquement pour un objectif quotidien : valeur >= objectif.",
            boolean: "Les éléments de type boolean valent 1 quand c'est fait.",
          },
        };
      })
  );

  server.registerTool(
    "get_profile",
    {
      title: "Profil de l'utilisateur",
      description:
        "Informations de profil utiles au contexte : prénom/nom, âge, taille, objectif, ancienneté, dernier poids connu, et nombre total de séances terminées.",
      inputSchema: { timezone: z.string().max(64).optional() },
      annotations: READ_ONLY,
    },
    (input) =>
      runTool(ctx, "get_profile", async () => {
        const period = resolveDatePeriod(ctx, { timezone: input.timezone }, "today");
        const [{ user, latestWeight }, first, loaded] = await Promise.all([
          loadProfile(ctx.userId),
          firstSessionStart(ctx.userId),
          loadSessions(ctx.userId, { statuses: ["completed"] }),
        ]);
        if (!user) throw new McpToolError("Profil introuvable.");
        const today = new Date();
        let age: number | null = null;
        if (user.birthDate) {
          age = today.getUTCFullYear() - user.birthDate.getUTCFullYear();
          const beforeBirthday =
            today.getUTCMonth() < user.birthDate.getUTCMonth() ||
            (today.getUTCMonth() === user.birthDate.getUTCMonth() &&
              today.getUTCDate() < user.birthDate.getUTCDate());
          if (beforeBirthday) age -= 1;
        }
        return {
          name: user.name,
          age,
          heightCm: user.height,
          goal: user.goalDescription,
          memberSince: localDateKey(user.createdAt, period.timezone),
          latestWeight: latestWeight
            ? { weightKg: latestWeight.weight, date: dateOnly(latestWeight.date) }
            : null,
          completedSessions: loaded.sessions.filter((session) => session.status === "completed")
            .length,
          firstSessionDate: first ? localDateKey(first, period.timezone) : null,
          today: localDateKey(today, period.timezone),
          timezone: period.timezone,
          truncated: loaded.truncated,
        };
      })
  );
}
