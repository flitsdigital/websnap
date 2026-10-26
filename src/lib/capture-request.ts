import { z } from "zod";
import { CUSTOM_LIMITS } from "./presets";

export const captureRequestSchema = z.object({
  urls: z.string().max(5000),
  presetIds: z.array(z.string().max(40)).max(10),
  customPreset: z
    .object({
      kind: z.enum(["desktop", "mobile"]),
      width: z.int().min(CUSTOM_LIMITS.width.min).max(CUSTOM_LIMITS.width.max),
      height: z.int().min(CUSTOM_LIMITS.height.min).max(CUSTOM_LIMITS.height.max),
      dpr: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    })
    .nullable(),
  uiVariants: z.array(z.enum(["none", "chrome", "safari"])).min(1, "Kies minimaal één UI-variant."),
  theme: z.enum(["light", "dark"]),
  fullPage: z.boolean(),
  hidePopups: z.boolean(),
  hideSelectors: z.array(z.string().max(200)).max(30),
  extraDelaySeconds: z.number().min(0).max(15),
});

export type CaptureRequest = z.infer<typeof captureRequestSchema>;

const hideOptions = {
  hidePopups: z.boolean(),
  hideSelectors: z.array(z.string().max(200)).max(30),
  extraDelaySeconds: z.number().min(0).max(15),
};

export const inspectRequestSchema = z.object({
  url: z.string().max(2000),
  presetIds: z.array(z.string().max(40)).min(1, "Kies minimaal één formaat.").max(4),
  ...hideOptions,
});

export type InspectRequest = z.infer<typeof inspectRequestSchema>;

export const regionsRequestSchema = z.object({
  id: z.string().max(100),
  crops: z
    .array(
      z.object({
        presetId: z.string().max(40),
        section: z.int().min(1).max(99),
        keys: z.array(z.string().max(1000)).max(60).optional(),
        x: z.number().min(0),
        y: z.number().min(0),
        width: z.number().positive(),
        height: z.number().positive(),
      }),
    )
    .min(1)
    .max(120),
  uiVariants: z.array(z.enum(["none", "chrome", "safari"])).min(1, "Kies minimaal één UI-variant."),
  theme: z.enum(["light", "dark"]),
});
