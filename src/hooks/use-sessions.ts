"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchSessions } from "@/lib/client-actions";
import type { SessionSummary } from "@/lib/types";

export function useSessions() {
  const [data, setData] = useState<{ outputDir: string | null; sessions: SessionSummary[] }>({
    outputDir: null,
    sessions: [],
  });

  const refresh = useCallback(() => {
    fetchSessions()
      .then(setData)
      .catch(() => {});
  }, []);

  useEffect(refresh, [refresh]);

  return { ...data, refresh };
}
