import { regionsRequestSchema } from "@/lib/capture-request";
import { cropRegions } from "@/server/inspect";
import { errorMessage, InvalidRequestError } from "@/server/run-capture";

export async function POST(request: Request) {
  const parsed = regionsRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const error = issue?.path[0] === "uiVariants" ? issue.message : "Kies minimaal één sectie.";
    return Response.json({ error }, { status: 400 });
  }
  try {
    const { id, crops, uiVariants, theme } = parsed.data;
    return Response.json(await cropRegions(id, crops, [...new Set(uiVariants)], theme));
  } catch (error) {
    const status = error instanceof InvalidRequestError ? 404 : 500;
    return Response.json({ error: errorMessage(error) }, { status });
  }
}
