"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { format, subMonths, subYears, differenceInMonths } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChartNoAxesCombined,
  Calendar,
  Dumbbell,
} from "lucide-react";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useAuthStore } from "@/stores/auth";
import {
  getExercises,
  getExerciseStats,
  type Exercise,
  type PracticedExercise,
  type ExerciseSessionData,
} from "@/lib/api/exercises";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

// Types
type MetricType = "e1rm" | "volume";

interface Period {
  key: string;
  label: string;
  getStartDate: () => Date;
}

interface ChartDataPoint {
  date: string;
  displayDate: string;
  value: number;
}

// Constants
const PERIODS: Period[] = [
  { key: "1m", label: "1m", getStartDate: () => subMonths(new Date(), 1) },
  { key: "3m", label: "3m", getStartDate: () => subMonths(new Date(), 3) },
  { key: "6m", label: "6m", getStartDate: () => subMonths(new Date(), 6) },
  { key: "1y", label: "1an", getStartDate: () => subYears(new Date(), 1) },
  { key: "all", label: "Tout", getStartDate: () => new Date(0) },
];

const chartConfig: ChartConfig = {
  value: {
    label: "Valeur",
    color: "var(--accent-orange)",
  },
};

// Calculate nice Y-axis ticks
function calculateNiceTicks(min: number, max: number): number[] {
  const range = max - min;

  let step = 1;
  if (range <= 3) {
    step = 0.5;
  } else if (range <= 10) {
    step = 1;
  } else if (range <= 25) {
    step = 2;
  } else if (range <= 50) {
    step = 5;
  } else if (range <= 200) {
    step = 10;
  } else if (range <= 500) {
    step = 50;
  } else {
    step = 100;
  }

  const tickMin = Math.floor(min / step) * step;
  const tickMax = Math.ceil(max / step) * step;

  const ticks: number[] = [];
  for (let tick = tickMin; tick <= tickMax; tick += step) {
    ticks.push(Math.round(tick * 10) / 10);
  }

  return ticks;
}

// Trend Card Component (same as measurements)
function TrendCard({
  firstValue,
  lastValue,
  change,
  changePercent,
  unit,
}: {
  firstValue: number | null;
  lastValue: number | null;
  change: number;
  changePercent: number;
  unit: string;
}) {
  const changeColor =
    change > 0
      ? "text-emerald-400"
      : change < 0
        ? "text-red-400"
        : "text-muted-foreground";

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {firstValue?.toFixed(1) ?? "—"}
          <span className="mx-2 opacity-40">→</span>
          <span className="font-semibold text-foreground text-base">
            {lastValue?.toFixed(1) ?? "—"}
          </span>
          <span className="ml-1 text-xs opacity-60">{unit}</span>
        </p>

        <div className={cn("flex items-center gap-1.5 text-sm font-medium", changeColor)}>
          {change > 0 ? (
            <TrendingUp className="h-4 w-4" />
          ) : change < 0 ? (
            <TrendingDown className="h-4 w-4" />
          ) : (
            <Minus className="h-4 w-4" />
          )}
          <span className="tabular-nums">
            {change > 0 ? "+" : ""}
            {change.toFixed(1)}
          </span>
          <span className="text-xs opacity-70 tabular-nums">
            ({change > 0 ? "+" : ""}
            {changePercent.toFixed(1)}%)
          </span>
        </div>
      </div>
    </div>
  );
}

// Exercise Info Summary Card (AC8)
function ExerciseInfoCard({
  sessions,
  periodStartDate,
}: {
  sessions: ExerciseSessionData[];
  periodStartDate: Date;
}) {
  if (sessions.length === 0) return null;

  // Frequency
  const count = sessions.length;
  const now = new Date();
  const effectiveStart =
    periodStartDate.getTime() === 0
      ? new Date(sessions[0]!.completedAt)
      : periodStartDate;
  const months = Math.max(differenceInMonths(now, effectiveStart), 1);
  const freqPerMonth = count / months;

  const frequencyText =
    count === 1
      ? "1 fois"
      : `${count} fois (${freqPerMonth.toFixed(1)}x/mois)`;

  // Max weight on period
  let maxWeight = 0;
  let repsAtMax = 0;
  let maxWeightDate = "";

  for (const s of sessions) {
    if (s.maxWeight > maxWeight) {
      maxWeight = s.maxWeight;
      repsAtMax = s.repsAtMaxWeight;
      maxWeightDate = s.completedAt;
    }
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4 shrink-0" />
        <span>{frequencyText}</span>
      </div>
      {maxWeight > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Dumbbell className="h-4 w-4 shrink-0" />
          <span>
            Poids max : {maxWeight}kg (sur {repsAtMax} reps le{" "}
            {format(new Date(maxWeightDate), "dd/MM/yyyy")})
          </span>
        </div>
      )}
    </div>
  );
}

