import "server-only";
import type { Page } from "playwright";
import type { DetectedSection } from "@/lib/types";
import { MAX_FULL_PAGE } from "./screenshot";

export const SECTION_SELECTOR =
  'header, nav, main, main > *, section, article, aside, footer, [class*="section" i], body > *, body > * > *, body > * > * > *';

/**
 * Boxes of the page's visual sections in CSS px, measured from the top of the document. Each section carries
 * keys (DOM path, id, class + index) so the same element can be found again in another viewport.
 */
export async function detectSections(page: Page): Promise<DetectedSection[]> {
  return page.evaluate(
    ({ selector, maxHeight }) => {
      const viewportWidth = document.documentElement.clientWidth;
      const pageHeight = document.documentElement.scrollHeight;
      const bottomLimit = Math.min(maxHeight, pageHeight);
      const byBox = new Map<string, DetectedSection>();
      const classCounts = new Map<string, number>();

      const pathOf = (element: Element) => {
        const parts: string[] = [];
        for (
          let node: Element | null = element;
          node?.parentElement && node !== document.body;
          node = node.parentElement
        ) {
          parts.unshift(`${node.tagName.toLowerCase()}:${[...node.parentElement.children].indexOf(node)}`);
        }
        return parts.join(">");
      };

      for (const element of document.querySelectorAll<HTMLElement>(selector)) {
        // Keys are counted before filtering, so indexes match between viewports that hide different elements.
        const keys = [`path:${pathOf(element)}`];
        if (element.id) keys.push(`id:${element.id}`);
        if (element.classList.length) {
          const signature = `${element.tagName}.${[...element.classList].sort().join(".")}`;
          const index = classCounts.get(signature) ?? 0;
          classCounts.set(signature, index + 1);
          keys.push(`class:${signature}:${index}`);
        }

        const style = getComputedStyle(element);
        if (style.position === "fixed" || style.display === "none" || style.visibility === "hidden") continue;
        const rect = element.getBoundingClientRect();
        const x = Math.max(0, Math.round(rect.left + window.scrollX));
        const y = Math.max(0, Math.round(rect.top + window.scrollY));
        const width = Math.min(viewportWidth, Math.round(rect.right + window.scrollX)) - x;
        const height = Math.min(bottomLimit, Math.round(rect.bottom + window.scrollY)) - y;
        if (width < viewportWidth * 0.5 || height < 40 || y >= bottomLimit) continue;
        // Page-wide wrappers are never what someone wants to cut out.
        if (height > pageHeight * 0.9 && pageHeight > window.innerHeight * 1.5) continue;

        // Wrappers often share a box with their child; keep one entry that answers to all of their keys.
        const box = `${x},${y},${width},${height}`;
        const existing = byBox.get(box);
        if (existing) {
          existing.keys.push(...keys);
          continue;
        }
        const className = typeof element.className === "string" ? element.className.trim().split(/\s+/)[0] : "";
        const name = element.id ? `#${element.id}` : className ? `.${className}` : "";
        byBox.set(box, { x, y, width, height, label: element.tagName.toLowerCase() + name, keys });
      }
      return [...byBox.values()].sort((a, b) => a.y - b.y || b.height - a.height).slice(0, 80);
    },
    { selector: SECTION_SELECTOR, maxHeight: MAX_FULL_PAGE },
  );
}
