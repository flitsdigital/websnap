"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

// In-memory copy so the state still works when localStorage is blocked.
const memory = new Map<string, string>();
const listeners = new Set<() => void>();

function read(key: string): string | null {
  if (memory.has(key)) return memory.get(key) ?? null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function parse<T>(raw: string | null, defaults: T): T {
  if (raw === null) return defaults;
  try {
    const value: unknown = JSON.parse(raw);
    // Merge so settings added in a later version get their default.
    return (isRecord(defaults) && isRecord(value) ? { ...defaults, ...value } : value) as T;
  } catch {
    return defaults;
  }
}

/** useState backed by localStorage. The first render always uses the defaults, so hydration matches. */
export function usePersistentState<T>(key: string, defaults: T) {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );
  const value = useMemo(() => parse(raw, defaults), [raw, defaults]);

  const setValue = useCallback(
    (next: T | ((previous: T) => T)) => {
      const resolved = next instanceof Function ? next(parse(read(key), defaults)) : next;
      const json = JSON.stringify(resolved);
      memory.set(key, json);
      try {
        localStorage.setItem(key, json);
      } catch {}
      listeners.forEach((listener) => listener());
    },
    [key, defaults],
  );

  return [value, setValue] as const;
}
