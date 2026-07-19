/* Color math — pure functions, no DOM.
 *
 * Parsing (hex/HSL), WCAG 2.x contrast, and sRGB↔OKLCH conversion.
 * The theme compiler derives surface ladders and legible content
 * colors from user-picked base/highlight colors with these helpers;
 * the accent module reuses the same luminance math. */

/** sRGB components, each 0–1. */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** OKLCH: L 0–1, C ≥ 0, h in degrees. */
export interface Oklch {
  l: number;
  c: number;
  h: number;
}

/* ------------------------------------------------------------------ */
/* Parsing                                                            */
/* ------------------------------------------------------------------ */

/** Parse `#rgb` / `#rrggbb` or `hsl()` (comma or space syntax; alpha
 *  ignored) into sRGB. Returns null for anything else. */
export function parseColor(input: string): Rgb | null {
  const s = input.trim();

  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
  if (hex) {
    let d = hex[1];
    if (d.length === 3) d = d.replace(/./g, (ch) => ch + ch);
    const n = parseInt(d, 16);
    return {
      r: ((n >> 16) & 0xff) / 255,
      g: ((n >> 8) & 0xff) / 255,
      b: (n & 0xff) / 255,
    };
  }

  const hsl =
    /^hsla?\(\s*(-?[\d.]+)(?:deg)?\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%\s*(?:[,/][^)]*)?\)$/i.exec(
      s,
    );
  if (hsl) {
    const h = ((parseFloat(hsl[1]) % 360) + 360) % 360;
    const sat = Math.min(100, parseFloat(hsl[2])) / 100;
    const l = Math.min(100, parseFloat(hsl[3])) / 100;
    const c = (1 - Math.abs(2 * l - 1)) * sat;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    const [r, g, b] =
      h < 60 ? [c, x, 0]
      : h < 120 ? [x, c, 0]
      : h < 180 ? [0, c, x]
      : h < 240 ? [0, x, c]
      : h < 300 ? [x, 0, c]
      : [c, 0, x];
    return { r: r + m, g: g + m, b: b + m };
  }

  return null;
}

/** sRGB → `#rrggbb` (for `<input type="color">`, which only takes hex). */
export function rgbToHex({ r, g, b }: Rgb): string {
  const byte = (c: number) =>
    Math.round(clamp01(c) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${byte(r)}${byte(g)}${byte(b)}`;
}

/* ------------------------------------------------------------------ */
/* WCAG luminance & contrast                                          */
/* ------------------------------------------------------------------ */

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

function clamp01(c: number): number {
  return Math.min(1, Math.max(0, c));
}

/** WCAG 2.x relative luminance (0 = black, 1 = white). */
export function relativeLuminance({ r, g, b }: Rgb): number {
  return (
    0.2126 * srgbToLinear(r) +
    0.7152 * srgbToLinear(g) +
    0.0722 * srgbToLinear(b)
  );
}

/** WCAG 2.x contrast ratio, 1–21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const NEAR_WHITE: Rgb = { r: 0.97, g: 0.97, b: 0.98 };
const NEAR_BLACK: Rgb = { r: 0.11, g: 0.11, b: 0.14 };

/** Readable text color over `bg`: whichever of near-white/near-black
 *  wins on contrast ratio, as an oklch() string. */
export function readableOn(bg: Rgb): string {
  return contrastRatio(NEAR_WHITE, bg) >= contrastRatio(NEAR_BLACK, bg)
    ? 'oklch(0.98 0 0)'
    : 'oklch(0.2 0.01 260)';
}

/* ------------------------------------------------------------------ */
/* OKLCH conversion (matrices from Björn Ottosson's reference)        */
/* ------------------------------------------------------------------ */

export function rgbToOklch(rgb: Rgb): Oklch {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const c = Math.hypot(a, bb);
  const h = ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
  return { l: L, c, h };
}

export function oklchToRgb({ l, c, h }: Oklch): Rgb {
  const rad = (h * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const bb = c * Math.sin(rad);

  const l_ = (l + 0.3963377774 * a + 0.2158037573 * bb) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * bb) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * bb) ** 3;

  return {
    r: clamp01(linearToSrgb(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_)),
    g: clamp01(linearToSrgb(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_)),
    b: clamp01(linearToSrgb(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_)),
  };
}

/** Format an OKLCH triple as a CSS `oklch()` string (token idiom). */
export function oklchCss({ l, c, h }: Oklch, alpha?: number): string {
  const base = `${round(l)} ${round(c)} ${round(h, 1)}`;
  return alpha === undefined || alpha >= 1
    ? `oklch(${base})`
    : `oklch(${base} / ${round(alpha)})`;
}

function round(n: number, places = 4): number {
  return Number(n.toFixed(places));
}

/* ------------------------------------------------------------------ */
/* Derivation                                                         */
/* ------------------------------------------------------------------ */

export interface SurfaceLadder {
  base100: Oklch;
  base200: Oklch;
  base300: Oklch;
  /** Opaque window backdrop behind the translucent surfaces. */
  surfaceBase: Oklch;
  /** Default text color over the ladder. */
  baseContent: Oklch;
}

/** Derive the background/surface ladder from a base color: keep its
 *  hue, clamp chroma to a subtle wash, and impose a per-scheme
 *  lightness ladder so text stays legible whatever the user picks. */
export function deriveSurfaces(base: Rgb, scheme: 'light' | 'dark'): SurfaceLadder {
  const { c, h } = rgbToOklch(base);
  if (scheme === 'dark') {
    const wash = Math.min(c, 0.03);
    return {
      base100: { l: 0.17, c: wash, h },
      base200: { l: 0.15, c: wash, h },
      base300: { l: 0.13, c: wash, h },
      surfaceBase: { l: 0.15, c: Math.min(c, 0.04), h },
      baseContent: { l: 0.92, c: Math.min(c, 0.01), h },
    };
  }
  const wash = Math.min(c, 0.02);
  return {
    base100: { l: 0.97, c: wash, h },
    base200: { l: 0.94, c: wash, h },
    base300: { l: 0.9, c: wash, h },
    surfaceBase: { l: 0.96, c: wash, h },
    baseContent: { l: 0.22, c: Math.min(c, 0.02), h },
  };
}

/** Nudge `fg` lighter or darker (away from the background's luminance)
 *  until it clears `min` contrast against `bg`, preserving hue. */
export function ensureContrast(fg: Rgb, bg: Rgb, min = 4.5): Oklch {
  const target = rgbToOklch(fg);
  const darkBg = relativeLuminance(bg) < 0.5;
  const step = darkBg ? 0.02 : -0.02;
  for (let i = 0; i < 40; i++) {
    if (contrastRatio(oklchToRgb(target), bg) >= min) break;
    target.l = clamp01(target.l + step);
    if (target.l === 0 || target.l === 1) break;
  }
  return target;
}
