import "server-only";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseFileName } from "@/lib/file-name";
import type { OutputFile, SessionSummary } from "@/lib/types";

export function outputDir(): string {
  const configured = process.env.WEBSNAP_OUTPUT_DIR?.trim();
  if (configured) return path.resolve(configured.replace(/^~(?=$|[\\/])/, os.homedir()));
  const pictures = path.join(os.homedir(), "Pictures");
  return path.join(existsSync(/*turbopackIgnore: true*/ pictures) ? pictures : os.homedir(), "Websnap");
}

export function displayPath(absolute: string): string {
  const home = os.homedir();
  return absolute === home || absolute.startsWith(home + path.sep) ? "~" + absolute.slice(home.length) : absolute;
}

/** Absolute path for a path relative to the output dir, or null when it would escape it. */
export function resolveOutputPath(relative: string): string | null {
  const root = outputDir();
  const absolute = path.resolve(root, relative);
  return absolute === root || absolute.startsWith(root + path.sep) ? absolute : null;
}

export function timestamp(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

/** `<site>/<timestamp>`, with a -2, -3… suffix when that folder already exists. */
export function newSessionPath(site: string): string {
  const stamp = timestamp();
  let sessionPath = `${site}/${stamp}`;
  for (let n = 2; existsSync(/*turbopackIgnore: true*/ path.join(outputDir(), sessionPath)); n++) {
    sessionPath = `${site}/${stamp}-${n}`;
  }
  return sessionPath;
}

export async function saveImage(sessionPath: string, name: string, png: Buffer): Promise<string> {
  const directory = path.join(outputDir(), sessionPath);
  await mkdir(/*turbopackIgnore: true*/ directory, { recursive: true });
  await writeFile(/*turbopackIgnore: true*/ path.join(directory, name), png);
  return `${sessionPath}/${name}`;
}

async function directories(absolute: string): Promise<string[]> {
  const entries = await readdir(/*turbopackIgnore: true*/ absolute, { withFileTypes: true }).catch(() => []);
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

export async function listSessions(limit = 12): Promise<SessionSummary[]> {
  const root = outputDir();
  const sessions: SessionSummary[] = [];
  for (const site of await directories(root)) {
    for (const run of await directories(path.join(root, site))) {
      const runDir = path.join(root, site, run);
      const names = await readdir(/*turbopackIgnore: true*/ runDir).catch(() => []);
      const files: OutputFile[] = names.flatMap((name) => {
        const parsed = parseFileName(name);
        return parsed ? [{ path: `${site}/${run}/${name}`, name, width: parsed.width, height: parsed.height }] : [];
      });
      if (!files.length) continue;
      const { mtime } = await stat(/*turbopackIgnore: true*/ runDir);
      sessions.push({ path: `${site}/${run}`, site, createdAt: mtime.toISOString(), files });
    }
  }
  return sessions.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

/** Reads a PNG inside the output dir; null when the path escapes it, isn't a PNG or doesn't exist. */
export async function readOutputPng(relative: string): Promise<{ name: string; data: Buffer } | null> {
  const absolute = resolveOutputPath(relative);
  if (!absolute || !absolute.toLowerCase().endsWith(".png")) return null;
  const data = await readFile(/*turbopackIgnore: true*/ absolute).catch(() => null);
  return data && { name: path.basename(absolute), data };
}
