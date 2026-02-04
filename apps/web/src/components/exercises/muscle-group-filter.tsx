"use client";

import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  MuscleGroup,
  MUSCLE_GROUPS,
  getMuscleGroupColors,
  getMuscleGroupLabel,
} from "@/lib/constants/muscle-groups";

interface MuscleGroupFilterProps {
  selected: MuscleGroup[];
  onChange: (groups: MuscleGroup[]) => void;
  /** If provided, only show these muscle groups instead of all */
  availableGroups?: Set<string>;
}

export function MuscleGroupFilter({ selected, onChange, availableGroups }: MuscleGroupFilterProps) {
  const groups = availableGroups
    ? MUSCLE_GROUPS.filter((g) => availableGroups.has(g))
    : MUSCLE_GROUPS;

  return (
    <div className="overflow-x-auto scrollbar-hide md:overflow-visible">
      <ToggleGroup
        type="multiple"
        value={selected}
        onValueChange={(value) => onChange(value as MuscleGroup[])}
        className="flex gap-2 pb-2 md:flex-wrap md:justify-center w-max md:w-auto"
      >
        {groups.map((group) => {
          const isSelected = selected.includes(group);
          const colors = getMuscleGroupColors(group);

          return (
            <ToggleGroupItem
              key={group}
              value={group}
              variant="outline"
              size="sm"
              className={cn(
                "shrink-0 px-3",
                isSelected
                  ? cn(colors.bg, colors.text, colors.border, colors.hoverBg, colors.hoverText)
                  : "hover:bg-transparent hover:text-foreground"
              )}
            >
              {getMuscleGroupLabel(group)}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
}
