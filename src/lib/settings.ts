import type { CaptureRequest, InspectRequest } from "./capture-request";
import { CUSTOM_LIMITS } from "./presets";
import type { DeviceKind, UiTheme, UiVariant } from "./types";

export type CaptureMode = "screens" | "sections";

export interface FormSettings {
  mode: CaptureMode;
  presetIds: string[];
  /** Presets the sections mode loads the page in; kept apart from the screenshot presets. */
  sectionPresetIds: string[];
  custom: { enabled: boolean; kind: DeviceKind; width: number; height: number; dpr: 1 | 2 | 3 };
  uiVariants: UiVariant[];
  /** Sections default to an exact cut-out; with UI each becomes a full screen of the preset. */
  sectionUiVariants: UiVariant[];
  theme: UiTheme;
  fullPage: boolean;
  hidePopups: boolean;
  extraDelaySeconds: number;
  /** Raw text field: CSS selectors separated by commas or new lines. */
  hideSelectors: string;
}

export const SETTINGS_KEY = "websnap:settings";

export const DEFAULT_SETTINGS: FormSettings = {
  mode: "screens",
  presetIds: ["desktop", "iphone"],
  sectionPresetIds: ["desktop", "iphone"],
  custom: { enabled: false, kind: "desktop", width: 1280, height: 800, dpr: 2 },
  uiVariants: ["none", "chrome", "safari"],
  sectionUiVariants: ["none"],
  theme: "light",
  fullPage: false,
  hidePopups: true,
  extraDelaySeconds: 0,
  hideSelectors: "",
};

export function parseSelectors(text: string): string[] {
  return text
    .split(/[,\n]/)
    .map((selector) => selector.trim())
    .filter(Boolean)
    .slice(0, 30);
}

export const clampSize = (value: number, { min, max }: { min: number; max: number }) =>
  Math.min(max, Math.max(min, Math.round(value) || min));

export function toCaptureRequest(urls: string, settings: FormSettings): CaptureRequest {
  const { enabled, kind, width, height, dpr } = settings.custom;
  const custom = {
    kind,
    width: clampSize(width, CUSTOM_LIMITS.width),
    height: clampSize(height, CUSTOM_LIMITS.height),
    dpr,
  };
  return {
    urls,
    presetIds: settings.presetIds,
    customPreset: enabled ? custom : null,
    uiVariants: settings.uiVariants,
    theme: settings.theme,
    fullPage: settings.fullPage,
    hidePopups: settings.hidePopups,
    hideSelectors: parseSelectors(settings.hideSelectors),
    extraDelaySeconds: settings.extraDelaySeconds,
  };
}

export function toInspectRequest(url: string, settings: FormSettings): InspectRequest {
  return {
    url,
    presetIds: settings.sectionPresetIds,
    hidePopups: settings.hidePopups,
    hideSelectors: parseSelectors(settings.hideSelectors),
    extraDelaySeconds: settings.extraDelaySeconds,
  };
}

export function formatCount(settings: FormSettings): number {
  return settings.presetIds.length + (settings.custom.enabled ? 1 : 0);
}

export function countScreenshots(urlCount: number, settings: FormSettings): number {
  return Math.max(urlCount, 1) * formatCount(settings) * settings.uiVariants.length;
}
