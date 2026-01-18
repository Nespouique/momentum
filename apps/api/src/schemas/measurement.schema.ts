import { z } from "zod";

// All measurement fields are optional floats
const measurementFields = {
  weight: z.number().min(20).max(500).optional().nullable(),
  neck: z.number().min(20).max(100).optional().nullable(),
  shoulders: z.number().min(50).max(200).optional().nullable(),
  chest: z.number().min(50).max(200).optional().nullable(),
  bicepsLeft: z.number().min(15).max(80).optional().nullable(),
  bicepsRight: z.number().min(15).max(80).optional().nullable(),
  forearmLeft: z.number().min(15).max(60).optional().nullable(),
  forearmRight: z.number().min(15).max(60).optional().nullable(),
  wristLeft: z.number().min(10).max(30).optional().nullable(),
  wristRight: z.number().min(10).max(30).optional().nullable(),
  waist: z.number().min(40).max(200).optional().nullable(),
  hips: z.number().min(50).max(200).optional().nullable(),
  thighLeft: z.number().min(30).max(100).optional().nullable(),
  thighRight: z.number().min(30).max(100).optional().nullable(),
  calfLeft: z.number().min(20).max(70).optional().nullable(),
  calfRight: z.number().min(20).max(70).optional().nullable(),
  ankleLeft: z.number().min(15).max(40).optional().nullable(),
  ankleRight: z.number().min(15).max(40).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
};

export const createMeasurementSchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
  ...measurementFields,
});

export const updateMeasurementSchema = z.object({
  date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid date format",
    })
    .optional(),
  ...measurementFields,
});

export const progressQuerySchema = z.object({
  field: z.enum([
    "weight",
    "neck",
    "shoulders",
    "chest",
    "bicepsLeft",
    "bicepsRight",
    "forearmLeft",
    "forearmRight",
    "wristLeft",
    "wristRight",
    "waist",
    "hips",
    "thighLeft",
    "thighRight",
    "calfLeft",
    "calfRight",
    "ankleLeft",
    "ankleRight",
  ]),
  period: z.enum(["1month", "3months", "6months", "1year", "all"]).default("3months"),
});

export type CreateMeasurementInput = z.infer<typeof createMeasurementSchema>;
export type UpdateMeasurementInput = z.infer<typeof updateMeasurementSchema>;
export type ProgressQueryInput = z.infer<typeof progressQuerySchema>;
