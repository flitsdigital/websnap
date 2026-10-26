"use client";

import { countScreenshots, formatCount, type CaptureMode, type FormSettings } from "@/lib/settings";
import { parseUrlList } from "@/lib/url";
import { SectionLabel } from "../ui/section-label";
import { SegmentedControl } from "../ui/segmented-control";
import { AdvancedOptions } from "./advanced-options";
import { PresetPicker } from "./preset-picker";
import { UiVariantPicker } from "./ui-variant-picker";

interface CaptureFormProps {
  urls: string;
  onUrlsChange: (urls: string) => void;
  settings: FormSettings;
  onSettingsChange: (update: (settings: FormSettings) => FormSettings) => void;
  /** A capture run or page load is in progress. */
  busy: boolean;
  onSubmit: () => void;
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function CaptureForm({ urls, onUrlsChange, settings, onSettingsChange, busy, onSubmit }: CaptureFormProps) {
  const sections = settings.mode === "sections";
  const urlCount = parseUrlList(urls).length;
  const formats = formatCount(settings);
  const variants = settings.uiVariants.length;
  const total = countScreenshots(urlCount, settings);
  const reason = !urlCount
    ? "Vul eerst een website in"
    : sections
      ? !settings.sectionPresetIds.length
        ? "Kies minimaal één formaat"
        : !settings.sectionUiVariants.length
          ? "Kies minimaal één UI-variant"
          : null
      : !formats
        ? "Kies minimaal één formaat"
        : !variants
          ? "Kies minimaal één UI-variant"
          : null;
  const submit = () => {
    if (!reason && !busy) onSubmit();
  };

  const buttonLabel = sections
    ? busy
      ? "Laden…"
      : "Pagina laden"
    : busy
      ? "Bezig…"
      : `Maak ${plural(total, "screenshot", "screenshots")}`;
  const hint = sections
    ? "Daarna kies je secties in de preview · ⌘ + Enter"
    : `${plural(formats, "formaat", "formaten")} × ${plural(variants, "UI-variant", "UI-varianten")} · ⌘ + Enter`;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="flex flex-1 flex-col"
    >
      <div className="flex flex-1 flex-col gap-[22px] p-5">
        <SegmentedControl<CaptureMode>
          label="Wat wil je maken?"
          value={settings.mode}
          options={[
            { value: "screens", label: "Screenshots" },
            { value: "sections", label: "Secties" },
          ]}
          onChange={(mode) => onSettingsChange((current) => ({ ...current, mode }))}
        />

        <section>
          <label htmlFor="urls">
            <SectionLabel as="span">Website</SectionLabel>
          </label>
          <div className="mt-2.5 flex items-start gap-1 rounded-[10px] border-[1.5px] border-line-strong bg-surface px-3 py-2.5 transition-shadow focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-tint">
            <span aria-hidden="true" className="pt-px font-mono text-[13px] leading-[22px] text-muted">
              https://
            </span>
            <textarea
              id="urls"
              value={urls}
              rows={Math.min(5, Math.max(1, urls.split("\n").length))}
              placeholder="jouwklant.nl"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              aria-describedby="urls-help"
              onChange={(event) => onUrlsChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  submit();
                }
              }}
              className="min-w-0 flex-1 resize-none bg-transparent text-[15px] leading-[22px] outline-none placeholder:text-line-strong focus-visible:outline-none"
            />
          </div>
          <p id="urls-help" className="mt-2 text-xs text-muted">
            {sections
              ? urlCount > 1
                ? "Secties werken per pagina: alleen de eerste URL wordt geladen."
                : "Je kiest straks secties uit deze pagina."
              : "Meerdere sites of pagina's? Zet ze onder elkaar."}
          </p>
        </section>

        <PresetPicker settings={settings} onChange={onSettingsChange} />

        <UiVariantPicker settings={settings} onChange={onSettingsChange} />

        {!sections && (
          <>
            <section aria-labelledby="pagina-label">
              <SectionLabel id="pagina-label">Pagina</SectionLabel>
              <SegmentedControl
                label="Pagina"
                className="mt-2.5"
                value={settings.fullPage ? "full" : "fold"}
                options={[
                  { value: "fold", label: "Boven de vouw" },
                  { value: "full", label: "Volledige pagina" },
                ]}
                onChange={(value) => onSettingsChange((current) => ({ ...current, fullPage: value === "full" }))}
              />
            </section>
          </>
        )}

        <AdvancedOptions settings={settings} onChange={onSettingsChange} />
      </div>

      <div className="sticky bottom-0 border-t border-line bg-surface px-5 py-4">
        <button
          type="submit"
          disabled={Boolean(reason) || busy}
          className="h-[46px] w-full rounded-[10px] bg-ink text-[15px] font-semibold text-white transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-line-strong"
        >
          {buttonLabel}
        </button>
        <p className="mt-2 text-center text-xs text-muted">{reason ?? hint}</p>
      </div>
    </form>
  );
}
