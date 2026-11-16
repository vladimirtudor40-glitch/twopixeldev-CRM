#!/usr/bin/env bash
# Compilează gmaps-scraper (google-maps-scraper de la github.com/gosom, licență MIT) pentru „Caută lead-uri”.
#
# Versiunea oficială v1.18.2 se blochează pe Windows („target closed”, issue #137) din cauza flag-urilor
# Chrome --single-process și --no-zygote din scrapemate. Compilăm din sursă cu cele două flag-uri scoase,
# exact ca versiunea reparată din aplicația separată „twopixeldev Leaduri”.
#
# Folosire: scripts/build-gmaps-scraper.sh <fișier-ieșire> [GOOS] [GOARCH]   (implicit windows/amd64)
set -euo pipefail

OUT="$1"
GOOS_TARGET="${2:-windows}"
GOARCH_TARGET="${3:-amd64}"
SCRAPER_VERSION="v1.18.2"
SCRAPEMATE_VERSION="v1.4.1" # versiunea cerută de go.mod-ul scraper-ului

case "$OUT" in /*|[A-Za-z]:*) ;; *) OUT="$PWD/$OUT" ;; esac
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

git -c advice.detachedHead=false clone -q --depth 1 --branch "$SCRAPER_VERSION" https://github.com/gosom/google-maps-scraper.git "$WORK/gms"
git -c advice.detachedHead=false clone -q --depth 1 --branch "$SCRAPEMATE_VERSION" https://github.com/gosom/scrapemate.git "$WORK/gms/third_party/scrapemate"
grep -q "github.com/gosom/scrapemate $SCRAPEMATE_VERSION" "$WORK/gms/go.mod"

F="$WORK/gms/third_party/scrapemate/adapters/fetchers/jshttp/jshttp.go"
grep -q -- '`--single-process`,' "$F"
sed -i.bak -e '/`--single-process`,/d' -e '/`--no-zygote`,/d' "$F"
rm -f "$F.bak"
if grep -q -- '--single-process\|--no-zygote' "$F"; then
  echo "Nu am putut scoate flag-urile din $F" >&2
  exit 1
fi
printf '\nreplace github.com/gosom/scrapemate => ./third_party/scrapemate\n' >> "$WORK/gms/go.mod"

mkdir -p "$(dirname "$OUT")"
(cd "$WORK/gms" && GOOS="$GOOS_TARGET" GOARCH="$GOARCH_TARGET" CGO_ENABLED=0 go build -trimpath -ldflags "-s -w" -o "$OUT" .)
echo "gmaps-scraper $SCRAPER_VERSION (fără --single-process) → $OUT"
