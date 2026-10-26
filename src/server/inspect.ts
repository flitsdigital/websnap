import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { BrowserContext, Page } from "playwright";
import sharp from "sharp";
import { sectionFileName } from "@/lib/file-name";
import type {
  CaptureOptions,
  Crop,
  InspectedPage,
  Inspection,
  OutputFile,
  Preset,
  SessionSummary,
  UiTheme,
  UiVariant,
} from "@/lib/types";
import { displayHost, slugifyHost } from "@/lib/url";
import { loadPage } from "./capture/capture-preset";
import { composeWithFrame } from "./capture/compose";
import { readPageMeta } from "./capture/page-meta";
import { detectSections } from "./capture/sections";
import { sampleTopTint, takeScreenshot } from "./capture/screenshot";
import { scrollToSection } from "./capture/scroll-to-section";
import { buildFrame, uiHeights, type PageMeta } from "./frames";
import { InvalidRequestError, runExclusive } from "./run-capture";
import { newSessionPath, saveImage } from "./storage";

type LoadOptions = Pick<CaptureOptions, "hidePopups" | "hideSelectors" | "extraDelayMs">;

interface LivePage {
  context: BrowserContext;
  page: Page;
}

interface Stored {
  inspection: Inspection;
  options: LoadOptions;
  /**
   * Pages left open after loading, per preset id, so cutting with browser UI can scroll the real page to a section
   * (sticky navbar included). Only the latest inspection keeps them; the others are closed to save memory.
   */
  live: Map<string, LivePage>;
  /** Full-resolution full-page PNG per preset id. Crops come from these, so the result is exactly the preview. */
  files: Map<string, string>;
  previews: Map<string, Buffer>;
  /** Title, host and favicon for the browser bars. */
  meta: PageMeta;
}

// Keeps a few recent pages so cutting again doesn't need a reload; older ones are deleted.
const MAX_STORED = 5;
const PREVIEW_WIDTH = 1600;

const shared = globalThis as typeof globalThis & { websnapInspections?: Map<string, Stored> };
const store = (shared.websnapInspections ??= new Map<string, Stored>());
const cacheDir = path.join(os.tmpdir(), "websnap");

const removeFiles = (files: Iterable<string>) =>
  Promise.all([...files].map((file) => rm(/*turbopackIgnore: true*/ file, { force: true })));

async function closeLive(stored: Stored) {
  // Entries kept on globalThis from before a hot reload may not have `live` yet.
  if (!stored.live) return;
  await Promise.all([...stored.live.values()].map(({ context }) => context.close().catch(() => {})));
  stored.live.clear();
}

export function inspectPage(url: string, presets: Preset[], options: LoadOptions): Promise<Inspection> {
  return runExclusive(async () => {
    const id = randomUUID();
    const files = new Map<string, string>();
    const live = new Map<string, LivePage>();
    await mkdir(/*turbopackIgnore: true*/ cacheDir, { recursive: true });
    for (const other of store.values()) await closeLive(other);

    // Presets load in parallel (separate contexts): most of the time is waiting on the site, not CPU.
    const results = await Promise.allSettled(
      presets.map(async (preset): Promise<InspectedPage & { meta: PageMeta }> => {
        const { context, page } = await loadPage(url, preset, options);
        live.set(preset.id, { context, page });
        try {
          const meta = await readPageMeta(page, context);
          const sections = await detectSections(page);
          const png = await takeScreenshot(page, preset, true);
          const { height = 0 } = await sharp(png, { limitInputPixels: false }).metadata();
          const file = path.join(cacheDir, `${id}-${preset.id}.png`);
          await writeFile(/*turbopackIgnore: true*/ file, png);
          files.set(preset.id, file);
          return { preset, width: preset.width, height: Math.round(height / preset.dpr), sections, meta };
        } catch (error) {
          await context.close();
          live.delete(preset.id);
          throw error;
        }
      }),
    );
    const failed = results.find((result) => result.status === "rejected");
    if (failed) {
      await Promise.all([...live.values()].map(({ context }) => context.close()));
      await removeFiles(files.values());
      throw failed.reason;
    }
    const loaded = results.map(
      (result) => (result as PromiseFulfilledResult<InspectedPage & { meta: PageMeta }>).value,
    );
    const pages = loaded.map(({ preset, width, height, sections }) => ({ preset, width, height, sections }));

    const inspection: Inspection = { id, url, host: displayHost(url), pages };
    store.set(id, { inspection, options, live, files, previews: new Map(), meta: loaded[0].meta });
    for (const [oldId, old] of store) {
      if (store.size <= MAX_STORED) break;
      store.delete(oldId);
      await closeLive(old);
      await removeFiles(old.files.values());
    }
    return inspection;
  });
}

