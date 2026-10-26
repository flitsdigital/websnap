import { spawn } from "node:child_process";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { outputDir, resolveOutputPath } from "@/server/storage";

const schema = z.object({ path: z.string().max(500) });

function revealCommand(target: string, isFile: boolean): [string, string[]] {
  if (process.platform === "darwin") return ["open", isFile ? ["-R", target] : [target]];
  if (process.platform === "win32") return ["explorer", [isFile ? `/select,${target}` : target]];
  return ["xdg-open", [isFile ? path.dirname(target) : target]];
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Ongeldig pad." }, { status: 400 });

  const target = resolveOutputPath(parsed.data.path);
  if (target === outputDir()) await mkdir(/*turbopackIgnore: true*/ target, { recursive: true });
  const info = target ? await stat(/*turbopackIgnore: true*/ target).catch(() => null) : null;
  const isFile = Boolean(info?.isFile() && target?.toLowerCase().endsWith(".png"));
  if (!target || !info || (!info.isDirectory() && !isFile)) {
    return Response.json({ error: "Map of bestand niet gevonden." }, { status: 404 });
  }

  const [command, args] = revealCommand(target, isFile);
  spawn(/*turbopackIgnore: true*/ command, args, { detached: true, stdio: "ignore" })
    .on("error", () => {})
    .unref();
  return new Response(null, { status: 204 });
}
