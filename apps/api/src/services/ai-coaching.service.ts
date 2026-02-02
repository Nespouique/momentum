import OpenAI from "openai";
import { prisma } from "../lib/prisma.js";
import { evaluateSession } from "./progression.service.js";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

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

interface SessionHistoryData {
  sessionDate: string;
  exercises: Array<{
    exerciseId: string;
    exerciseName: string;
    sets: Array<{
      setNumber: number;
      targetReps: number;
      targetWeight: number | null;
      actualReps: number | null;
      actualWeight: number | null;
    }>;
  }>;
}

/**
 * Build context from the last N sessions of the same workout
 */
export async function buildWorkoutContext(
  sessionId: string,
  maxSessions: number = 9
): Promise<{
  workoutId: string;
  workoutName: string;
  currentSession: SessionHistoryData;
  historySessions: SessionHistoryData[];
  stagnatingExerciseIds: string[];
}> {
  // Get current session with workout info
  const currentSession = await prisma.workoutSession.findUnique({
    where: { id: sessionId },
    include: {
      workout: {
        select: { id: true, name: true },
      },
      exercises: {
        where: {
          status: { notIn: ["skipped", "substituted"] },
        },
        include: {
          exercise: {
            select: { id: true, name: true },
          },
          sets: {
            orderBy: { setNumber: "asc" },
          },
        },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!currentSession || !currentSession.workout) {
    throw new Error("Session not found");
  }

  // Ensure progression suggestions are generated for this session (idempotent)
  await evaluateSession(sessionId);

  // Get exercises with pending suggestions (same logic as progressive overload)
  const pendingSuggestions = await prisma.progressionSuggestion.findMany({
    where: {
      sessionId,
      status: "pending",
    },
    select: { exerciseId: true },
  });
  const stagnatingExerciseIds = pendingSuggestions.map((s) => s.exerciseId);

  // Get historical sessions for the same workout
  const historySessions = await prisma.workoutSession.findMany({
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
            select: { id: true, name: true },
          },
          sets: {
            orderBy: { setNumber: "asc" },
          },
        },
        orderBy: { position: "asc" },
      },
    },
  });

  // Format current session
  const formattedCurrentSession: SessionHistoryData = {
    sessionDate: currentSession.startedAt.toISOString().split("T")[0]!,
    exercises: currentSession.exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exercise.name,
      sets: ex.sets.map((set) => ({
        setNumber: set.setNumber,
        targetReps: set.targetReps,
        targetWeight: set.targetWeight,
        actualReps: set.actualReps,
        actualWeight: set.actualWeight,
      })),
    })),
  };

  // Format historical sessions
  const formattedHistorySessions: SessionHistoryData[] = historySessions.map(
    (session) => ({
      sessionDate: session.completedAt?.toISOString().split("T")[0] ?? "unknown",
      exercises: session.exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exercise.name,
        sets: ex.sets.map((set) => ({
          setNumber: set.setNumber,
          targetReps: set.targetReps,
          targetWeight: set.targetWeight,
          actualReps: set.actualReps,
          actualWeight: set.actualWeight,
        })),
      })),
    })
  );

  return {
    workoutId: currentSession.workoutId,
    workoutName: currentSession.workout.name,
    currentSession: formattedCurrentSession,
    historySessions: formattedHistorySessions,
    stagnatingExerciseIds,
  };
}

/**
 * Generate AI coaching advice - AI decides autonomously if changes are needed
 */
