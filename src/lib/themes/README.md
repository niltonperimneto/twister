# Themes

Twister's look is driven by a small theme engine. Each theme is a flat
map of design-token **primitives** (colors, radii, glass, mesh
background). At runtime the theme store writes every token as an inline
CSS custom property on `<html>` (`--color-primary`, `--radius-md`, …),
which overrides the fallback values compiled from `src/app.css`. All
derived values — alpha washes, accent gradients, hover tints — are
computed in `app.css` with `color-mix()`, so a theme never has to
restate them.

## Selection

The persisted choice lives in `localStorage` under `twister_theme`:

- `"system"` (the default when unset) re-detects the desktop
  environment on every launch via the `detect_desktop_environment`
  Tauri command (`XDG_CURRENT_DESKTOP`): KDE/Plasma → `breeze`,
  COSMIC → `cosmic`, GNOME → `libadwaita`, anything else →
  `DEFAULT_THEME_ID`.
- Any explicit theme id is sticky until the user changes it in
  **About → App Preferences → Theme**.

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
| `surface-base` | Opaque window background |
| `surface-picker` | Frosted input-field background |
| `backdrop-blur` | `backdrop-filter` value for glass panels, or `none` for flat |
| `glass-inset` | Inset highlight `box-shadow` for glass panels, or `none` |
| `mesh-gradient` | Full `background` value for the animated `.app-root::before` texture, or `none` |

Only `appearance: 'dark'` is supported today; the union will grow to
`'dark' | 'light'` when light palettes land.
