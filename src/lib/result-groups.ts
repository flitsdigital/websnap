import { parseFileName } from "./file-name";
import { findPreset, PRESETS, UI_VARIANTS, uiLabel } from "./presets";
import type { CaptureRun, DeviceKind, JobResult, SessionSummary, UiVariant } from "./types";

export interface ResultItem {
  id: string;
  ui: UiVariant;
  section?: number | null;
  label: string;
  result: JobResult;
}

export interface ResultGroup {
  key: string;
  title: string;
  detail: string;
  kind: DeviceKind;
  items: ResultItem[];
}

export interface SiteResults {
  host: string;
  groups: ResultGroup[];
}

const detail = (width: number, height: number, dpr: number) => `${width} × ${height} @${dpr}x`;

function siteLabel(url: string): string {
  const { hostname, port, pathname, search } = new URL(url);
  return (hostname.replace(/^www\./, "") + (port ? `:${port}` : "") + pathname + search).replace(/\/$/, "");
}

export function groupRun(run: CaptureRun): SiteResults[] {
  const sites = new Map<string, SiteResults>();
  for (const job of run.jobs) {
    let site = sites.get(job.url);
    if (!site) sites.set(job.url, (site = { host: siteLabel(job.url), groups: [] }));
    let group = site.groups.find((candidate) => candidate.key === job.preset.id);
    if (!group) {
      const { id, label, kind, width, height, dpr } = job.preset;
      site.groups.push((group = { key: id, title: label, detail: detail(width, height, dpr), kind, items: [] }));
    }
    group.items.push({
      id: job.id,
      ui: job.ui,
      label: uiLabel(job.ui, run.theme),
      result: run.results[job.id] ?? { status: "pending" },
    });
  }
  return [...sites.values()];
}

export function groupSession(session: SessionSummary): SiteResults[] {
  const groups = new Map<string, ResultGroup>();
  for (const file of session.files) {
    const parsed = parseFileName(file.name);
    if (!parsed) continue;
    let group = groups.get(parsed.presetId);
    if (!group) {
      const preset = findPreset(parsed.presetId);
      const custom = /^custom-(\d+)x(\d+)$/.exec(parsed.presetId);
      const width = preset?.width ?? Number(custom?.[1] ?? file.width);
      const height = preset?.height ?? Number(custom?.[2] ?? file.height);
      groups.set(
        parsed.presetId,
        (group = {
          key: parsed.presetId,
          title: preset?.label ?? `Eigen ${width}×${height}`,
          detail: detail(width, height, Math.max(1, Math.round(file.width / width))),
          // shortcut: custom presets don't store their kind in the file name, so guess from the width.
          kind: preset?.kind ?? (width < 768 ? "mobile" : "desktop"),
          items: [],
        }),
      );
    }
    group.items.push({
      id: file.path,
      ui: parsed.ui,
      section: parsed.section,
      label:
        parsed.section === null
          ? uiLabel(parsed.ui, parsed.theme)
          : `Sectie ${parsed.section}${parsed.ui === "none" ? "" : ` · ${uiLabel(parsed.ui, parsed.theme)}`}`,
      result: { status: "done", file },
    });
  }

  const presetOrder = (key: string) => {
    const index = PRESETS.findIndex((preset) => preset.id === key);
    return index === -1 ? PRESETS.length : index;
  };
  const uiOrder = (ui: UiVariant) => UI_VARIANTS.findIndex((variant) => variant.id === ui);
  const sorted = [...groups.values()].sort((a, b) => presetOrder(a.key) - presetOrder(b.key));
  for (const group of sorted) {
    group.items.sort((a, b) => (a.section ?? 0) - (b.section ?? 0) || uiOrder(a.ui) - uiOrder(b.ui));
  }
  return [{ host: session.site, groups: sorted }];
}
