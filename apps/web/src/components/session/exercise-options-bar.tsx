"use client";

import { SkipForward, ArrowLeftRight, ListChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExerciseOptionsBarProps {
  onSkip: () => void;
  onPostpone: () => void;
  onSubstitute: () => void;
  disabled?: boolean;
  showSubstitute?: boolean;
}

export function ExerciseOptionsBar({
  onSkip,
  onPostpone,
  onSubstitute,
  disabled = false,
  showSubstitute = true,
}: ExerciseOptionsBarProps) {
  const actions = [
    { icon: SkipForward, label: "Passer", onClick: onSkip },
    { icon: ListChevronsUpDown, label: "Réorganiser", onClick: onPostpone },
    ...(showSubstitute ? [{ icon: ArrowLeftRight, label: "Remplacer", onClick: onSubstitute }] : []),
  ];

  return (
    <div className="flex items-center justify-center gap-2">
      {actions.map(({ icon: Icon, label, onClick }) => (
        <button
          key={label}
          onClick={onClick}
          disabled={disabled}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-full",
            "text-xs font-medium text-zinc-400",
            "bg-zinc-800/40 border border-zinc-700/40",
            "hover:bg-zinc-700/50 hover:text-zinc-200 hover:border-zinc-600/50",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "transition-all active:scale-95"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
