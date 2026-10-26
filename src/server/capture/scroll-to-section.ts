import "server-only";
import type { Page } from "playwright";
import { SECTION_SELECTOR } from "./sections";

/**
 * Scrolls the live page so a section starts right below the site's sticky or fixed navbar, the way a visitor sees
 * it. The element is looked up again by its keys because its position changes when the viewport gets shorter.
 */
export async function scrollToSection(page: Page, keys: string[] | undefined, fallbackY: number): Promise<void> {
  const sectionTop = await page.evaluate(
    ({ keys, fallbackY, selector }) => {
      const find = (): Element | null => {
        for (const key of keys) {
          if (key.startsWith("id:")) {
            const element = document.getElementById(key.slice(3));
            if (element) return element;
          }
        }
        for (const key of keys) {
          if (!key.startsWith("path:")) continue;
          let node: Element | null = document.body;
          for (const part of key.slice(5).split(">")) {
            const [tag, index] = part.split(":");
            node = node?.children[Number(index)] ?? null;
            if (!node || node.tagName.toLowerCase() !== tag) break;
          }
          if (node && node !== document.body) return node;
        }
        for (const key of keys) {
          if (!key.startsWith("class:")) continue;
          const [, signature, index] = key.split(":");
          const matches = [...document.querySelectorAll(selector)].filter(
            (element) => `${element.tagName}.${[...element.classList].sort().join(".")}` === signature,
          );
          if (matches[Number(index)]) return matches[Number(index)];
        }
        return null;
      };
      const element = keys.length ? find() : null;
      return element ? element.getBoundingClientRect().top + window.scrollY : fallbackY;
    },
    { keys: keys ?? [], fallbackY, selector: SECTION_SELECTOR },
  );

  // Scroll past and come back up: navbars that hide while scrolling down show again, as for a real visitor.
  await page.evaluate((y) => window.scrollTo(0, y + 300), sectionTop);
  await page.waitForTimeout(200);
  await page.evaluate((y) => window.scrollTo(0, y), sectionTop);
  await page.waitForTimeout(500);

  const navBottom = await page.evaluate(() => {
    let bottom = 0;
    for (const element of document.body.querySelectorAll("*")) {
      const style = getComputedStyle(element);
      if (style.position !== "fixed" && style.position !== "sticky") continue;
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) continue;
      const rect = element.getBoundingClientRect();
      // A bar along the top edge; full-screen menus and side widgets are not navbars.
      if (
        rect.top <= 1 &&
        rect.bottom > 0 &&
        rect.width >= window.innerWidth * 0.5 &&
        rect.height < window.innerHeight * 0.4
      ) {
        bottom = Math.max(bottom, rect.bottom);
      }
    }
    return Math.round(bottom);
  });
  if (navBottom > 0) {
    await page.evaluate((y) => window.scrollTo(0, Math.max(0, y)), sectionTop - navBottom);
    await page.waitForTimeout(450);
  }
}
