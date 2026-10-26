import type { InspectRequest } from "./capture-request";
import type { Crop, Inspection, SessionSummary, UiTheme, UiVariant } from "./types";

async function errorFrom(response: Response, fallback: string): Promise<Error> {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return new Error(data?.error ?? fallback);
}

export async function fetchSessions(): Promise<{ outputDir: string; sessions: SessionSummary[] }> {
  const response = await fetch("/api/sessions", { cache: "no-store" });
  if (!response.ok) throw await errorFrom(response, "Sessies laden mislukt.");
  return response.json();
}

export async function downloadZip(paths: string[]): Promise<void> {
  const response = await fetch("/api/zip", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paths }),
  });
  if (!response.ok) throw await errorFrom(response, "Zip maken mislukt.");
  const url = URL.createObjectURL(await response.blob());
  Object.assign(document.createElement("a"), { href: url, download: "websnap.zip" }).click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function revealPath(path: string): Promise<void> {
  const response = await fetch("/api/reveal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  if (!response.ok) throw await errorFrom(response, "Map openen mislukt.");
}

const UNREACHABLE = "Websnap is niet bereikbaar. Draait de server nog?";

async function postJson(url: string, body: unknown): Promise<Response> {
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(UNREACHABLE);
  }
}

export async function inspectPage(request: InspectRequest): Promise<Inspection> {
  const response = await postJson("/api/inspect", request);
  if (!response.ok) throw await errorFrom(response, "Pagina laden mislukt.");
  return response.json();
}

export async function cropRegions(
  id: string,
  crops: Crop[],
  uiVariants: UiVariant[],
  theme: UiTheme,
): Promise<SessionSummary> {
  const response = await postJson("/api/regions", { id, crops, uiVariants, theme });
  if (!response.ok) throw await errorFrom(response, "Knippen mislukt.");
  return response.json();
}

export function previewUrl(id: string, presetId: string): string {
  return `/api/inspect?id=${encodeURIComponent(id)}&preset=${encodeURIComponent(presetId)}`;
}
