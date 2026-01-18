import { z } from "zod";

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

export const measurementSchema = z.object({
  date: z.date({ error: "La date est requise" }),
  ...measurementFields,
});

export type MeasurementFormData = z.infer<typeof measurementSchema>;
