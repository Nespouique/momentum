import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  age: z.union([
    z.number().int().min(10, "Age must be at least 10").max(120, "Age must be at most 120"),
    z.null(),
  ]).optional(),
  height: z.union([
    z.number().min(50, "Height must be at least 50 cm").max(300, "Height must be at most 300 cm"),
    z.null(),
  ]).optional(),
  goalDescription: z.string().max(500, "Goal must be at most 500 characters").nullable().optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
