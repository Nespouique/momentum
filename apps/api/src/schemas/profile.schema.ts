import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  birthDate: z.string().optional().nullable(), // ISO date string YYYY-MM-DD
  height: z.number().min(50).max(300).optional().nullable(),
  goalDescription: z.string().max(500).optional().nullable(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export const updatePreferencesSchema = z.object({
  accentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Accent color must be a valid hex color")
    .transform((value) => value.toUpperCase()),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
