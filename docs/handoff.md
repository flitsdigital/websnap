# Handoff: Websnap

> Bouwopdracht voor Claude Code. Lees dit document helemaal voordat je begint en werk de fases onderaan in volgorde af. Na elke fase: `npm run check` groen, kort verslag aan de gebruiker, dan pas door.

## 1. Wat we bouwen

Een lokale webapp waarmee het team van een webbureau (Flits Digital) screenshots maakt van websites die ze hebben gebouwd. Die screenshots gaan daarna in Photoshop in device-mockups (MacBook, iPhone).

De gebruiker vult één of meer URL's in, kiest formaten (desktop, iPhone, eigen formaat) en of er een browser-UI omheen moet (geen, Chrome of Safari, licht of donker). De app maakt per combinatie een PNG, slaat die op in een map op de Mac en laat de resultaten live zien.

**Belangrijkste eis:** het eindbestand heeft altijd exact het formaat van de gekozen preset, ook mét browser-UI. Een iPhone-screenshot is altijd 1179 × 2556 px, zodat elke variant in hetzelfde Photoshop smart object past.

**Niet in scope:** device-frames (MacBook-behuizing, iPhone-bezel) — dat doet de gebruiker in Photoshop. Geen accounts, geen database, geen hosting. De app draait alleen op `localhost`.

## 2. Stack

| Onderdeel      | Keuze                                                     | Opmerking                                                                                                                 |
| -------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Framework      | Next.js 16 (App Router), React 19, TypeScript strict      | Scaffold met `npx create-next-app@latest websnap --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm` |
| Styling        | Tailwind CSS v4                                           | Tokens in `globals.css` via `@theme`                                                                                      |
| Browser        | `playwright` (Chromium)                                   | `postinstall: playwright install chromium`                                                                                |
| Beeldbewerking | `sharp`                                                   | Samenvoegen van balken en screenshot, stitching                                                                           |
| Validatie      | `zod` (v4)                                                | Eén schema voor client en server                                                                                          |
| Zip            | `jszip`                                                   | Download van selectie                                                                                                     |
| Fonts          | `geist` (npm)                                             | Lokaal, geen netwerk nodig bij build. Niet `next/font/google`                                                             |
| Overig         | `server-only`, `prettier` + `prettier-plugin-tailwindcss` |                                                                                                                           |

Scripts in `package.json`:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "typecheck": "tsc --noEmit",
  "format": "prettier --write .",
  "check": "npm run typecheck && npm run lint && prettier --check .",
  "postinstall": "playwright install chromium"
}
```

`.prettierrc.json`: `{ "printWidth": 120, "plugins": ["prettier-plugin-tailwindcss"], "tailwindStylesheet": "./src/app/globals.css" }`

### Next.js 16: let op

Deze versie wijkt af van wat je misschien kent. Lees bij twijfel `node_modules/next/dist/docs/` (zie de `AGENTS.md` die create-next-app aanmaakt).

- De scaffold zet `cacheComponents: true` aan. Laat dat staan. Gevolg: **geen** `export const runtime`, `dynamic` of `revalidate` in route-bestanden (wordt geweigerd). Een GET-route die bij elke request moet draaien roept `await connection()` aan (uit `next/server`) of leest de request.
- `playwright` en `sharp` staan al op Next's lijst van server-externe packages. Geen `serverExternalPackages` nodig.
- Bestandstoegang met een dynamisch pad buiten het project (output-map, `spawn` van `open`) geeft bij `next build` een tracing-waarschuwing. Zet `/*turbopackIgnore: true*/` als eerste argument-comment in die call, bijvoorbeeld `readdir(/*turbopackIgnore: true*/ root, …)`.
- Typed `LayoutProps<"/">` is globaal beschikbaar in layouts.

## 3. Configuratie

`.env.example` (beide optioneel):

```bash
# Waar de screenshots komen. Standaard: ~/Pictures/Websnap (of ~/Websnap als Pictures niet bestaat)
# WEBSNAP_OUTPUT_DIR=~/Pictures/Websnap

# Eigen Chromium-binary in plaats van die van Playwright (bijv. in een container). Zet dan ook --no-sandbox.
# WEBSNAP_CHROMIUM_PATH=/pad/naar/chromium
```

## 4. Architectuur

```
[CaptureForm] --POST /api/capture (JSON)--> planCapture() --> runCapture()   (max. één run tegelijk)
      ^                                                            |
      |          NDJSON-stream: start, shot, error, done           |  per URL × preset:
[useCaptureRun] <--------------------------------------------------+    capturePreset()
      |                                                                 1. pagina laden in Chromium
[ResultsView] <-- GET /api/files?path=… (PNG uit output-map)            2. pop-ups verbergen, doorscrollen
                                                                        3. per UI-variant: viewport verkleinen,
                                                                           screenshot, balken renderen, samenvoegen
                                                                        4. opslaan in <output>/<site>/<tijdstempel>/
