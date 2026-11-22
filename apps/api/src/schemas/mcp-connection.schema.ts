import { z } from "zod";

export const createMcpTokenSchema = z.object({
  label: z.string().trim().min(1, "Le nom est requis").max(60, "60 caractères maximum"),
  expiresInDays: z.union([z.literal(30), z.literal(90), z.literal(365), z.null()]).default(90),
});

export type CreateMcpTokenInput = z.infer<typeof createMcpTokenSchema>;
