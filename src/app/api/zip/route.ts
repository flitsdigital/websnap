import JSZip from "jszip";
import { z } from "zod";
import { readOutputPng } from "@/server/storage";

const schema = z.object({ paths: z.array(z.string().max(500)).min(1).max(200) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Selecteer 1 tot 200 screenshots." }, { status: 400 });

  const zip = new JSZip();
  const names = new Set<string>();
  for (const relative of new Set(parsed.data.paths)) {
    const file = await readOutputPng(relative);
    if (!file) continue;
    // Same file name from two sessions: keep both by falling back to the folder path.
    const name = names.has(file.name) ? relative : file.name;
    names.add(name);
    zip.file(name, file.data);
  }
  if (!names.size) return Response.json({ error: "Geen van de bestanden bestaat nog." }, { status: 404 });

  // PNGs are already compressed; storing them keeps zipping fast.
  const data = await zip.generateAsync({ type: "uint8array", compression: "STORE" });
  return new Response(new Uint8Array(data), {
    headers: { "Content-Type": "application/zip", "Content-Disposition": 'attachment; filename="websnap.zip"' },
  });
}
