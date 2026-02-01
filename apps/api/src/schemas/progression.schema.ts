import { z } from "zod";

export const updateSuggestionSchema = z.object({
  status: z.enum(["accepted", "dismissed"]),
});

export type UpdateSuggestionInput = z.infer<typeof updateSuggestionSchema>;
