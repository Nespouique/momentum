import { z } from "zod";
import { MUSCLE_GROUPS } from "@momentum/shared";

export const exerciseFormSchema = z.object({
  name: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères"),
  muscleGroups: z
    .array(z.enum(MUSCLE_GROUPS))
    .min(1, "Sélectionnez au moins un groupe musculaire"),
});

export type ExerciseFormValues = z.infer<typeof exerciseFormSchema>;
