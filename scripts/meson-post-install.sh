#!/bin/sh
# Twister meson post-install hook (registered via meson.add_install_script).
#
# Reloads udev so the freshly-installed daemon rules take effect, and prints the
# per-user session steps the install can't do itself (running under `sudo meson
# install` we are root, so `systemctl --user` would target the wrong session).

set -eu

# Skip everything when staging into a DESTDIR (distro packaging) — the package
# manager owns udev/systemd reloads on the target system.
if [ -n "${DESTDIR:-}" ]; then
    exit 0
fi

note() { printf '\033[36m›\033[0m %s\n' "$*"; }

# ── Reload udev (best-effort; needs root) ───────────────────────────────────
if command -v udevadm >/dev/null 2>&1; then
    if [ "$(id -u)" = "0" ]; then
        note 'Reloading udev rules…'
        udevadm control --reload-rules || true
        udevadm trigger || true
    else
        note 'Not root — skipping udev reload. Run once as root:'
        printf '    sudo udevadm control --reload-rules && sudo udevadm trigger\n'
    fi
fi

# ── Per-user session steps (cannot be done from a root install) ─────────────
cat <<'EOF'

Twister and its daemons are installed. To finish, in your normal user session:

  systemctl --user daemon-reload
  systemctl --user enable --now clackd.service ratbagd.service

clackd needs one udev line per VIA keyboard you want managed (the Epomaker
EK68 / Zuoya GMK67 line is preinstalled). Edit:

  /etc/udev/rules.d/60-clackd-via.rules     # or $prefix/lib/udev/rules.d

then re-run:  sudo udevadm control --reload-rules && sudo udevadm trigger

EOF
