import "server-only";
import type { Page } from "playwright";

// fs-cc = Finsweet Cookie Consent, common on the agency's Webflow sites.
const POPUP_SELECTORS = [
  "#CybotCookiebotDialog",
  "#CybotCookiebotDialogBodyUnderlay",
  "#onetrust-consent-sdk",
  "#onetrust-banner-sdk",
  "#usercentrics-root",
  "#usercentrics-cmp-ui",
  "#didomi-host",
  ".cky-consent-container",
  ".cky-overlay",
  "#cookie-notice",
  "#cookie-law-info-bar",
  "#cookiescript_injected",
  "#cmplz-cookiebanner-container",
  ".cmplz-cookiebanner",
  "#BorlabsCookieBox",
  "#iubenda-cs-banner",
  ".iubenda-cs-container",
  ".klaro",
  ".osano-cm-window",
  ".qc-cmp2-container",
  "#truste-consent-track",
  ".truste_box_overlay",
  "#shopify-pc__banner",
  ".shopify-pc__banner__dialog",
  '[fs-cc="banner"]',
  '[fs-cc="manager"]',
  "[fs-consent-element]",
  ".fs-cc-banner_component",
  ".cc-window",
  ".cc-banner",
  ".cc-revoke",
  "#cc-main",
  "#axeptio_overlay",
  "#moove_gdpr_cookie_info_bar",
  ".cookie-consent",
  ".cookie-banner",
  ".cookie-bar",
  ".cookiebar",
  "#cookie-banner",
  "#cookieBanner",
  "#cookie-bar",
  "#hubspot-messages-iframe-container",
  ".intercom-lightweight-app",
  "#intercom-container",
  "#crisp-chatbox",
  ".crisp-client",
  "#tidio-chat",
  "#tidio-chat-iframe",
  'iframe[title*="chat" i]',
  "#chat-widget-container",
  ".drift-frame-controller",
  ".tawk-min-container",
  "#trengo-web-widget",
  ".trengo-vue-iframe",
  "#zsiq_float",
];

const HIDE = "{display:none!important;visibility:hidden!important;pointer-events:none!important}";

export async function preparePage(page: Page, options: { hidePopups: boolean; hideSelectors: string[] }) {
  // Separate rules so one invalid user selector can't disable the built-in list.
  const rules = ["html{scroll-behavior:auto!important}"];
  if (options.hidePopups) rules.push(POPUP_SELECTORS.join(",") + HIDE);
  if (options.hideSelectors.length) rules.push(options.hideSelectors.join(",") + HIDE);
  await page.addStyleTag({ content: rules.join("\n") });

  if (options.hidePopups) {
    await page.evaluate(() => {
      for (const element of [document.documentElement, document.body]) {
        const style = getComputedStyle(element);
        if (style.overflow === "hidden" || style.overflowY === "hidden") {
          element.style.setProperty("overflow", "visible", "important");
        }
      }
    });
  }
}

/** Scrolls through the page so lazy images and scroll animations (Webflow interactions) load. */
export async function warmUpPage(page: Page) {
  await page
    .evaluate(async () => {
      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      const step = Math.max(300, window.innerHeight * 0.75);
      const started = Date.now();
      for (let y = 0; ; y += step) {
        const end = Math.min(document.documentElement.scrollHeight - window.innerHeight, 16_000);
        window.scrollTo(0, Math.min(y, end));
        await sleep(130);
        if (y >= end || Date.now() - started > 9_000) break;
      }
      await sleep(300);
      window.scrollTo(0, 0);
      const pending = [...document.images]
        .filter((image) => !image.complete)
        .map(
          (image) =>
            new Promise((resolve) => {
              image.addEventListener("load", resolve, { once: true });
              image.addEventListener("error", resolve, { once: true });
            }),
        );
      await Promise.race([Promise.all(pending), sleep(5_000)]);
      await Promise.race([document.fonts.ready, sleep(3_000)]);
    })
    .catch(() => {});
}
