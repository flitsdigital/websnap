"use client";

import { useCallback, useState } from "react";
import type { CaptureRequest } from "@/lib/capture-request";
import type { CaptureEvent, CaptureRun, JobResult } from "@/lib/types";

export const IDLE_RUN: CaptureRun = {
  status: "idle",
  startedAt: null,
  theme: "light",
  jobs: [],
  results: {},
  sessionPaths: [],
  error: null,
};

export function applyEvent(run: CaptureRun, event: CaptureEvent): CaptureRun {
  switch (event.type) {
    case "start":
      return {
        ...run,
        jobs: event.jobs,
        results: Object.fromEntries(event.jobs.map((job) => [job.id, { status: "pending" } as JobResult])),
      };
    case "shot":
      return { ...run, results: { ...run.results, [event.jobId]: { status: "done", file: event.file } } };
    case "error": {
      const failed = event.jobIds.map((id) => [id, { status: "error", message: event.message } as JobResult]);
      return { ...run, results: { ...run.results, ...Object.fromEntries(failed) } };
    }
    case "done":
      return { ...run, status: "done", sessionPaths: event.sessionPaths };
  }
}

/** Ends the run; jobs that never got a result are marked failed instead of spinning forever. */
function finish(run: CaptureRun, error: string | null, pendingMessage: string): CaptureRun {
  if (run.status !== "running") return run;
  const results = Object.fromEntries(
    Object.entries(run.results).map(([id, result]) => [
      id,
      result.status === "pending" ? ({ status: "error", message: pendingMessage } as JobResult) : result,
    ]),
  );
  return { ...run, status: "done", results, error };
}

export function useCaptureRun() {
  const [run, setRun] = useState<CaptureRun>(IDLE_RUN);

  const start = useCallback(async (request: CaptureRequest) => {
    setRun({ ...IDLE_RUN, status: "running", startedAt: new Date().toISOString(), theme: request.theme });
    try {
      const response = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setRun((current) => finish(current, data?.error ?? "Er ging iets mis bij het starten.", "Niet gestart."));
        return;
      }

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as CaptureEvent;
          setRun((current) => applyEvent(current, event));
        }
      }
      setRun((current) => finish(current, null, "De run is onderbroken."));
    } catch {
      setRun((current) =>
        finish(current, "Websnap is niet bereikbaar. Draait de server nog?", "De run is onderbroken."),
      );
    }
  }, []);

  const reset = useCallback(() => setRun(IDLE_RUN), []);

  return { run, start, reset };
}
