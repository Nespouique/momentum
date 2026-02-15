"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuthStore } from "@/stores/auth";
import { createTrackable, updateTrackable, createGoal, updateGoal, suggestIcons, type CreateTrackableInput } from "@/lib/api/trackables";
import { getIconComponent } from "@/lib/icons";
import { IconSelector } from "./icon-selector";
import { ColorPicker } from "./color-picker";

const FREQ_LABELS: Record<string, string> = {
  daily: "jour",
  weekly: "semaine",
  monthly: "mois",
};

const trackableSchema = z.object({
  name: z
    .string()
    .min(1, "Le nom est requis")
    .max(50, "Le nom ne peut pas dépasser 50 caractères"),
  icon: z.string().min(1, "Sélectionnez une icône"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Couleur invalide"),
  trackingType: z.string().refine((val) => ["boolean", "number", "duration"].includes(val), {
    message: "Sélectionnez un type valide",
  }),
  unit: z.string().max(20).optional(),
  targetValue: z.number().min(1, "La valeur cible est requise"),
  frequency: z.enum(["daily", "weekly", "monthly"]),
});

type TrackableFormData = z.infer<typeof trackableSchema>;

interface CreateTrackableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /** When provided, the modal switches to edit mode */
  trackable?: {
    id: string;
    name: string;
    icon: string;
    color: string;
    trackingType: "boolean" | "number" | "duration";
    unit: string | null;
    goal: { id: string; targetValue: number; frequency: "daily" | "weekly" | "monthly" } | null;
  };
}

