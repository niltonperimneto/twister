# Twister — meson superproject.
#
# Builds and installs the Twister GUI together with the two session-bus daemons
# it drives, pulled in as subprojects:
#   - clackd   (keyboards)  -> subprojects/clackd
#   - libratbag (mice)      -> subprojects/libratbag   (provides ratbagd)
#
# Both daemon repos already carry their own meson.build (binaries + udev rules +
# D-Bus service files + systemd user units + ratbagd's device database), so a
# single `meson install` lays everything down. Either daemon can be turned off
# with -Dclackd=disabled / -Dratbagd=disabled.
#
# NOTE: configure into `builddir`, NOT `build` — `build/` is the vite frontend
# output dir (tauri frontendDist "../build") and meson would clobber it.
#
# This is an additional, source-based distribution path; the AppImage
# (scripts/build-appimage.sh) and Flatpak (io.github.niltonperimneto.Twister.yml)
# paths are unaffected.

project(
    'twister',
    version: '1.0.0',
    license: 'GPL-3.0-or-later',
    meson_version: '>= 0.59.0',
)

app_id = 'io.github.niltonperimneto.Twister'

source_root = meson.project_source_root()

npm = find_program('npm', required: true)
cargo = find_program('cargo', required: true)
npm_path = npm.full_path()
cargo_path = cargo.full_path()

# Map meson's buildtype onto a cargo profile, mirroring the daemons' meson.build.
cargo_target_dir = 'debug'
cargo_args = ''
if get_option('buildtype') == 'release' or get_option('buildtype') == 'debugoptimized'
    cargo_target_dir = 'release'
    cargo_args = '--release'
endif

# ── Twister binary ─────────────────────────────────────────────────────────
#
# One custom_target produces the self-contained `twister` binary: build the
# frontend with npm (vite writes ../build), then `cargo build`, whose tauri-build
# step embeds that build/ output into the binary. Only the single binary needs
# installing afterwards. node_modules is reused if already present so repeated
# `meson compile` runs stay fast; cargo no-ops when nothing changed.
twister_build = '''_out="$PWD/$1"
cd "@0@"
if [ ! -d node_modules ]; then "@1@" ci; fi
"@1@" run build
"@2@" build @3@ --manifest-path src-tauri/Cargo.toml
cp "src-tauri/target/@4@/twister" "$_out"
'''.format(source_root, npm_path, cargo_path, cargo_args, cargo_target_dir)

custom_target(
    'twister',
    build_by_default: true,
    command: ['sh', '-c', twister_build, '_', '@OUTPUT@'],
    output: 'twister',
    install: true,
    install_dir: get_option('bindir'),
)

# ── Desktop integration (same destinations as the Flatpak manifest) ────────
datadir = get_option('datadir')

install_data(
    app_id + '.desktop',
    install_dir: join_paths(datadir, 'applications'),
)
install_data(
    app_id + '.metainfo.xml',
    install_dir: join_paths(datadir, 'metainfo'),
)

# Icons: project sizes -> hicolor theme, renamed to the reverse-DNS app id that
# the .desktop's Icon= field references.
foreach icon : [
    ['src-tauri/icons/32x32.png', '32x32'],
    ['src-tauri/icons/128x128.png', '128x128'],
    ['src-tauri/icons/128x128@2x.png', '256x256'],
]
    install_data(
        icon[0],
        install_dir: join_paths(datadir, 'icons', 'hicolor', icon[1], 'apps'),
        rename: app_id + '.png',
    )
endforeach

# ── Bundled daemons (subprojects) ──────────────────────────────────────────
#
# `.allowed()` is true for 'enabled' and 'auto'; passing the feature as
# `required:` makes a missing subproject fatal only when explicitly enabled.
clackd_feature = get_option('clackd')
if clackd_feature.allowed()
    subproject('clackd', required: clackd_feature)
endif

ratbagd_feature = get_option('ratbagd')
if ratbagd_feature.allowed()
    subproject('libratbag', required: ratbagd_feature)
endif

# ── Post-install (udev reload; prints session-service hints) ───────────────
meson.add_install_script('scripts/meson-post-install.sh')

summary({
        'prefix': get_option('prefix'),
        'bundle clackd (keyboards)': clackd_feature.allowed(),
        'bundle ratbagd (mice)': ratbagd_feature.allowed(),
    },
    section: 'Twister',
)
