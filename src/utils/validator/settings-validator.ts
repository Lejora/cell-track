import { z } from "zod";

export const settingsSchema = z.object({
  defaultMapLat: z
    .number()
    .min(-90, "Latitude must be between -90 and 90 degrees")
    .max(90, "Latitude must be between -90 and 90 degrees"),
  defaultMapLng: z
    .number()
    .min(-180, "Longitude must be between -180 and 180 degrees")
    .max(180, "Longitude must be between -180 and 180 degrees"),
  defaultZoomLevel: z
    .number()
    .int("Zoom level must be an integer")
    .min(1, "Zoom level must be between 1 and 20")
    .max(20, "Zoom level must be between 1 and 20"),
  showAccuracyCircles: z.boolean(),
  circleColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color (e.g., #fa6e6e)"),
  circleOpacity: z
    .number()
    .min(0, "Opacity must be between 0 and 1")
    .max(1, "Opacity must be between 0 and 1"),
});

export const settingsUpdateSchema = settingsSchema.partial();

export type SettingsData = z.infer<typeof settingsSchema>;
export type SettingsUpdateData = z.infer<typeof settingsUpdateSchema>;