export default function ExerciseStatsPage() {
  const { token } = useAuthStore();
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [exercises, setExercises] = useState<PracticedExercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("e1rm");
  const [selectedPeriod, setSelectedPeriod] = useState("all");

  // Sorted exercise names for combobox
  const sortedExerciseNames = useMemo(
    () =>
      [...allExercises]
        .sort((a, b) => a.name.localeCompare(b.name, "fr"))
        .map((e) => e.name),
    [allExercises]
  );

  // Selected exercise name for combobox value
  const selectedExerciseName = useMemo(
    () => allExercises.find((e) => e.id === selectedExerciseId)?.name ?? null,
    [allExercises, selectedExerciseId]
  );

  // Load data
  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [statsData, exercisesData] = await Promise.all([
        getExerciseStats(token),
        getExercises(token),
      ]);
      setExercises(statsData.data);
      setAllExercises(exercisesData.data);
    } catch (error) {
      console.error("Failed to load exercise stats:", error);
      toast.error("Erreur lors du chargement des statistiques");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Selected exercise data
  const selectedExercise = useMemo(
    () => exercises.find((ex) => ex.exerciseId === selectedExerciseId),
    [exercises, selectedExerciseId]
  );

  // Period start date
  const periodStartDate = useMemo(() => {
    const period = PERIODS.find((p) => p.key === selectedPeriod);
    return period?.getStartDate() ?? new Date(0);
  }, [selectedPeriod]);

  // Filter sessions by period
  const filteredSessions = useMemo(() => {
    if (!selectedExercise) return [];
    return selectedExercise.sessions.filter(
      (s) => new Date(s.completedAt) >= periodStartDate
    );
  }, [selectedExercise, periodStartDate]);

  // Chart data
  const chartData = useMemo(() => {
    return filteredSessions.map(
      (s): ChartDataPoint => ({
        date: s.completedAt,
        displayDate: format(new Date(s.completedAt), "d MMM", { locale: fr }),
        value: selectedMetric === "e1rm" ? s.bestE1RM : s.totalVolume,
      })
    );
  }, [filteredSessions, selectedMetric]);

  // Trends
  const trends = useMemo(() => {
    if (chartData.length < 2) return null;

    const first = chartData[0]!;
    const last = chartData[chartData.length - 1]!;
    const change = last.value - first.value;
    const changePercent = first.value !== 0 ? (change / first.value) * 100 : 0;

    return { firstValue: first.value, lastValue: last.value, change, changePercent };
  }, [chartData]);

  // Y-axis domain
  const { yAxisDomain, yAxisTicks } = useMemo(() => {
    if (chartData.length === 0) {
      return {
        yAxisDomain: [0, 100] as [number, number],
        yAxisTicks: [0, 25, 50, 75, 100],
      };
    }

    const values = chartData.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1 || 1;

    const ticks = calculateNiceTicks(min - padding, max + padding);

    if (ticks.length === 0) {
      return {
        yAxisDomain: [0, 100] as [number, number],
        yAxisTicks: [0, 25, 50, 75, 100],
      };
    }

    const domain: [number, number] = [ticks[0]!, ticks[ticks.length - 1]!];
    return { yAxisDomain: domain, yAxisTicks: ticks };
  }, [chartData]);

  const metricUnit = "kg";
  const metricLabel = selectedMetric === "e1rm" ? "Force estimée (E1RM)" : "Volume total";

  // Loading
  if (isLoading) {
    return (
      <div className="pb-8">
        <PageHeader title="Évolution" showBack />
        <div className="space-y-4">
          <div className="h-9 animate-pulse rounded-md bg-secondary/50" />
          <div className="h-64 animate-pulse rounded-xl bg-secondary/50" />
        </div>
      </div>
    );
  }

  // No exercises at all
  if (allExercises.length === 0) {
    return (
      <div className="pb-8">
        <PageHeader title="Évolution" showBack />
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-[var(--accent-orange)]/20 to-transparent border border-[var(--accent-orange)]/20">
            <ChartNoAxesCombined className="h-8 w-8 text-[var(--accent-orange)]" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">Aucune donnée</h3>
          <p className="max-w-xs text-sm text-muted-foreground">
            Complétez des séances pour voir vos statistiques d&apos;exercices.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <PageHeader title="Évolution" showBack />

      {/* Exercise selector */}
      <div className="mb-6">
        <Combobox
          value={selectedExerciseName}
          onValueChange={(name) => {
            const ex = allExercises.find((e) => e.name === name);
            setSelectedExerciseId(ex?.id ?? null);
          }}
          items={sortedExerciseNames}
        >
          <ComboboxInput
            placeholder="Choisir un exercice..."
            showClear
            className="w-full"
          />
          <ComboboxContent>
            <ComboboxEmpty>Aucun exercice trouvé.</ComboboxEmpty>
            <ComboboxList>
              {(item: string) => (
                <ComboboxItem key={item} value={item}>
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>

      {/* Prompt when no exercise selected */}
      {!selectedExerciseId && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h3 className="mb-2 text-lg font-semibold">Choisissez un exercice</h3>
          <p className="max-w-xs text-sm text-muted-foreground">
            Sélectionnez un exercice ci-dessus pour voir son évolution.
          </p>
        </div>
      )}

      {/* Metric toggle (AC4) */}
      {selectedExercise && (
        <div className="flex gap-2 mb-4">
          <Button
            variant={selectedMetric === "e1rm" ? "secondary" : "ghost"}
            size="sm"
            className="flex-1"
            onClick={() => setSelectedMetric("e1rm")}
          >
            Force (E1RM)
          </Button>
          <Button
            variant={selectedMetric === "volume" ? "secondary" : "ghost"}
            size="sm"
            className="flex-1"
            onClick={() => setSelectedMetric("volume")}
          >
            Volume
          </Button>
        </div>
      )}

      {/* Chart or empty state (AC5) */}
      {selectedExercise && chartData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-border/40 bg-card">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-[var(--accent-orange)]/20 to-transparent border border-[var(--accent-orange)]/20">
            <ChartNoAxesCombined className="h-8 w-8 text-[var(--accent-orange)]" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">Aucune donnée sur cette période</h3>
          <p className="max-w-xs text-sm text-muted-foreground">
            Aucune séance avec {selectedExercise.exerciseName}
            {selectedPeriod !== "all" && " sur cette période"}.
          </p>
        </div>
      ) : selectedExerciseId && !selectedExercise ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-border/40 bg-card">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-[var(--accent-orange)]/20 to-transparent border border-[var(--accent-orange)]/20">
            <ChartNoAxesCombined className="h-8 w-8 text-[var(--accent-orange)]" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">Aucune donnée</h3>
          <p className="max-w-xs text-sm text-muted-foreground">
            Aucune séance enregistrée avec {selectedExerciseName}.
          </p>
        </div>
      ) : selectedExercise && chartData.length > 0 ? (
        <>
          {/* Chart Card */}
          <div className="rounded-xl border border-border/40 bg-card p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                {selectedExercise.exerciseName}
              </h3>
              <span className="text-xs text-muted-foreground">{metricUnit}</span>
            </div>

            <ChartContainer config={chartConfig} className="h-[220px] w-full">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--border)"
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="displayDate"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickMargin={8}
                  />
                  <YAxis
                    domain={yAxisDomain}
                    ticks={yAxisTicks}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickMargin={4}
                    width={50}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(_label, payload) => {
                          if (payload?.[0]?.payload?.date) {
                            return format(
                              new Date(payload[0].payload.date as string),
                              "d MMMM yyyy",
                              { locale: fr }
                            );
                          }
                          return "";
                        }}
                        formatter={(value) => [
                          `${Number(value).toFixed(1)} ${metricUnit}`,
                          metricLabel,
                        ]}
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={metricLabel}
                    stroke="var(--color-value)"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "var(--color-value)", strokeWidth: 0 }}
                    activeDot={{
                      r: 6,
                      fill: "var(--color-value)",
                      strokeWidth: 2,
                      stroke: "var(--background)",
                    }}
                    connectNulls
                  />
                </LineChart>
            </ChartContainer>

            {/* Period selector (AC6) */}
            <div className="flex justify-center gap-2 mt-4 pt-4 border-t border-border/30">
              {PERIODS.map((period) => (
                <Button
                  key={period.key}
                  variant={selectedPeriod === period.key ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "min-w-12 h-8 text-xs",
                    selectedPeriod === period.key && "bg-secondary"
                  )}
                  onClick={() => setSelectedPeriod(period.key)}
                >
                  {period.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Trend Card (AC7) */}
          {trends && chartData.length > 1 && (
            <div className="mb-4">
              <TrendCard
                firstValue={trends.firstValue}
                lastValue={trends.lastValue}
                change={trends.change}
                changePercent={trends.changePercent}
                unit={metricUnit}
              />
            </div>
          )}

          {/* Single data point message */}
          {chartData.length === 1 && (
            <div className="text-center py-4 text-sm text-muted-foreground mb-4">
              <p>Une seule séance enregistrée.</p>
              <p className="text-xs mt-1">
                Ajoutez plus de séances pour voir l&apos;évolution.
              </p>
            </div>
          )}

          {/* Exercise info summary (AC8) */}
          <ExerciseInfoCard
            sessions={filteredSessions}
            periodStartDate={periodStartDate}
          />
        </>
      ) : null}
    </div>
  );
}