```

### Mappenstructuur

```
src/
  app/
    layout.tsx, page.tsx, globals.css, icon.svg
    api/capture/route.ts     POST  start run, streamt NDJSON
    api/files/route.ts       GET   serveert PNG uit output-map (?download=1 = bijlage)
    api/sessions/route.ts    GET   output-map (weergavepad) + recente sessies
    api/zip/route.ts         POST  { paths } → zip
    api/reveal/route.ts      POST  { path } → open map/bestand in Finder
  components/
    websnap.tsx              app-shell, schermlogica (client)
    app-header.tsx, empty-state.tsx, icons.tsx
    capture-form/            capture-form, preset-picker, ui-variant-picker, advanced-options
    results/                 results-view, result-card, selection-bar
    ui/                      segmented-control, switch, section-label
  hooks/
    use-capture-run.ts       fetch + NDJSON → state
    use-sessions.ts          GET /api/sessions
    use-persistent-state.ts  useState + localStorage
  lib/                       gedeeld door client en server, geen Node-API's
    types.ts, presets.ts, url.ts, settings.ts, capture-request.ts (zod),
    result-groups.ts, file-url.ts, client-actions.ts, cn.ts
  server/                    alleen server, elk bestand begint met `import "server-only";`
    run-capture.ts           plan + uitvoeren + events + Nederlandse foutmeldingen
    storage.ts               output-map, bestandsnamen, sessies, padcontrole
    capture/                 browser.ts, prepare-page.ts, page-meta.ts, screenshot.ts, compose.ts, capture-preset.ts
    frames/                  types.ts, icons.ts, html.ts, desktop.ts, mobile.ts, index.ts
```

## 5. Gedeelde types en data (`src/lib`)

### `types.ts`

```ts
export type DeviceKind = "desktop" | "mobile";
export type UiVariant = "none" | "chrome" | "safari";
export type UiTheme = "light" | "dark";

export interface Preset {
  id: string;
  label: string;
  kind: DeviceKind;
  width: number;
  height: number;
  dpr: 1 | 2 | 3;
}
// width/height = CSS-pixels van het hele scherm (UI inbegrepen). Bestand = width×dpr bij height×dpr.

export interface CaptureOptions {
  theme: UiTheme;
  fullPage: boolean;
  hidePopups: boolean;
  hideSelectors: string[];
  extraDelayMs: number;
}

export interface CaptureJob {
  id: string;
  url: string;
  host: string;
  preset: Preset;
  ui: UiVariant;
}
// id = `${url}|${preset.id}|${ui}`

export interface OutputFile {
  path: string;
  name: string;
  width: number;
  height: number;
}
// path relatief aan de output-map, altijd met "/"

export type CaptureEvent =
  | { type: "start"; jobs: CaptureJob[] }
  | { type: "shot"; jobId: string; file: OutputFile }
  | { type: "error"; jobIds: string[]; message: string }
  | { type: "done"; sessionPaths: string[] };

export type JobResult =
  { status: "pending" } | { status: "done"; file: OutputFile } | { status: "error"; message: string };

export interface CaptureRun {
  status: "idle" | "running" | "done";
  startedAt: string | null;
  theme: UiTheme; // thema waarmee de run startte (labels mogen niet meeveranderen met het formulier)
  jobs: CaptureJob[];
  results: Record<string, JobResult>;
  sessionPaths: string[];
  error: string | null;
}

export interface SessionSummary {
  path: string;
  site: string;
  createdAt: string;
  files: OutputFile[];
}
// path = `<site>/<tijdstempel>`
```

### `presets.ts`

| id           | label          | kind    | width | height | dpr | bestand     |
| ------------ | -------------- | ------- | ----- | ------ | --- | ----------- |
| `desktop`    | Desktop        | desktop | 1440  | 900    | 2   | 2880 × 1800 |
| `desktop-hd` | Desktop HD     | desktop | 1920  | 1080   | 1   | 1920 × 1080 |
| `iphone`     | iPhone         | mobile  | 393   | 852    | 3   | 1179 × 2556 |
| `iphone-max` | iPhone Pro Max | mobile  | 430   | 932    | 3   | 1290 × 2796 |

UI-varianten: `none` "Zonder UI", `chrome` "Chrome", `safari` "Safari".
Eigen formaat: breedte 280–3840, hoogte 400–4000, dpr 1/2/3, kind desktop/mobiel. `customPreset()` maakt id `custom-<w>x<h>` en label `Eigen <w>×<h>`.

### `url.ts`

- `normalizeUrl(input)`: trim; geen protocol → `http://` als het `localhost`, `127.0.0.1`, `[::1]` of `*.local/.test/.localhost` is (met optionele poort), anders `https://`. Ongeldig of hostname zonder punt (behalve localhost) → `null`.
- `parseUrlList(text)`: splitsen op witruimte en komma's, normaliseren, uniek.
- `slugifyHost("www.Klant.nl")` → `klant-nl` (lowercase, `www.` eraf, niet-alfanumeriek → `-`, max 60, fallback `site`).
- `displayHost(url)`: hostname zonder `www.`, plus `:poort` als die er is.

### `capture-request.ts` (zod, gedeeld)

```ts
{
  urls: string (max 5000),               // ruwe textarea-inhoud
  presetIds: string[] (max 10),
  customPreset: { kind, width, height, dpr } | null,
  uiVariants: ("none"|"chrome"|"safari")[] min 1,  // melding: "Kies minimaal één UI-variant."
  theme: "light"|"dark",
  fullPage: boolean,
  hidePopups: boolean,
  hideSelectors: string[] (elk max 200, max 30),
  extraDelaySeconds: number 0–15,
}
```

### `settings.ts`

`FormSettings` (wordt in localStorage bewaard onder `websnap:settings`): presetIds, custom `{ enabled, kind, width, height, dpr }`, uiVariants, theme, fullPage, hidePopups, extraDelaySeconds, hideSelectors (string). Defaults: `["desktop","iphone"]`, custom uit (1280×800 @2x desktop), alle drie UI-varianten, licht, boven de vouw, pop-ups verbergen aan, 0 s, leeg. Plus `toCaptureRequest(urls, settings)` en `countScreenshots(urlCount, settings)` = max(urls,1) × formaten × UI-varianten.

## 6. Server: de capture-engine (`src/server`)

### 6.1 Browser (`capture/browser.ts`)

