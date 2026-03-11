/* Resolve a ratbagd device model string (e.g. "usb:046d:4074:0") to the
 * matching Piper SVG filename via the svg-lookup.ini shipped alongside the
 * SVG assets in public/svgs/.
 *
 * The lookup table is fetched once on first use and cached. */

interface LookupEntry {
  matches: string[];
  svg: string;
}

let entriesPromise: Promise<LookupEntry[]> | null = null;

function parseLookup(ini: string): LookupEntry[] {
  const result: LookupEntry[] = [];
  let currentMatches: string[] = [];
  let currentSvg = '';

  for (const line of ini.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('DeviceMatch=')) {
      currentMatches = trimmed.slice('DeviceMatch='.length).split(';').map(s => s.trim()).filter(Boolean);
    } else if (trimmed.startsWith('Svg=')) {
      currentSvg = trimmed.slice('Svg='.length).trim();
      if (currentMatches.length > 0 && currentSvg) {
        result.push({ matches: currentMatches, svg: currentSvg });
      }
      currentMatches = [];
      currentSvg = '';
    }
  }
  return result;
}

async function getEntries(): Promise<LookupEntry[]> {
  if (!entriesPromise) {
    entriesPromise = fetch('/svgs/svg-lookup.ini')
      .then(r => r.ok ? r.text() : '')
      .then(parseLookup)
      .catch(() => []);
  }
  return entriesPromise;
}

/**
 * Given a ratbagd model string like "usb:046d:4074:0", return the SVG
 * filename (e.g. "logitech-g-pro.svg") or "fallback.svg" if not found.
 */
export async function resolveSvgFilename(model: string): Promise<string> {
  if (!model) return 'fallback.svg';

  const entries = await getEntries();

  // Normalise: strip trailing ":0" version for matching (Piper convention)
  let normalised = model;
  if (model.startsWith('usb:') || model.startsWith('bluetooth:')) {
    const parts = model.split(':');
    if (parts.length === 4 && parts[3] === '0') {
      normalised = parts.slice(0, 3).join(':');
    }
  }

  for (const entry of entries) {
    if (entry.matches.includes(normalised) || entry.matches.includes(model)) {
      return entry.svg;
    }
  }
  return 'fallback.svg';
}

/* In-memory SVG cache to avoid redundant fetches within a session. */
const svgCache = new Map<string, string>();

/** Load the raw SVG string for a given device model. */
export async function loadDeviceSvg(model: string): Promise<string> {
  const filename = await resolveSvgFilename(model);

  for (const candidate of [filename, 'fallback.svg']) {
    if (svgCache.has(candidate)) {
      return svgCache.get(candidate)!;
    }
    try {
      const res = await fetch(`/svgs/${candidate}`);
      if (res.ok) {
        const text = await res.text();
        svgCache.set(candidate, text);
        return text;
      }
    } catch {
      /* network error — try fallback */
    }
  }
  return '';
}

