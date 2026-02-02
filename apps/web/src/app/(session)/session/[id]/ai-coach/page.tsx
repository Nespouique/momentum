"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Brain, Lightbulb, MessageSquare, AlertCircle, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout";
import { ResultInput } from "@/components/session/result-input";
import { useAuthStore } from "@/stores/auth";
import { toast } from "sonner";
import {
  generateAICoaching,
  applyAICoaching,
  getSession,
  updateSession,
  type AIProposal,
  type AICoachingResponse,
} from "@/lib/api/sessions";

interface AICoachPageProps {
  params: { id: string };
}

interface EditableSet {
  setNumber: number;
  currentReps: number;
  currentWeight: number | null;
  editedReps: number;
  editedWeight: number;
}

interface EditableProposal extends Omit<AIProposal, "sets"> {
  editedSets: EditableSet[];
}

export default function AICoachPage({ params }: AICoachPageProps) {
  const sessionId = params.id;
  const router = useRouter();
  const { token } = useAuthStore();
  // Note: We don't use useSessionStore here because the session may not be loaded in the store
  // when navigating directly to the AI coach page. We use direct API calls instead.

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coachingData, setCoachingData] = useState<AICoachingResponse | null>(null);
  const [proposals, setProposals] = useState<EditableProposal[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workoutName, setWorkoutName] = useState<string>("");

  // Load session info and generate coaching advice
  useEffect(() => {
    if (!token) return;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Get session info for workout name
        const sessionResponse = await getSession(token, sessionId);
        setWorkoutName(sessionResponse.data.workout?.name || "Workout");

        // Generate AI coaching advice
        const response = await generateAICoaching(token, sessionId);
        setCoachingData(response.data);

        // Initialize editable proposals with per-set values
        const editableProposals: EditableProposal[] = response.data.proposals.map((p) => ({
          exerciseId: p.exerciseId,
          exerciseName: p.exerciseName,
          analysis: p.analysis,
          justification: p.justification,
          editedSets: p.sets.map((s) => ({
            setNumber: s.setNumber,
            currentReps: s.currentReps,
            currentWeight: s.currentWeight,
            editedReps: s.suggestedReps,
            editedWeight: s.suggestedWeight ?? 0,
          })),
        }));
        setProposals(editableProposals);
      } catch (err) {
        console.error("Failed to load AI coaching:", err);
        setError(
          err instanceof Error ? err.message : "Une erreur est survenue lors de l'analyse"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [token, sessionId]);

  // Handle set value change
  const handleSetChange = useCallback(
    (exerciseId: string, setNumber: number, value: { reps: number; weight: number }) => {
      setProposals((prev) =>
        prev.map((p) =>
          p.exerciseId === exerciseId
            ? {
                ...p,
                editedSets: p.editedSets.map((s) =>
                  s.setNumber === setNumber
                    ? { ...s, editedReps: value.reps, editedWeight: value.weight }
                    : s
                ),
              }
            : p
        )
      );
    },
    []
  );

  // Apply proposals
  const handleApply = useCallback(async () => {
    if (!token || proposals.length === 0) return;

    setIsSubmitting(true);
    try {
      await applyAICoaching(token, sessionId, {
        proposals: proposals.map((p) => ({
          exerciseId: p.exerciseId,
          sets: p.editedSets.map((s) => ({
            setNumber: s.setNumber,
            targetReps: s.editedReps,
            targetWeight: s.editedWeight === 0 ? null : s.editedWeight,
          })),
        })),
      });
      // Complete the session directly via API (store may not have session loaded)
      await updateSession(token, sessionId, { status: "completed" });
      toast.success("Objectifs mis à jour !");
      router.push("/");
    } catch (err) {
      console.error("Failed to apply coaching:", err);
      toast.error("Échec de la mise à jour des objectifs");
    } finally {
      setIsSubmitting(false);
    }
  }, [token, sessionId, proposals, router]);

  // Ignore and complete session
  const handleIgnore = useCallback(async () => {
    if (!token) return;
    setIsSubmitting(true);
    try {
      // Complete the session directly via API (store may not have session loaded)
      await updateSession(token, sessionId, { status: "completed" });
      router.push("/");
    } catch (err) {
      console.error("Failed to complete session:", err);
      toast.error("Échec de la finalisation de la séance");
    } finally {
      setIsSubmitting(false);
    }
  }, [token, sessionId, router]);

  // Go back
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4">
        <Brain className="h-16 w-16 text-violet-400 animate-pulse" />
        <div className="text-center">
          <p className="text-zinc-100 font-medium">
            Analyse des {coachingData?.analyzedSessionsCount || 10} dernières
          </p>
          <p className="text-zinc-100 font-medium">
            séances &quot;{workoutName || "..."}&quot;...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4">
        <AlertCircle className="h-16 w-16 text-red-400" />
        <div className="text-center space-y-2">
          <p className="text-zinc-100 font-medium">Oups, une erreur est survenue</p>
          <p className="text-zinc-400 text-sm">
            Le coach IA n&apos;a pas pu analyser ta séance.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button
            onClick={() => window.location.reload()}
            variant="default"
            className="w-full"
          >
            Réessayer
          </Button>
          <button
            onClick={handleBack}
            className="text-center text-sm text-zinc-500 hover:text-zinc-300 py-2"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  // No proposals - show encouragement message
  if (!coachingData || proposals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <Brain className="h-10 w-10 text-emerald-400" />
        </div>
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-xl font-semibold text-zinc-100">Tout va bien !</p>
          <p className="text-zinc-300 text-base leading-relaxed">
            {coachingData?.coachMessage || "Ta progression est régulière, continue comme ça !"}
          </p>
          <p className="text-zinc-500 text-sm">
            {coachingData?.analyzedSessionsCount || 0} séances analysées
          </p>
        </div>
        <Button
          onClick={handleIgnore}
          disabled={isSubmitting}
          variant="default"
          className="w-full max-w-xs"
        >
          {isSubmitting ? "Finalisation..." : "Terminer la séance"}
        </Button>
      </div>
    );
  }

  // Success state with proposals
  return (
    <div className="flex flex-col h-full overflow-y-auto pb-6">
      {/* Header */}
      <PageHeader title="Propositions Coach IA" showBack />

      <div className="px-4">
        {/* Brain icon bubble */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-500/20 border border-violet-500/30">
            <Brain className="h-8 w-8 text-violet-400" />
          </div>
        </div>

        {/* Workout name as subtitle */}
        <h3 className="text-base text-zinc-400 text-center mb-6">{workoutName}</h3>

        {/* Introduction card */}
        <div className="rounded-xl bg-violet-950/30 border border-violet-500/20 p-4 mb-6">
          <div className="flex gap-3">
            <Lightbulb className="h-5 w-5 text-violet-400 shrink-0 mt-0.5" />
            <p className="text-sm text-zinc-300">
              J&apos;ai analysé tes {coachingData.analyzedSessionsCount} dernières
              séances. Voici mes recommandations pour débloquer ta progression. Tu
              peux ajuster les valeurs avant de valider.
            </p>
          </div>
        </div>

        {/* Proposal cards */}
        <div className="flex-1 space-y-4 mb-6">
          {proposals.map((proposal) => (
            <ProposalCard
              key={proposal.exerciseId}
              proposal={proposal}
              onSetChange={handleSetChange}
            />
          ))}
        </div>

        {/* Actions - at bottom */}
        <div className="pt-4 space-y-3">
          <Button
            onClick={handleApply}
            disabled={isSubmitting}
            size="xl"
            className="w-full"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Application...
              </span>
            ) : (
              "Appliquer et terminer"
            )}
          </Button>

          <Button
            onClick={handleIgnore}
            disabled={isSubmitting}
            variant="secondary"
            size="xl"
            className="w-full"
          >
            Ignorer et terminer
          </Button>
        </div>
      </div>
    </div>
  );
}

