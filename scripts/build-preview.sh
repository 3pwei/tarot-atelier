#!/usr/bin/env bash
# Builds the DEV preview that Cloudflare Pages serves for every pull request.
#
# The site is exported with the production base path (/tarot) and placed at
# preview/tarot/, so a preview behaves exactly like
# https://games.milespapa.com/tarot/. The preview root redirects to /tarot/
# and every response is marked noindex.
#
# Usage: scripts/build-preview.sh   (Cloudflare Pages output directory: preview)
set -euo pipefail

slug=tarot
root=preview

cd "$(dirname "$0")/.."

NEXT_PUBLIC_BASE_PATH="/$slug" NEXT_TELEMETRY_DISABLED=1 pnpm build

rm -rf "$root"
mkdir -p "$root/$slug"
cp -a out/. "$root/$slug/"
# Cloudflare Pages serves the root 404.html for unknown paths; its assets
# already point at /tarot/.
cp "$root/$slug/404.html" "$root/404.html"

cat >"$root/_redirects" <<REDIRECTS
/  /$slug/  302
REDIRECTS

cat >"$root/_headers" <<HEADERS
/*
  X-Robots-Tag: noindex
HEADERS

echo "Preview ready in $root/ (open /$slug/)."
