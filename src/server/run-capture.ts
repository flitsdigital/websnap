import "server-only";
import sharp from "sharp";
import type { CaptureRequest } from "@/lib/capture-request";
import { fileName } from "@/lib/file-name";
import { customPreset, findPreset } from "@/lib/presets";
import type { CaptureEvent, CaptureJob, CaptureOptions, Preset, UiVariant } from "@/lib/types";
import { displayHost, parseUrlList, slugifyHost } from "@/lib/url";
import { CaptureError, capturePreset } from "./capture/capture-preset";
import { saveImage, timestamp } from "./storage";

export class InvalidRequestError extends Error {}

export interface CapturePlan {
  jobs: CaptureJob[];
  urls: string[];
  presets: Preset[];
  uiVariants: UiVariant[];
  options: CaptureOptions;
}

const jobId = (url: string, preset: Preset, ui: UiVariant) => `${url}|${preset.id}|${ui}`;

export function planCapture(request: CaptureRequest): CapturePlan {
  const urls = parseUrlList(request.urls);
  if (!urls.length) throw new InvalidRequestError("Vul een geldige URL in, bijvoorbeeld klant.nl.");

  const presets = request.presetIds.map(findPreset).filter((preset): preset is Preset => preset !== undefined);
  if (request.customPreset) presets.push(customPreset(request.customPreset));
  const uniquePresets = [...new Map(presets.map((preset) => [preset.id, preset])).values()];
  if (!uniquePresets.length) throw new InvalidRequestError("Kies minimaal één formaat.");

  const uiVariants = [...new Set(request.uiVariants)];
  const jobs = urls.flatMap((url) =>
    uniquePresets.flatMap((preset) =>
      uiVariants.map((ui) => ({ id: jobId(url, preset, ui), url, host: displayHost(url), preset, ui })),
    ),
  );
  return {
    jobs,
    urls,
    presets: uniquePresets,
    uiVariants,
    options: {
      theme: request.theme,
      fullPage: request.fullPage,
      hidePopups: request.hidePopups,
      hideSelectors: request.hideSelectors,
      extraDelayMs: Math.round(request.extraDelaySeconds * 1000),
    },
  };
}

let queue: Promise<unknown> = Promise.resolve();

/** Never runs two browser jobs at once: Chromium memory and the output folders stay predictable. */
export function runExclusive<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task, task);
  queue = result.catch(() => {});
  return result;
}

export function errorMessage(error: unknown): string {
  if (error instanceof CaptureError || error instanceof InvalidRequestError) return error.message;
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("ERR_NAME_NOT_RESOLVED")) return "Domein niet gevonden. Klopt de URL?";
  if (message.includes("ERR_CONNECTION_REFUSED")) return "Geen verbinding. Draait de (lokale) server?";
  if (/ERR_CONNECTION|ERR_TUNNEL|ERR_INTERNET/.test(message)) return "Kon geen verbinding maken met de site.";
  if (/ERR_SSL|ERR_CERT/.test(message)) return "Beveiligde verbinding mislukt. Probeer het met http://.";
  if (message.includes("Timeout")) return "De pagina laadde niet binnen 45 seconden.";
  if (message.includes("Executable doesn't exist")) {
    return "Chromium ontbreekt. Draai eenmalig: npx playwright install chromium";
  }
  return (message.split("\n")[0] || "Onbekende fout.").slice(0, 200);
}

/** Runs the plan and reports progress through emit. Never throws. */
export function runCapture(plan: CapturePlan, emit: (event: CaptureEvent) => void): Promise<void> {
  return runExclusive(async () => {
    emit({ type: "start", jobs: plan.jobs });
    const stamp = timestamp();
    const sessionPaths: string[] = [];
    const usedPaths = new Set<string>();

    for (const url of plan.urls) {
      const site = slugifyHost(displayHost(url));
      // Two pages of the same site in one run get their own folder instead of overwriting each other.
      let sessionPath = `${site}/${stamp}`;
      for (let n = 2; usedPaths.has(sessionPath); n++) sessionPath = `${site}/${stamp}-${n}`;
      usedPaths.add(sessionPath);

      for (const preset of plan.presets) {
        const pending = new Set(plan.uiVariants.map((ui) => jobId(url, preset, ui)));
        try {
          await capturePreset(url, preset, plan.uiVariants, plan.options, async (ui, png) => {
            const { width = 0, height = 0 } = await sharp(png, { limitInputPixels: false }).metadata();
            const name = fileName(site, preset, ui, plan.options.theme, plan.options.fullPage, width, height);
            const path = await saveImage(sessionPath, name, png);
            if (!sessionPaths.includes(sessionPath)) sessionPaths.push(sessionPath);
            pending.delete(jobId(url, preset, ui));
            emit({ type: "shot", jobId: jobId(url, preset, ui), file: { path, name, width, height } });
          });
        } catch (error) {
          if (pending.size) emit({ type: "error", jobIds: [...pending], message: errorMessage(error) });
        }
      }
    }
    emit({ type: "done", sessionPaths });
  }).catch((error) => console.error("[websnap] capture run failed", error));
}