export async function generateCoachingAdvice(
  sessionId: string
): Promise<AICoachingResponse> {
  const context = await buildWorkoutContext(sessionId);

  // Build the prompt context with ALL exercises and their history
  const exercisesContext = context.currentSession.exercises.map((ex) => {
    // Get history for this exercise
    const history = context.historySessions
      .map((session) => {
        const historyEx = session.exercises.find(
          (e) => e.exerciseId === ex.exerciseId
        );
        if (!historyEx) return null;
        return {
          date: session.sessionDate,
          sets: historyEx.sets,
        };
      })
      .filter(Boolean);

    return {
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      currentSession: {
        sets: ex.sets,
      },
      history,
    };
  });

  const systemPrompt = `Tu es un coach sportif expert en musculation, spécialisé dans la progression et le dépassement des plateaux.

CONTEXTE:
L'utilisateur a terminé une séance. Tu as accès à l'historique complet de ses performances sur ce workout.

TON RÔLE:
1. Analyser les données d'entraînement pour TOUS les exercices
2. Identifier toi-même les exercices qui pourraient bénéficier d'ajustements (stagnation, sous-performance, fatigue, etc.)
3. Proposer des ajustements concrets UNIQUEMENT pour les exercices qui en ont besoin
4. Si tout va bien, ne propose rien et félicite l'utilisateur

CRITÈRES POUR PROPOSER UN AJUSTEMENT:
- Stagnation: performances identiques sur 3+ séances consécutives
- Sous-performance répétée: l'utilisateur n'atteint pas ses objectifs régulièrement
- Progression possible: l'utilisateur dépasse systématiquement ses objectifs
- Fatigue détectée: baisse de performance progressive

TON STYLE:
- Direct et concis (2-3 phrases max par analyse)
- Motivant mais réaliste
- Basé sur des principes d'entraînement éprouvés

STRATÉGIES DE PROGRESSION À CONSIDÉRER:
- Augmenter le poids (et potentiellement réduire les reps si nécessaire)
- Augmenter les reps à poids constant
- Réduire légèrement le poids pour augmenter significativement les reps (phase de volume)
- Proposer un deload temporaire si tu détectes une fatigue accumulée
- Pour les exercices au poids de corps (0kg ou null), suggérer une progression en reps si l'exercice n'est pas faisable avec du poids

Tu dois répondre UNIQUEMENT en JSON valide avec ce format exact:
{
  "coachMessage": "Message global pour l'utilisateur (encouragement ou introduction aux suggestions)",
  "proposals": [
    {
      "exerciseId": "uuid-de-l-exercice",
      "exerciseName": "Nom de l'exercice",
      "analysis": "Courte analyse de la situation (1-2 phrases)",
      "justification": "Explication de la stratégie choisie (1-2 phrases)",
      "sets": [
        {
          "setNumber": 1,
          "suggestedReps": 10,
          "suggestedWeight": 65
        }
      ]
    }
  ]
}

IMPORTANT:
- Si aucun exercice ne nécessite d'ajustement, renvoie "proposals": [] avec un message d'encouragement
- suggestedWeight peut être null pour les exercices au poids de corps
- Propose une valeur pour CHAQUE série de l'exercice si tu fais une proposition`;

  const userPrompt = `Voici les données de la séance "${context.workoutName}" (${context.historySessions.length + 1} séances analysées):

${JSON.stringify(exercisesContext, null, 2)}

Analyse ces exercices et décide toi-même lesquels nécessitent des ajustements.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    // Parse the JSON response
    const parsed = JSON.parse(content) as {
      coachMessage: string;
      proposals: Array<{
        exerciseId: string;
        exerciseName: string;
        analysis: string;
        justification: string;
        sets: Array<{
          setNumber: number;
          suggestedReps: number;
          suggestedWeight: number | null;
        }>;
      }>;
    };

    // Map to our response format, adding current values
    const proposals: AIProposal[] = parsed.proposals.map((p) => {
      const currentEx = context.currentSession.exercises.find(
        (e) => e.exerciseId === p.exerciseId
      );

      // Map sets with current values
      const sets: AIProposalSet[] = p.sets.map((suggestedSet) => {
        const currentSet = currentEx?.sets.find(
          (s) => s.setNumber === suggestedSet.setNumber
        );
        return {
          setNumber: suggestedSet.setNumber,
          currentReps: currentSet?.targetReps ?? 10,
          currentWeight: currentSet?.targetWeight ?? null,
          suggestedReps: suggestedSet.suggestedReps,
          suggestedWeight: suggestedSet.suggestedWeight,
        };
      });

      return {
        exerciseId: p.exerciseId,
        exerciseName: p.exerciseName,
        analysis: p.analysis,
        justification: p.justification,
        sets,
      };
    });

    return {
      sessionId,
      workoutName: context.workoutName,
      analyzedSessionsCount: context.historySessions.length + 1,
      proposals,
      coachMessage: parsed.coachMessage || "Voici mon analyse de ta séance !",
    };
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
): Promise<void> {
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

  // Update each set individually
  for (const proposal of proposals) {
    const sessionExercise = session.exercises.find(
      (e) => e.exerciseId === proposal.exerciseId
    );

    if (sessionExercise?.workoutItemExercise) {
      const templateSets = sessionExercise.workoutItemExercise.sets;

      for (const setProposal of proposal.sets) {
        const templateSet = templateSets.find(
          (s) => s.setNumber === setProposal.setNumber
        );

        if (templateSet) {
          await prisma.workoutSet.update({
            where: { id: templateSet.id },
            data: {
              targetReps: setProposal.targetReps,
              targetWeight: setProposal.targetWeight,
            },
          });
        }
      }
    }
  }
}
