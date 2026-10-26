"use client";

import { UI_VARIANTS } from "@/lib/presets";
import type { FormSettings } from "@/lib/settings";
import type { UiVariant } from "@/lib/types";
import { SectionLabel } from "../ui/section-label";
import { SegmentedControl } from "../ui/segmented-control";
import { SelectCard } from "../ui/select-card";

type Update = (update: (settings: FormSettings) => FormSettings) => void;

/** Tiny browser sketch; hex colours mirror the real bars. */
function Wireframe({ ui, dark }: { ui: UiVariant; dark: boolean }) {
  return (
    <div className="h-11 w-full overflow-hidden rounded-[5px] border border-line-strong bg-white">
      {ui === "chrome" && (
        <>
          <div className="flex h-2.5 items-end pl-1.5" style={{ background: dark ? "#1f2023" : "#e8ebef" }}>
            <div className="h-[7px] w-5 rounded-t-[3px]" style={{ background: dark ? "#35363a" : "#ffffff" }} />
          </div>
          <div
            className="flex h-3 items-center px-1"
            style={{
              background: dark ? "#35363a" : "#ffffff",
              borderBottom: `1px solid ${dark ? "#2a2b2e" : "#e3e3e3"}`,
            }}
          >
            <div className="h-1.5 flex-1 rounded-full" style={{ background: dark ? "#202124" : "#f1f3f4" }} />
          </div>
        </>
      )}
      {ui === "safari" && (
        <div
          className="flex h-3.5 items-center justify-center"
          style={{
            background: dark ? "#2c2c2e" : "#f6f6f6",
            borderBottom: `1px solid ${dark ? "#161617" : "#d9d9d9"}`,
          }}
        >
          <div className="h-1.5 w-1/2 rounded-full" style={{ background: dark ? "#48484a" : "#e2e2e4" }} />
        </div>
      )}
    </div>
  );
}

export function UiVariantPicker({ settings, onChange }: { settings: FormSettings; onChange: Update }) {
  const sections = settings.mode === "sections";
  const listKey = sections ? "sectionUiVariants" : "uiVariants";
  const toggle = (id: UiVariant) =>
    onChange((current) => {
      const ids = current[listKey].includes(id)
        ? current[listKey].filter((other) => other !== id)
        : [...current[listKey], id];
      return { ...current, [listKey]: UI_VARIANTS.map((variant) => variant.id).filter((other) => ids.includes(other)) };
    });

  return (
    <section aria-labelledby="ui-label">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel id="ui-label">Browser-UI</SectionLabel>
        <SegmentedControl
          label="Thema van de browser-UI"
          className="w-[150px]"
          value={settings.theme}
          options={[
            { value: "light", label: "Licht" },
            { value: "dark", label: "Donker" },
          ]}
          onChange={(theme) => onChange((current) => ({ ...current, theme }))}
        />
      </div>
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        {UI_VARIANTS.map((variant) => (
          <SelectCard
            key={variant.id}
            selected={settings[listKey].includes(variant.id)}
            onClick={() => toggle(variant.id)}
            className="p-2"
          >
            <Wireframe ui={variant.id} dark={settings.theme === "dark"} />
            <span className="mt-2 block text-[13px] font-medium">{variant.label}</span>
          </SelectCard>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">
        {sections
          ? "Zonder UI: precies de sectie. Met UI: een volledig scherm vanaf de sectie, op het vaste formaat."
          : "Desktop krijgt de macOS-variant, iPhone de iOS-variant."}
      </p>
    </section>
  );
}
