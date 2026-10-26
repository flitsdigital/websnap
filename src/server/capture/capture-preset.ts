import "server-only";
import type { BrowserContext, Page } from "playwright";
import type { CaptureOptions, Preset, UiVariant } from "@/lib/types";
import { buildFrame, uiHeights } from "../frames";
import { getBrowser, userAgent } from "./browser";
import { composeWithFrame } from "./compose";
import { readPageMeta } from "./page-meta";
import { preparePage, warmUpPage } from "./prepare-page";
import { sampleTopTint, takeScreenshot } from "./screenshot";

/** An error whose message is already fit for the user. */
export class CaptureError extends Error {}

type LoadOptions = Pick<CaptureOptions, "hidePopups" | "hideSelectors" | "extraDelayMs">;

/** A fresh browser context that behaves like the preset's device. The caller closes it. */
export async function presetContext(preset: Preset): Promise<BrowserContext> {
  const browser = await getBrowser();
  const mobile = preset.kind === "mobile";
  return browser.newContext({
    viewport: { width: preset.width, height: preset.height },
    deviceScaleFactor: preset.dpr,
    isMobile: mobile,
    hasTouch: mobile,
    userAgent: userAgent(browser, preset.kind),
    locale: "nl-NL",
    colorScheme: "light",
    ignoreHTTPSErrors: true,
  });
}

/** Opens the page in a fresh context, ready to capture. The caller closes the context. */
export async function loadPage(
  url: string,
  preset: Preset,
  options: LoadOptions,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await presetContext(preset);
  try {
    const page = await context.newPage();
    const response = await page.goto(url, { waitUntil: "load", timeout: 45_000 });
    if (response && response.status() >= 400) throw new CaptureError(`De site gaf status ${response.status()} terug.`);
    await page.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => {});

    await preparePage(page, options);
    await warmUpPage(page);
    if (options.extraDelayMs > 0) await page.waitForTimeout(options.extraDelayMs);
    return { context, page };
  } catch (error) {
    await context.close();
    throw error;
  }
}

/** Loads the page once per preset; only the viewport changes per UI variant. */
export async function capturePreset(
  url: string,
  preset: Preset,
  variants: UiVariant[],
  options: CaptureOptions,
  onImage: (ui: UiVariant, png: Buffer) => Promise<void>,
): Promise<void> {
  const { context, page } = await loadPage(url, preset, options);
  try {
    const meta = await readPageMeta(page, context);
    const barPage = await context.newPage();

    for (const ui of variants) {
      const { top, bottom } = uiHeights(preset.kind, ui);
      // Shrinking the viewport (instead of cropping) lets layout and vh units adapt like in a real browser.
      await page.setViewportSize({ width: preset.width, height: Math.max(200, preset.height - top - bottom) });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(450);

      const shot = await takeScreenshot(page, preset, options.fullPage);
      const tint = preset.kind === "mobile" && ui === "safari" ? await sampleTopTint(shot) : null;
      const frame = buildFrame(preset.kind, ui, preset.width, options.theme, meta, tint);
      await onImage(ui, await composeWithFrame(shot, frame, barPage, preset.width));
    }
  } finally {
    await context.close();
  }
}
