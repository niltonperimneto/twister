# Themes

Twister's look is driven by a small theme engine. Each theme is a flat
map of design-token **primitives** (colors, radii, widget surfaces,
glass, mesh background) plus metadata: a widget `style`
(`'glass' | 'flat'`, mirrored to a `data-style` attribute on `<html>`
that CSS uses to gate glass-only decoration like blurs, glows, orbs,
and hover lifts) and an optional `icons` set id (see
`src/lib/icons/`). At runtime the theme store writes every token as an
inline CSS custom property on `<html>` (`--color-primary`,
`--radius-md`, …), which overrides the fallback values compiled from
`src/app.css`. Derived values — alpha washes, accent gradients, hover
tints — are computed in `app.css` with `color-mix()`, so a theme never
has to restate them.

The built-in Breeze and Libadwaita themes are grounded in their
desktops' human interface guidelines, with palette and metrics taken
from the upstream sources of truth:

- **Breeze** (Kirigami HIG): [`KDE/breeze`](https://github.com/KDE/breeze)
  `BreezeDark.colors` + `breezemetrics.h` — flat opaque surfaces, 5px
  frame radius, solid `#3daee9` selection with white text, buttons that
  show the accent outline on hover (DecorationHover), Breeze symbolic
  icons.
- **Libadwaita** (GNOME HIG):
  [`GNOME/libadwaita`](https://github.com/GNOME/libadwaita) stylesheet —
  window `#222226` / view `#1d1d20` / headerbar `#2e2e32`, `white/8%`
  cards at 12px, borderless bold 9px buttons filled with a
  `currentColor` wash (10% rest / 15% hover / 30% pressed), Adwaita
  symbolic icons, zero translucency or shadows.
- **Cosmic** keeps the glassmorphic showcase styling
  (`style: 'glass'`) with COSMIC symbolic icons.
- **Aurora** is Twister's original house look — Dracula-blue
  glassmorphism with the animated mesh background and the built-in
  Lucide-style icons. It is `DEFAULT_THEME_ID`: the DE-agnostic
  fallback when System (auto) can't recognize the desktop.

## Selection

The persisted state (selection + accent preference + the custom
`ThemeConfig`, see below) lives in `theme-config.json` in the app data
dir, written through `@tauri-apps/plugin-fs`, with a synchronous
`localStorage` mirror under `twister_theme_state` that `preload()`
reads before the first paint (the pre-engine `twister_theme` /
`twister_follow_system_accent` keys are migrated on first run):

- `"system"` (the default when unset) re-detects the desktop
  environment on every launch via the `detect_desktop_environment`
  Tauri command (`XDG_CURRENT_DESKTOP`): KDE/Plasma → `breeze`,
  COSMIC → `cosmic`, GNOME → `libadwaita`, anything else →
  `DEFAULT_THEME_ID`.
- Any explicit theme id is sticky until the user changes it in
  **Appearance** (sidebar).
- `"custom"` compiles its tokens at runtime from the 8-axis
  `ThemeConfig` instead of a hand-crafted map (see below).

## Custom themes (the 8-axis engine)

`config.ts` defines `ThemeConfig` — `colorScheme` (light/dark/system,
OS-synced via the Tauri window API), `density`, `fontSize`,
`baseColor`, `highlightColor`, `iconTheme`, `roundness`,
`translucency`. `compile.ts` turns a config into the exact
`ThemeTokens` shape the presets declare (surfaces derived from
`baseColor` with a per-scheme lightness ladder, WCAG-contrast-enforced
primary from `highlightColor`; color math in `color.ts`), so the store
applies it through the same token loop. `density`/`fontSize` compile
separately and apply globally — over presets too — via Tailwind 4's
`--spacing` unit and the root `--font-base`. Editing any palette axis
while a preset is active forks the selection to `"custom"`. Configs
import/export as validated `.json` through the dialog + fs plugins
(`io.ts`); the panel lives on the sidebar's **Appearance** page.

## System accent following

On top of the theme tokens sits an optional accent override
(**Appearance → Follow system accent**, on by default,
persisted as `twister_follow_system_accent`). The Rust backend reads
`org.freedesktop.appearance/accent-color` from the XDG Desktop Portal
(`watch_system_accent` command) and re-emits live changes as
`system:accent` events; when an accent is available the store replaces
`--color-primary` and `--color-primary-content` (content color picked
by WCAG luminance) after applying the theme, so every `color-mix()`
derivation re-tints while surfaces and radii stay from the theme. If
the portal or the key is missing (older DEs, bare WMs, browser dev),
the theme's stock accent is used silently. Helpers live in
`accent.ts`.

## Adding a theme

1. Copy an existing theme module (e.g. `cosmic.ts`) to `mytheme.ts`.
2. Change `id` (unique, lowercase), `name` (picker label),
   `description`, and the token values. Every `ThemeTokens` key is
   required — a missing token is a compile error (`bun run check`).
3. Register it in `index.ts`: one import plus one entry in the
   `themes` map. The picker and the engine pick it up automatically.
4. Run `bun run test` — the registry tests validate id/key agreement
   and non-empty token values.

### Token reference

| Token | Meaning |
| --- | --- |
| `color-primary` / `-content` | Accent color and text-on-accent (DaisyUI) |
| `color-secondary` / `-content` | Secondary accent (DaisyUI) |
| `color-base-100/200/300` | Surface shades, lightest to darkest (DaisyUI) |
| `color-base-content` | Default text color (DaisyUI) |
| `color-info/success/warning/error` | Status colors (DaisyUI) |
| `radius-xs/sm/md/lg/full` | Corner radius scale used across components |
| `radius-button` | Button corner radius (Breeze 5px, Adwaita 9px, glass pill) |
| `surface-base` | Opaque window background |
| `surface-picker` | Input-field background (opaque on flat themes) |
| `surface-card` | Card/panel background — full value, gradient allowed |
| `border-card` | Card border color (`transparent` for Adwaita) |
| `shadow-card` | Card `box-shadow` — full value, or `none` for flat HIGs |
| `button-bg` / `button-bg-hover` | Button fill at rest / hover |
| `button-border` / `button-border-hover` | Button border colors (Breeze hover = accent) |
| `selection-bg` / `selection-fg` | Selected rows & active pills (Breeze solid accent + white) |
| `font-ui` | UI font stack per HIG (Noto Sans / Adwaita Sans / Inter) |
| `backdrop-blur` | `backdrop-filter` value for glass panels, or `none` for flat |
| `glass-inset` | Inset highlight `box-shadow` for glass panels, or `none` |
| `mesh-gradient` | Full `background` value for the animated `.app-root::before` texture, or `none` |

Only `appearance: 'dark'` is supported today; the union will grow to
`'dark' | 'light'` when light palettes land.
