import "server-only";
import type { DeviceKind, UiTheme, UiVariant } from "@/lib/types";
import { chromeDesktop, safariDesktop } from "./desktop";
import { chromeIphone, safariIphone } from "./mobile";
import type { Frame, PageMeta, Tint } from "./types";

const HEIGHTS: Record<DeviceKind, Record<UiVariant, { top: number; bottom: number }>> = {
  desktop: { none: { top: 0, bottom: 0 }, chrome: { top: 84, bottom: 0 }, safari: { top: 52, bottom: 0 } },
  mobile: { none: { top: 0, bottom: 0 }, chrome: { top: 106, bottom: 82 }, safari: { top: 54, bottom: 86 } },
};

export function uiHeights(kind: DeviceKind, ui: UiVariant): { top: number; bottom: number } {
  return HEIGHTS[kind][ui];
}

export function buildFrame(
  kind: DeviceKind,
  ui: UiVariant,
  width: number,
  theme: UiTheme,
  meta: PageMeta,
  tint: Tint | null,
): Frame | null {
  if (ui === "none") return null;
  const { top, bottom } = uiHeights(kind, ui);
  if (kind === "desktop") {
    return { top: (ui === "chrome" ? chromeDesktop : safariDesktop)(width, top, theme, meta), bottom: null };
  }
  return ui === "chrome"
    ? chromeIphone(width, top, bottom, theme, meta)
    : safariIphone(width, top, bottom, theme, meta, tint);
}

export type { PageMeta, Tint } from "./types";
