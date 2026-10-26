"use client";

import { useState } from "react";
import type { Pick } from "@/hooks/use-inspection";
import { cropRegions } from "@/lib/client-actions";
import type { Crop, DetectedSection, Inspection, Region, SessionSummary, UiTheme, UiVariant } from "@/lib/types";
import { CloseIcon } from "../icons";
import { matchSection, PagePreview, pickBox, type HoverTarget } from "./page-preview";

interface SectionPickerProps {
  inspection: Inspection;
  picks: Pick[];
  onPicksChange: (update: (picks: Pick[]) => Pick[]) => void;
  onCropped: (session: SessionSummary) => void;
  uiVariants: UiVariant[];
  theme: UiTheme;
}

const MAX_PICKS = 30;

const sameBox = (a: Region, b: Region) => a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

export function SectionPicker({ inspection, picks, onPicksChange, onCropped, uiVariants, theme }: SectionPickerProps) {
  const { pages } = inspection;
  const [hover, setHover] = useState<HoverTarget | null>(null);
  const [cropping, setCropping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const crops: Crop[] = pages.flatMap((page) =>
    picks.flatMap((pick, index) => {
      const box = pickBox(pick, page);
      if (!box) return [];
      const { x, y, width, height } = box;
      // The matched section's own keys: they describe the element as it exists in this preset's page.
      const keys = "keys" in box ? (box as DetectedSection).keys : undefined;
      return [{ presetId: page.preset.id, section: index + 1, x, y, width, height, keys }];
    }),
  );

  const add = (pick: Pick) => onPicksChange((current) => (current.length >= MAX_PICKS ? current : [...current, pick]));

  const toggleSection = (presetId: string, section: DetectedSection) =>
    onPicksChange((current) => {
      const page = pages.find((candidate) => candidate.preset.id === presetId)!;
      if (current.some((pick) => "keys" in pick && matchSection(page.sections, pick.keys) === section)) {
        return current.filter((pick) => !("keys" in pick && matchSection(page.sections, pick.keys) === section));
      }
      if (current.length >= MAX_PICKS) return current;
      return [...current, { id: crypto.randomUUID(), label: section.label, keys: section.keys }];
    });

  const toggleFrame = (presetId: string, label: string, region: Region) => {
    const existing = picks.find(
      (pick) => "region" in pick && pick.presetId === presetId && sameBox(pick.region, region),
    );
    if (existing) onPicksChange((current) => current.filter((pick) => pick !== existing));
    else add({ id: crypto.randomUUID(), label: `Eigen kader · ${label}`, presetId, region });
  };

  const crop = async () => {
    setCropping(true);
    setError(null);
    try {
      onCropped(await cropRegions(inspection.id, crops, uiVariants, theme));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Knippen mislukt.");
    } finally {
      setCropping(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="sticky top-0 z-10 -mx-6 -mt-6 border-b border-line bg-ground/95 px-6 pt-6 pb-4 backdrop-blur md:-mx-7 md:px-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-[22px] font-semibold tracking-[-0.015em]">{inspection.host}</h1>
            <p className="mt-0.5 font-mono text-xs text-muted">{pages.map((page) => page.preset.label).join(" + ")}</p>
          </div>
          <div className="flex items-center gap-2">
            {picks.length > 0 && (
              <button
                type="button"
                onClick={() => onPicksChange(() => [])}
                className="h-[38px] rounded-lg px-3 font-medium text-muted hover:bg-soft hover:text-ink"
              >
                Wis selectie
              </button>
            )}
            <button
              type="button"
              onClick={crop}
              disabled={!crops.length || !uiVariants.length || cropping}
              className="h-[38px] rounded-lg bg-ink px-4 font-semibold text-white hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-line-strong"
            >
              {cropping
                ? "Knippen…"
                : picks.length
                  ? `Knip ${picks.length} ${picks.length === 1 ? "sectie" : "secties"} · ${crops.length * uiVariants.length} ${crops.length * uiVariants.length === 1 ? "bestand" : "bestanden"}`
                  : "Kies een sectie"}
            </button>
          </div>
        </div>
        <p className="mt-3 text-[13px] text-muted">
          Klik op een sectie: hij wordt in elk formaat geselecteerd. Sleep zelf een kader voor alleen dat formaat.
        </p>
        {picks.length > 0 && (
          <ol className="mt-3 flex flex-wrap gap-1.5">
            {picks.map((pick, index) => {
              const missing = pages.filter((page) => !pickBox(pick, page)).map((page) => page.preset.label);
              return (
                <li
                  key={pick.id}
                  className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border border-line bg-surface px-1 text-xs"
                >
                  <span className="grid size-5 flex-none place-items-center rounded-full bg-accent font-semibold text-white">
                    {index + 1}
                  </span>
                  <span className="truncate font-mono text-muted">{pick.label}</span>
                  {"keys" in pick && missing.length > 0 && (
                    <span className="flex-none text-danger">niet op {missing.join(", ")}</span>
                  )}
                  <button
                    type="button"
                    aria-label={`Sectie ${index + 1} weghalen`}
                    onClick={() => onPicksChange((current) => current.filter((other) => other.id !== pick.id))}
                    className="grid size-5 flex-none place-items-center rounded-full text-muted hover:bg-soft hover:text-ink"
                  >
                    <CloseIcon className="size-3" />
                  </button>
                </li>
              );
            })}
          </ol>
        )}
        {error && (
          <div role="alert" className="mt-3 rounded-lg border border-danger/25 bg-[#fdecea] px-4 py-3 text-danger">
            {error}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-start gap-6">
        {pages.map((page) => (
          <PagePreview
            key={page.preset.id}
            inspectionId={inspection.id}
            page={page}
            picks={picks}
            hover={hover}
            onHover={setHover}
            onToggleSection={(section) => toggleSection(page.preset.id, section)}
            onToggleFrame={(region) => toggleFrame(page.preset.id, page.preset.label, region)}
          />
        ))}
      </div>
    </div>
  );
}
