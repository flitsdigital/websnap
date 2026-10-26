import { readOutputPng } from "@/server/storage";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const file = await readOutputPng(params.get("path") ?? "");
  if (!file) return Response.json({ error: "Bestand niet gevonden." }, { status: 404 });

  const headers: Record<string, string> = { "Content-Type": "image/png", "Cache-Control": "private, max-age=3600" };
  if (params.get("download") === "1") headers["Content-Disposition"] = `attachment; filename="${file.name}"`;
  return new Response(new Uint8Array(file.data), { headers });
}
