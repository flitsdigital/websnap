"use client";

import { cn } from "@/lib/cn";

export function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 text-left"
    >
      <span>{label}</span>
      <span
        className={cn(
          "relative h-6 w-10 flex-none rounded-full transition-colors",
          checked ? "bg-accent" : "bg-line-strong",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-5 rounded-full bg-surface shadow-sm transition-transform",
            checked && "translate-x-4",
          )}
        />
      </span>
    </button>
  );
}