// Proposal Card Component
interface ProposalCardProps {
  proposal: EditableProposal;
  onSetChange: (exerciseId: string, setNumber: number, value: { reps: number; weight: number }) => void;
}

function ProposalCard({ proposal, onSetChange }: ProposalCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
      {/* Exercise header */}
      <div className="px-4 py-3 border-b border-zinc-800/50">
        <h3 className="font-semibold text-zinc-100">{proposal.exerciseName}</h3>
        <p className="text-xs text-zinc-500 mt-0.5">Nouveaux objectifs proposés</p>
      </div>

      {/* Analysis text */}
      <div className="px-4 py-3 border-b border-zinc-800/50">
        <p className="text-sm text-zinc-400">{proposal.analysis}</p>
      </div>

      {/* Editable sets */}
      <div className="divide-y divide-zinc-800/50">
        {proposal.editedSets.map((set) => {
          const weightDiff = set.editedWeight - (set.currentWeight ?? 0);
          const repsDiff = set.editedReps - set.currentReps;

          return (
            <div key={set.setNumber} className="px-4 py-3">
              <div className="flex items-center gap-3">
                {/* Set number badge */}
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-100 text-xs font-semibold text-zinc-900">
                  {set.setNumber}
                </div>

                {/* Compact stepper controls */}
                <div className="flex-1">
                  <ResultInput
                    exerciseName=""
                    targetReps={set.currentReps}
                    targetWeight={set.currentWeight}
                    value={{ reps: set.editedReps, weight: set.editedWeight }}
                    onChange={(value) => onSetChange(proposal.exerciseId, set.setNumber, value)}
                    showObjective={false}
                    compact
                    hideHeader
                  />
                </div>
              </div>

              {/* Evolution indicator - aligned under inputs */}
              <div className="mt-1.5 ml-9 flex items-center text-xs">
                {/* Reps evolution - left side */}
                <div className="flex-1 flex items-center justify-center gap-1">
                  {repsDiff !== 0 ? (
                    <>
                      {repsDiff > 0 ? (
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-amber-500" />
                      )}
                      <span className={repsDiff > 0 ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
                        {repsDiff > 0 ? "+" : ""}{repsDiff}
                      </span>
                    </>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </div>

                {/* Weight evolution - right side */}
                <div className="flex-1 flex items-center justify-center gap-1">
                  {weightDiff !== 0 ? (
                    <>
                      {weightDiff > 0 ? (
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-amber-500" />
                      )}
                      <span className={weightDiff > 0 ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
                        {weightDiff > 0 ? "+" : ""}{weightDiff}kg
                      </span>
                    </>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Justification */}
      <div className="px-4 py-3 border-t border-zinc-800/50">
        <div className="flex gap-2">
          <MessageSquare className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
          <p className="text-sm text-zinc-400 italic">&quot;{proposal.justification}&quot;</p>
        </div>
      </div>
    </div>
  );
}