- Eén gedeelde Chromium via `globalThis` (overleeft hot reload). Als hij niet meer `isConnected()` is: opnieuw starten.
- `WEBSNAP_CHROMIUM_PATH` gezet → `executablePath` + `args: ["--no-sandbox"]`.
- Desktop user agent: normale Mac-Chrome-UA met het major-versienummer van de browser (`browser.version()`), zodat sites geen "HeadlessChrome" zien.
- iPhone user agent: `Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1`.

### 6.2 Eén preset vastleggen (`capture/capture-preset.ts`)

`capturePreset(url, preset, variants, options, onImage)`:

1. Nieuwe context: viewport = preset width × height, `deviceScaleFactor: dpr`, `isMobile` en `hasTouch` voor mobiel, UA zoals hierboven, `locale: "nl-NL"`, `colorScheme: "light"`, `ignoreHTTPSErrors: true`.
2. `goto(url, { waitUntil: "load", timeout: 45s })`. Status ≥ 400 → `CaptureError("De site gaf status X terug.")`. Daarna `networkidle` met 8 s timeout (fout negeren).
3. `preparePage` → `warmUpPage` → optionele extra wachttijd → `readPageMeta`.
4. Tweede pagina in dezelfde context (`barPage`) voor het renderen van de balken (zelfde dpr).
5. Per UI-variant:
   - `contentHeight = max(200, preset.height - uiHeights(kind, ui).top - .bottom)`
   - `page.setViewportSize({ width, height: contentHeight })`, scroll naar boven, 450 ms wachten (layout en `vh`-eenheden passen zich aan, net als in een echte browser).
   - Screenshot (6.5), bij iPhone + Safari de tint van de bovenkant meten, frame bouwen (7), samenvoegen (6.6), `onImage(ui, png)`.
6. Context altijd sluiten in `finally`.

De pagina wordt dus één keer geladen per preset; alleen de viewport verandert per UI-variant.

### 6.3 Pagina voorbereiden (`capture/prepare-page.ts`)

`preparePage(page, { hidePopups, hideSelectors })`: één `addStyleTag` met `html{scroll-behavior:auto!important}` plus, als er selectors zijn, `<selectors>{display:none!important;visibility:hidden!important;pointer-events:none!important}`. Bij `hidePopups` daarna de scroll-lock opheffen: als `html` of `body` computed `overflow`/`overflowY` = `hidden` heeft → inline `overflow: visible !important`.

Ingebouwde lijst `POPUP_SELECTORS`:

```
#CybotCookiebotDialog, #CybotCookiebotDialogBodyUnderlay, #onetrust-consent-sdk, #onetrust-banner-sdk,
#usercentrics-root, #usercentrics-cmp-ui, #didomi-host, .cky-consent-container, .cky-overlay,
#cookie-notice, #cookie-law-info-bar, #cookiescript_injected, #cmplz-cookiebanner-container, .cmplz-cookiebanner,
#BorlabsCookieBox, #iubenda-cs-banner, .iubenda-cs-container, .klaro, .osano-cm-window, .qc-cmp2-container,
#truste-consent-track, .truste_box_overlay, #shopify-pc__banner, .shopify-pc__banner__dialog,
[fs-cc="banner"], [fs-cc="manager"], [fs-consent-element], .fs-cc-banner_component,
.cc-window, .cc-banner, .cc-revoke, #cc-main, #axeptio_overlay, #moove_gdpr_cookie_info_bar,
.cookie-consent, .cookie-banner, .cookie-bar, .cookiebar, #cookie-banner, #cookieBanner, #cookie-bar,
#hubspot-messages-iframe-container, .intercom-lightweight-app, #intercom-container, #crisp-chatbox, .crisp-client,
#tidio-chat, #tidio-chat-iframe, iframe[title*="chat" i], #chat-widget-container, .drift-frame-controller,
.tawk-min-container, #trengo-web-widget, .trengo-vue-iframe, #zsiq_float
```

(`fs-cc` = Finsweet Cookie Consent, veel gebruikt op Webflow-sites van het bureau.)

`warmUpPage(page)`, in één `page.evaluate`: scroll in stappen van max(300, 75% van de viewporthoogte) met 130 ms pauze tot het einde (max 16.000 px, max 9 s), 300 ms wachten, terug naar boven. Daarna wachten op alle nog niet geladen `<img>` (load of error, max 5 s) en `document.fonts.ready` (max 3 s). Fouten negeren. Dit laadt lazy images en scroll-animaties (Webflow-interacties).

### 6.4 Pagina-info (`capture/page-meta.ts`)

`readPageMeta(page, context)` → `PageMeta { title, host, path, favicon }`:

- title = `document.title` (getrimd); host = hostname zonder `www.` plus poort; path = pathname + search zonder trailing slash.
- favicon: eerste `link[rel~="icon"]` of `link[rel="shortcut icon"]`, anders `/favicon.ico`. Ophalen via `context.request.get` (8 s), alleen als response ok is en content-type op image/icon/svg lijkt, dan als data-URL. Anders `null` (dan tekent de Chrome-tab een globe-icoon).

### 6.5 Screenshot (`capture/screenshot.ts`)

