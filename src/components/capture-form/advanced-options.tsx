"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { FormSettings } from "@/lib/settings";
import { ChevronDownIcon } from "../icons";
import { SectionLabel } from "../ui/section-label";
import { Switch } from "../ui/switch";

type Update = (update: (settings: FormSettings) => FormSettings) => void;

const inputClass = "h-9 w-full rounded-lg border border-line-strong bg-surface px-2.5";

export function AdvancedOptions({ settings, onChange }: { settings: FormSettings; onChange: Update }) {
  const [open, setOpen] = useState(false);
  const update = (patch: Partial<FormSettings>) => onChange((current) => ({ ...current, ...patch }));

  return (
    <section className="border-t border-line pt-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="advanced-options"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between"
      >
        <SectionLabel as="span">Geavanceerd</SectionLabel>
        <ChevronDownIcon className={cn("size-4 text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div id="advanced-options" className="mt-4 space-y-4">
          <Switch
            label="Cookiebanners en chats verbergen"
            checked={settings.hidePopups}
            onChange={(hidePopups) => update({ hidePopups })}
          />
          <label className="block">
            <span className="mb-1 block">Extra wachten (seconden)</span>
            <input
              type="number"
              min={0}
              max={15}
              step={0.5}
              value={settings.extraDelaySeconds}
              onChange={(event) =>
                update({ extraDelaySeconds: Math.min(15, Math.max(0, Number(event.target.value) || 0)) })
              }
              className={cn(inputClass, "font-mono text-[13px]")}
            />
          </label>
          <label className="block">
            <span className="mb-1 block">Ook verbergen</span>
            <input
              type="text"
              value={settings.hideSelectors}
              placeholder=".promo-bar, #nieuwsbrief-popup"
              onChange={(event) => update({ hideSelectors: event.target.value })}
              className={cn(inputClass, "font-mono text-[13px]")}
            />
            <span className="mt-1 block text-xs text-muted">
              CSS-selectors, gescheiden door komma&apos;s. Voor banners en pop-ups die Websnap niet kent.
            </span>
          </label>
        </div>
      )}
    </section>
  );
}
