import OpenAI from "openai";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

const AI_COACH_MODEL = "gpt-6-luna";
const AI_COACH_REASONING_EFFORT = "medium" as const;
const AI_COACH_MAX_COMPLETION_TOKENS = 8000;

export const AI_PROPOSAL_STRATEGIES = [
  "increase_weight",
  "increase_reps",
  "volume_phase",
  "deload",
  "align_target",
] as const;

export type AIProposalStrategy = (typeof AI_PROPOSAL_STRATEGIES)[number];

// Types for AI coaching responses - per-set proposals
export interface AIProposalSet {
  setNumber: number;
  currentReps: number;
  currentWeight: number | null;
  suggestedReps: number;
  suggestedWeight: number | null;
}

export interface AIProposal {
  exerciseId: string;
  exerciseName: string;
  strategy: AIProposalStrategy;
  analysis: string;
  justification: string;
  sets: AIProposalSet[];
}

export interface AICoachingResponse {
  sessionId: string;
  workoutName: string;
  analyzedSessionsCount: number;
  proposals: AIProposal[];
  coachMessage: string; // Encouragement or advice message
}

interface SetPerformanceData {
  setNumber: number;
  targetReps: number;
  targetWeight: number | null;
  actualReps: number | null;
  actualWeight: number | null;
  rpe: number | null;
}

interface TemplateSetData {
  setNumber: number;
  targetReps: number;
  targetWeight: number | null;
}

interface SessionExerciseData {
  exerciseId: string;
  exerciseName: string;
  muscleGroups: string[];
  templateSets: TemplateSetData[];
  sets: SetPerformanceData[];
}

interface SessionHistoryData {
  sessionDate: string;
  notes: string | null;
  exercises: SessionExerciseData[];
}

export interface WorkoutCoachingContext {
  workoutId: string;
  workoutName: string;
  userGoal: string | null;
  daysSinceLastSession: number | null;
  currentSession: SessionHistoryData;
  historySessions: SessionHistoryData[]; // Chronological order (oldest -> newest)
}

export class InvalidCoachingProposalError extends Error {
  constructor() {
    super("Coaching proposal no longer matches the workout template");
    this.name = "InvalidCoachingProposalError";
  }
}

const aiCoachingModelOutputSchema = z.object({
  coachMessage: z.string(),
  proposals: z.array(
    z.object({
      exerciseId: z.string(),
      exerciseName: z.string(),
      strategy: z.enum(AI_PROPOSAL_STRATEGIES),
      analysis: z.string(),
      justification: z.string(),
      sets: z.array(
        z.object({
          setNumber: z.number().int().min(1),
          suggestedReps: z.number(),
          suggestedWeight: z.number().nullable(),
        })
      ),
    })
  ),
});

const AI_COACHING_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["coachMessage", "proposals"],
  properties: {
    coachMessage: {
      type: "string",
      description:
        "Message global concis (1-2 phrases) en français pour l'utilisateur : bilan de la séance et introduction aux ajustements éventuels.",
    },
    proposals: {
      type: "array",
      description:
        "Liste des exercices nécessitant réellement un ajustement (vide si aucun ajustement n'est justifié).",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "exerciseId",
          "exerciseName",
          "strategy",
          "analysis",
          "justification",
          "sets",
        ],
        properties: {
          exerciseId: {
            type: "string",
            description: "UUID exact de l'exercice fourni dans le contexte.",
          },
          exerciseName: {
            type: "string",
            description: "Nom exact de l'exercice.",
          },
          strategy: {
            type: "string",
            enum: [...AI_PROPOSAL_STRATEGIES],
            description: "Type principal d'ajustement proposé.",
          },
          analysis: {
            type: "string",
            description: "Constat factuel concis (1-2 phrases) basé sur le réalisé récent.",
          },
          justification: {
            type: "string",
            description: "Explication concise (1-2 phrases) de l'ajustement proposé.",
          },
          sets: {
            type: "array",
            description: "Une entrée par série de la cible actuelle de l'exercice.",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["setNumber", "suggestedReps", "suggestedWeight"],
              properties: {
                setNumber: { type: "integer" },
                suggestedReps: { type: "integer" },
                suggestedWeight: { type: ["number", "null"] },
              },
            },
          },
        },
      },
    },
  },
} as const;

