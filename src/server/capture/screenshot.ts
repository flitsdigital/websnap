import "server-only";
import type { Page } from "playwright";
import sharp from "sharp";
import type { Preset } from "@/lib/types";
import type { Tint } from "../frames";

export const MAX_FULL_PAGE = 16_000;
// Chromium can't capture much more than ~16k device pixels at once, so long pages go in segments.
const SEGMENT_DEVICE_PX = 12_000;

export async function takeScreenshot(page: Page, preset: Preset, fullPage: boolean): Promise<Buffer> {
  const base = { type: "png", animations: "disabled", caret: "hide", timeout: 60_000 } as const;
  if (!fullPage) return page.screenshot(base);

  const height = Math.min(await page.evaluate(() => document.documentElement.scrollHeight), MAX_FULL_PAGE);
  const segment = Math.floor(SEGMENT_DEVICE_PX / preset.dpr);
  const parts: { top: number; input: Buffer }[] = [];
  for (let y = 0; y < height; y += segment) {
    const clip = { x: 0, y, width: preset.width, height: Math.min(segment, height - y) };
    parts.push({ top: y * preset.dpr, input: await page.screenshot({ ...base, fullPage: true, clip }) });
  }
  if (parts.length === 1) return parts[0].input;

  return sharp({
    create: { width: preset.width * preset.dpr, height: height * preset.dpr, channels: 4, background: "#ffffff" },
    limitInputPixels: false,
  })
    .composite(parts.map((part) => ({ ...part, left: 0 })))
    .png()
    .toBuffer();
}

/** Average colour of the top rows; iOS Safari tints the status bar with the site. */
export async function sampleTopTint(png: Buffer): Promise<Tint> {
  const { width = 1 } = await sharp(png).metadata();
  const [r, g, b] = await sharp(png, { limitInputPixels: false })
    .extract({ left: 0, top: 0, width, height: 6 })
    .resize(1, 1, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer();
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return { background: `rgb(${r},${g},${b})`, foreground: luminance > 0.6 ? "#000" : "#fff" };
}
