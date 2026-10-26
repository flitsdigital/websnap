# Websnap

Schone screenshots van websites die we gebouwd hebben, op precies het formaat van onze Photoshop-mockups (MacBook, iPhone). Met of zonder browser-UI (Chrome of Safari, licht of donker); het eindbestand heeft altijd hetzelfde formaat, zodat elke variant in hetzelfde smart object past.

Websnap draait alleen op je eigen Mac (`localhost`). Er is geen account of database.

## Installeren (eenmalig)

1. Installeer **Node.js** (LTS) via [nodejs.org](https://nodejs.org).
2. Open Terminal in deze map en draai:

   ```bash
   npm install
   ```

   Dit installeert ook Chromium (de browser die de screenshots maakt).

## Starten

Dubbelklik op **`Websnap starten.command`**. De eerste keer installeert en bouwt hij alles; daarna opent Websnap vanzelf op [http://localhost:4747](http://localhost:4747). Sluit het Terminal-venster om te stoppen.

Liever handmatig:

```bash
npm run build && npx next start -p 4747
```

Na een update van de code: opnieuw `npm install && npm run build`.

> macOS blokkeert het `.command`-bestand de eerste keer misschien. Klik dan met rechts → **Open**.

## Waar komen de bestanden?

In `~/Pictures/Websnap/<site>/<datum_tijd>/`, bijvoorbeeld:

```
~/Pictures/Websnap/klant-nl/2026-10-25_141502/klant-nl_iphone_safari-dark_1179x2556.png
```

Bestandsnaam: `<site>_<formaat>_<ui>[_fullpage]_<breedte>x<hoogte>.png`. Een andere map kies je met `WEBSNAP_OUTPUT_DIR` in `.env.local` (zie `.env.example`).

## Formaten

| Formaat        | Scherm (CSS-px)     | Dichtheid | Bestand             |
| -------------- | ------------------- | --------- | ------------------- |
| Desktop        | 1440 × 900          | 2x        | 2880 × 1800         |
| Desktop HD     | 1920 × 1080         | 1x        | 1920 × 1080         |
| iPhone         | 393 × 852           | 3x        | 1179 × 2556         |
| iPhone Pro Max | 430 × 932           | 3x        | 1290 × 2796         |
| Eigen formaat  | 280–3840 × 400–4000 | 1x/2x/3x  | breedte × dichtheid |

Desktop krijgt de macOS-balk, iPhone de iOS-balk. Met browser-UI wordt de pagina korter gemaakt (zoals in een echte browser), niet bijgesneden.

## Secties uitknippen

Zet bovenaan het formulier de schakelaar op **Secties**, vul één pagina in, kies de formaten (standaard Desktop + iPhone) en klik op **Pagina laden**. Je ziet de hele pagina per formaat naast elkaar:

- **Klik** op een sectie (header, hero, footer…) om hem te selecteren. Hij wordt meteen in elk formaat geselecteerd, ook al is hij op de iPhone anders van vorm. Nog een keer klikken haalt hem weg.
- **Sleep** zelf een kader als een sectie niet precies goed is. Dat kader geldt alleen voor het formaat waarin je het tekent.
- Klik op **Knip N secties**. Elk stuk wordt een losse PNG op de dichtheid van het formaat (een gebied van 1440 × 620 op Desktop wordt 2880 × 1240), bijvoorbeeld `klant-nl_desktop_sectie-1_2880x1240.png` en `klant-nl_iphone_sectie-1_1179x1788.png`. Hetzelfde nummer is dezelfde sectie.
- Kies je bij Browser-UI ook **Chrome** of **Safari**, dan krijg je per sectie bovendien een volledig scherm op het vaste formaat (2880 × 1800 of 1179 × 2556) met de browserbalken erom, alsof je naar die sectie gescrold bent: de navbar van de site staat bovenin en de sectie begint eronder. Dat past direct in de MacBook- en iPhone-mockups. Een sectie die hoger is dan het scherm loopt onderaan door tot het scherm vol is.

## Tips

- **Cookiebanner of chat zichtbaar?** Websnap verbergt de bekende. Voeg andere toe onder _Geavanceerd → Ook verbergen_ (CSS-selector, bijv. `.promo-bar`).
- **Animaties nog niet klaar?** Zet _Extra wachten_ op een paar seconden.
- **Lokale site** (`localhost:4321`, `site.test`) werkt gewoon; die wordt via `http://` geopend.

## Bekende beperkingen

- Alles rendert in Chromium; de iPhone is emulatie, geen echte Safari.
- Een lopende run kan niet worden afgebroken; er loopt altijd maar één run tegelijk.

## Ontwikkelen

```bash
npm run dev      # ontwikkelserver
npm run check    # typecheck + lint + prettier
```

Opdracht en ontwerp: [docs/handoff.md](docs/handoff.md).
