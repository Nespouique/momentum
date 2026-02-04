"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { format, subMonths, subYears } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, ChartNoAxesCombined } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useAuthStore } from "@/stores/auth";
import { getMeasurements, type Measurement } from "@/lib/api/measurements";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Measurement definitions with full labels
interface MeasurementDef {
  key: string;
  label: string;
  unit: string;
  bilateral?: boolean;
  fieldKey?: string;
  leftKey?: string;
  rightKey?: string;
}

const MEASUREMENTS: MeasurementDef[] = [
  { key: "forearm", label: "Avant-bras", unit: "cm", bilateral: true, leftKey: "forearmLeft", rightKey: "forearmRight" },
  { key: "biceps", label: "Biceps", unit: "cm", bilateral: true, leftKey: "bicepsLeft", rightKey: "bicepsRight" },
  { key: "ankle", label: "Cheville", unit: "cm", bilateral: true, leftKey: "ankleLeft", rightKey: "ankleRight" },
  { key: "neck", label: "Cou", unit: "cm", fieldKey: "neck" },
  { key: "thigh", label: "Cuisse", unit: "cm", bilateral: true, leftKey: "thighLeft", rightKey: "thighRight" },
  { key: "shoulders", label: "Épaules", unit: "cm", fieldKey: "shoulders" },
  { key: "hips", label: "Hanches", unit: "cm", fieldKey: "hips" },
  { key: "calf", label: "Mollet", unit: "cm", bilateral: true, leftKey: "calfLeft", rightKey: "calfRight" },
  { key: "weight", label: "Poids", unit: "kg", fieldKey: "weight" },
  { key: "wrist", label: "Poignet", unit: "cm", bilateral: true, leftKey: "wristLeft", rightKey: "wristRight" },
  { key: "chest", label: "Poitrine", unit: "cm", fieldKey: "chest" },
  { key: "waist", label: "Taille", unit: "cm", fieldKey: "waist" },
];

// Period definitions
interface Period {
  key: string;
  label: string;
  getStartDate: () => Date;
}

const PERIODS: Period[] = [
  { key: "1m", label: "1m", getStartDate: () => subMonths(new Date(), 1) },
  { key: "3m", label: "3m", getStartDate: () => subMonths(new Date(), 3) },
  { key: "6m", label: "6m", getStartDate: () => subMonths(new Date(), 6) },
  { key: "1y", label: "1an", getStartDate: () => subYears(new Date(), 1) },
  { key: "all", label: "Tout", getStartDate: () => new Date(0) },
];

// Chart configuration
const chartConfigSingle: ChartConfig = {
  value: {
    label: "Valeur",
    color: "var(--accent-orange)",
  },
};

const chartConfigBilateral: ChartConfig = {
  left: {
    label: "Gauche",
    color: "var(--accent-orange)",
  },
  right: {
    label: "Droite",
    color: "hsl(217 91% 60%)",
  },
};

// Chart data point interface
interface ChartDataPoint {
  date: string;
  displayDate: string;
  value?: number | null;
  left?: number | null;
  right?: number | null;
}

// Calculate nice Y-axis ticks (whole numbers or 0.5 increments)
function calculateNiceTicks(min: number, max: number): number[] {
  const range = max - min;

  // Determine step: use 1 for large ranges, 0.5 for smaller ranges
  let step = 1;
  if (range <= 3) {
    step = 0.5;
  } else if (range <= 10) {
    step = 1;
  } else if (range <= 25) {
    step = 2;
  } else if (range <= 50) {
    step = 5;
  } else {
    step = 10;
  }

  // Round min down and max up to nearest step
  const tickMin = Math.floor(min / step) * step;
  const tickMax = Math.ceil(max / step) * step;

  const ticks: number[] = [];
  for (let tick = tickMin; tick <= tickMax; tick += step) {
    ticks.push(Math.round(tick * 10) / 10); // Avoid floating point issues
  }

  return ticks;
}

