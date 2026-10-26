import { inspectRequestSchema } from "@/lib/capture-request";
import { findPreset } from "@/lib/presets";
import type { Preset } from "@/lib/types";
import { normalizeUrl } from "@/lib/url";
import { inspectPage, previewImage } from "@/server/inspect";
import { errorMessage } from "@/server/run-capture";

export async function POST(request: Request) {
  const parsed = inspectRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const error = issue?.path[0] === "presetIds" ? issue.message : "Ongeldig verzoek. Controleer de instellingen.";
    return Response.json({ error }, { status: 400 });
  }
  const url = normalizeUrl(parsed.data.url);
  if (!url) return Response.json({ error: "Vul een geldige URL in, bijvoorbeeld klant.nl." }, { status: 400 });
  const presets = [...new Set(parsed.data.presetIds)]
    .map(findPreset)
    .filter((preset): preset is Preset => preset !== undefined);
  if (!presets.length) return Response.json({ error: "Kies minimaal één formaat." }, { status: 400 });

  try {
    const { hidePopups, hideSelectors, extraDelaySeconds } = parsed.data;
    const inspection = await inspectPage(url, presets, {
      hidePopups,
      hideSelectors,
      extraDelayMs: Math.round(extraDelaySeconds * 1000),
    });
    return Response.json(inspection, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 422 });
  }
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const preview = await previewImage(params.get("id") ?? "", params.get("preset") ?? "");
  if (!preview) return Response.json({ error: "Preview niet gevonden. Laad de pagina opnieuw." }, { status: 404 });
  return new Response(new Uint8Array(preview), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600" },
  });
}
