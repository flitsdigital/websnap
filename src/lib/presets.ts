import type { DeviceKind, Preset, UiTheme, UiVariant } from "./types";

export const PRESETS: Preset[] = [
  { id: "desktop", label: "Desktop", kind: "desktop", width: 1440, height: 900, dpr: 2 },
  { id: "desktop-hd", label: "Desktop HD", kind: "desktop", width: 1920, height: 1080, dpr: 1 },
  { id: "iphone", label: "iPhone", kind: "mobile", width: 393, height: 852, dpr: 3 },
  { id: "iphone-max", label: "iPhone Pro Max", kind: "mobile", width: 430, height: 932, dpr: 3 },
];

export const UI_VARIANTS: { id: UiVariant; label: string }[] = [
  { id: "none", label: "Zonder UI" },
  { id: "chrome", label: "Chrome" },
  { id: "safari", label: "Safari" },
];

export const CUSTOM_LIMITS = {
  width: { min: 280, max: 3840 },
  height: { min: 400, max: 4000 },
} as const;

export interface CustomPresetInput {
  kind: DeviceKind;
  width: number;
  height: number;
  dpr: 1 | 2 | 3;
}

export function customPreset({ kind, width, height, dpr }: CustomPresetInput): Preset {
  return { id: `custom-${width}x${height}`, label: `Eigen ${width}×${height}`, kind, width, height, dpr };
}

export function findPreset(id: string): Preset | undefined {
  return PRESETS.find((preset) => preset.id === id);
}

export function uiLabel(ui: UiVariant, theme: UiTheme): string {
  if (ui === "none") return "Zonder UI";
  return `${ui === "chrome" ? "Chrome" : "Safari"} · ${theme === "dark" ? "donker" : "licht"}`;
}
