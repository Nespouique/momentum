"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  Scale,
  Activity,
  User,
  History,
  ChartLine,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuthStore } from "@/stores/auth";
import { getProfile, type UserProfile } from "@/lib/api/profile";
import {
  getMeasurements,
  deleteMeasurement,
  type Measurement,
} from "@/lib/api/measurements";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Helper functions
function calculateAge(birthDate: string | null, atDate?: string): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const referenceDate = atDate ? new Date(atDate) : new Date();
  let age = referenceDate.getFullYear() - birth.getFullYear();
  const monthDiff = referenceDate.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function calculateBMI(weight: number | null, heightCm: number | null): number | null {
  if (!weight || !heightCm) return null;
  const heightM = heightCm / 100;
  return weight / (heightM * heightM);
}

function getBMICategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: "Insuffisant", color: "text-blue-400" };
  if (bmi < 25) return { label: "Normal", color: "text-emerald-400" };
  if (bmi < 30) return { label: "Surpoids", color: "text-amber-400" };
  return { label: "Obésité", color: "text-red-400" };
}

function formatDate(dateStr: string): string {
  return format(new Date(dateStr), "d MMM yyyy", { locale: fr });
}

function formatDateShort(dateStr: string): string {
  return format(new Date(dateStr), "d MMM", { locale: fr }).replace(".", "");
}

function getYear(dateStr: string): string {
  return format(new Date(dateStr), "yyyy");
}

