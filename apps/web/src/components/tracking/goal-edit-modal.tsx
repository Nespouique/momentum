"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth";
import { createGoal, updateGoal, type Trackable } from "@/lib/api/trackables";

const goalSchema = z.object({
  targetValue: z.number().positive("La valeur doit être positive"),
  frequency: z.string().refine((val) => ["daily", "weekly", "monthly"].includes(val), {
    message: "Sélectionnez une fréquence valide",
  }),
});

type GoalFormData = z.infer<typeof goalSchema>;

interface GoalEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackable: Trackable;
  onSuccess?: () => void;
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Quotidien",
  weekly: "Hebdomadaire",
  monthly: "Mensuel",
};

/** Sleep trackable stores values in minutes but we display/edit in hours */
function isSleepTrackable(trackable: Trackable): boolean {
  return trackable.name === "Durée sommeil";
}

function minutesToHours(min: number): number {
  return Math.round((min / 60) * 2) / 2; // round to nearest 0.5
}

function hoursToMinutes(hours: number): number {
  return Math.round(hours * 60);
}

export function GoalEditModal({
  open,
  onOpenChange,
  trackable,
  onSuccess,
}: GoalEditModalProps) {
  const { token } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSleep = isSleepTrackable(trackable);

  const defaultTarget = trackable.goal?.targetValue || 1;

  const form = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      targetValue: isSleep ? minutesToHours(defaultTarget) : defaultTarget,
      frequency: trackable.goal?.frequency || "daily",
    },
  });

  const onSubmit = async (data: GoalFormData) => {
    if (!token) return;

    const targetValue = isSleep ? hoursToMinutes(data.targetValue) : data.targetValue;

    setIsSubmitting(true);
    try {
      if (trackable.goal) {
        await updateGoal(token, trackable.id, trackable.goal.id, {
          targetValue,
          frequency: data.frequency as "daily" | "weekly" | "monthly",
        });
        toast.success("Objectif mis à jour");
      } else {
        await createGoal(token, trackable.id, {
          targetValue,
          frequency: data.frequency as "daily" | "weekly" | "monthly",
        });
        toast.success("Objectif créé");
      }

      onOpenChange(false);
      onSuccess?.();
      form.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentGoalDisplay = trackable.goal
    ? isSleep
      ? `${minutesToHours(trackable.goal.targetValue)}h / ${FREQUENCY_LABELS[trackable.goal.frequency]}`
      : `${trackable.goal.targetValue} ${trackable.unit || ""} / ${FREQUENCY_LABELS[trackable.goal.frequency]}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-lg">
        <DialogHeader>
          <DialogTitle>Configurer l&apos;objectif</DialogTitle>
          <p className="text-sm text-muted-foreground">{trackable.name}</p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fréquence</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
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
                  <FormLabel>
                    {isSleep ? "Durée cible (heures)" : "Valeur cible"}
                  </FormLabel>
                  <FormControl>
                    {isSleep ? (
                      <NumberInput
                        value={field.value}
                        onChange={(val) => field.onChange(val ?? 0)}
                        min={0.5}
                        max={24}
                        step={0.5}
                        placeholder="8"
                      />
                    ) : (
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="10000"
                        value={field.value}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {currentGoalDisplay && (
              <div className="rounded-lg bg-muted/30 border border-border/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Objectif actuel</p>
                <p className="text-sm font-medium">{currentGoalDisplay}</p>
              </div>
            )}

            <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-2 mt-4">
              <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                {isSubmitting ? "Enregistrement..." : "Enregistrer"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                Annuler
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
