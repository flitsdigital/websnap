import type { Preset, UiTheme, UiVariant } from "./types";

// Contract: <site>_<presetId>_<variant>[_fullpage]_<w>x<h>.png. A cut-out section uses sectie-<n>[-<ui>] as
// variant, e.g. sectie-2 or sectie-2-safari-dark. Site slugs and preset ids never contain "_".
const FILE_NAME =
  /^([a-z0-9-]+)_([a-z0-9-]+)_(?:sectie-(\d+)-?)?(zonder-ui|chrome|safari|chrome-dark|safari-dark|)(_fullpage)?_(\d+)x(\d+)\.png$/;

export interface ParsedFileName {
  site: string;
  presetId: string;
  ui: UiVariant;
  theme: UiTheme;
  fullPage: boolean;
  /** Section number for cut-out sections, otherwise null. */
  section: number | null;
  width: number;
  height: number;
}

function variantName(ui: UiVariant, theme: UiTheme): string {
  return ui === "none" ? "zonder-ui" : theme === "dark" ? `${ui}-dark` : ui;
}

export function fileName(
  site: string,
  preset: Preset,
  ui: UiVariant,
  theme: UiTheme,
  fullPage: boolean,
  width: number,
  height: number,
): string {
  return `${site}_${preset.id}_${variantName(ui, theme)}${fullPage ? "_fullpage" : ""}_${width}x${height}.png`;
}

/** Without UI the section is cut exactly (`sectie-1`); with UI it is a full screen (`sectie-1-chrome`). */
export function sectionFileName(
  site: string,
  preset: Preset,
  section: number,
  ui: UiVariant,
  theme: UiTheme,
  width: number,
  height: number,
): string {
  const variant = ui === "none" ? `sectie-${section}` : `sectie-${section}-${variantName(ui, theme)}`;
  return `${site}_${preset.id}_${variant}_${width}x${height}.png`;
}

export function parseFileName(name: string): ParsedFileName | null {
  const match = FILE_NAME.exec(name);
  if (!match) return null;
  const [, site, presetId, sectionNumber, variant, fullPage, width, height] = match;
  const section = sectionNumber ? Number(sectionNumber) : null;
  // A plain screenshot always names its variant; only a section may leave it out.
  if (!variant && section === null) return null;
  return {
    site,
    presetId,
    ui: !variant || variant === "zonder-ui" ? "none" : (variant.replace("-dark", "") as UiVariant),
    theme: variant.endsWith("-dark") ? "dark" : "light",
    fullPage: Boolean(fullPage),
    section,
    width: Number(width),
    height: Number(height),
  };
}
