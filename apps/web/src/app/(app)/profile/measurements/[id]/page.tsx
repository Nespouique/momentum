"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CalendarIcon,
  ChevronDown,
  Scale,
  User,
  Dumbbell,
  Activity,
  Footprints,
  Save,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { NumberInput } from "@/components/ui/number-input";
import { PageHeader } from "@/components/layout";
import { useAuthStore } from "@/stores/auth";
import {
  getMeasurement,
  getLatestMeasurement,
  createMeasurement,
  updateMeasurement,
  type Measurement,
  type MeasurementInput,
} from "@/lib/api/measurements";
import {
  measurementSchema,
  type MeasurementFormData,
} from "@/lib/validations/measurement";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function SectionHeader({
  icon: Icon,
  title,
  isOpen,
}: {
  icon: React.ElementType;
  title: string;
  isOpen: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <span className="font-medium">{title}</span>
      </div>
      <ChevronDown
        className={cn(
          "h-4 w-4 text-muted-foreground transition-transform duration-200",
          isOpen && "rotate-180"
        )}
      />
    </div>
  );
}

function FieldRow({
  label,
  unit,
  children,
}: {
  label: string;
  unit: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-3">
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm text-muted-foreground">{label}</Label>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">{unit}</span>
      </div>
      <div className="w-full">{children}</div>
    </div>
  );
}

function BilateralFieldRow({
  label,
  unit,
  leftChild,
  rightChild,
}: {
  label: string;
  unit: string;
  leftChild: React.ReactNode;
  rightChild: React.ReactNode;
}) {
  return (
    <div className="py-3">
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm text-muted-foreground">{label}</Label>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">{unit}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
            Gauche
          </span>
          {leftChild}
        </div>
        <div className="space-y-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
            Droite
          </span>
          {rightChild}
        </div>
      </div>
    </div>
  );
}