function formatWeight(weight: number | null): string {
  if (weight === null || weight === 0) return "PDC";
  return `${weight}kg`;
}

function formatTemplateSetsLine(sets: TemplateSetData[]): string {
  return sets.map((s) => `S${s.setNumber} ${s.targetReps}@${formatWeight(s.targetWeight)}`).join(" | ");
}

function formatActualSetsLine(sets: SetPerformanceData[]): string {
  return sets
    .map((s) => {
      if (s.actualReps === null) {
        return `S${s.setNumber} -`;
      }
      const rpeSuffix = s.rpe !== null ? ` (RPE ${s.rpe})` : "";
      return `S${s.setNumber} ${s.actualReps}@${formatWeight(s.actualWeight)}${rpeSuffix}`;
    })
    .join(" | ");
}

function normalizeWeight(weight: number | null): number | null {
  if (weight === null || weight <= 0) return null;
  return Math.round(weight * 100) / 100;
}

/**
 * Build read-only context from the current session and the last N completed sessions
 * of the same workout (returned in chronological order: oldest -> newest).
 */
export async function buildWorkoutContext(
  sessionId: string,
  maxSessions: number = 9
): Promise<WorkoutCoachingContext> {
  const currentSession = await prisma.workoutSession.findUnique({
    where: { id: sessionId },
    include: {
      user: {
        select: { goalDescription: true },
      },
      workout: {
        select: { id: true, name: true },
      },
      exercises: {
        where: {
          status: { notIn: ["skipped", "substituted"] },
        },
        include: {
          exercise: {
            select: { id: true, name: true, muscleGroups: true },
          },
          workoutItemExercise: {
            include: {
              sets: {
                orderBy: { setNumber: "asc" },
              },
            },
          },
          sets: {
            orderBy: { setNumber: "asc" },
          },
        },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!currentSession) {
    throw new Error("Session not found");
  }

  if (currentSession.type === "ad_hoc" || !currentSession.workout || !currentSession.workoutId) {
    throw new Error("AI coaching requires a planned workout session");
  }

  // Get recent completed historical sessions for the same workout (most recent first, then reverse)
  const rawHistorySessions = await prisma.workoutSession.findMany({
    where: {
      userId: currentSession.userId,
      workoutId: currentSession.workoutId,
      status: "completed",
      id: { not: sessionId },
    },
    orderBy: { completedAt: "desc" },
    take: maxSessions,
    include: {
      exercises: {
        where: {
          status: { notIn: ["skipped", "substituted"] },
        },
        include: {
          exercise: {
            select: { id: true, name: true, muscleGroups: true },
          },
          sets: {
            orderBy: { setNumber: "asc" },
          },
        },
        orderBy: { position: "asc" },
      },
    },
  });

  const mostRecentHistory = rawHistorySessions[0];
  const lastHistoryDate = mostRecentHistory?.completedAt ?? mostRecentHistory?.startedAt ?? null;
  const daysSinceLastSession = lastHistoryDate
    ? Math.max(
        0,
        Math.round(
          (currentSession.startedAt.getTime() - lastHistoryDate.getTime()) / (1000 * 60 * 60 * 24)
        )
      )
    : null;

  // Format current session (using actual workout template sets as baseline when available)
  const formattedCurrentSession: SessionHistoryData = {
    sessionDate: currentSession.startedAt.toISOString().split("T")[0]!,
    notes: currentSession.notes?.trim() || null,
    exercises: currentSession.exercises.map((ex) => {
      const templateSets: TemplateSetData[] =
        ex.workoutItemExercise && ex.workoutItemExercise.sets.length > 0
          ? ex.workoutItemExercise.sets.map((s) => ({
              setNumber: s.setNumber,
              targetReps: s.targetReps,
              targetWeight: s.targetWeight,
            }))
          : ex.sets.map((s) => ({
              setNumber: s.setNumber,
              targetReps: s.targetReps,
              targetWeight: s.targetWeight,
            }));

      return {
        exerciseId: ex.exerciseId,
        exerciseName: ex.exercise.name,
        muscleGroups: ex.exercise.muscleGroups,
        templateSets,
        sets: ex.sets.map((set) => ({
          setNumber: set.setNumber,
          targetReps: set.targetReps,
          targetWeight: set.targetWeight,
          actualReps: set.actualReps,
          actualWeight: set.actualWeight,
          rpe: set.rpe,
        })),
      };
    }),
  };

  // Format historical sessions in chronological order (oldest -> newest)
  const formattedHistorySessions: SessionHistoryData[] = [...rawHistorySessions]
    .reverse()
    .map((session) => ({
      sessionDate: (session.completedAt ?? session.startedAt).toISOString().split("T")[0]!,
      notes: session.notes?.trim() || null,
      exercises: session.exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exercise.name,
        muscleGroups: ex.exercise.muscleGroups,
        templateSets: ex.sets.map((set) => ({
          setNumber: set.setNumber,
          targetReps: set.targetReps,
          targetWeight: set.targetWeight,
        })),
        sets: ex.sets.map((set) => ({
          setNumber: set.setNumber,
          targetReps: set.targetReps,
          targetWeight: set.targetWeight,
          actualReps: set.actualReps,
          actualWeight: set.actualWeight,
          rpe: set.rpe,
        })),
      })),
    }));

  return {
    workoutId: currentSession.workoutId,
    workoutName: currentSession.workout.name,
    userGoal: currentSession.user.goalDescription?.trim() || null,
    daysSinceLastSession,
    currentSession: formattedCurrentSession,
    historySessions: formattedHistorySessions,
  };
}

