#!/usr/bin/env bash
# Replaces site/tarot/ in a milespapa-games checkout with a fresh static export
# and runs that repository's own publishing checks.
#
# Usage: scripts/stage-games-site.sh <out-dir> <milespapa-games-dir>
#
# Prints `changed=true|false` (also to $GITHUB_OUTPUT when set). It never
# commits or pushes; see docs/deployment.md for the release steps.
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <out-dir> <milespapa-games-dir>" >&2
  exit 64
fi

out_dir=$1
games_dir=$2
slug=tarot
target="$games_dir/site/$slug"

if [[ ! -f "$out_dir/index.html" ]]; then
  echo "No static export at $out_dir; run the build first." >&2
  exit 1
fi
# A build without the /tarot base path loads assets from the domain root.
if ! grep -q "/$slug/_next/" "$out_dir/index.html"; then
  echo "$out_dir was not built with NEXT_PUBLIC_BASE_PATH=/$slug." >&2
  exit 1
fi
if [[ ! -f "$games_dir/scripts/check-site.mjs" ]]; then
  echo "$games_dir does not look like a milespapa-games checkout." >&2
  exit 1
fi

# Replace the folder entirely so no stale chunks survive.
rm -rf "$target"
mkdir -p "$target"
cp -a "$out_dir/." "$target/"

(cd "$games_dir" && node scripts/check-site.mjs)

if [[ -z "$(git -C "$games_dir" status --porcelain -- "site/$slug")" ]]; then
  changed=false
else
  changed=true
fi
echo "changed=$changed"
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  echo "changed=$changed" >>"$GITHUB_OUTPUT"
fi
