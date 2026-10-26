"use client";

import Image from "next/image";
import { cn } from "@/lib/cn";
import { fileUrl } from "@/lib/file-url";
import type { ResultItem } from "@/lib/result-groups";
import type { DeviceKind } from "@/lib/types";
import { AlertIcon, CheckIcon, DownloadIcon } from "../icons";

interface ResultCardProps {
  item: ResultItem;
  kind: DeviceKind;
  selected: boolean;
  onToggle: (path: string) => void;
}

export function ResultCard({ item, kind, selected, onToggle }: ResultCardProps) {
  const { result } = item;
  const preview = kind === "mobile" ? "h-[328px]" : "aspect-[16/11]";

  if (result.status !== "done") {
    const pending = result.status === "pending";
    return (
      <div
        className={cn(
          "flex flex-col overflow-hidden rounded-xl bg-surface",
          pending ? "border border-dashed border-line-strong" : "border border-line",
        )}
      >
        <div
          role={pending ? "status" : "alert"}
          className={cn(
            preview,
            "flex flex-col items-center justify-center gap-3 p-5 text-center",
            pending ? "text-muted" : "text-danger",
          )}
        >
          {pending ? (
            <>
              <span className="size-6 animate-spin rounded-full border-2 border-line border-t-accent motion-reduce:animate-none" />
              Bezig…
            </>
          ) : (
            <>
              <AlertIcon className="size-6" />
              <p>{result.message}</p>
            </>
          )}
        </div>
        <div className="border-t border-line px-3 py-2.5 font-medium">{item.label}</div>
      </div>
    );
  }

  const { file } = result;
  // Full-page captures are too tall to fit; show their top instead.
  const tall = file.height / file.width > 2.5;
  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-xl border bg-surface",
        selected ? "border-accent ring-1 ring-accent" : "border-line",
      )}
    >
      <a
        href={fileUrl(file.path)}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open ${file.name} in een nieuw tabblad`}
        className={cn(preview, "flex items-center justify-center overflow-hidden bg-soft p-3.5")}
      >
        <Image
          src={fileUrl(file.path)}
          alt=""
          width={file.width}
          height={file.height}
          unoptimized
          className={cn(
            "rounded-[3px] shadow-[0_1px_4px_rgba(15,17,21,0.14)]",
            tall ? "h-full w-full object-cover object-top" : "h-auto max-h-full w-auto max-w-full",
          )}
        />
      </a>
      <button
        type="button"
        role="checkbox"
        aria-checked={selected}
        aria-label={`Selecteer ${item.label}`}
        onClick={() => onToggle(file.path)}
        className={cn(
          "absolute top-2.5 left-2.5 grid size-[22px] place-items-center rounded-md border-[1.5px] shadow-sm",
          selected ? "border-accent bg-accent text-white" : "border-line-strong bg-surface/90",
        )}
      >
        {selected && <CheckIcon className="size-3.5" />}
      </button>
      <div className="flex items-center gap-2 border-t border-line px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{item.label}</p>
          <p className="font-mono text-[11.5px] text-muted">
            {file.width} × {file.height}
          </p>
        </div>
        <a
          href={fileUrl(file.path, true)}
          download={file.name}
          aria-label={`Download ${item.label}`}
          className="grid size-8 flex-none place-items-center rounded-lg border border-line text-muted hover:bg-soft hover:text-ink"
        >
          <DownloadIcon className="size-4" />
        </a>
      </div>
    </div>
  );
}