/**
 * Format workout context into a compact, chronological, unambiguous text prompt
 */
export function buildCoachingPrompts(context: WorkoutCoachingContext): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = `Tu es un coach sportif expert en musculation, spécialisé dans la surcharge progressive et la gestion de la fatigue.

CONTEXTE:
L'utilisateur vient de terminer une séance. Tu reçois ses cibles actuelles (template) et son historique RÉALISÉ trié du plus ancien au plus récent jusqu'à aujourd'hui.

RÈGLES D'ANALYSE STRICTES (anti-erreur):
1. Base-toi UNIQUEMENT sur les valeurs RÉALISÉES (ne confonds jamais "Cible actuelle" et "Réalisé").
2. Ne parle de "stagnation" que si les 3 DERNIÈRES séances consécutives (incluant aujourd'hui) affichent les mêmes charges et répétitions réalisées sur les séries de travail. Ne cite jamais une ancienne performance vieille de plusieurs séances comme une constance récente.
3. Reprise après pause: si l'écart depuis la dernière séance est >= 14 jours, considère qu'il s'agit d'une reprise. Privilégie la consolidation et ne propose un ajustement que s'il est manifeste (cible actuelle déjà dépassée aujourd'hui, ou plateau long et constant sans aucune baisse).
4. Sélectivité: ne modifie pas tous les exercices par réflexe. Propose UNIQUEMENT les exercices qui ont un vrai besoin d'ajustement (en général 0 à 3 exercices prioritaires ; davantage seulement si chaque cas est indiscutable). Si tout va bien, renvoie "proposals": [] avec un message d'encouragement.
5. Structure des séries: si un exercice a une structure pyramidale (séries d'échauffement / montée en charge plus légères au début, ou série de back-off en fin), préserve cette structure et ajuste principalement les séries de travail.
6. Incréments réalistes: utilise des paliers de salle cohérents (barres/machines: pas de 1.25 ou 2.5 kg ; haltères: pas de 1 ou 2 kg ; exercices au poids de corps: null). Adapte l'amplitude au groupe musculaire (plus modeste en isolation qu'en polyarticulaire).
7. Aucun changement inutile: n'inclus jamais un exercice dont toutes les séries proposées sont identiques à la cible actuelle.
8. Complétude: pour chaque exercice proposé, renvoie une valeur pour CHAQUE numéro de série de la cible actuelle, avec l'exerciseId exact.

STRATÉGIES ("strategy"):
- "increase_weight": augmenter la charge (en maintenant ou réduisant légèrement les reps)
- "increase_reps": augmenter les répétitions à charge constante
- "volume_phase": réduire légèrement la charge pour augmenter nettement les reps
- "deload": alléger temporairement face à une fatigue ou baisse progressive
- "align_target": réaligner la cible sur ce que l'utilisateur réalise déjà au-dessus de la cible, ou abaisser une cible trop haute non atteinte de manière répétée

STYLE:
- Français naturel, direct, précis (cite les chiffres réels sans erreur)
- Concis: 1 à 2 phrases max par champ (coachMessage, analysis, justification)`;

  const totalSessions = context.historySessions.length + 1;
  const headerLines: string[] = [
    `Séance: "${context.workoutName}" | Date: ${context.currentSession.sessionDate} | Séances analysées: ${totalSessions}`,
  ];

  if (context.daysSinceLastSession !== null) {
    const pauseFlag =
      context.daysSinceLastSession >= 14 ? " (reprise après pause >= 14 jours)" : "";
    headerLines.push(
      `Écart depuis la dernière séance: ${context.daysSinceLastSession} jour(s)${pauseFlag}`
    );
  }
  if (context.userGoal) {
    headerLines.push(`Objectif utilisateur: ${context.userGoal}`);
  }
  if (context.currentSession.notes) {
    headerLines.push(`Notes du jour: ${context.currentSession.notes}`);
  }

  headerLines.push(
    "",
    'Légende: S<n> <reps>@<poids> (PDC = poids de corps, "-" = série non faite). Historique du plus ancien au plus récent, RÉALISÉ uniquement.'
  );

  const exerciseBlocks = context.currentSession.exercises.map((ex) => {
    const muscles = ex.muscleGroups.length > 0 ? ex.muscleGroups.join(", ") : "non précisé";
    const lines: string[] = [
      `### ${ex.exerciseName} | id: ${ex.exerciseId} | muscles: ${muscles}`,
      `Cible actuelle: ${formatTemplateSetsLine(ex.templateSets)}`,
      "Réalisé:",
    ];

    for (const hist of context.historySessions) {
      const histEx = hist.exercises.find((e) => e.exerciseId === ex.exerciseId);
      if (!histEx) continue;
      const noteSuffix = hist.notes ? ` | note: ${hist.notes}` : "";
      lines.push(`- ${hist.sessionDate}: ${formatActualSetsLine(histEx.sets)}${noteSuffix}`);
    }

    lines.push(
      `- ${context.currentSession.sessionDate} (AUJOURD'HUI): ${formatActualSetsLine(ex.sets)}`
    );

    return lines.join("\n");
  });

  const userPrompt = `${headerLines.join("\n")}\n\n${exerciseBlocks.join("\n\n")}\n\nAnalyse ces exercices et propose uniquement les ajustements réellement justifiés.`;

  return { systemPrompt, userPrompt };
}

