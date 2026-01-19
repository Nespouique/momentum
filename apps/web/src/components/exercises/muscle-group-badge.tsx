"use client";

import { cn } from "@/lib/utils";
import { MuscleGroup, getMuscleGroupColors, getMuscleGroupLabel } from "@/lib/constants/muscle-groups";

interface MuscleGroupBadgeProps {
  group: MuscleGroup;
  size?: "sm" | "md";
  className?: string;
}

export function MuscleGroupBadge({ group, size = "sm", className }: MuscleGroupBadgeProps) {
  const colors = getMuscleGroupColors(group);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-medium transition-colors",
        colors.bg,
        colors.text,
        colors.border,
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-2.5 py-1 text-sm",
        className
      )}
    >
      {getMuscleGroupLabel(group)}
    </span>
  );
}
