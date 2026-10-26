import { captureRequestSchema } from "@/lib/capture-request";
import { InvalidRequestError, planCapture, runCapture, type CapturePlan } from "@/server/run-capture";

export async function POST(request: Request) {
  const parsed = captureRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const error = issue?.path[0] === "uiVariants" ? issue.message : "Ongeldig verzoek. Controleer de instellingen.";
    return Response.json({ error }, { status: 400 });
  }

  let plan: CapturePlan;
  try {
    plan = planCapture(parsed.data);
  } catch (error) {
    if (error instanceof InvalidRequestError) return Response.json({ error: error.message }, { status: 400 });
    throw error;
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // If the tab closes, enqueue throws; the run continues so the files still get saved.
      void runCapture(plan, (event) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {}
      }).finally(() => {
        try {
          controller.close();
        } catch {}
      });
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
