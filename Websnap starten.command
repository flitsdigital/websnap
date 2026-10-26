#!/bin/bash
# Double-click on macOS to start Websnap on http://localhost:4747.
cd "$(dirname "$0")" || exit 1

pause() { read -n 1 -s -r -p "Druk op een toets om dit venster te sluiten."; echo; }

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is niet gevonden. Installeer de LTS-versie via https://nodejs.org en probeer het opnieuw."
  pause
  exit 1
fi

if [ ! -d node_modules ] || [ ! -f .next/BUILD_ID ]; then
  echo "Eerste keer: Websnap installeren en bouwen. Dit duurt een paar minuten…"
  if ! (npm install && npm run build); then
    echo "Installeren is mislukt. Zie de melding hierboven."
    pause
    exit 1
  fi
fi

(sleep 2 && open "http://localhost:4747") &
echo "Websnap draait op http://localhost:4747. Sluit dit venster om te stoppen."
exec npx next start -p 4747
