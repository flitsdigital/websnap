import { connection } from "next/server";
import { displayPath, listSessions, outputDir } from "@/server/storage";

export async function GET() {
  await connection();
  return Response.json({ outputDir: displayPath(outputDir()), sessions: await listSessions() });
}
