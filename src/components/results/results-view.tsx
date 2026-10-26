"use client";

import { cn } from "@/lib/cn";
import type { SiteResults } from "@/lib/result-groups";
import { ArrowLeftIcon } from "../icons";
import { ResultCard } from "./result-card";

interface ResultsViewProps {
  title: string;
  startedAt: string | null;
  sites: SiteResults[];
  running: boolean;
  error: string | null;
  selected: Set<string>;
  onToggle: (path: string) => void;
  onBack?: () => void;
  backLabel?: string;
}

const dateFormat = new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" });

function StatusBadge({
  running,
  finished,
  total,
  failed,
}: Record<"finished" | "total" | "failed", number> & { running: boolean }) {
  const [label, colors] = running
    ? [`Bezig · ${finished} van ${total}`, "bg-accent-tint text-accent-ink"]
    : failed
      ? [`Klaar · ${failed} mislukt`, "bg-[#fdecea] text-danger"]
      : ["Klaar", "bg-[#e6f4ea] text-[#1e6b34]"];
  return (
    <span className={cn("inline-flex h-7 items-center gap-2 rounded-full px-3 text-[13px] font-medium", colors)}>
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function ResultsView({
  title,
  startedAt,
  sites,
  running,
  error,
  selected,
  onToggle,
  onBack,
  backLabel = "Overzicht",
}: ResultsViewProps) {
  const items = sites.flatMap((site) => site.groups.flatMap((group) => group.items));
  const finished = items.filter((item) => item.result.status !== "pending").length;
  const failed = items.filter((item) => item.result.status === "error").length;

  return (
    <div className="mx-auto max-w-[1200px]">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"
        >
          <ArrowLeftIcon className="size-4" />
          {backLabel}
        </button>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-[22px] font-semibold tracking-[-0.015em]">{title}</h1>
          {startedAt && <p className="mt-0.5 font-mono text-xs text-muted">{dateFormat.format(new Date(startedAt))}</p>}
        </div>
        {items.length > 0 && <StatusBadge running={running} finished={finished} total={items.length} failed={failed} />}
      </div>

      {running && (
        <div
          role="progressbar"
          aria-label="Voortgang"
          aria-valuemin={0}
          aria-valuemax={items.length}
          aria-valuenow={finished}
          className="mt-4 h-[3px] overflow-hidden rounded-full bg-line"
        >
          <div
            className="h-full bg-accent transition-[width] duration-300"
            style={{ width: `${items.length ? (finished / items.length) * 100 : 0}%` }}
          />
        </div>
      )}

      {error && (
        <div role="alert" className="mt-4 rounded-lg border border-danger/25 bg-[#fdecea] px-4 py-3 text-danger">
          {error}
        </div>
      )}

      {sites.map((site) => (
        <div key={site.host} className="mt-6">
          {sites.length > 1 && <h2 className="mb-1 text-[17px] font-semibold">{site.host}</h2>}
          {site.groups.map((group) => (
            <section key={group.key} className="mt-5">
              <div className="flex items-baseline gap-2">
                <h3 className="text-[15px] font-semibold">{group.title}</h3>
                <span className="font-mono text-xs text-muted">{group.detail}</span>
              </div>
              <div
                className={cn(
                  "mt-3 grid gap-4",
                  group.kind === "mobile"
                    ? "max-w-[820px] grid-cols-[repeat(auto-fill,minmax(190px,1fr))]"
                    : "grid-cols-[repeat(auto-fill,minmax(260px,1fr))]",
                )}
              >
                {group.items.map((item) => (
                  <ResultCard
                    key={item.id}
                    item={item}
                    kind={group.kind}
                    selected={item.result.status === "done" && selected.has(item.result.file.path)}
                    onToggle={onToggle}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ))}
    </div>
  );
}