/**
 * Validate and sanitize raw model JSON against the actual workout template
 */
export function sanitizeCoachingResponse(
  rawContent: string,
  context: WorkoutCoachingContext,
  sessionId: string
): AICoachingResponse {
  const parsed = aiCoachingModelOutputSchema.parse(JSON.parse(rawContent));

  const seenExerciseIds = new Set<string>();
  const proposals: AIProposal[] = [];

  for (const proposal of parsed.proposals) {
    if (seenExerciseIds.has(proposal.exerciseId)) continue;

    const currentEx = context.currentSession.exercises.find(
      (e) => e.exerciseId === proposal.exerciseId
    );
    if (!currentEx || currentEx.templateSets.length === 0) continue;

    seenExerciseIds.add(proposal.exerciseId);

    const suggestedBySetNumber = new Map(proposal.sets.map((s) => [s.setNumber, s]));

    const sets: AIProposalSet[] = currentEx.templateSets.map((templateSet) => {
      const suggested = suggestedBySetNumber.get(templateSet.setNumber);
      const currentWeight = normalizeWeight(templateSet.targetWeight);
      const suggestedReps = suggested
        ? Math.min(100, Math.max(1, Math.round(suggested.suggestedReps)))
        : templateSet.targetReps;
      const suggestedWeight = suggested
        ? normalizeWeight(suggested.suggestedWeight)
        : currentWeight;

      return {
        setNumber: templateSet.setNumber,
        currentReps: templateSet.targetReps,
        currentWeight,
        suggestedReps,
        suggestedWeight,
      };
    });

    // Drop no-op proposals where every set matches the current template target
    const hasAnyChange = sets.some(
      (s) => s.suggestedReps !== s.currentReps || s.suggestedWeight !== s.currentWeight
    );
    if (!hasAnyChange) continue;

    proposals.push({
      exerciseId: currentEx.exerciseId,
      exerciseName: currentEx.exerciseName,
      strategy: proposal.strategy,
      analysis: proposal.analysis.trim(),
      justification: proposal.justification.trim(),
      sets,
    });
  }

  return {
    sessionId,
    workoutName: context.workoutName,
    analyzedSessionsCount: context.historySessions.length + 1,
    proposals,
    coachMessage: parsed.coachMessage.trim() || "Voici mon analyse de ta séance !",
  };
}

