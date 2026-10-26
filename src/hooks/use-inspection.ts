"use client";

import { useCallback, useState } from "react";
import { inspectPage } from "@/lib/client-actions";
import type { InspectRequest } from "@/lib/capture-request";
import type { Inspection, Region } from "@/lib/types";

export type InspectionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; inspection: Inspection }
  | { status: "error"; message: string };

/**
 * A chosen cut-out. A detected section is matched in every preset by its element keys; a dragged frame only
 * exists in the preset it was drawn in.
 */
export type Pick =
  { id: string; label: string; keys: string[] } | { id: string; label: string; presetId: string; region: Region };

export function useInspection() {
  const [state, setState] = useState<InspectionState>({ status: "idle" });
  // Kept here so the selection survives a trip to the results and back.
  const [picks, setPicks] = useState<Pick[]>([]);

  const load = useCallback(async (request: InspectRequest) => {
    setState({ status: "loading" });
    setPicks([]);
    try {
      setState({ status: "ready", inspection: await inspectPage(request) });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Pagina laden mislukt." });
    }
  }, []);

  return { state, load, picks, setPicks };
}