export default function MeasurementFormPage() {
  const params = useParams();
  const id = params["id"] as string;
  const router = useRouter();
  const { token } = useAuthStore();
  const isNew = id === "new";

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previousValues, setPreviousValues] = useState<Measurement | null>(null);
  const [openSections, setOpenSections] = useState({
    upperBody: false,
    arms: false,
    core: false,
    legs: false,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MeasurementFormData>({
    resolver: zodResolver(measurementSchema),
    defaultValues: {
      date: new Date(),
      weight: null,
      neck: null,
      shoulders: null,
      chest: null,
      bicepsLeft: null,
      bicepsRight: null,
      forearmLeft: null,
      forearmRight: null,
      wristLeft: null,
      wristRight: null,
      waist: null,
      hips: null,
      thighLeft: null,
      thighRight: null,
      calfLeft: null,
      calfRight: null,
      ankleLeft: null,
      ankleRight: null,
      notes: null,
    },
  });

  useEffect(() => {
    if (!token) return;

    const loadData = async () => {
      try {
        if (isNew) {
          // For new measurements, load previous values as placeholders
          const latest = await getLatestMeasurement(token);
          if (latest) {
            setPreviousValues(latest);
          }
        } else {
          // For editing, load the specific measurement
          const measurement = await getMeasurement(token, id);
          reset({
            date: new Date(measurement.date),
            weight: measurement.weight,
            neck: measurement.neck,
            shoulders: measurement.shoulders,
            chest: measurement.chest,
            bicepsLeft: measurement.bicepsLeft,
            bicepsRight: measurement.bicepsRight,
            forearmLeft: measurement.forearmLeft,
            forearmRight: measurement.forearmRight,
            wristLeft: measurement.wristLeft,
            wristRight: measurement.wristRight,
            waist: measurement.waist,
            hips: measurement.hips,
            thighLeft: measurement.thighLeft,
            thighRight: measurement.thighRight,
            calfLeft: measurement.calfLeft,
            calfRight: measurement.calfRight,
            ankleLeft: measurement.ankleLeft,
            ankleRight: measurement.ankleRight,
            notes: measurement.notes,
          });
        }
      } catch (error) {
        console.error("Failed to load measurement:", error);
        if (!isNew) {
          toast.error("Erreur lors du chargement");
          router.push("/profile/measurements");
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id, isNew, token, reset, router]);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Get placeholder from previous measurement (only for new measurements)
  const getPlaceholder = (field: keyof Measurement): string | undefined => {
    if (!isNew || !previousValues) return undefined;
    const value = previousValues[field];
    return value !== null && value !== undefined ? String(value) : undefined;
  };

  const onSubmit = async (data: MeasurementFormData) => {
    if (!token) return;

    setIsSaving(true);
    try {
      const dateStr = data.date.toISOString().split("T")[0] as string;
      const payload: MeasurementInput = {
        date: dateStr,
        weight: data.weight,
        neck: data.neck,
        shoulders: data.shoulders,
        chest: data.chest,
        bicepsLeft: data.bicepsLeft,
        bicepsRight: data.bicepsRight,
        forearmLeft: data.forearmLeft,
        forearmRight: data.forearmRight,
        wristLeft: data.wristLeft,
        wristRight: data.wristRight,
        waist: data.waist,
        hips: data.hips,
        thighLeft: data.thighLeft,
        thighRight: data.thighRight,
        calfLeft: data.calfLeft,
        calfRight: data.calfRight,
        ankleLeft: data.ankleLeft,
        ankleRight: data.ankleRight,
        notes: data.notes,
      };

      if (isNew) {
        await createMeasurement(token, payload);
        toast.success("Mesure ajoutée");
      } else {
        await updateMeasurement(token, id, payload);
        toast.success("Mesure mise à jour");
      }

      router.push("/profile/measurements");
    } catch (error) {
      console.error("Failed to save measurement:", error);
      if (error instanceof Error && error.message.includes("already exists")) {
        toast.error("Une mesure existe déjà pour cette date");
      } else {
        toast.error("Erreur lors de la sauvegarde");
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="pb-8">
      <PageHeader
        title={isNew ? "Nouvelle mesure" : "Modifier la mesure"}
        showBack
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Date Picker */}
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <Label className="mb-3 block text-sm font-medium">Date</Label>
          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value
                      ? format(field.value, "PPP", { locale: fr })
                      : "Sélectionner une date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}
          />
          {errors.date && (
            <p className="mt-2 text-sm text-destructive">
              {errors.date.message}
            </p>
          )}
        </div>

        {/* Weight - Always visible */}
        <div className="rounded-xl border border-[hsl(var(--accent-orange))]/30 bg-gradient-to-br from-[hsl(var(--accent-orange))]/5 to-transparent p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--accent-orange))]/10">
              <Scale className="h-5 w-5 text-[hsl(var(--accent-orange))]" />
            </div>
            <div>
              <h3 className="font-semibold">Poids</h3>
              <p className="text-xs text-muted-foreground">
                Votre mesure principale
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Controller
              name="weight"
              control={control}
              render={({ field }) => (
                <NumberInput
                  value={field.value}
                  onChange={field.onChange}
                  min={20}
                  max={500}
                  step={0.1}
                  placeholder={getPlaceholder("weight") ?? "75.0"}
                  className="flex-1"
                />
              )}
            />
            <span className="text-sm font-medium text-muted-foreground">
              kg
            </span>
          </div>
        </div>

        {/* Upper Body Section */}
        <Collapsible
          open={openSections.upperBody}
          onOpenChange={() => toggleSection("upperBody")}
        >
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <CollapsibleTrigger asChild>
              <button type="button" className="w-full px-4 hover:bg-secondary/50 transition-colors">
                <SectionHeader
                  icon={User}
                  title="Haut du corps"
                  isOpen={openSections.upperBody ?? false}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t border-border/60 px-4 pb-4">
                <FieldRow label="Cou" unit="cm">
                  <Controller
                    name="neck"
                    control={control}
                    render={({ field }) => (
                      <NumberInput
                        value={field.value}
                        onChange={field.onChange}
                        min={20}
                        max={100}
                        step={0.5}
                        placeholder={getPlaceholder("neck") ?? "38"}
                        className="w-full"
                      />
                    )}
                  />
                </FieldRow>
                <FieldRow label="Épaules" unit="cm">
                  <Controller
                    name="shoulders"
                    control={control}
                    render={({ field }) => (
                      <NumberInput
                        value={field.value}
                        onChange={field.onChange}
                        min={50}
                        max={200}
                        step={0.5}
                        placeholder={getPlaceholder("shoulders") ?? "115"}
                        className="w-full"
                      />
                    )}
                  />
                </FieldRow>
                <FieldRow label="Poitrine" unit="cm">
                  <Controller
                    name="chest"
                    control={control}
                    render={({ field }) => (
                      <NumberInput
                        value={field.value}
                        onChange={field.onChange}
                        min={50}
                        max={200}
                        step={0.5}
                        placeholder={getPlaceholder("chest") ?? "100"}
                        className="w-full"
                      />
                    )}
                  />
                </FieldRow>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Arms Section */}
        <Collapsible
          open={openSections.arms}
          onOpenChange={() => toggleSection("arms")}
        >
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <CollapsibleTrigger asChild>
              <button type="button" className="w-full px-4 hover:bg-secondary/50 transition-colors">
                <SectionHeader
                  icon={Dumbbell}
                  title="Bras"
                  isOpen={openSections.arms ?? false}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t border-border/60 px-4 pb-4">
                <BilateralFieldRow
                  label="Biceps"
                  unit="cm"
                  leftChild={
                    <Controller
                      name="bicepsLeft"
                      control={control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value}
                          onChange={field.onChange}
                          min={15}
                          max={80}
                          step={0.5}
                          placeholder={getPlaceholder("bicepsLeft") ?? "35"}
                          className="w-full"
                        />
                      )}
                    />
                  }
                  rightChild={
                    <Controller
                      name="bicepsRight"
                      control={control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value}
                          onChange={field.onChange}
                          min={15}
                          max={80}
                          step={0.5}
                          placeholder={getPlaceholder("bicepsRight") ?? "35"}
                          className="w-full"
                        />
                      )}
                    />
                  }
                />
                <BilateralFieldRow
                  label="Avant-bras"
                  unit="cm"
                  leftChild={
                    <Controller
                      name="forearmLeft"
                      control={control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value}
                          onChange={field.onChange}
                          min={15}
                          max={60}
                          step={0.5}
                          placeholder={getPlaceholder("forearmLeft") ?? "28"}
                          className="w-full"
                        />
                      )}
                    />
                  }
                  rightChild={
                    <Controller
                      name="forearmRight"
                      control={control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value}
                          onChange={field.onChange}
                          min={15}
                          max={60}
                          step={0.5}
                          placeholder={getPlaceholder("forearmRight") ?? "28"}
                          className="w-full"
                        />
                      )}
                    />
                  }
                />
                <BilateralFieldRow
                  label="Poignet"
                  unit="cm"
                  leftChild={
                    <Controller
                      name="wristLeft"
                      control={control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value}
                          onChange={field.onChange}
                          min={10}
                          max={30}
                          step={0.5}
                          placeholder={getPlaceholder("wristLeft") ?? "17"}
                          className="w-full"
                        />
                      )}
                    />
                  }
                  rightChild={
                    <Controller
                      name="wristRight"
                      control={control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value}
                          onChange={field.onChange}
                          min={10}
                          max={30}
                          step={0.5}
                          placeholder={getPlaceholder("wristRight") ?? "17"}
                          className="w-full"
                        />
                      )}
                    />
                  }
                />
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Core Section */}
        <Collapsible
          open={openSections.core}
          onOpenChange={() => toggleSection("core")}
        >
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <CollapsibleTrigger asChild>
              <button type="button" className="w-full px-4 hover:bg-secondary/50 transition-colors">
                <SectionHeader
                  icon={Activity}
                  title="Tronc"
                  isOpen={openSections.core ?? false}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t border-border/60 px-4 pb-4">
                <FieldRow label="Taille" unit="cm">
                  <Controller
                    name="waist"
                    control={control}
                    render={({ field }) => (
                      <NumberInput
                        value={field.value}
                        onChange={field.onChange}
                        min={40}
                        max={200}
                        step={0.5}
                        placeholder={getPlaceholder("waist") ?? "82"}
                        className="w-full"
                      />
                    )}
                  />
                </FieldRow>
                <FieldRow label="Hanches" unit="cm">
                  <Controller
                    name="hips"
                    control={control}
                    render={({ field }) => (
                      <NumberInput
                        value={field.value}
                        onChange={field.onChange}
                        min={50}
                        max={200}
                        step={0.5}
                        placeholder={getPlaceholder("hips") ?? "95"}
                        className="w-full"
                      />
                    )}
                  />
                </FieldRow>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Legs Section */}
        <Collapsible
          open={openSections.legs}
          onOpenChange={() => toggleSection("legs")}
        >
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <CollapsibleTrigger asChild>
              <button type="button" className="w-full px-4 hover:bg-secondary/50 transition-colors">
                <SectionHeader
                  icon={Footprints}
                  title="Jambes"
                  isOpen={openSections.legs ?? false}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t border-border/60 px-4 pb-4">
                <BilateralFieldRow
                  label="Cuisse"
                  unit="cm"
                  leftChild={
                    <Controller
                      name="thighLeft"
                      control={control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value}
                          onChange={field.onChange}
                          min={30}
                          max={100}
                          step={0.5}
                          placeholder={getPlaceholder("thighLeft") ?? "58"}
                          className="w-full"
                        />
                      )}
                    />
                  }
                  rightChild={
                    <Controller
                      name="thighRight"
                      control={control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value}
                          onChange={field.onChange}
                          min={30}
                          max={100}
                          step={0.5}
                          placeholder={getPlaceholder("thighRight") ?? "58"}
                          className="w-full"
                        />
                      )}
                    />
                  }
                />
                <BilateralFieldRow
                  label="Mollet"
                  unit="cm"
                  leftChild={
                    <Controller
                      name="calfLeft"
                      control={control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value}
                          onChange={field.onChange}
                          min={20}
                          max={70}
                          step={0.5}
                          placeholder={getPlaceholder("calfLeft") ?? "38"}
                          className="w-full"
                        />
                      )}
                    />
                  }
                  rightChild={
                    <Controller
                      name="calfRight"
                      control={control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value}
                          onChange={field.onChange}
                          min={20}
                          max={70}
                          step={0.5}
                          placeholder={getPlaceholder("calfRight") ?? "38"}
                          className="w-full"
                        />
                      )}
                    />
                  }
                />
                <BilateralFieldRow
                  label="Cheville"
                  unit="cm"
                  leftChild={
                    <Controller
                      name="ankleLeft"
                      control={control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value}
                          onChange={field.onChange}
                          min={15}
                          max={40}
                          step={0.5}
                          placeholder={getPlaceholder("ankleLeft") ?? "23"}
                          className="w-full"
                        />
                      )}
                    />
                  }
                  rightChild={
                    <Controller
                      name="ankleRight"
                      control={control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value}
                          onChange={field.onChange}
                          min={15}
                          max={40}
                          step={0.5}
                          placeholder={getPlaceholder("ankleRight") ?? "23"}
                          className="w-full"
                        />
                      )}
                    />
                  }
                />
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Notes */}
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <Label className="mb-3 block text-sm font-medium">
            Notes (optionnel)
          </Label>
          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <Textarea
                placeholder="Ajoutez des notes sur cette mesure..."
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || null)}
                className="min-h-[100px] resize-none"
              />
            )}
          />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          size="lg"
          className="w-full gap-2"
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {isNew ? "Ajouter la mesure" : "Enregistrer"}
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
