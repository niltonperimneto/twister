# Bundled keyboard definitions

The `*.json` files in this directory are VIA keyboard definitions copied
verbatim from the **the-via/keyboards** project:

- Source: https://github.com/the-via/keyboards
- License: GNU General Public License v3.0 (GPL-3.0)

They are bundled so Twister can render a keyboard's true physical layout
(matched by USB VID/PID) instead of a bare matrix grid. Twister is
GPL-3.0-or-later, so redistributing these GPL-3.0 definitions is compatible.

This is a **curated subset** of the full the-via/keyboards set — only a handful
of common boards are included to keep the bundle small. Parsing and the
KLE → positioned-keys transform are done at runtime by
[`@the-via/reader`](https://github.com/the-via/reader) (also GPL-3.0).

## Adding a keyboard

Drop the board's VIA definition JSON into this directory. It is picked up
automatically at build time via `import.meta.glob` in `../definitions.ts` and
indexed by its `vendorId`/`productId`. No code changes are required.

If no definition matches a connected keyboard, Twister falls back to a generic
rows × cols matrix grid, so remapping still works for any board.