// Trend Card Component - Refined minimal design
function TrendCard({
  label,
  firstValue,
  lastValue,
  change,
  changePercent,
  unit,
  color,
}: {
  label?: string;
  firstValue: number | null;
  lastValue: number | null;
  change: number;
  changePercent: number;
  unit: string;
  color?: "orange" | "blue";
}) {
  const dotColor = color === "blue" ? "bg-[hsl(217_91%_60%)]" : "bg-[var(--accent-orange)]";
  const changeColor = change > 0
    ? "text-emerald-400"
    : change < 0
    ? "text-red-400"
    : "text-muted-foreground";

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-4">
      {label && (
        <div className="flex items-center gap-2 mb-3">
          <div className={cn("w-2.5 h-2.5 rounded-full", dotColor)} />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {firstValue?.toFixed(1) ?? "—"}
          <span className="mx-2 opacity-40">→</span>
          <span className="font-semibold text-foreground text-base">{lastValue?.toFixed(1) ?? "—"}</span>
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
            {change > 0 ? "+" : ""}{change.toFixed(1)}
          </span>
          <span className="text-xs opacity-70 tabular-nums">
            ({change > 0 ? "+" : ""}{changePercent.toFixed(1)}%)
          </span>
        </div>
      </div>
    </div>
  );
}

export default function MeasurementsGraphsPage() {
  const { token } = useAuthStore();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMeasurement, setSelectedMeasurement] = useState("weight");
  const [selectedPeriod, setSelectedPeriod] = useState("all");

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getMeasurements(token);
      setMeasurements(data.data);
    } catch (error) {
      console.error("Failed to load measurements:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get the selected measurement definition
  const measurementDef = useMemo(
    () => MEASUREMENTS.find((m) => m.key === selectedMeasurement),
    [selectedMeasurement]
  );

  // Filter and transform data for the chart
  const chartData = useMemo(() => {
    if (!measurementDef) return [];

    const period = PERIODS.find((p) => p.key === selectedPeriod);
    const startDate = period?.getStartDate() ?? new Date(0);

    const filtered = measurements
      .filter((m) => new Date(m.date) >= startDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return filtered.map((m): ChartDataPoint => {
      const date = new Date(m.date);
      if (measurementDef.bilateral) {
        return {
          date: m.date,
          displayDate: format(date, "d MMM", { locale: fr }),
          left: m[measurementDef.leftKey as keyof Measurement] as number | null,
          right: m[measurementDef.rightKey as keyof Measurement] as number | null,
        };
      } else {
        return {
          date: m.date,
          displayDate: format(date, "d MMM", { locale: fr }),
          value: m[measurementDef.fieldKey as keyof Measurement] as number | null,
        };
      }
    });
  }, [measurements, measurementDef, selectedPeriod]);

  // Filter out data points without values
  const validChartData = useMemo(() => {
    if (measurementDef?.bilateral) {
      return chartData.filter((d) => d.left !== null || d.right !== null);
    }
    return chartData.filter((d) => d.value !== null);
  }, [chartData, measurementDef]);

  // Calculate trends for bilateral (separate left/right)
  const trends = useMemo(() => {
    if (validChartData.length < 2 || !measurementDef) return null;

    const first = validChartData[0];
    const last = validChartData[validChartData.length - 1];

    if (!first || !last) return null;

    if (measurementDef.bilateral) {
      const leftFirst = first.left ?? 0;
      const leftLast = last.left ?? 0;
      const leftChange = leftLast - leftFirst;
      const leftChangePercent = leftFirst !== 0 ? (leftChange / leftFirst) * 100 : 0;

      const rightFirst = first.right ?? 0;
      const rightLast = last.right ?? 0;
      const rightChange = rightLast - rightFirst;
      const rightChangePercent = rightFirst !== 0 ? (rightChange / rightFirst) * 100 : 0;

      return {
        bilateral: true as const,
        left: {
          firstValue: first.left ?? null,
          lastValue: last.left ?? null,
          change: leftChange,
          changePercent: leftChangePercent,
        },
        right: {
          firstValue: first.right ?? null,
          lastValue: last.right ?? null,
          change: rightChange,
          changePercent: rightChangePercent,
        },
        unit: measurementDef.unit,
      };
    } else {
      const firstValue = first.value ?? 0;
      const lastValue = last.value ?? 0;
      const change = lastValue - firstValue;
      const changePercent = firstValue !== 0 ? (change / firstValue) * 100 : 0;

      return {
        bilateral: false as const,
        single: {
          firstValue: first.value ?? null,
          lastValue: last.value ?? null,
          change,
          changePercent,
        },
        unit: measurementDef.unit,
      };
    }
  }, [validChartData, measurementDef]);

  // Calculate Y-axis domain and ticks with nice increments
  const { yAxisDomain, yAxisTicks } = useMemo(() => {
    if (validChartData.length === 0) {
      return { yAxisDomain: [0, 100] as [number, number], yAxisTicks: [0, 25, 50, 75, 100] };
    }

    let allValues: number[] = [];
    if (measurementDef?.bilateral) {
      validChartData.forEach((d) => {
        if (d.left !== null && d.left !== undefined) allValues.push(d.left);
        if (d.right !== null && d.right !== undefined) allValues.push(d.right);
      });
    } else {
      allValues = validChartData
        .map((d) => d.value)
        .filter((v): v is number => v !== null && v !== undefined);
    }

    if (allValues.length === 0) {
      return { yAxisDomain: [0, 100] as [number, number], yAxisTicks: [0, 25, 50, 75, 100] };
    }

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.1 || 1;

    const ticks = calculateNiceTicks(min - padding, max + padding);

    if (ticks.length === 0) {
      return { yAxisDomain: [0, 100] as [number, number], yAxisTicks: [0, 25, 50, 75, 100] };
    }

    const domain: [number, number] = [ticks[0]!, ticks[ticks.length - 1]!];

    return { yAxisDomain: domain, yAxisTicks: ticks };
  }, [validChartData, measurementDef]);

  const selectedLabel = measurementDef?.label ?? "Mesure";

  if (isLoading) {
    return (
      <div className="pb-8">
        <PageHeader title="Évolution" showBack />
        <div className="space-y-4">
          <div className="h-10 animate-pulse rounded-lg bg-secondary/50" />
          <div className="h-64 animate-pulse rounded-xl bg-secondary/50" />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <PageHeader title="Évolution" showBack />

      {/* Measurement Toggle Grid - Full width justified layout */}
      <div className="mb-6">
        <div className="grid grid-cols-3 gap-2">
          {MEASUREMENTS.map((m) => (
            <Button
              key={m.key}
              variant={selectedMeasurement === m.key ? "default" : "outline-solid"}
              size="sm"
              className={cn(
                "h-10 text-sm font-medium transition-all justify-center",
                selectedMeasurement === m.key && "shadow-md"
              )}
              onClick={() => setSelectedMeasurement(m.key)}
            >
              {m.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Chart or Empty State */}
      {validChartData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-border/40 bg-card">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-[var(--accent-orange)]/20 to-transparent border border-[var(--accent-orange)]/20">
            <ChartNoAxesCombined className="h-8 w-8 text-[var(--accent-orange)]" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">Aucune donnée</h3>
          <p className="max-w-xs text-sm text-muted-foreground">
            Aucune mesure de {selectedLabel.toLowerCase()} enregistrée
            {selectedPeriod !== "all" && " pour cette période"}.
          </p>
        </div>
      ) : (
        <>
          {/* Chart Card */}
          <div className="rounded-xl border border-border/40 bg-card p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                {selectedLabel}
              </h3>
              <span className="text-xs text-muted-foreground">
                {measurementDef?.unit}
              </span>
            </div>

            <ChartContainer
              config={measurementDef?.bilateral ? chartConfigBilateral : chartConfigSingle}
              className="h-[220px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={validChartData}
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
                        labelFormatter={(_, payload) => {
                          if (payload?.[0]?.payload?.date) {
                            return format(new Date(payload[0].payload.date), "d MMMM yyyy", {
                              locale: fr,
                            });
                          }
                          return "";
                        }}
                      />
                    }
                  />

                  {measurementDef?.bilateral ? (
                    <>
                      <Line
                        type="monotone"
                        dataKey="left"
                        name="Gauche"
                        stroke="var(--color-left)"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: "var(--color-left)", strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: "var(--color-left)", strokeWidth: 2, stroke: "var(--background)" }}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="right"
                        name="Droite"
                        stroke="var(--color-right)"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: "var(--color-right)", strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: "var(--color-right)", strokeWidth: 2, stroke: "var(--background)" }}
                        connectNulls
                      />
                    </>
                  ) : (
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="Valeur"
                      stroke="var(--color-value)"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "var(--color-value)", strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: "var(--color-value)", strokeWidth: 2, stroke: "var(--background)" }}
                      connectNulls
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>

            {/* Legend for bilateral */}
            {measurementDef?.bilateral && (
              <div className="flex justify-center gap-6 mt-3 pt-3 border-t border-border/30">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent-orange)]" />
                  <span className="text-xs text-muted-foreground">Gauche</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[hsl(217_91%_60%)]" />
                  <span className="text-xs text-muted-foreground">Droite</span>
                </div>
              </div>
            )}

            {/* Period Filter - Below chart */}
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

          {/* Trend Cards */}
          {trends && validChartData.length > 1 && (
            <div className="space-y-3">
              {trends.bilateral ? (
                <>
                  <TrendCard
                    label="Gauche"
                    firstValue={trends.left.firstValue}
                    lastValue={trends.left.lastValue}
                    change={trends.left.change}
                    changePercent={trends.left.changePercent}
                    unit={trends.unit}
                    color="orange"
                  />
                  <TrendCard
                    label="Droite"
                    firstValue={trends.right.firstValue}
                    lastValue={trends.right.lastValue}
                    change={trends.right.change}
                    changePercent={trends.right.changePercent}
                    unit={trends.unit}
                    color="blue"
                  />
                </>
              ) : (
                <TrendCard
                  firstValue={trends.single.firstValue}
                  lastValue={trends.single.lastValue}
                  change={trends.single.change}
                  changePercent={trends.single.changePercent}
                  unit={trends.unit}
                  color="orange"
                />
              )}
            </div>
          )}

          {/* Single data point message */}
          {validChartData.length === 1 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              <p>Une seule mesure enregistrée.</p>
              <p className="text-xs mt-1">Ajoutez plus de mesures pour voir l'évolution.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
