"use client";

import { useState } from "react";
import { TrendingUp, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export interface ProgressionSuggestion {
  id: string;
  exerciseId: string;
  exerciseName: string;
  suggestionType: "increase_weight" | "increase_reps";
  currentValue: number;
  suggestedValue: number;
  reason: string;
  status: "pending" | "accepted" | "dismissed";
}

interface ProgressionSuggestionCardProps {
  suggestion: ProgressionSuggestion;
  onAccept: (id: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
}

export function ProgressionSuggestionCard({
  suggestion,
  onAccept,
  onDismiss,
}: ProgressionSuggestionCardProps) {
  const [status, setStatus] = useState<"pending" | "loading" | "accepted" | "dismissed">(
    suggestion.status === "pending" ? "pending" : suggestion.status
  );
  const [isVisible, setIsVisible] = useState(suggestion.status === "pending");

  const handleAccept = async () => {
    setStatus("loading");
    try {
      await onAccept(suggestion.id);
      setStatus("accepted");
      setTimeout(() => {
        setIsVisible(false);
      }, 1800);
    } catch {
      setStatus("pending");
    }
  };

  const handleDismiss = async () => {
    setStatus("loading");
    try {
      await onDismiss(suggestion.id);
      setStatus("dismissed");
      setIsVisible(false);
    } catch {
      setStatus("pending");
    }
  };

  const isWeight = suggestion.suggestionType === "increase_weight";
  const unit = isWeight ? "kg" : "reps";
  // suggestedValue now contains the increment directly (currentValue is 0)
  const increment = suggestion.suggestedValue;

  // Don't render if already handled
  if (suggestion.status !== "pending" && !isVisible) {
    return null;
  }

  return (
    <Collapsible open={isVisible}>
      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 duration-300">
        <div
          className={cn(
            "relative mx-3 mb-3 overflow-hidden rounded-lg",
            "bg-gradient-to-br from-emerald-950/80 via-emerald-950/50 to-zinc-900/80",
            "border border-emerald-500/30",
            "shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]",
            "transition-all duration-300",
            status === "accepted" && "border-emerald-400/50 shadow-[0_0_20px_-3px_rgba(16,185,129,0.4)]"
          )}
        >
          {/* Decorative gradient orb */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          {status === "accepted" ? (
            // Success state
            <div className="relative p-4 flex items-center justify-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/20 animate-in zoom-in-50 duration-300">
                <Check className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="animate-in slide-in-from-left-2 duration-300">
                <p className="text-sm font-semibold text-emerald-300">
                  Objectif mis à jour !
                </p>
                <p className="text-xs text-emerald-400/70">
                  +{increment}{isWeight ? "kg" : " reps"} pour la prochaine séance
                </p>
              </div>
            </div>
          ) : (
            <div className="relative p-4">
              {/* Header */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-md bg-emerald-500/20">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                </div>
                <span className="text-sm font-semibold text-emerald-300">
                  Passer au niveau supérieur ?
                </span>
              </div>

              {/* Increment display - shows per-set increment */}
              <div className="flex items-center justify-center gap-3 mb-4 p-4 rounded-lg bg-zinc-900/60 border border-zinc-800/50">
                <div className="text-center">
                  <p className="text-2xl font-mono font-bold text-emerald-400">
                    +{increment}
                    <span className="text-base font-normal text-emerald-500/70 ml-1">{unit}</span>
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">par série</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 h-10"
                  onClick={handleDismiss}
                  disabled={status === "loading"}
                >
                  <X className="h-4 w-4 mr-1.5" />
                  Ignorer
                </Button>
                <Button
                  size="sm"
                  className="flex-1 h-10"
                  onClick={handleAccept}
                  disabled={status === "loading"}
                >
                  {status === "loading" ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-zinc-400/30 border-t-zinc-600 rounded-full animate-spin" />
                      <span>Application...</span>
                    </span>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1.5" />
                      Appliquer
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