- Basisopties: `{ type: "png", animations: "disabled", caret: "hide", timeout: 60s }`.
- Boven de vouw: gewoon `page.screenshot(base)`.
- Volledige pagina: hoogte = min(scrollHeight, 16.000 CSS-px). Chromium kan niet veel hoger dan ~16k device-pixels in één keer, dus in segmenten van `floor(12000 / dpr)` CSS-px vastleggen met `fullPage: true` en een `clip`, en met sharp onder elkaar plakken op een wit canvas van width×dpr bij hoogte×dpr (`limitInputPixels: false`). Eén segment → direct teruggeven. Sticky headers verschijnen zo maar één keer bovenaan.
- `sampleTopTint(png)`: bovenste 6 rijen gemiddeld naar 1 pixel (`extract` → `resize(1,1,{fit:"fill"})` → `raw`). Achtergrond = die kleur, voorgrond `#000` als luminantie (0.2126R + 0.7152G + 0.0722B)/255 > 0.6, anders `#fff`. iOS Safari kleurt de statusbalk mee met de site.

### 6.6 Samenvoegen (`capture/compose.ts`)

`composeWithFrame(screenshot, frame | null, barPage, width)`: geen frame → screenshot ongewijzigd. Anders elke balk renderen met `barPage.setViewportSize({ width, height: bar.height })`, `setContent(html, { waitUntil: "load" })`, `screenshot({ type: "png", omitBackground: true })`. Dan met sharp een transparant canvas (breedte van de screenshot, hoogte top + screenshot + bottom) en `composite`: top op y=0, screenshot eronder, bottom daaronder. PNG met `compressionLevel: 8`.

### 6.7 Opslag (`storage.ts`)

