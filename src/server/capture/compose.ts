import "server-only";
import type { Page } from "playwright";
import sharp from "sharp";
import type { Bar, Frame } from "../frames/types";

async function renderBar(barPage: Page, width: number, bar: Bar): Promise<Buffer> {
  await barPage.setViewportSize({ width, height: bar.height });
  await barPage.setContent(bar.html, { waitUntil: "load" });
  return barPage.screenshot({ type: "png", omitBackground: true });
}

export async function composeWithFrame(
  screenshot: Buffer,
  frame: Frame | null,
  barPage: Page,
  width: number,
): Promise<Buffer> {
  if (!frame) return screenshot;
  const top = await renderBar(barPage, width, frame.top);
  const bottom = frame.bottom ? await renderBar(barPage, width, frame.bottom) : null;

  const size = async (input: Buffer | null) => {
    if (!input) return { width: 0, height: 0 };
    const { width = 0, height = 0 } = await sharp(input, { limitInputPixels: false }).metadata();
    return { width, height };
  };
  const [topSize, shotSize, bottomSize] = await Promise.all([size(top), size(screenshot), size(bottom)]);

  const layers = [
    { input: top, top: 0, left: 0 },
    { input: screenshot, top: topSize.height, left: 0 },
  ];
  if (bottom) layers.push({ input: bottom, top: topSize.height + shotSize.height, left: 0 });

  return sharp({
    create: {
      width: shotSize.width,
      height: topSize.height + shotSize.height + bottomSize.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
    limitInputPixels: false,
  })
    .composite(layers)
    .png({ compressionLevel: 8 })
    .toBuffer();
}
