import { MuscleGroup, MUSCLE_GROUPS } from "@momentum/shared";

// Re-export for convenience
export { MUSCLE_GROUPS };
export type { MuscleGroup };

// Vibrant colors for each muscle group - designed for dark theme
// Includes hover variants to override toggle component hover styles
export const MUSCLE_GROUP_COLORS: Record<MuscleGroup, { bg: string; text: string; border: string; hoverBg: string; hoverText: string }> = {
  pecs: {
    bg: "bg-rose-500/15",
    text: "text-rose-400",
    border: "border-rose-500/30",
    hoverBg: "hover:bg-rose-500/20",
    hoverText: "hover:text-rose-400",
  },
  dos: {
    bg: "bg-sky-500/15",
    text: "text-sky-400",
    border: "border-sky-500/30",
    hoverBg: "hover:bg-sky-500/20",
    hoverText: "hover:text-sky-400",
  },
  epaules: {
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    border: "border-amber-500/30",
    hoverBg: "hover:bg-amber-500/20",
    hoverText: "hover:text-amber-400",
  },
  biceps: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    hoverBg: "hover:bg-emerald-500/20",
    hoverText: "hover:text-emerald-400",
  },
  triceps: {
    bg: "bg-violet-500/15",
    text: "text-violet-400",
    border: "border-violet-500/30",
    hoverBg: "hover:bg-violet-500/20",
    hoverText: "hover:text-violet-400",
  },
  quadriceps: {
    bg: "bg-orange-500/15",
    text: "text-orange-400",
    border: "border-orange-500/30",
    hoverBg: "hover:bg-orange-500/20",
    hoverText: "hover:text-orange-400",
  },
  ischios: {
    bg: "bg-pink-500/15",
    text: "text-pink-400",
    border: "border-pink-500/30",
    hoverBg: "hover:bg-pink-500/20",
    hoverText: "hover:text-pink-400",
  },
  fessiers: {
    bg: "bg-indigo-500/15",
    text: "text-indigo-400",
    border: "border-indigo-500/30",
    hoverBg: "hover:bg-indigo-500/20",
    hoverText: "hover:text-indigo-400",
  },
  abdos: {
    bg: "bg-cyan-500/15",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
    hoverBg: "hover:bg-cyan-500/20",
    hoverText: "hover:text-cyan-400",
  },
  mollets: {
    bg: "bg-teal-500/15",
    text: "text-teal-400",
    border: "border-teal-500/30",
    hoverBg: "hover:bg-teal-500/20",
    hoverText: "hover:text-teal-400",
  },
  trapezes: {
    bg: "bg-lime-500/15",
    text: "text-lime-400",
    border: "border-lime-500/30",
    hoverBg: "hover:bg-lime-500/20",
    hoverText: "hover:text-lime-400",
  },
  lombaires: {
    bg: "bg-yellow-500/15",
    text: "text-yellow-400",
    border: "border-yellow-500/30",
    hoverBg: "hover:bg-yellow-500/20",
    hoverText: "hover:text-yellow-400",
  },
};

// French labels for muscle groups
export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  pecs: "Pectoraux",
  dos: "Dos",
  epaules: "Épaules",
  biceps: "Biceps",
  triceps: "Triceps",
  quadriceps: "Quadriceps",
  ischios: "Ischios",
  fessiers: "Fessiers",
  abdos: "Abdos",
  mollets: "Mollets",
  trapezes: "Trapèzes",
  lombaires: "Lombaires",
};

export function getMuscleGroupLabel(group: MuscleGroup): string {
  return MUSCLE_GROUP_LABELS[group] || group;
}

export function getMuscleGroupColors(group: MuscleGroup) {
  return MUSCLE_GROUP_COLORS[group] || {
    bg: "bg-zinc-500/15",
    text: "text-zinc-400",
    border: "border-zinc-500/30",
  };
}