export function CreateTrackableModal({
  open,
  onOpenChange,
  onSuccess,
  trackable,
}: CreateTrackableModalProps) {
  const { token } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const lastSuggestedName = useRef<string>("");

  const isEditMode = !!trackable;

  const form = useForm<TrackableFormData>({
    resolver: zodResolver(trackableSchema),
    defaultValues: {
      name: "",
      icon: "target",
      color: "#FFFFFF",
      trackingType: "boolean",
      unit: "",
      targetValue: 1,
      frequency: "daily",
    },
  });

  const trackingType = form.watch("trackingType");
  const selectedIcon = form.watch("icon");
  const selectedColor = form.watch("color");
  const watchedName = form.watch("name");
  const watchedUnit = form.watch("unit");
  const watchedTargetValue = form.watch("targetValue") ?? 0;
  const watchedFrequency = form.watch("frequency") ?? "daily";
  const watchedTrackingType = form.watch("trackingType");

  // Reset form when sheet opens
  useEffect(() => {
    if (open) {
      if (trackable) {
        form.reset({
          name: trackable.name,
          icon: trackable.icon,
          color: trackable.color,
          trackingType: trackable.trackingType,
          unit: trackable.unit || "",
          targetValue: trackable.goal?.targetValue ?? 1,
          frequency: trackable.goal?.frequency ?? "daily",
        });
      } else {
        form.reset({
          name: "",
          icon: "target",
          color: "#FFFFFF",
          trackingType: "boolean",
          unit: "",
          targetValue: 1,
          frequency: "daily",
        });
      }
      setSuggestions([]);
      lastSuggestedName.current = "";
    }
  }, [open, form, trackable]);

  const fetchSuggestions = useCallback(async (name: string) => {
    if (!token || name.length < 2) return;
    if (name === lastSuggestedName.current) return;
    lastSuggestedName.current = name;

    setSuggestionsLoading(true);
    try {
      const result = await suggestIcons(token, name);
      setSuggestions(result.icons);

      const firstValid = result.icons.find((icon) => getIconComponent(icon));
      if (firstValid) {
        form.setValue("icon", firstValid);
      }
      if (result.color) {
        form.setValue("color", result.color);
      }
    } catch {
      // Silently fail - AI suggestions are optional
    } finally {
      setSuggestionsLoading(false);
    }
  }, [token, form]);

  const onSubmit = async (data: TrackableFormData) => {
    if (!token) return;

    setIsSubmitting(true);
    try {
      if (isEditMode && trackable) {
        // Update existing trackable
        await updateTrackable(token, trackable.id, {
          name: data.name,
          icon: data.icon,
          color: data.color,
          unit: (data.trackingType === "number" || data.trackingType === "duration") && data.unit
            ? data.unit
            : null,
        });

        // Update or create goal
        const goalData = {
          targetValue: data.targetValue,
          frequency: data.frequency as "daily" | "weekly" | "monthly",
        };

        if (trackable.goal) {
          await updateGoal(token, trackable.id, trackable.goal.id, goalData);
        } else {
          await createGoal(token, trackable.id, goalData);
        }

        toast.success("Trackable mis à jour");
      } else {
        // Create new trackable
        const payload: CreateTrackableInput = {
          name: data.name,
          icon: data.icon,
          color: data.color,
          trackingType: data.trackingType as "boolean" | "number" | "duration",
        };

        if (
          (data.trackingType === "number" || data.trackingType === "duration") &&
          data.unit
        ) {
          payload.unit = data.unit;
        }

        const newTrackable = await createTrackable(token, payload);

        await createGoal(token, newTrackable.id, {
          targetValue: data.targetValue,
          frequency: data.frequency as "daily" | "weekly" | "monthly",
        });

        toast.success("Trackable créé avec succès");
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const IconComponent = getIconComponent(selectedIcon);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle>{isEditMode ? "Modifier le trackable" : "Nouveau trackable"}</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto py-4 px-1 -mx-1 space-y-6">
              {/* Preview card */}
              <div className="space-y-2">
                <Label>Aperçu</Label>
                <div
                  className="relative overflow-hidden rounded-xl border border-border/40 bg-card"
                  style={{ borderLeftWidth: "4px", borderLeftColor: selectedColor }}
                >
                  <div
                    className="absolute inset-y-0 left-0 w-12 opacity-5 blur-xl"
                    style={{ backgroundColor: selectedColor }}
                  />
                  <div className="relative p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${selectedColor}15` }}
                      >
                        {IconComponent ? (
                          <IconComponent className="h-5 w-5" style={{ color: selectedColor }} />
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold tracking-tight">
                          {watchedName || "Nom du trackable"}
                        </h3>
                        {watchedTargetValue > 0 && (
                          <p className="text-xs text-muted-foreground/70 mt-0.5">
                            {watchedTargetValue}
                            {watchedUnit ? ` ${watchedUnit}` : ""} /{" "}
                            {FREQ_LABELS[watchedFrequency] || "jour"}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0">
                        {watchedTrackingType === "boolean" ? (
                          <Checkbox disabled className="h-6 w-6" />
                        ) : (
                          <div className="flex h-9 min-w-[60px] items-center justify-center rounded-lg border border-border/40 bg-secondary/30 px-3 text-sm font-semibold">
                            <span className="text-muted-foreground">&mdash;</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Name + Color side by side */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <div className="relative flex-1">
                          <Input
                            placeholder="Yoga, Méditation, Lecture..."
                            {...field}
                            className="pr-8"
                            onBlur={(e) => {
                              field.onBlur();
                              fetchSuggestions(e.target.value);
                            }}
                          />
                          {field.value && (
                            <button
                              type="button"
                              onClick={() => form.setValue("name", "")}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </FormControl>
                      <ColorPicker
                        value={selectedColor}
                        onChange={(c) => form.setValue("color", c)}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Icon */}
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icône</FormLabel>
                    <FormControl>
                      <IconSelector
                        value={field.value}
                        onChange={field.onChange}
                        suggestions={suggestions}
                        suggestionsLoading={suggestionsLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tracking type */}
              <FormField
                control={form.control}
                name="trackingType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de suivi</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isEditMode}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="boolean">Booléen (oui/non)</SelectItem>
                        <SelectItem value="number">Nombre</SelectItem>
                        <SelectItem value="duration">Durée</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Unit (conditional) */}
              {(trackingType === "number" || trackingType === "duration") && (
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unité (optionnel)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={
                            trackingType === "duration" ? "min, h..." : "kg, km, reps..."
                          }
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Goal section */}
              <div className="space-y-4">
                <Label>Objectif</Label>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">Fréquence</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="daily">Quotidien</SelectItem>
                            <SelectItem value="weekly">Hebdomadaire</SelectItem>
                            <SelectItem value="monthly">Mensuel</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">Valeur cible</FormLabel>
                        <FormControl>
                          <NumberInput
                            value={field.value}
                            onChange={(val) => field.onChange(val ?? 0)}
                            min={1}
                            step={1}
                            placeholder="0"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 pt-4 border-t border-zinc-800">
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting
                  ? (isEditMode ? "Enregistrement..." : "Création...")
                  : (isEditMode ? "Enregistrer" : "Créer")}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
