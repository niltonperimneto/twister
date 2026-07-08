#!/usr/bin/env bash
# Build a Twister AppImage locally.
#
# Mirrors the AppDir construction in .github/workflows/build-appimage.yml so
# the local artifact has the same layout the CI publishes on tag pushes.
# Uses host system libs (no bundled webkit2gtk) — matching CI behaviour.
#
# Output: dist/Twister_<VERSION>_amd64.AppImage

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

note() { printf '\033[36m›\033[0m %s\n' "$*"; }
die()  { printf '\n\033[31merror:\033[0m %s\n' "$*" >&2; exit 1; }

# ── Version (same regex as scripts/sync-version.sh) ─────────────────
VERSION=$(sed -n 's/^version *= *"\(.*\)"/\1/p' src-tauri/Cargo.toml | head -1)
[ -n "$VERSION" ] || die "Cannot read version from src-tauri/Cargo.toml"
note "Twister $VERSION"

# ── Host deps ───────────────────────────────────────────────────────
for cmd in cargo npm file curl; do
  command -v "$cmd" >/dev/null || die "missing host tool: $cmd"
done
if ! cargo tauri --version >/dev/null 2>&1; then
  die "tauri CLI not found. Install with: cargo install tauri-cli --version '^2' --locked"
fi
if ! pkg-config --exists webkit2gtk-4.1 javascriptcoregtk-4.1 2>/dev/null; then
  die "webkit2gtk-4.1 development files not found.
  Fedora:        sudo dnf install webkit2gtk4.1-devel javascriptcoregtk4.1-devel
  Debian/Ubuntu: sudo apt install libwebkit2gtk-4.1-dev libjavascriptcoregtk-4.1-dev
  Arch:          sudo pacman -S webkit2gtk-4.1"
fi

# ── appimagetool (cached locally; pinned to CI version) ─────────────
APPIMAGETOOL_VER="1.9.1"
if command -v appimagetool >/dev/null; then
  APPIMAGETOOL=$(command -v appimagetool)
  note "Using system appimagetool: $APPIMAGETOOL"
else
  CACHE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/twister"
  APPIMAGETOOL="$CACHE_DIR/appimagetool-${APPIMAGETOOL_VER}"
  if [ ! -x "$APPIMAGETOOL" ]; then
    note "Downloading appimagetool $APPIMAGETOOL_VER → $APPIMAGETOOL"
    mkdir -p "$CACHE_DIR"
    curl -Lo "$APPIMAGETOOL" \
      "https://github.com/AppImage/appimagetool/releases/download/${APPIMAGETOOL_VER}/appimagetool-x86_64.AppImage"
    chmod +x "$APPIMAGETOOL"
  fi
fi

# ── Build the binary ────────────────────────────────────────────────
note "Building Twister binary (cargo tauri build --no-bundle)…"
cargo tauri build --no-bundle

BINARY="src-tauri/target/release/twister"
[ -x "$BINARY" ] || die "expected $BINARY to exist after build"

# ── AppDir ──────────────────────────────────────────────────────────
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
APPDIR="$WORK/AppDir"
note "Constructing AppDir at $APPDIR"

install -Dm755 "$BINARY" "$APPDIR/usr/bin/twister"
install -Dm644 src-tauri/icons/128x128@2x.png \
  "$APPDIR/usr/share/icons/hicolor/256x256/apps/twister.png"
install -Dm644 src-tauri/icons/128x128@2x.png "$APPDIR/twister.png"

# Desktop entry: use the project's canonical .desktop but rewrite the Icon
# field to "twister" so it matches the AppDir's top-level twister.png (the
# AppImage convention) instead of the reverse-DNS Flatpak icon name.
install -Dm644 io.github.niltonperimneto.Twister.desktop \
  "$APPDIR/twister.desktop"
sed -i 's|^Icon=.*|Icon=twister|' "$APPDIR/twister.desktop"

# AppStream metainfo — lets appimaged / GNOME Software identify the bundle.
install -Dm644 io.github.niltonperimneto.Twister.metainfo.xml \
  "$APPDIR/usr/share/metainfo/io.github.niltonperimneto.Twister.metainfo.xml"

cat > "$APPDIR/AppRun" <<'APPRUN'
#!/bin/bash
SELF=$(readlink -f "$0")
HERE=${SELF%/*}
exec "$HERE/usr/bin/twister" "$@"
APPRUN
chmod +x "$APPDIR/AppRun"

# ── Pack ────────────────────────────────────────────────────────────
mkdir -p dist
OUT="dist/Twister_${VERSION}_amd64.AppImage"
note "Packing $OUT"
APPIMAGE_EXTRACT_AND_RUN=1 ARCH=x86_64 "$APPIMAGETOOL" "$APPDIR" "$OUT"

note "✓ Built $OUT"
ls -lh "$OUT"
