"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { exerciseFormSchema, ExerciseFormValues } from "@/lib/validations/exercise";
import { Exercise } from "@/lib/api/exercises";
import {
  MuscleGroup,
  MUSCLE_GROUPS,
  getMuscleGroupColors,
  getMuscleGroupLabel,
} from "@/lib/constants/muscle-groups";

interface ExerciseFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise?: Exercise | null;
  onSubmit: (data: ExerciseFormValues) => Promise<void>;
  isSubmitting?: boolean;
}

export function ExerciseFormModal({
  open,
  onOpenChange,
  exercise,
  onSubmit,
  isSubmitting = false,
}: ExerciseFormModalProps) {
  const isEditing = !!exercise;

  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseFormSchema),
    defaultValues: {
      name: "",
      muscleGroups: [],
    },
  });

  // Reset form when exercise changes
  useEffect(() => {
    if (exercise) {
      form.reset({
        name: exercise.name,
        muscleGroups: exercise.muscleGroups as MuscleGroup[],
      });
    } else {
      form.reset({
        name: "",
        muscleGroups: [],
      });
    }
  }, [exercise, form]);

  const handleSubmit = async (data: ExerciseFormValues) => {
    await onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier l'exercice" : "Nouvel exercice"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifiez les informations de votre exercice personnalisé."
              : "Créez un exercice personnalisé pour vos entraînements."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Name field */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de l&apos;exercice</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ex : Bulgarian Split Squat"
                      {...field}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Muscle groups field */}
            <FormField
              control={form.control}
              name="muscleGroups"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Groupes musculaires</FormLabel>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {MUSCLE_GROUPS.map((group) => {
                      const isChecked = field.value.includes(group);
                      const colors = getMuscleGroupColors(group);

                      return (
                        <label
                          key={group}
                          className={cn(
                            "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all",
                            isChecked
                              ? cn(colors.bg, colors.border)
                              : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50"
                          )}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...field.value, group]);
                              } else {
                                field.onChange(
                                  field.value.filter((g) => g !== group)
                                );
                              }
                            }}
                          />
                          <span
                            className={cn(
                              "text-sm font-medium",
                              isChecked ? colors.text : "text-zinc-300"
                            )}
                          >
                            {getMuscleGroupLabel(group)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? "Enregistrer" : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
