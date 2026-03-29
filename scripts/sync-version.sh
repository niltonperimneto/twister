#!/usr/bin/env bash
# sync-version.sh — read the version from Cargo.toml and propagate it
# to package.json, tauri.conf.json, and the AppStream metainfo XML.
#
# Usage:  ./scripts/sync-version.sh          (from the twister/ root)
# The script is also called automatically via `npm run sync-version`.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ── 1. Extract version from Cargo.toml (single source of truth) ─────
VERSION=$(sed -n 's/^version *= *"\(.*\)"/\1/p' "$ROOT/src-tauri/Cargo.toml" | head -1)

if [ -z "$VERSION" ]; then
  echo "error: could not read version from src-tauri/Cargo.toml" >&2
  exit 1
fi

# ── 2. package.json ─────────────────────────────────────────────────
sed -i "s/\"version\": *\"[^\"]*\"/\"version\": \"$VERSION\"/" "$ROOT/package.json"

# ── 3. tauri.conf.json ──────────────────────────────────────────────
sed -i "s/\"version\": *\"[^\"]*\"/\"version\": \"$VERSION\"/" "$ROOT/src-tauri/tauri.conf.json"

# ── 4. AppStream metainfo XML (latest <release> tag only) ───────────
METAINFO="$ROOT/io.github.niltonperimneto.Twister.metainfo.xml"
if [ -f "$METAINFO" ]; then
  sed -i "0,/<release version=\"[^\"]*\"/{s/<release version=\"[^\"]*\"/<release version=\"$VERSION\"/}" "$METAINFO"
fi

echo "synced version $VERSION across all manifests"
