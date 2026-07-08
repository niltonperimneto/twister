/* Bundled VIA keyboard-definition index, keyed by VID/PID.
 *
 * clackd reports a keyboard's vendor/product id (via GetDeviceIdentity); we use
 * it to look up a VIA layout definition and render the real physical layout
 * instead of a bare matrix grid. Definitions are a curated subset of
 * github.com/the-via/keyboards (GPL-3.0), bundled at build time via
 * import.meta.glob. Parsing/transform is done by @the-via/reader.
 *
 * To support more keyboards, drop the board's VIA definition JSON into
 * ./definitions/ — it is picked up automatically. (A future enhancement is to
 * also load user-supplied definitions from a config directory at runtime.) */

import {
  isKeyboardDefinitionV3,
  keyboardDefinitionV3ToVIADefinitionV3,
  keyboardDefinitionV2ToVIADefinitionV2,
} from '@the-via/reader';

/* VIA packs a definition's identity as vendorId*65536 + productId; the
 * transformed definition exposes this as `vendorProductId`. */
function packVendorProductId(vendorId: number, productId: number): number {
  return vendorId * 65536 + productId;
}

/* The transformed definition shape (positioned keys + matrix + metadata),
 * derived from the reader's transform return types so we don't depend on its
 * exported type names. */
export type ViaDefinition =
  | ReturnType<typeof keyboardDefinitionV2ToVIADefinitionV2>
  | ReturnType<typeof keyboardDefinitionV3ToVIADefinitionV3>;

export type ViaKey = ViaDefinition['layouts']['keys'][number];

/* Raw definition JSON bundled from ./definitions/*.json. */
const rawModules = import.meta.glob('./definitions/*.json', { eager: true }) as Record<
  string,
  { default: unknown }
>;

function transform(raw: unknown): ViaDefinition | null {
  try {
    return isKeyboardDefinitionV3(raw as never)
      ? keyboardDefinitionV3ToVIADefinitionV3(raw as never)
      : keyboardDefinitionV2ToVIADefinitionV2(raw as never);
  } catch (e) {
    console.warn('[twister] Skipping invalid keyboard definition:', e);
    return null;
  }
}

/* vendorProductId (vid*65536+pid) -> transformed definition. Built once. */
const INDEX: Map<number, ViaDefinition> = (() => {
  const m = new Map<number, ViaDefinition>();
  for (const mod of Object.values(rawModules)) {
    const def = transform(mod.default);
    if (def) m.set(def.vendorProductId, def);
  }
  return m;
})();

/* Returns the bundled VIA definition for a keyboard, or null if none matches. */
export function matchDefinition(vendorId: number, productId: number): ViaDefinition | null {
  return INDEX.get(packVendorProductId(vendorId, productId)) ?? null;
}
