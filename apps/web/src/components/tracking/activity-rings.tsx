"use client";

import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { Footprints, Timer, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface RingData {
  value: number;
  goal: number;
  percentage: number;
}

interface ActivityRingsProps {
  steps: RingData;
  active: RingData;
  calories: RingData;
}

const chartConfig = {
  steps: {
    label: "Pas",
    color: "#22C55E",
  },
  active: {
    label: "Minutes",
    color: "#3B82F6",
  },
  calories: {
    label: "Calories",
    color: "#EF4444",
  },
} satisfies ChartConfig;

function formatNumber(num: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(num));
}

function RingLegendItem({
  icon: Icon,
  label,
  value,
  goal,
  unit,
  color,
  isOverflow,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  goal: number;
  unit: string;
  color: string;
  isOverflow: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-300",
          isOverflow && "ring-2 ring-offset-2 ring-offset-background"
        )}
        style={{
          backgroundColor: `${color}15`,
          ...(isOverflow && { "--tw-ring-color": color } as React.CSSProperties),
        }}
      >
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-1">
          <span
            className="text-base font-bold tabular-nums tracking-tight"
            style={{ color }}
          >
            {formatNumber(value)}
          </span>
          <span className="text-[11px] text-muted-foreground font-medium">
            / {formatNumber(goal)} {unit}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground/70 font-medium tracking-wide">
          {label}
        </p>
      </div>
    </div>
  );
}

export function ActivityRings({ steps, active, calories }: ActivityRingsProps) {
  const stepsDisplay = Math.min(steps.percentage, 100);
  const activeDisplay = Math.min(active.percentage, 100);
  const caloriesDisplay = Math.min(calories.percentage, 100);

  const isStepsOverflow = steps.percentage > 100;
  const isActiveOverflow = active.percentage > 100;
  const isCaloriesOverflow = calories.percentage > 100;

  const chartData = [
    {
      name: "calories",
      value: caloriesDisplay,
      fill: "var(--color-calories)",
    },
    {
      name: "active",
      value: activeDisplay,
      fill: "var(--color-active)",
    },
    {
      name: "steps",
      value: stepsDisplay,
      fill: "var(--color-steps)",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Ring Visualization */}
      <div className="relative">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square w-full max-w-[200px]"
        >
          <RadialBarChart
            data={chartData}
            startAngle={90}
            endAngle={-270}
            innerRadius="30%"
            outerRadius="100%"
            barSize={16}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              background={{
                fill: "hsl(var(--muted))",
                opacity: 0.3,
              }}
              dataKey="value"
              cornerRadius={2}
            />
          </RadialBarChart>
        </ChartContainer>

        {/* Overflow glow effects */}
        {isStepsOverflow && (
          <div
            className="absolute inset-0 pointer-events-none opacity-20 blur-xl animate-pulse"
            style={{
              background: `radial-gradient(circle at center, ${chartConfig.steps.color}40, transparent 70%)`,
            }}
          />
        )}
      </div>

      {/* Legend */}
      <div className="space-y-4">
        <div className="flex justify-evenly">
          <RingLegendItem
            icon={Footprints}
            label="Pas"
            value={steps.value}
            goal={steps.goal}
            unit="pas"
            color={chartConfig.steps.color}
            isOverflow={isStepsOverflow}
          />
          <RingLegendItem
            icon={Timer}
            label="Min. d'activité"
            value={active.value}
            goal={active.goal}
            unit="min"
            color={chartConfig.active.color}
            isOverflow={isActiveOverflow}
          />
        </div>
        <div className="flex justify-evenly">
          <RingLegendItem
            icon={Flame}
            label="Calories actives"
            value={calories.value}
            goal={calories.goal}
            unit="kcal"
            color={chartConfig.calories.color}
            isOverflow={isCaloriesOverflow}
          />
        </div>
      </div>
    </div>
  );
}