- `outputDir()`: `WEBSNAP_OUTPUT_DIR` (met `~` uitgevouwen), anders `~/Pictures/Websnap`, of `~/Websnap` als Pictures niet bestaat.
- `displayPath(abs)`: home-map als `~` tonen.
- `resolveOutputPath(relative)`: `path.resolve(root, relative)` en alleen teruggeven als het de root zelf is of eronder ligt, anders `null`. **Alle bestandsroutes gebruiken dit.**
- `timestamp()`: `YYYY-MM-DD_HHmmss` in lokale tijd.
- Sessiemap: `<output>/<slugifyHost(displayHost(url))>/<timestamp>/` (één tijdstempel per run, gedeeld door alle URL's).
- **Bestandsnaam (contract):** `<site>_<presetId>_<variant>[_fullpage]_<w>x<h>.png`, met variant = `zonder-ui`, `chrome`, `safari`, `chrome-dark` of `safari-dark`. Voorbeeld: `klant-nl_iphone_safari-dark_fullpage_1179x2556.png`. `listSessions()` en `groupSession()` lezen dit formaat terug; houd ze synchroon.
- `listSessions()`: alle `<site>/<run>/` mappen met PNG's, afmetingen uit de bestandsnaam, `createdAt` = mtime van de map, nieuwste eerst, max 12.

### 6.8 Orkestratie (`run-capture.ts`)

- `planCapture(request)` → `{ jobs, urls, presets, options }`. Geen geldige URL → `InvalidRequestError("Vul een geldige URL in, bijvoorbeeld klant.nl.")`. Geen formaat → `"Kies minimaal één formaat."`. Jobs = URL × preset × UI-variant (in die volgorde).
- `runCapture(plan, emit)`: altijd via `runExclusive` (een promise-queue op moduleniveau) zodat er nooit twee runs tegelijk lopen. Emit `start`, dan per URL per preset `capturePreset`; elke afbeelding: sharp-metadata voor afmetingen, `fileName`, `saveImage`, emit `shot`. Fout tijdens een preset → emit `error` met de jobIds die nog niet klaar waren. Aan het eind `done` met de sessiepaden. Gooit nooit.
- Foutmeldingen (Nederlands, zeggen wat te doen):

| Herkenning                                     | Melding                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| `CaptureError`                                 | eigen tekst                                                         |
| `ERR_NAME_NOT_RESOLVED`                        | Domein niet gevonden. Klopt de URL?                                 |
| `ERR_CONNECTION_REFUSED`                       | Geen verbinding. Draait de (lokale) server?                         |
| `ERR_CONNECTION`, `ERR_TUNNEL`, `ERR_INTERNET` | Kon geen verbinding maken met de site.                              |
| `ERR_SSL`, `ERR_CERT`                          | Beveiligde verbinding mislukt. Probeer het met http://.             |
| `Timeout`                                      | De pagina laadde niet binnen 45 seconden.                           |
| `Executable doesn't exist`                     | Chromium ontbreekt. Draai eenmalig: npx playwright install chromium |
| anders                                         | eerste regel van de fout, max 200 tekens                            |

## 7. Browser-UI-balken (`src/server/frames`)

Elke balk is een klein HTML-document van exact `width × height` CSS-px (transparante body), gerenderd door Playwright en daarna geplakt. Zo zijn ze scherp op elke dpr en gebruiken ze de systeemfont (SF Pro op de Mac).

### Gemeenschappelijk (`html.ts`)

- Font stack: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Inter, "Segoe UI", Roboto, sans-serif`, antialiased, `letter-spacing: -0.01em`.
- `barDocument(width, height, css, body)`: doctype, `<meta name="viewport" content="width=device-width,initial-scale=1">` (**verplicht**, anders rendert een mobiele context op 980 px breed), reset, `html,body{width;height;overflow:hidden;background:transparent}`, `.row{display:flex;align-items:center}`.
- `escapeHtml()` voor titel en host.
- Verkeerslichten macOS: drie cirkels 12 px, gap 8, kleuren `#ff5f57`, `#febc2e`, `#28c840`, `box-shadow: inset 0 0 0 .5px rgba(0,0,0,.12)`.
- Iconen (`icons.ts`): inline SVG, viewBox 24, `stroke="currentColor"`, round caps/joins:

```
back      <path d="M15 18l-6-6 6-6"/>
forward   <path d="M9 18l6-6-6-6"/>
reload    <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4.2h-4.2"/>
star      <path d="M12 4.2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4L4.2 9.9l5.4-.8z"/>
plus      <path d="M12 5v14M5 12h14"/>
tune      <path d="M4 8h9M17 8h3M4 16h3M11 16h9"/><circle cx="15" cy="8" r="2"/><circle cx="9" cy="16" r="2"/>
lock      <rect x="6" y="10.5" width="12" height="9" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>
share     <path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M8 11H6.5A1.5 1.5 0 0 0 5 12.5v6A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 17.5 11H16"/>
sidebar   <rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M9.5 5v14"/>
tabs      <rect x="3.5" y="7.5" width="12" height="12" rx="2"/><path d="M8 4.5h10.5a2 2 0 0 1 2 2V17"/>
pageMenu  <path d="M4.5 7h15M4.5 12h15M4.5 17h9"/>
person    <circle cx="12" cy="9" r="3.5"/><path d="M5.5 19.5a6.5 6.5 0 0 1 13 0"/>
globe     <circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.4 2.4 2.4 13.6 0 16M12 4c-2.4 2.4-2.4 13.6 0 16"/>
dotsV     drie gevulde cirkels r 1.3 op (12,5.5) (12,12) (12,18.5)
dotsH     drie gevulde cirkels r 1.5 op (5.5,12) (12,12) (18.5,12)
```

### Hoogtes (enige bron: `uiHeights(kind, ui)` in `frames/index.ts`)

| Variant        | Top                            | Bottom |
| -------------- | ------------------------------ | ------ |
| Zonder UI      | 0                              | 0      |
| Chrome desktop | 84                             | 0      |
| Safari desktop | 52                             | 0      |
| Chrome iPhone  | 106 (54 status + 52 adresbalk) | 82     |
| Safari iPhone  | 54 (status)                    | 86     |

`buildFrame(kind, ui, width, theme, meta, tint)` → `{ top: { height, html }, bottom: { height, html } | null } | null`.

### Chrome desktop (macOS), 84 px

| Kleur             | Licht                 | Donker                |
| ----------------- | --------------------- | --------------------- |
| tabstrip          | `#e8ebef`             | `#1f2023`             |
| tab + toolbar     | `#ffffff`             | `#35363a`             |
| tekst             | `#1f1f1f`             | `#e8eaed`             |
| muted             | `#5f6368`             | `#9aa0a6`             |
| omnibox           | `#f1f3f4`             | `#202124`             |
| lijn              | `#e3e3e3`             | `#2a2b2e`             |
| avatar bg / icoon | `#d3e3fd` / `#0b57d0` | `#5f6368` / `#e8eaed` |

- Tabstrip 42 px, padding-left 14, items onderaan uitgelijnd. Verkeerslichten verticaal gecentreerd, margin-right 18.
- Actieve tab: hoogte 34, breedte min(240, 32% van width), radius 10 10 0 0, padding 0 10 0 12, gap 9, 12 px tekst. Uitlopende hoekjes links en rechts onderaan via `:before/:after` van 10×10 met `radial-gradient(circle at 0 0 / 100% 0, transparent 10px, <tabkleur> 10.5px)`. Inhoud: favicon 16 px (radius 3) of globe-icoon (opacity .7), titel (of host) met ellipsis, `×` in muted 15 px.
- `+` (16 px, muted) 18 px rechts van de tab, margin-bottom 8.
- Toolbar 42 px, padding 0 10, gap 4, border-bottom 1 px lijn. Knoppen 30×30: back 18, forward 18 (opacity .45), reload 17.
- Omnibox: flex 1, hoogte 32, radius 16, margin 0 8, padding 0 12, gap 10: tune-icoon 16, URL in 13.5 px (host in tekstkleur, path in muted), ster 16.
- Rechts: avatar 22 px rond met person-icoon 14 px, dan dotsV 18.

### Safari desktop (macOS), 52 px

| Kleur       | Licht              | Donker                  |
| ----------- | ------------------ | ----------------------- |
| achtergrond | `#f6f6f6`          | `#2c2c2e`               |
| adresveld   | `rgba(0,0,0,.055)` | `rgba(255,255,255,.09)` |
| tekst       | `#1d1d1f`          | `#f2f2f7`               |
| muted       | `#707074`          | `#a1a1a6`               |
| lijn onder  | `#d9d9d9`          | `#161617`               |

- Padding 0 14 0 18. Links: verkeerslichten (margin-right 18), knoppen 28×28: sidebar 18, back 18, forward 18 (opacity .45).
- Adresveld absoluut gecentreerd: breedte min(680, 46% van width), hoogte 32, radius 9, 13 px tekst gecentreerd: lock 12 px (muted) + host. Links in het veld pageMenu 15 px, rechts reload 14 px (beide muted, 10 px van de rand).
- Rechts: share, plus, tabs (18 px, stroke 1.6).

### iOS statusbalk (54 px, gedeeld)

- Dynamic Island is 126 px breed (niet tekenen, de mockup heeft die al). Links en rechts een "oor" van (width − 126) / 2 breed, inhoud gecentreerd, padding-top 3.
- Links: `9:41`, 17 px, weight 600, letter-spacing −0.02em, padding-left 10.
- Rechts (gap 6, padding-right 6): signaal (4 staafjes 3 px breed, hoogtes 4 / 6.5 / 9 / 12, onder uitgelijnd, 18×12), wifi (17×12, drie bogen), batterij (27×13: omlijning 23×12 radius 3.8 op 40% opacity, vulling 20×9 radius 2.5, knopje op 45% opacity).
- Home-indicator voor de onderbalken: 134×5, radius 3, 8 px van de onderkant, gecentreerd.

### Safari iPhone (iOS 26 compact)

| Kleur          | Licht             | Donker           |
| -------------- | ----------------- | ---------------- |
| achtergrond    | `#f2f2f4`         | `#0c0c0d`        |
| pill/knoppen   | `#ffffff`         | `#2a2a2c`        |
| tekst          | `#1c1c1e`         | `#f2f2f7`        |
| home-indicator | `#111111`         | `#ffffff`        |
| schaduw        | `rgba(0,0,0,.08)` | `rgba(0,0,0,.4)` |

- Top = statusbalk met de **gemeten tint van de site** (6.5), anders thema-achtergrond.
- Bottom 86 px, padding 6 12 0: rij met ronde knop 46 px (back 20, stroke 2), pill (flex 1, hoogte 46, radius 23, margin 0 8, 15 px weight 500, host gecentreerd, pageMenu 17 links en reload 17 rechts op 15 px van de rand), ronde knop 46 px (dotsH 22). Knoppen en pill: `box-shadow: 0 1px 6px <schaduw>, 0 0 0 .5px rgba(0,0,0,.05)`. Home-indicator.

### Chrome iPhone

| Kleur       | Licht     | Donker    |
| ----------- | --------- | --------- |
| achtergrond | `#ffffff` | `#1f1f1f` |
| adresveld   | `#f1f3f4` | `#303134` |
| tekst       | `#1f1f1f` | `#e8eaed` |
| muted       | `#5f6368` | `#9aa0a6` |
| lijn        | `#e6e6e6` | `#2c2c2c` |

- Top 106: statusbalk (thema-achtergrond) + adresrij 52 px (padding 2 12 10, border-bottom): veld flex 1, hoogte 40, radius 20, host 15 px gecentreerd, tune-icoon 17 px muted op 14 px van links.
- Bottom 82: border-top, rij van 48 px met vijf iconen `space-around` (padding 0 6): back 22, forward 22 (opacity .4), plus 22, tab-teller (21×21, border 1.8 px, radius 5, "1" in 11 px weight 700), dotsH 22. Home-indicator.

## 8. API-routes (`src/app/api`)

| Route           | Methode | In                              | Uit                                                                                                                                                                                                                                                                                                |
| --------------- | ------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/capture`  | POST    | `CaptureRequest`                | 400 `{ error }` bij ongeldige invoer of `InvalidRequestError`; anders `200 application/x-ndjson`, één `CaptureEvent` per regel. `ReadableStream` dat `runCapture` aanroept; enqueue en close in try/catch (tab gesloten → run loopt door, bestanden worden opgeslagen). `Cache-Control: no-store`. |
| `/api/files`    | GET     | `?path=<relatief>[&download=1]` | PNG. 404 als `resolveOutputPath` null geeft, het geen `.png` is of niet bestaat. `download` → `Content-Disposition: attachment`.                                                                                                                                                                   |
| `/api/sessions` | GET     | –                               | `{ outputDir: displayPath, sessions: SessionSummary[] }`. Begint met `await connection()`.                                                                                                                                                                                                         |
| `/api/zip`      | POST    | `{ paths: string[] }` (1–200)   | `application/zip` (`websnap.zip`) met de geldige PNG's; 400/404 met `{ error }`.                                                                                                                                                                                                                   |
| `/api/reveal`   | POST    | `{ path }` (`.` = output-map)   | 204. macOS: `open <map>` of `open -R <bestand.png>`; Windows `explorer`; Linux `xdg-open`. Detached spawn. 404 als het pad niet bestaat of buiten de output-map valt.                                                                                                                              |

## 9. Ontwerp en UI

### Tokens (`globals.css`)

```css
@import "tailwindcss";

@theme {
  --color-ground: #f4f5f7; /* paginaachtergrond */
  --color-surface: #ffffff; /* panelen, kaarten */
  --color-ink: #0f1115; /* tekst, primaire knop */
  --color-muted: #626873; /* secundaire tekst (5.6:1 op wit) */
  --color-line: #e3e5e9;
  --color-line-strong: #c9cdd4; /* stippellijnen, uitgeschakeld */
  --color-soft: #eceef1; /* segmented-achtergrond, previewvlak */
  --color-accent: #2d5bff; /* selectie, voortgang, focus */
  --color-accent-soft: #f3f6ff; /* geselecteerde kaart */
  --color-accent-tint: #e8eeff; /* status-badge, focus-ring rond URL-veld */
  --color-accent-ink: #1d3fc2;
  --color-danger: #c4352f;
  --font-sans: var(--font-geist-sans), -apple-system, "Segoe UI", sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, "SF Mono", monospace;
}

@layer base {
  body {
    @apply bg-ground font-sans text-sm text-ink antialiased;
  }
  :focus-visible {
    @apply outline-2 outline-offset-2 outline-accent;
  }
}
```

Alleen licht thema voor de app zelf. Afmetingen en pixelwaarden altijd in Geist Mono. UI-tekst Nederlands, code en comments Engels. Inspiratie (Mobbin): URL-balk zoals Firecrawl, formaatkaarten zoals de export-presets van Arcade, resultatengrid met zwevende selectiebalk zoals Magnific, "bezig"-kaarten zoals Bloom.

### Layout

- **Header** (56 px, wit, lijn onder, padding 0 24): links logo (28 px zwart vierkant radius 8 met wit afgerond kadertje 14×11) + "Websnap" 15 px semibold. Rechts het weergavepad van de output-map (mono 12 px, `bg-soft`, radius 6, verborgen op smal scherm) en knop "Open map" (map-icoon, rand, 34 px hoog) → reveal van de huidige sessiemap of `.`.
- **Body**: flex-wrap rij. Linkerkolom (formulier) `flex: 1 1 340px`, max 400 px vanaf md, wit, lijn rechts. Rechterkolom `flex: 999 1 560px`, padding 24/28, onderaan 128 px ruimte voor de selectiebalk. Op telefoonbreedte stapelt alles.

### Formulier (linkerkolom)

Secties met 22 px tussenruimte, padding 20. Sectietitels: 12 px semibold uppercase, tracking 0.04em, muted.

1. **Website**: veld met `https://` als vaste prefix (mono 13 px muted) en een textarea (15 px, 1–5 rijen meegroeiend). Rand 1.5 px `line-strong`, radius 10; bij focus rand accent + ring 4 px `accent-tint`. Placeholder "jouwklant.nl". Hulptekst: "Meerdere sites of pagina's? Zet ze onder elkaar." ⌘/Ctrl + Enter verstuurt.
2. **Formaat**: 2-koloms grid, gap 8, met kaarten per preset (icoon 20 px laptop/monitor/telefoon, naam semibold, `1440 × 900 · 2x` in mono 11.5 muted). Geselecteerd: rand 1.5 px accent, `accent-soft`, blauw vinkje-rondje 18 px rechtsboven. Multi-select (`aria-pressed`). Daaronder over twee kolommen een gestippelde knop "+ Eigen formaat"; aangeklikt wordt het een blok met breedte × hoogte, select 1x/2x/3x, segmented Desktop/Mobiel en een link "Verwijderen".
3. **Browser-UI**: titelrij met rechts een segmented Licht/Donker (150 px). Drie tegels (grid 3) met een mini-wireframe (44 px hoog): leeg venster, Chrome (tab + adresbalk), Safari (één balk met pill). Zelfde selectiestijl, multi-select. Hulptekst: "Desktop krijgt de macOS-variant, iPhone de iOS-variant."
4. **Pagina**: segmented "Boven de vouw" / "Volledige pagina" over de volle breedte.
5. **Geavanceerd** (inklapbaar, lijn erboven, chevron): switch "Cookiebanners en chats verbergen", getalveld "Extra wachten (seconden)" 0–15 stap 0.5, tekstveld "Ook verbergen" (CSS-selectors, komma's) met hulptekst.
6. **Voet** (sticky onderaan de kolom, lijn erboven, padding 16 20): primaire knop 46 px, radius 10, ink, 15 px semibold: "Maak 6 screenshots" (aantal live berekend), "Bezig…" tijdens een run. Uitgeschakeld (`line-strong`) als er geen geldige URL, geen formaat of geen UI-variant is. Regel eronder (12 px muted, gecentreerd): de reden ("Vul eerst een website in" / "Kies minimaal één formaat" / "Kies minimaal één UI-variant"), anders "2 formaten × 3 UI-varianten · ⌘ + Enter".

### Rechterkolom: lege staat (eerste keer)

Max 760 px breed. Kop "Schone screenshots voor je mockups" (28 px semibold, tracking −0.025em) met een alinea uitleg (15 px muted, max 58ch). Drie kaarten: `2880 × 1800` MacBook-mockup, `1179 × 2556` iPhone-mockup ("Ook met UI blijft het eindformaat gelijk."), `geen pop-ups` Schoon beeld; de waarde in mono accent. Daaronder "Eerdere sessies": lijst (wit, radius 12, scheidingslijnen) met thumbnail 72×45 (eerste liggende PNG, object-top), sitenaam, "N screenshots", datum in mono. Klik opent die sessie in de resultatenweergave.

### Rechterkolom: resultaten

- Kop: site (22 px semibold) + starttijd in mono; rechts een status-badge (pil met bolletje): "Bezig · 3 van 6" (accent-tint/accent-ink), "Klaar" (groen `#e6f4ea`/`#1e6b34`), "Klaar · 2 mislukt" (rood `#fdecea`/danger). Tijdens een run een voortgangsbalk van 3 px (accent op line, `role="progressbar"`).
- Per site (kopje alleen bij meerdere sites) per formaat een sectie: titel (15 px) + `1440 × 900 @2x` mono. Grid: desktop `repeat(auto-fill, minmax(260px, 1fr))`, mobiel `minmax(190px, 1fr)` met max 820 px.
- **Kaart klaar**: previewvlak `bg-soft`, padding 14 (desktop aspect 16/11, mobiel 328 px hoog), afbeelding met kleine schaduw en radius, klik opent de PNG in een nieuw tabblad. Selectievakje 22 px linksboven (accent als geselecteerd). Voet: label ("Chrome · licht", "Safari · donker", "Zonder UI"), afmetingen in mono, downloadknop 32 px.
- **Kaart bezig**: gestippelde rand, spinner (accent-boog op line-cirkel, `motion-reduce` uit) + "Bezig…".
- **Kaart mislukt**: alert-icoon en de foutmelding in danger.
- **Selectiebalk** (fixed, onder midden, ink, radius 12, schaduw): "N geselecteerd", knop "Download" (accent, maakt zip via `/api/zip`, "Zip maken…" tijdens), "Toon in Finder" (reveal eerste selectie), `×` wist de selectie.
- Bij een fout van het verzoek zelf: rode melding boven de resultaten. Netwerkfout → "Websnap is niet bereikbaar. Draait de server nog?"

### Gedrag client

- `useCaptureRun`: zet bij start `{ status: "running", startedAt, theme }`, POST, leest `response.body.pipeThrough(new TextDecoderStream())`, buffert op `\n`, parset elke regel en vouwt hem met een pure `applyEvent(run, event)` in de state. Stream klaar zonder `done` → status `done`.
- `groupRun(run)` en `groupSession(session)` (in `lib/result-groups.ts`) maken dezelfde structuur `{ host, groups: [{ key, title, detail, kind, items }] }` zodat `ResultsView` voor beide werkt.
- Na een afgeronde run de sessielijst verversen. Nieuwe run of sessie openen wist de selectie.
- `usePersistentState`: eerste render met defaults (geen hydration-mismatch), daarna localStorage inlezen; elke wijziging wegschrijven. Alles in try/catch.
- Afbeeldingen via `next/image` met `unoptimized` (bron is een lokale API-route).

## 10. Conventies

- TypeScript strict, geen `any`. Named exports, bestandsnamen kebab-case.
- `src/server/**` begint met `import "server-only";` en wordt nooit uit componenten geïmporteerd. Fetch-logica alleen in hooks en `lib/client-actions.ts`.
- Eén bron per feit: hoogtes in `frames`, presets in `lib/presets.ts`, bestandsnaam in `storage.ts`, request-schema in `lib/capture-request.ts`.
- Tailwind-tokens in plaats van losse hex-kleuren (uitzondering: eenmalige statuskleuren en de mini-wireframes).
- Toegankelijk: echte `<button>`/`<label>`, `aria-pressed` voor toggles, `role="radiogroup"`/`radio` voor segmented controls, `role="switch"`, `aria-label` op icoonknoppen, zichtbare focus.
- Comments alleen waar het "waarom" niet vanzelf spreekt.
- Geen extra dependencies zonder reden.

## 11. Fases

Werk ze in volgorde af. Na elke fase `npm run check` groen en een kort verslag.

1. **Scaffold**: create-next-app (zie 2), dependencies, scripts, prettier, `.env.example`, `globals.css`-tokens, Geist via `geist`, layout met `lang="nl"` en titel "Websnap", `icon.svg` (logo). Verwijder de boilerplate.
2. **Gedeelde lib**: `types`, `presets`, `url`, `capture-request`, `settings`.
3. **Engine**: `frames/*`, `capture/*`, `storage`, `run-capture`. Test met een klein Node-script of via de route tegen een lokale testpagina (sticky header, lazy images, Cookiebot-achtige banner, hoge pagina) en controleer: 2880 × 1800 en 1179 × 2556 met én zonder UI, banner weg, full page zonder naden.
4. **API-routes**, inclusief padcontrole (`/api/files?path=../../etc/passwd` → 404).
5. **UI**: primitives, formulier, resultaten, lege staat, selectiebalk, hooks.
6. **Afronden**: `README.md` (Nederlands, voor het team: Node installeren, `npm install`, `npm run build && npx next start -p 4747`, waar de bestanden komen, formatentabel), een `Websnap starten.command` voor dubbelklikken op macOS (check Node, eerste keer `npm install && npm run build`, open `http://localhost:4747`, `next start -p 4747`), en een `CLAUDE.md` die naar dit document verwijst. `next build` moet zonder waarschuwingen slagen.

## 12. Acceptatiecriteria

- [ ] `npm run check` en `next build` slagen zonder fouten of waarschuwingen.
- [ ] Desktop-preset levert 2880 × 1800 voor zonder UI, Chrome en Safari; iPhone 1179 × 2556 voor alle drie. Eigen 390 × 844 @3x → 1170 × 2532.
- [ ] Met UI is de pagina korter (viewport verkleind), niet bijgesneden: een 100vh-hero past precies boven de onderbalk.
- [ ] Chrome-tab toont de echte paginatitel en favicon; adresbalken tonen de host zonder `www.`.
- [ ] Safari iPhone: statusbalk heeft de kleur van de bovenkant van de site, tekst wit of zwart op basis van contrast.
- [ ] Bekende cookiebanners en chatwidgets zijn onzichtbaar; scroll-lock is opgeheven.
- [ ] Volledige pagina langer dan 12.000 device-pixels is naadloos geplakt; max 16.000 CSS-px.
- [ ] `localhost:4321` werkt (http), `klant.nl` wordt https.
- [ ] Een niet-bestaand domein geeft per kaart "Domein niet gevonden. Klopt de URL?" en de rest van de run gaat door.
- [ ] Bestanden staan in `~/Pictures/Websnap/<site>/<tijdstempel>/` met namen volgens het contract; eerdere sessies zijn terug te openen.
- [ ] Bestandsroutes weigeren paden buiten de output-map.
- [ ] Formulierinstellingen blijven bewaard na herladen.
- [ ] Werkt op telefoonbreedte zonder horizontale scroll.

## 13. Bekende beperkingen (bewust, niet oplossen in deze opdracht)

- Alles rendert in Chromium; mobiel is emulatie (UA, touch, dpr), geen echte WebKit.
- Pop-ups verbergen werkt met een lijst selectors; onbekende banners vangt de gebruiker op via "Ook verbergen".
- Een lopende run kan niet worden afgebroken.

## 14. Daarna (roadmap, niet nu bouwen)

1. Tests met Vitest: `normalizeUrl`/`slugifyHost`, `fileName` ↔ `groupSession` round-trip, `planCapture`; één Playwright-test op een lokale testpagina die de afmetingen controleert.
2. Run afbreken (AbortController → `request.signal` → check tussen presets).
3. Site-profielen: per domein extra selectors en wachttijd onthouden (JSON in de output-map).
4. Meerdere pagina's per site als één sessie, paginanaam in de bestandsnaam.
5. WebKit als optie voor iPhone.
6. Donkere modus voor de app.
7. Eventueel een gedeelde online versie (dan auth toevoegen en `@sparticuz/chromium` of een kleine server).