// Stat Card Component
function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  subtitle,
  accentColor = "orange",
  gap = 1,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number | null;
  unit?: string;
  subtitle?: string;
  accentColor?: "orange" | "emerald" | "blue" | "zinc";
  gap?: 1 | 2;
}) {
  const colorClasses = {
    orange: "from-[hsl(var(--accent-orange))]/20 to-transparent text-[hsl(var(--accent-orange))]",
    emerald: "from-emerald-500/20 to-transparent text-emerald-400",
    blue: "from-blue-500/20 to-transparent text-blue-400",
    zinc: "from-zinc-500/20 to-transparent text-zinc-400",
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/40 bg-card p-4">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", colorClasses[accentColor].split(" ")[0])} />
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={cn("h-4 w-4", colorClasses[accentColor].split(" ").slice(-1)[0])} />
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
        <div className={cn("flex items-baseline", gap === 1 ? "gap-1" : "gap-2")}>
          <span className="text-2xl font-bold tabular-nums tracking-tight">
            {value ?? "—"}
          </span>
          {unit && value !== null && (
            <span className="text-sm text-muted-foreground">{unit}</span>
          )}
        </div>
        {subtitle && (
          <p className={cn("text-xs mt-1", subtitle.includes("Normal") ? "text-emerald-400" : "text-muted-foreground")}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

// Evolution Indicator
function Evolution({ current, previous, inverse = false }: { current: number | null; previous: number | null; inverse?: boolean }) {
  if (current === null || previous === null) return null;

  const diff = current - previous;
  if (diff === 0) return null;

  const isPositive = inverse ? diff < 0 : diff > 0;
  const Icon = diff > 0 ? TrendingUp : TrendingDown;

  return (
    <div className={cn(
      "flex items-center gap-0.5 text-xs font-medium",
      isPositive ? "text-emerald-400" : "text-red-400"
    )}>
      <Icon className="h-3 w-3" />
      <span>{diff > 0 ? "+" : ""}{diff.toFixed(1)}</span>
    </div>
  );
}

// Measurement Row
function MeasurementRow({
  label,
  value,
  previousValue,
  unit = "cm",
  inverse = false,
}: {
  label: string;
  value: number | null;
  previousValue: number | null;
  unit?: string;
  inverse?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <Evolution current={value} previous={previousValue} inverse={inverse} />
        <div className="flex items-baseline gap-1 min-w-[60px] justify-end">
          <span className={cn(
            "text-sm font-semibold tabular-nums",
            value === null ? "text-muted-foreground/50" : "text-foreground"
          )}>
            {value?.toFixed(1) ?? "—"}
          </span>
          {value !== null && (
            <span className="text-[10px] text-muted-foreground">{unit}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// Bilateral Measurement Row (main label + indented left/right sub-rows)
function BilateralRow({
  label,
  leftValue,
  rightValue,
  prevLeftValue,
  prevRightValue,
  unit = "cm",
}: {
  label: string;
  leftValue: number | null;
  rightValue: number | null;
  prevLeftValue: number | null;
  prevRightValue: number | null;
  unit?: string;
}) {
  return (
    <div className="py-3 border-b border-border/30 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="mt-1.5 pl-4 space-y-1">
        {/* Gauche */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground/60">Gauche</span>
          <div className="flex items-center gap-3">
            <Evolution current={leftValue} previous={prevLeftValue} />
            <div className="flex items-baseline gap-1 min-w-[60px] justify-end">
              <span className={cn(
                "text-sm font-semibold tabular-nums",
                leftValue === null ? "text-muted-foreground/50" : "text-foreground"
              )}>
                {leftValue?.toFixed(1) ?? "—"}
              </span>
              {leftValue !== null && (
                <span className="text-[10px] text-muted-foreground">{unit}</span>
              )}
            </div>
          </div>
        </div>
        {/* Droite */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground/60">Droite</span>
          <div className="flex items-center gap-3">
            <Evolution current={rightValue} previous={prevRightValue} />
            <div className="flex items-baseline gap-1 min-w-[60px] justify-end">
              <span className={cn(
                "text-sm font-semibold tabular-nums",
                rightValue === null ? "text-muted-foreground/50" : "text-foreground"
              )}>
                {rightValue?.toFixed(1) ?? "—"}
              </span>
              {rightValue !== null && (
                <span className="text-[10px] text-muted-foreground">{unit}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Section Header
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 pt-4 pb-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-primary">
        {title}
      </h3>
      <div className="flex-1 h-px bg-gradient-to-r from-primary/30 to-transparent" />
    </div>
  );
}

// Empty State
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h3 className="mb-2 text-lg font-semibold">Aucune mesure</h3>
      <p className="mb-6 max-w-xs text-sm text-muted-foreground">
        Commencez à suivre vos mensurations pour visualiser votre progression.
      </p>
      <Button onClick={onAdd} className="gap-2">
        <Plus className="h-4 w-4" />
        Ajouter une mesure
      </Button>
    </div>
  );
}

export default function MeasurementsPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [disableHover, setDisableHover] = useState(false);

  // Disable hover temporarily when drawer closes
  useEffect(() => {
    if (showHistory) {
      setDisableHover(true);
    } else {
      // Keep hover disabled briefly after drawer closes
      const timeout = setTimeout(() => {
        setDisableHover(false);
      }, 400);
      return () => clearTimeout(timeout);
    }
  }, [showHistory]);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [profileData, measurementsData] = await Promise.all([
        getProfile(token),
        getMeasurements(token),
      ]);
      setProfile(profileData);
      setMeasurements(measurementsData.data);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = () => {
    router.push("/profile/measurements/new");
  };

  const handleDelete = async () => {
    if (!deleteId || !token) return;

    setIsDeleting(true);
    try {
      await deleteMeasurement(token, deleteId);
      toast.success("Mesure supprimée");
      setDeleteId(null);
      loadData();
    } catch (error) {
      console.error("Failed to delete measurement:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  const latest = measurements[0] ?? null;
  const previous = measurements[1] ?? null;

  const age = calculateAge(profile?.birthDate ?? null, latest?.date);
  const bmi = calculateBMI(latest?.weight ?? null, profile?.height ?? null);
  const bmiCategory = bmi ? getBMICategory(bmi) : null;

  if (isLoading) {
    return (
      <div className="pb-8">
        <PageHeader title="Mensurations" showBack />
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-secondary/50" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-xl bg-secondary/50" />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <PageHeader
        title="Mensurations"
        showBack
        actions={
          measurements.length > 0 && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="focus-visible:ring-0 focus-visible:bg-transparent"
                onClick={() => router.push("/profile/measurements/graphs")}
              >
                <ChartLine className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "focus:bg-transparent focus-visible:ring-0",
                  disableHover && "hover:bg-transparent"
                )}
                onClick={() => setShowHistory(true)}
              >
                <History className="h-4 w-4" />
              </Button>
            </div>
          )
        }
      />

      {!latest ? (
        <EmptyState onAdd={handleAdd} />
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <StatCard
              icon={Calendar}
              label="Mesure"
              value={formatDateShort(latest.date)}
              unit={getYear(latest.date)}
              accentColor="zinc"
              gap={2}
            />
            <StatCard
              icon={User}
              label="Âge"
              value={age}
              unit="ans"
              accentColor="blue"
            />
            <StatCard
              icon={Scale}
              label="Poids"
              value={latest.weight?.toFixed(1) ?? null}
              unit="kg"
              accentColor="orange"
            />
            <StatCard
              icon={Activity}
              label="IMC"
              value={bmi?.toFixed(1) ?? null}
              subtitle={bmiCategory?.label}
              accentColor="emerald"
            />
          </div>

          {/* Body Measurements */}
          <div className="rounded-xl border border-border/40 bg-card p-4">
            {/* Upper Body */}
            <SectionHeader title="Haut du corps" />
            <MeasurementRow
              label="Cou"
              value={latest.neck}
              previousValue={previous?.neck ?? null}
            />
            <MeasurementRow
              label="Épaules"
              value={latest.shoulders}
              previousValue={previous?.shoulders ?? null}
            />
            <MeasurementRow
              label="Poitrine"
              value={latest.chest}
              previousValue={previous?.chest ?? null}
            />
            <MeasurementRow
              label="Taille"
              value={latest.waist}
              previousValue={previous?.waist ?? null}
              inverse
            />
            <MeasurementRow
              label="Hanches"
              value={latest.hips}
              previousValue={previous?.hips ?? null}
            />

            {/* Arms */}
            <div className="mt-8" />
            <SectionHeader title="Bras" />
            <BilateralRow
              label="Biceps"
              leftValue={latest.bicepsLeft}
              rightValue={latest.bicepsRight}
              prevLeftValue={previous?.bicepsLeft ?? null}
              prevRightValue={previous?.bicepsRight ?? null}
            />
            <BilateralRow
              label="Avant-bras"
              leftValue={latest.forearmLeft}
              rightValue={latest.forearmRight}
              prevLeftValue={previous?.forearmLeft ?? null}
              prevRightValue={previous?.forearmRight ?? null}
            />
            <BilateralRow
              label="Poignet"
              leftValue={latest.wristLeft}
              rightValue={latest.wristRight}
              prevLeftValue={previous?.wristLeft ?? null}
              prevRightValue={previous?.wristRight ?? null}
            />

            {/* Legs */}
            <div className="mt-8" />
            <SectionHeader title="Jambes" />
            <BilateralRow
              label="Cuisse"
              leftValue={latest.thighLeft}
              rightValue={latest.thighRight}
              prevLeftValue={previous?.thighLeft ?? null}
              prevRightValue={previous?.thighRight ?? null}
            />
            <BilateralRow
              label="Mollet"
              leftValue={latest.calfLeft}
              rightValue={latest.calfRight}
              prevLeftValue={previous?.calfLeft ?? null}
              prevRightValue={previous?.calfRight ?? null}
            />
            <BilateralRow
              label="Cheville"
              leftValue={latest.ankleLeft}
              rightValue={latest.ankleRight}
              prevLeftValue={previous?.ankleLeft ?? null}
              prevRightValue={previous?.ankleRight ?? null}
            />
          </div>
        </>
      )}

      {/* Floating Add Button */}
      {latest && (
        <div className="fixed bottom-20 right-4 z-50">
          <Button
            size="lg"
            onClick={handleAdd}
            className="h-14 w-14 rounded-full shadow-lg shadow-black/30 p-0"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* History sheet */}
      <Sheet open={showHistory} onOpenChange={setShowHistory}>
        <SheetContent side="bottom" className="max-h-[85vh] flex flex-col">
          <SheetHeader className="shrink-0">
            <SheetTitle>Historique des mesures</SheetTitle>
            <SheetDescription>
              {measurements.length} mesure{measurements.length > 1 ? "s" : ""} enregistrée{measurements.length > 1 ? "s" : ""}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 overflow-y-auto flex-1">
            <div className="space-y-2 pb-4">
              {measurements.map((measurement) => (
                <div
                  key={measurement.id}
                  onClick={() => {
                    setShowHistory(false);
                    router.push(`/profile/measurements/${measurement.id}`);
                  }}
                  className="flex items-center justify-between py-3 px-3 rounded-lg bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {formatDate(measurement.date)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {measurement.weight ? `${measurement.weight.toFixed(1)} kg` : "Poids non renseigné"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowHistory(false);
                      setDeleteId(measurement.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation dialog */}
      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Supprimer cette mesure"
        description="Cette action est irréversible. Les données de cette mesure seront définitivement supprimées."
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
