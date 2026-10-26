"use client";

import { CUSTOM_LIMITS, PRESETS } from "@/lib/presets";
import { clampSize, type FormSettings } from "@/lib/settings";
import type { Preset } from "@/lib/types";
import { LaptopIcon, MonitorIcon, PhoneIcon, PlusIcon } from "../icons";
import { SectionLabel } from "../ui/section-label";
import { SegmentedControl } from "../ui/segmented-control";
import { SelectCard } from "../ui/select-card";

type Update = (update: (settings: FormSettings) => FormSettings) => void;

function PresetIcon({ preset }: { preset: Preset }) {
  if (preset.kind === "mobile") return <PhoneIcon />;
  return preset.width > 1600 ? <MonitorIcon /> : <LaptopIcon />;
}

export function PresetPicker({ settings, onChange }: { settings: FormSettings; onChange: Update }) {
  const { custom } = settings;
  const setCustom = (patch: Partial<FormSettings["custom"]>) =>
    onChange((current) => ({ ...current, custom: { ...current.custom, ...patch } }));
  const sections = settings.mode === "sections";
  const listKey = sections ? "sectionPresetIds" : "presetIds";
  const isSelected = (id: string) => settings[listKey].includes(id);
  const toggle = (id: string) =>
    onChange((current) => {
      const ids = current[listKey].includes(id)
        ? current[listKey].filter((other) => other !== id)
        : [...current[listKey], id];
      return { ...current, [listKey]: PRESETS.map((preset) => preset.id).filter((other) => ids.includes(other)) };
    });

  return (
    <section aria-labelledby="formaat-label">
      <SectionLabel id="formaat-label">Formaat</SectionLabel>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {PRESETS.map((preset) => (
          <SelectCard key={preset.id} selected={isSelected(preset.id)} onClick={() => toggle(preset.id)}>
            <PresetIcon preset={preset} />
            <span className="mt-2 block font-semibold">{preset.label}</span>
            <span className="mt-0.5 block font-mono text-[11.5px] text-muted">
              {preset.width} × {preset.height} · {preset.dpr}x
            </span>
          </SelectCard>
        ))}

        {sections ? null : custom.enabled ? (
          <div className="col-span-2 space-y-3 rounded-[10px] border-[1.5px] border-accent bg-accent-soft p-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Eigen formaat</span>
              <button
                type="button"
                onClick={() => setCustom({ enabled: false })}
                className="text-xs font-medium text-muted underline-offset-2 hover:text-danger hover:underline"
              >
                Verwijderen
              </button>
            </div>
            <div className="flex items-end gap-2">
              <label className="min-w-0 flex-1">
                <span className="mb-1 block text-xs text-muted">Breedte</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={CUSTOM_LIMITS.width.min}
                  max={CUSTOM_LIMITS.width.max}
                  value={custom.width || ""}
                  onChange={(event) => setCustom({ width: Number(event.target.value) })}
                  onBlur={() => setCustom({ width: clampSize(custom.width, CUSTOM_LIMITS.width) })}
                  className="h-9 w-full rounded-lg border border-line-strong bg-surface px-2.5 font-mono text-[13px]"
                />
              </label>
              <span className="pb-2 text-muted">×</span>
              <label className="min-w-0 flex-1">
                <span className="mb-1 block text-xs text-muted">Hoogte</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={CUSTOM_LIMITS.height.min}
                  max={CUSTOM_LIMITS.height.max}
                  value={custom.height || ""}
                  onChange={(event) => setCustom({ height: Number(event.target.value) })}
                  onBlur={() => setCustom({ height: clampSize(custom.height, CUSTOM_LIMITS.height) })}
                  className="h-9 w-full rounded-lg border border-line-strong bg-surface px-2.5 font-mono text-[13px]"
                />
              </label>
              <label className="flex-none">
                <span className="mb-1 block text-xs text-muted">Dichtheid</span>
                <select
                  value={custom.dpr}
                  onChange={(event) => setCustom({ dpr: Number(event.target.value) as 1 | 2 | 3 })}
                  className="h-9 rounded-lg border border-line-strong bg-surface px-2 font-mono text-[13px]"
                >
                  <option value={1}>1x</option>
                  <option value={2}>2x</option>
                  <option value={3}>3x</option>
                </select>
              </label>
            </div>
            <SegmentedControl
              label="Soort apparaat"
              value={custom.kind}
              options={[
                { value: "desktop", label: "Desktop" },
                { value: "mobile", label: "Mobiel" },
              ]}
              onChange={(kind) => setCustom({ kind })}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCustom({ enabled: true })}
            className="col-span-2 flex h-11 items-center justify-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-line-strong font-medium text-muted hover:border-ink hover:text-ink"
          >
            <PlusIcon className="size-4" />
            Eigen formaat
          </button>
        )}
      </div>
    </section>
  );
}
