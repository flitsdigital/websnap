import "server-only";
import type { BrowserContext, Page } from "playwright";
import { displayHost } from "@/lib/url";
import type { PageMeta } from "../frames";

export async function readPageMeta(page: Page, context: BrowserContext): Promise<PageMeta> {
  const info = await page.evaluate(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel~="icon"], link[rel="shortcut icon"]');
    return {
      title: document.title.trim(),
      href: location.href,
      icon: link?.href || new URL("/favicon.ico", location.href).href,
    };
  });
  const url = new URL(info.href);
  return {
    title: info.title,
    host: displayHost(info.href),
    path: (url.pathname + url.search).replace(/\/$/, ""),
    favicon: await fetchFavicon(context, info.icon),
  };
}

async function fetchFavicon(context: BrowserContext, href: string): Promise<string | null> {
  if (href.startsWith("data:image/")) return href;
  try {
    const response = await context.request.get(href, { timeout: 8_000 });
    const type = (response.headers()["content-type"] ?? "").split(";")[0].trim();
    if (!response.ok() || !/image|icon|svg/.test(type)) return null;
    return `data:${type};base64,${(await response.body()).toString("base64")}`;
  } catch {
    return null;
  }
}
