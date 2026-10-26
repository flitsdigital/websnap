import "server-only";
import { chromium, type Browser } from "playwright";
import type { DeviceKind } from "@/lib/types";

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";

// Shared on globalThis so it survives hot reloads in dev.
const shared = globalThis as typeof globalThis & { websnapBrowser?: Promise<Browser> };

export async function getBrowser(): Promise<Browser> {
  const current = await shared.websnapBrowser?.catch(() => null);
  if (current?.isConnected()) return current;
  const executablePath = process.env.WEBSNAP_CHROMIUM_PATH;
  shared.websnapBrowser = chromium.launch(executablePath ? { executablePath, args: ["--no-sandbox"] } : {});
  return shared.websnapBrowser;
}

export function userAgent(browser: Browser, kind: DeviceKind): string {
  if (kind === "mobile") return IPHONE_UA;
  const major = browser.version().split(".")[0];
  return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36`;
}
