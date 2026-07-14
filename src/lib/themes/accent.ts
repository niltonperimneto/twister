/* System-accent helpers — pure functions, no DOM.
 *
 * The XDG portal reports the accent as three sRGB doubles in 0–1;
 * out-of-range components mean "no preference" per the spec. */

export type AccentRgb = [number, number, number];

/** Portal triple → CSS color string, or null when invalid/no preference. */
export function accentToCss(
  rgb: readonly number[] | null | undefined,
): string | null {
  if (!rgb || rgb.length !== 3) return null;
  if (!rgb.every((c) => Number.isFinite(c) && c >= 0 && c <= 1)) return null;
  const pct = (c: number) => `${(c * 100).toFixed(2)}%`;
  return `rgb(${pct(rgb[0])} ${pct(rgb[1])} ${pct(rgb[2])})`;
}

/** Readable text color over the accent: WCAG relative luminance decides
 *  between near-white and near-black (contrast(white) > contrast(black)
 *  exactly when L < 0.1791). */
export function accentContentColor(rgb: AccentRgb): string {
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const luminance =
    0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  return luminance < 0.1791 ? 'oklch(0.98 0 0)' : 'oklch(0.2 0.01 260)';
}
