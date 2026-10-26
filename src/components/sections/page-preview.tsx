"use client";

import Image from "next/image";
import { useRef, useState, type PointerEvent } from "react";
import type { Pick } from "@/hooks/use-inspection";
import { cn } from "@/lib/cn";
import { previewUrl } from "@/lib/client-actions";
import type { DetectedSection, InspectedPage, Region } from "@/lib/types";

/** What the pointer is over: a section (shown in every preview) or a dragged frame (only in its own preset). */
export type HoverTarget = { presetId: string; region: Region; label?: string; keys?: string[] };

type Point = { x: number; y: number; screenX: number; screenY: number };

const MIN_DRAG_PX = 16;

const contains = (box: Region, point: { x: number; y: number }) =>
  point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height;

const boxKey = (box: Region) => `${box.x},${box.y},${box.width},${box.height}`;

/** The section in this page that shares the most keys with the given element keys. */
export function matchSection(sections: DetectedSection[], keys: string[]): DetectedSection | null {
  let best: DetectedSection | null = null;
  let bestScore = 0;
  for (const section of sections) {
    const score = section.keys.filter((key) => keys.includes(key)).length;
    if (score > bestScore) [best, bestScore] = [section, score];
  }
  return best;
}

/** Where a pick sits in this page, or null when it doesn't exist here. */
export function pickBox(pick: Pick, page: InspectedPage): Region | null {
  if ("keys" in pick) return matchSection(page.sections, pick.keys);
  return pick.presetId === page.preset.id ? pick.region : null;
}

function fromPoints(a: Point, b: Point): Region {
  const x = Math.round(Math.min(a.x, b.x));
  const y = Math.round(Math.min(a.y, b.y));
  return { x, y, width: Math.round(Math.max(a.x, b.x)) - x, height: Math.round(Math.max(a.y, b.y)) - y };
}

interface PagePreviewProps {
  inspectionId: string;
  page: InspectedPage;
  picks: Pick[];
  hover: HoverTarget | null;
  onHover: (target: HoverTarget | null) => void;
  onToggleSection: (section: DetectedSection) => void;
  onToggleFrame: (region: Region) => void;
}

