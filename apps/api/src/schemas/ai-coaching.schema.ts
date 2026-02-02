import { z } from "zod";

export const applyCoachingSchema = z.object({
  proposals: z.array(
    z.object({
      exerciseId: z.string().uuid(),
      sets: z.array(
        z.object({
          setNumber: z.number().int().min(1),
          targetReps: z.number().int().min(1).max(100),
          targetWeight: z.number().min(0).nullable(),
        })
      ),
    })
  ),
});

export type ApplyCoachingInput = z.infer<typeof applyCoachingSchema>;
