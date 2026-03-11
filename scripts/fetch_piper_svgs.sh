#!/usr/bin/env bash
# Fetch the latest SVG assets from the Piper repository.
# Usage: ./scripts/fetch_piper_svgs.sh
set -euo pipefail

DEST="$(cd "$(dirname "$0")/../public/svgs" && pwd)"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

echo "Cloning piper (shallow)…"
git clone --depth 1 https://github.com/libratbag/piper.git "$TMPDIR/piper"

echo "Copying SVGs → $DEST"
mkdir -p "$DEST"
cp "$TMPDIR/piper/data/svgs/"*.svg "$DEST/"
cp "$TMPDIR/piper/data/svgs/svg-lookup.ini" "$DEST/"

echo "Done — $(ls "$DEST"/*.svg | wc -l) SVGs installed."
