#!/usr/bin/env bash
# install.sh — build and install Twister + its daemons via meson.
#
# Thin convenience wrapper around the meson superproject (meson.build): it builds
# the Twister GUI plus the bundled clackd (keyboards) and ratbagd (mice) daemons
# and installs them system-wide.
#
# Usage:
#   ./install.sh                         # prefix=/usr, both daemons
#   ./install.sh --prefix=/usr/local     # extra args are forwarded to meson setup
#   ./install.sh -Dclackd=disabled       # build only the app + ratbagd
#
# The meson build dir is `builddir` (NOT `build` — that is the vite frontend
# output dir).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

BUILDDIR=builddir

note() { printf '\033[36m›\033[0m %s\n' "$*"; }
die()  { printf '\n\033[31merror:\033[0m %s\n' "$*" >&2; exit 1; }

# ── Host deps ───────────────────────────────────────────────────────────────
for cmd in meson ninja cargo npm pkg-config; do
    command -v "$cmd" >/dev/null || die "missing host tool: $cmd"
done
if ! pkg-config --exists webkit2gtk-4.1 javascriptcoregtk-4.1 2>/dev/null; then
    die "webkit2gtk-4.1 development files not found.
  Fedora:        sudo dnf install webkit2gtk4.1-devel javascriptcoregtk4.1-devel
  Debian/Ubuntu: sudo apt install libwebkit2gtk-4.1-dev libjavascriptcoregtk-4.1-dev
  Arch:          sudo pacman -S webkit2gtk-4.1"
fi

# Default prefix unless the caller passed one through.
SETUP_ARGS=("$@")
if [[ ! " ${SETUP_ARGS[*]:-} " == *"--prefix"* ]]; then
    SETUP_ARGS=(--prefix=/usr "${SETUP_ARGS[@]:-}")
fi

# ── Configure / build ───────────────────────────────────────────────────────
if [ -d "$BUILDDIR" ]; then
    note "Reconfiguring $BUILDDIR"
    meson setup --reconfigure "$BUILDDIR" --buildtype=release "${SETUP_ARGS[@]}"
else
    note "Configuring $BUILDDIR"
    meson setup "$BUILDDIR" --buildtype=release "${SETUP_ARGS[@]}"
fi

note "Building (this compiles the frontend + Twister + the bundled daemons)…"
meson compile -C "$BUILDDIR"

# ── Install (needs root for /usr, udev rules, systemd units) ────────────────
note "Installing — you may be prompted for your password (sudo)…"
sudo meson install -C "$BUILDDIR"

note "✓ Done."