export function PagePreview({
  inspectionId,
  page,
  picks,
  hover,
  onHover,
  onToggleSection,
  onToggleFrame,
}: PagePreviewProps) {
  const { preset, width: pageWidth, height: pageHeight, sections } = page;
  const surface = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ start: Point; current: Point } | null>(null);

  const place = (box: Region) => ({
    left: `${(box.x / pageWidth) * 100}%`,
    top: `${(box.y / pageHeight) * 100}%`,
    width: `${(box.width / pageWidth) * 100}%`,
    height: `${(box.height / pageHeight) * 100}%`,
  });

  const toPoint = (event: PointerEvent): Point => {
    const rect = surface.current!.getBoundingClientRect();
    const clamp = (value: number, max: number) => Math.min(max, Math.max(0, value));
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * pageWidth, pageWidth),
      y: clamp(((event.clientY - rect.top) / rect.height) * pageHeight, pageHeight),
      screenX: event.clientX,
      screenY: event.clientY,
    };
  };

  // Nested sections overlap; the smallest box under the pointer is the one people mean.
  const targetAt = (point: Point): HoverTarget | null => {
    const frames: HoverTarget[] = picks.flatMap((pick) =>
      "region" in pick && pick.presetId === preset.id ? [{ presetId: preset.id, region: pick.region }] : [],
    );
    const found: HoverTarget[] = sections.map((section) => ({
      presetId: preset.id,
      region: section,
      label: section.label,
      keys: section.keys,
    }));
    const candidates = [...frames, ...found].filter((target) => contains(target.region, point));
    candidates.sort((a, b) => a.region.width * a.region.height - b.region.width * b.region.height);
    return candidates[0] ?? null;
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = toPoint(event);
    setDrag({ start: point, current: point });
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const point = toPoint(event);
    if (drag) setDrag({ ...drag, current: point });
    else onHover(targetAt(point));
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const point = toPoint(event);
    const moved = Math.hypot(point.screenX - drag.start.screenX, point.screenY - drag.start.screenY) > 4;
    setDrag(null);
    if (moved) {
      const box = fromPoints(drag.start, point);
      if (box.width >= MIN_DRAG_PX && box.height >= MIN_DRAG_PX) onToggleFrame(box);
      return;
    }
    const target = targetAt(point);
    if (!target) return;
    const section = target.keys && sections.find((candidate) => candidate === target.region);
    if (section) onToggleSection(section);
    else onToggleFrame(target.region);
  };

  const hoverBox =
    hover && (hover.keys ? matchSection(sections, hover.keys) : hover.presetId === preset.id && hover.region);
  const hoverPicked = hoverBox && picks.some((pick) => pickBox(pick, page) === hoverBox);
  const dragBox = drag ? fromPoints(drag.start, drag.current) : null;

  return (
    <figure
      className={cn("min-w-0", preset.kind === "mobile" ? "flex-[1_1_220px] sm:max-w-[320px]" : "flex-[3_1_480px]")}
    >
      <figcaption className="mb-2 flex items-baseline gap-2">
        <span className="text-[15px] font-semibold">{preset.label}</span>
        <span className="font-mono text-xs text-muted">
          {preset.width} px @{preset.dpr}x · {sections.length} secties
        </span>
      </figcaption>
      <div className="overflow-hidden rounded-lg bg-soft shadow-[0_1px_4px_rgba(15,17,21,0.14)]">
        <div
          ref={surface}
          className="relative cursor-crosshair touch-none select-none"
          style={{ aspectRatio: `${pageWidth} / ${pageHeight}` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => setDrag(null)}
          onPointerLeave={() => onHover(null)}
        >
          <Image
            src={previewUrl(inspectionId, preset.id)}
            alt={`Volledige pagina op ${preset.label}`}
            width={pageWidth}
            height={pageHeight}
            unoptimized
            loading="eager"
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full"
          />

          {/* Keyboard access: the detected sections as focusable toggles. Pointer input goes through the surface. */}
          {sections.map((section) => (
            <button
              key={boxKey(section)}
              type="button"
              aria-pressed={picks.some((pick) => pickBox(pick, page) === section)}
              aria-label={`${preset.label}: ${section.label}, ${section.width} × ${section.height}`}
              onClick={() => onToggleSection(section)}
              className="pointer-events-none absolute rounded-[2px] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
              style={place(section)}
            />
          ))}

          {hoverBox && !drag && (
            <div
              className={cn(
                "pointer-events-none absolute border-2 border-accent",
                hoverPicked ? "bg-transparent" : "bg-accent/10",
              )}
              style={place(hoverBox)}
            >
              <span className="absolute top-0 left-0 max-w-full truncate rounded-br-md bg-accent px-1.5 py-0.5 font-mono text-[11px] text-white">
                {"label" in hoverBox ? `${hoverBox.label} · ` : ""}
                {hoverBox.width * preset.dpr} × {hoverBox.height * preset.dpr}
              </span>
            </div>
          )}

          {picks.map((pick, index) => {
            const box = pickBox(pick, page);
            if (!box) return null;
            return (
              <div
                key={pick.id}
                className={cn(
                  "pointer-events-none absolute border-2 border-accent bg-accent/20",
                  "region" in pick && "border-dashed",
                )}
                style={place(box)}
              >
                <span className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-accent text-xs font-semibold text-white shadow">
                  {index + 1}
                </span>
              </div>
            );
          })}

          {dragBox && (
            <div
              className="pointer-events-none absolute border-2 border-dashed border-accent bg-accent/10"
              style={place(dragBox)}
            >
              <span className="absolute top-0 left-0 rounded-br-md bg-ink px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap text-white">
                {dragBox.width * preset.dpr} × {dragBox.height * preset.dpr}
              </span>
            </div>
          )}
        </div>
      </div>
    </figure>
  );
}
