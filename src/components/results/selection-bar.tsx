"use client";

import { useState } from "react";
import { downloadZip, revealPath } from "@/lib/client-actions";
import { CloseIcon, DownloadIcon, FolderIcon } from "../icons";

export function SelectionBar({ paths, onClear }: { paths: string[]; onClear: () => void }) {
  const [zipping, setZipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!paths.length) return null;

  const download = async () => {
    setZipping(true);
    setError(null);
    try {
      await downloadZip(paths);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Zip maken mislukt.");
    } finally {
      setZipping(false);
    }
  };

  return (
    <div
      role="region"
      aria-label="Selectie"
      className="fixed bottom-6 left-1/2 z-20 flex w-max max-w-[calc(100vw-32px)] -translate-x-1/2 flex-wrap items-center gap-2 rounded-xl bg-ink p-2 pl-4 text-white shadow-[0_12px_32px_rgba(15,17,21,0.28)]"
    >
      <span className="mr-1 font-medium whitespace-nowrap">{paths.length} geselecteerd</span>
      <button
        type="button"
        onClick={download}
        disabled={zipping}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 font-medium hover:bg-accent-ink disabled:opacity-70"
      >
        <DownloadIcon className="size-4" />
        {zipping ? "Zip maken…" : "Download"}
      </button>
      <button
        type="button"
        onClick={() => revealPath(paths[0]).catch((caught: Error) => setError(caught.message))}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 font-medium hover:bg-white/10"
      >
        <FolderIcon className="size-4" />
        Toon in Finder
      </button>
      <button
        type="button"
        onClick={onClear}
        aria-label="Selectie wissen"
        className="grid size-9 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
      >
        <CloseIcon className="size-4" />
      </button>
      {error && (
        <p role="alert" className="w-full px-1 pb-1 text-xs text-[#ffb4ae]">
          {error}
        </p>
      )}
    </div>
  );
}
