export type DeviceKind = "desktop" | "mobile";
export type UiVariant = "none" | "chrome" | "safari";
export type UiTheme = "light" | "dark";

/** width/height = CSS pixels of the whole screen (UI included). File = width×dpr by height×dpr. */
export interface Preset {
  id: string;
  label: string;
  kind: DeviceKind;
  width: number;
  height: number;
  dpr: 1 | 2 | 3;
}

export interface CaptureOptions {
  theme: UiTheme;
  fullPage: boolean;
  hidePopups: boolean;
  hideSelectors: string[];
  extraDelayMs: number;
}

/** id = `${url}|${preset.id}|${ui}` */
export interface CaptureJob {
  id: string;
  url: string;
  host: string;
  preset: Preset;
  ui: UiVariant;
}

/** path is relative to the output dir, always with "/" */
export interface OutputFile {
  path: string;
  name: string;
  width: number;
  height: number;
}

export type CaptureEvent =
  | { type: "start"; jobs: CaptureJob[] }
  | { type: "shot"; jobId: string; file: OutputFile }
  | { type: "error"; jobIds: string[]; message: string }
  | { type: "done"; sessionPaths: string[] };

export type JobResult =
  { status: "pending" } | { status: "done"; file: OutputFile } | { status: "error"; message: string };

export interface CaptureRun {
  status: "idle" | "running" | "done";
  startedAt: string | null;
  /** Theme the run started with, so labels don't change along with the form. */
  theme: UiTheme;
  jobs: CaptureJob[];
  results: Record<string, JobResult>;
  sessionPaths: string[];
  error: string | null;
}

/** path = `<site>/<timestamp>` */
export interface SessionSummary {
  path: string;
  site: string;
  createdAt: string;
  files: OutputFile[];
}

/** Rectangle in CSS px, measured from the top-left of the page. */
export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedSection extends Region {
  /** Tag plus id or first class, e.g. `section.hero`. */
  label: string;
  /** Identifies the element across viewports: DOM path, id and class + index. Two sections match when they share a key. */
  keys: string[];
}

/** One preset's full-page load; `width`/`height` are the full page in CSS px. */
export interface InspectedPage {
  preset: Preset;
  width: number;
  height: number;
  sections: DetectedSection[];
}

/** A page loaded in one or more presets for picking sections. */
export interface Inspection {
  id: string;
  url: string;
  host: string;
  pages: InspectedPage[];
}

/** One cut-out: a region of one preset's page, saved as `sectie-<section>`. */
export interface Crop extends Region {
  presetId: string;
  section: number;
  /** Element keys of a detected section, so the live page can scroll to it; absent for a dragged frame. */
  keys?: string[];
}
