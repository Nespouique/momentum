import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  birthDate: z.string().nullable().optional(),
  height: z.union([
    z.number().min(50, "La taille doit être d'au moins 50 cm").max(300, "La taille doit être au maximum de 300 cm"),
    z.null(),
  ]).optional(),
  goalDescription: z.string().max(500, "L'objectif doit contenir au maximum 500 caractères").nullable().optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Le mot de passe actuel est requis"),
    newPassword: z.string().min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères"),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmNewPassword"],
  });

export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