/** Scaled-down JPEG of one preset's page for the picker; null when it is gone. */
export async function previewImage(id: string, presetId: string): Promise<Buffer | null> {
  const stored = store.get(id);
  const file = stored?.files.get(presetId);
  if (!stored || !file) return null;
  let preview = stored.previews.get(presetId);
  if (!preview) {
    preview = await sharp(file, { limitInputPixels: false })
      .resize({ width: PREVIEW_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    stored.previews.set(presetId, preview);
  }
  return preview;
}

/** The open page for a preset; reloads it when it was closed (another page was loaded since) or crashed. */
async function livePage(stored: Stored, preset: Preset): Promise<LivePage> {
  const current = stored.live.get(preset.id);
  if (current && !current.page.isClosed()) return current;
  for (const other of store.values()) if (other !== stored) await closeLive(other);
  const reloaded = await loadPage(stored.inspection.url, preset, stored.options);
  stored.live.set(preset.id, reloaded);
  return reloaded;
}

export function cropRegions(
  id: string,
  crops: Crop[],
  uiVariants: UiVariant[],
  theme: UiTheme,
): Promise<SessionSummary> {
  // Exclusive: cutting with UI drives the live page, which a capture run or another load must not touch meanwhile.
  return runExclusive(async () => {
    const stored = store.get(id);
    if (!stored) throw new InvalidRequestError("Deze preview is verlopen. Laad de pagina opnieuw.");
    const { inspection, files: sources, meta } = stored;

    const site = slugifyHost(inspection.host);
    const sessionPath = newSessionPath(site);
    const files: OutputFile[] = [];
    const save = async (name: string, png: Buffer, width: number, height: number) => {
      files.push({ path: await saveImage(sessionPath, name, png), name, width, height });
    };

    for (const { preset } of inspection.pages) {
      const source = sources.get(preset.id);
      const presetCrops = crops.filter((crop) => crop.presetId === preset.id).sort((a, b) => a.section - b.section);
      if (!source || !presetCrops.length) continue;
      const { dpr } = preset;

      // Without UI: exactly the section, cut from the full-page image the preview shows.
      if (uiVariants.includes("none")) {
        const image = sharp(source, { limitInputPixels: false });
        const { width: imageWidth = 0, height: imageHeight = 0 } = await image.metadata();
        for (const crop of presetCrops) {
          const left = Math.min(Math.max(0, Math.round(crop.x * dpr)), imageWidth - 1);
          const top = Math.min(Math.max(0, Math.round(crop.y * dpr)), imageHeight - 1);
          const width = Math.min(Math.round(crop.width * dpr), imageWidth - left);
          const height = Math.min(Math.round(crop.height * dpr), imageHeight - top);
          if (width < 1 || height < 1) continue;
          const png = await image.clone().extract({ left, top, width, height }).png({ compressionLevel: 8 }).toBuffer();
          await save(sectionFileName(site, preset, crop.section, "none", theme, width, height), png, width, height);
        }
      }

      // With UI: a full screen of the preset, taken from the real page scrolled to the section.
      const framed = uiVariants.filter((ui) => ui !== "none");
      if (!framed.length) continue;
      const { context, page } = await livePage(stored, preset);
      const barPage = await context.newPage();
      try {
        for (const ui of framed) {
          const bars = uiHeights(preset.kind, ui);
          await page.setViewportSize({
            width: preset.width,
            height: Math.max(200, preset.height - bars.top - bars.bottom),
          });
          for (const crop of presetCrops) {
            await scrollToSection(page, crop.keys, crop.y);
            const screen = await takeScreenshot(page, preset, false);
            const tint = preset.kind === "mobile" && ui === "safari" ? await sampleTopTint(screen) : null;
            const frame = buildFrame(preset.kind, ui, preset.width, theme, meta, tint);
            const png = await composeWithFrame(screen, frame, barPage, preset.width);
            const { width = 0, height = 0 } = await sharp(png).metadata();
            await save(sectionFileName(site, preset, crop.section, ui, theme, width, height), png, width, height);
          }
        }
      } finally {
        await barPage.close();
        await page.setViewportSize({ width: preset.width, height: preset.height }).catch(() => {});
      }
    }
    if (!files.length) throw new InvalidRequestError("De selectie valt buiten de pagina.");
    files.sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
    return { path: sessionPath, site, createdAt: new Date().toISOString(), files };
  });
}