/**
 * Generate AI coaching advice - AI decides autonomously if changes are needed
 */
export async function generateCoachingAdvice(sessionId: string): Promise<AICoachingResponse> {
  const context = await buildWorkoutContext(sessionId);
  const { systemPrompt, userPrompt } = buildCoachingPrompts(context);

  try {
    const completion = await openai.chat.completions.create({
      model: AI_COACH_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      reasoning_effort: AI_COACH_REASONING_EFFORT,
      max_completion_tokens: AI_COACH_MAX_COMPLETION_TOKENS,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ai_coaching_response",
          strict: true,
          schema: AI_COACHING_RESPONSE_SCHEMA,
        },
      },
    });

    const choice = completion.choices[0];
    if (choice?.finish_reason === "length") {
      throw new Error("OpenAI response was truncated before completion");
    }

    const content = choice?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    return sanitizeCoachingResponse(content, context, sessionId);
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate coaching advice");
  }
}

/**
 * Apply AI coaching proposals to the workout template (per-set)
 */
export async function applyCoachingProposals(
  sessionId: string,
  proposals: Array<{
    exerciseId: string;
    sets: Array<{
      setNumber: number;
      targetReps: number;
      targetWeight: number | null;
    }>;
  }>
): Promise<number> {
  // Get the session to find the workout
  const session = await prisma.workoutSession.findUnique({
    where: { id: sessionId },
    include: {
      exercises: {
        include: {
          workoutItemExercise: {
            include: {
              sets: true,
            },
          },
        },
      },
    },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  if (session.type === "ad_hoc" || !session.workoutId) {
    throw new Error("AI coaching requires a planned workout session");
  }

  return prisma.$transaction(async (tx) => {
    let appliedCount = 0;
    const proposedExerciseIds = new Set<string>();

    for (const proposal of proposals) {
      if (proposedExerciseIds.has(proposal.exerciseId)) {
        throw new InvalidCoachingProposalError();
      }
      proposedExerciseIds.add(proposal.exerciseId);

      const matchingExercises = session.exercises.filter(
        (exercise) =>
          exercise.exerciseId === proposal.exerciseId &&
          exercise.status !== "skipped" &&
          exercise.status !== "substituted"
      );
      const sessionExercise = matchingExercises[0];

      if (matchingExercises.length !== 1 || !sessionExercise?.workoutItemExercise) {
        throw new InvalidCoachingProposalError();
      }

      const setNumbers = new Set<number>();
      for (const setProposal of proposal.sets) {
        if (setNumbers.has(setProposal.setNumber)) {
          throw new InvalidCoachingProposalError();
        }
        setNumbers.add(setProposal.setNumber);

        const templateSet = sessionExercise.workoutItemExercise.sets.find(
          (set) => set.setNumber === setProposal.setNumber
        );
        if (!templateSet) {
          throw new InvalidCoachingProposalError();
        }

        await tx.workoutSet.update({
          where: { id: templateSet.id },
          data: {
            targetReps: setProposal.targetReps,
            targetWeight: setProposal.targetWeight,
          },
        });
        appliedCount += 1;
      }
    }

    return appliedCount;
  });
}
