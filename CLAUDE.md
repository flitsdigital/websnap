@AGENTS.md

# Websnap

Lokale Next.js-app die screenshots maakt voor device-mockups. De volledige opdracht, architectuur en ontwerpspecificatie staan in [docs/handoff.md](docs/handoff.md); lees die eerst.

- `npm run check` moet groen zijn en `npm run build` zonder waarschuwingen slagen.
- UI-tekst Nederlands, code en comments Engels.

## Afwijkingen van de handoff

- Bestandsnaam-contract (`fileName`/`parseFileName`) staat in `src/lib/file-name.ts` in plaats van `storage.ts`, zodat `storage.ts` (server) en `result-groups.ts` (client) dezelfde code gebruiken.
- Extra primitive `src/components/ui/select-card.tsx` voor de formaat- en UI-tegels.
- Ingebouwde pop-up-selectors en "Ook verbergen" zijn aparte CSS-regels: een ongeldige eigen selector schakelt de ingebouwde lijst niet uit.
- Twee pagina's van dezelfde site in één run krijgen elk een eigen sessiemap (`<tijdstempel>-2`), zodat bestanden elkaar niet overschrijven.
- Na een run of geopende sessie brengt "← Overzicht" je terug naar de lege staat met eerdere sessies.
- `networkidle` wacht maximaal 3 s in plaats van 8 s: sites met analytics of video worden nooit stil, dus dat kostte per formaat altijd 8 s. Het doorscrollen laadt lazy images daarna alsnog.

## Secties (na de handoff toegevoegd)

Modus "Secties" in het formulier: één pagina in één of meer formaten laden (standaard Desktop + iPhone), secties aanklikken of zelf een kader slepen, en die stukken uitknippen.

- `src/server/inspect.ts`: laadt de pagina per formaat (parallel) (via `loadPage` uit `capture-preset.ts`), herkent secties (`capture/sections.ts`) en bewaart per formaat één full-page PNG op volle resolutie in `os.tmpdir()/websnap`. Uitknippen gebeurt uit die bestanden, zodat het resultaat exact de preview is. De laatste 5 pagina's blijven bewaard.
- Koppeling tussen formaten: elke herkende sectie heeft `keys` (DOM-pad, id, class + index). Een aangeklikte sectie wordt in elk formaat opgezocht via de meeste gedeelde keys (`matchSection` in `components/sections/page-preview.tsx`) en krijgt in elk formaat hetzelfde nummer. Een gesleept kader bestaat alleen in het formaat waarin het getekend is.
- Routes: `POST /api/inspect` (laden), `GET /api/inspect?id=&preset=` (JPEG-preview, max 1600 px breed), `POST /api/regions` (`{ id, crops }` → `SessionSummary`).
- Browser-UI bij secties (`sectionUiVariants`, standaard alleen "none"): zonder UI is het bestand precies de sectie (gebied × dpr), geknipt uit de full-page PNG. Met Chrome/Safari is het een volledig scherm op het vaste formaat, gemaakt op de echte pagina: de laatst geladen pagina blijft per formaat open (`Stored.live`, alleen voor de nieuwste inspectie), viewport = formaat − balken, `capture/scroll-to-section.ts` zoekt het element op via zijn keys, scrolt er voorbij en terug (zodat navbars die bij omlaag scrollen verdwijnen weer verschijnen) en zet de sectie direct onder de sticky/fixed navbar. Is de pagina inmiddels gesloten, dan wordt hij opnieuw geladen. Knippen loopt via `runExclusive`.
- Bestandsnaam: `<site>_<presetId>_sectie-<n>[-<ui>]_<w>x<h>.png`, bijv. `sectie-1` of `sectie-1-safari-dark`. `parseFileName` kent dit formaat (round-trip getest).
- UI: `components/sections/section-picker.tsx` (toolbar, selectie) en `page-preview.tsx` (één preview met klikken/slepen; kleinste sectie onder de muis wint), `hooks/use-inspection.ts`.
- Eigen formaat wordt in sectiemodus (nog) niet aangeboden.
