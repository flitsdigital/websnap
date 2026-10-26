"use client";

import type { KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

interface SegmentedControlProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const index = (options.findIndex((option) => option.value === value) + step + options.length) % options.length;
    onChange(options[index].value);
    (event.currentTarget.children[index] as HTMLElement | undefined)?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn("grid auto-cols-fr grid-flow-col gap-0.5 rounded-lg bg-soft p-0.5", className)}
    >
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-8 rounded-md px-2 text-[13px] font-medium whitespace-nowrap transition-colors",
              checked ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
