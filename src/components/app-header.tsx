"use client";

import { FolderIcon } from "./icons";

export function AppHeader({ outputDir, onReveal }: { outputDir: string | null; onReveal: () => void }) {
  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-line bg-surface px-6">
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="grid size-7 place-items-center rounded-lg bg-ink">
          <span className="h-[11px] w-[14px] rounded-[3px] border-2 border-white" />
        </span>
        <span className="text-[15px] font-semibold">Websnap</span>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        {outputDir && (
          <span className="hidden truncate rounded-md bg-soft px-2 py-1 font-mono text-xs text-muted sm:block">
            {outputDir}
          </span>
        )}
        <button
          type="button"
          onClick={onReveal}
          className="inline-flex h-[34px] flex-none items-center gap-1.5 rounded-lg border border-line px-3 font-medium hover:bg-soft"
        >
          <FolderIcon className="size-4" />
          Open map
        </button>
      </div>
    </header>
  );
}
