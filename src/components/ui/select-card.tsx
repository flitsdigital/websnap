"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { CheckIcon } from "../icons";

export function SelectCard({
  selected,
  onClick,
  className,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "relative rounded-[10px] border-[1.5px] p-3 text-left transition-colors",
        selected ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-line-strong",
        className,
      )}
    >
      {children}
      {selected && (
        <span className="absolute top-2 right-2 grid size-[18px] place-items-center rounded-full bg-accent text-white">
          <CheckIcon className="size-3" />
        </span>
      )}
    </button>
  );
}
