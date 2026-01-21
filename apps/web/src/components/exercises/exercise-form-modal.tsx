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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle>
            {isEditing ? "Modifier l'exercice" : "Nouvel exercice"}
          </SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto py-4 px-1 -mx-1 space-y-6">
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
            </div>

            {/* Footer */}
            <div className="shrink-0 pt-4 border-t border-zinc-800">
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? "Enregistrer" : "Créer"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
