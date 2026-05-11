/**
 * Share-code encoder/decoder for ascii-splash v0.5.0.
 *
 * Serialises a {@link ShareState} ({patternId, presetId, themeId, seed,
 * configHash}) to a 12-character Crockford base32 string and back, so users
 * can hand each other a code that reproduces a specific animation
 * byte-for-byte (`splash share` / `splash play <code>`).
 *
 * ## Bit layout (60 bits, MSB → LSB)
 *
 * ```
 *   [ v 4 ][ pat 5 ][ pre 3 ][ thm 3 ][ seed 32 ][ hash 13 ]
 * ```
 *
 * - `v` — format version. Starts at 1; bumped on any layout change so
 *   future decoders reject old codes and vice versa.
 * - `pat` — pattern id, 0-based index into the procedural pattern list
 *   (0..31; we have 23 today). PhotoPattern and LayeredPattern are
 *   intentionally not encodable — they depend on a local image file.
 * - `pre` — preset id minus 1 (presets are 1..6, encoded as 0..5).
 * - `thm` — theme id (0..4 today: ocean/matrix/starlight/fire/monochrome).
 * - `seed` — u32 PRNG seed (the input to `new Mulberry32(seed)`).
 * - `hash` — 13-bit FNV-1a fingerprint of the non-default pattern config.
 *   Two share codes with the same RNG state but different configs decode
 *   to different hashes; the consumer compares against the local config
 *   and refuses to `play` on mismatch.
 *
 * 60 bits divides evenly into 12 × 5-bit base32 chars (no padding waste).
 *
 * ## Alphabet
 *
 * Crockford base32: `0-9 A-Z` minus `I L O U`. Decode normalises
 * `i→1, l→1, o→0` (case-insensitive) so codes survive being read aloud
 * over the phone. Hyphens are stripped on decode (the human-friendly
 * `XXXX-XXXX-XXXX` rendering is purely cosmetic).
 */

/** Current share-code format version. Bump on any layout change. */
export const SHARE_CODE_VERSION = 1;

/** Total length of a canonical (un-hyphenated) share code. */
export const SHARE_CODE_LENGTH = 12;

/** Crockford base32 alphabet (no I/L/O/U). */
export const SHARE_CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Frozen registry mapping `patternId` (0-based) to the internal pattern
 * name used by `main.ts`'s `patternNames` array.
 *
 * **Do not reorder.** A share code records `patternId` as a 5-bit integer
 * indexing into this list; reordering or renaming entries would silently
 * break every existing share code in the wild. Adding a new pattern is
 * safe — append to the end (use the next free id). Removing one means
 * leaving a tombstone (or bumping {@link SHARE_CODE_VERSION}).
 *
 * PhotoPattern and LayeredPattern intentionally aren't here: they depend
 * on a local image file and can't be reproduced from a code alone.
 */
export const PROCEDURAL_PATTERN_IDS: readonly string[] = Object.freeze([
  'waves', // 0
  'starfield', // 1
  'matrix', // 2
  'rain', // 3
  'quicksilver', // 4
  'particles', // 5
  'spiral', // 6
  'plasma', // 7
  'tunnel', // 8
  'lightning', // 9
  'fireworks', // 10
  'maze', // 11
  'life', // 12
  'dna', // 13
  'lavalamp', // 14
  'smoke', // 15
  'snow', // 16
  'oceanbeach', // 17
  'campfire', // 18
  'nightsky', // 19
  'aquarium', // 20
  'snowfallpark', // 21
  'metaball', // 22
]);

/** Look up `patternId` (0-based) for an internal pattern name, or `-1`. */
export function patternIdByName(name: string): number {
  return PROCEDURAL_PATTERN_IDS.indexOf(name);
}

/** Look up the internal pattern name for a `patternId`, or `undefined`. */
export function patternNameById(id: number): string | undefined {
  return PROCEDURAL_PATTERN_IDS[id];
}

/**
 * Categorises share-code failures so the CLI can surface the right
 * friendly message.
 *
 * - `version` — code was produced by a different format version
 * - `length`  — wrong number of chars after normalisation
 * - `alphabet` — non-base32 character present (after Crockford fixups)
 * - `configHash` — payload decoded cleanly but its config fingerprint
 *   doesn't match the local non-default config. This is thrown by the
 *   *consumer* (main.ts) after a successful structural decode, not by
 *   `decodeShareCode` itself.
 */
export type ShareCodeErrorKind = 'version' | 'length' | 'alphabet' | 'configHash';

export class ShareCodeError extends Error {
  constructor(
    public readonly kind: ShareCodeErrorKind,
    message: string
  ) {
    super(message);
    this.name = 'ShareCodeError';
  }
}

/**
 * The payload a share code reproduces. Field semantics intentionally
 * mirror the runtime state in `main.ts` so callers can compose a
 * ShareState directly from `{currentPatternIndex, currentPresetIndex,
 * currentThemeIndex, seed, hashConfig(config, defaults)}`.
 */
export interface ShareState {
  /** 0-based index in the procedural pattern list. Must fit in 5 bits. */
  patternId: number;
  /** 1..6 (encoded as 0..5 on the wire). */
  presetId: number;
  /** 0-based theme index. Must fit in 3 bits. */
  themeId: number;
  /** u32 PRNG seed. */
  seed: number;
  /** 13-bit FNV-1a fingerprint from {@link hashConfig}. */
  configHash: number;
}

const ALPHABET_INDEX: Record<string, number> = (() => {
  const m: Record<string, number> = {};
  for (let i = 0; i < SHARE_CODE_ALPHABET.length; i++) {
    m[SHARE_CODE_ALPHABET[i]] = i;
  }
  return m;
})();

/**
 * Crockford normalisation: uppercase, strip hyphens, map I/L→1 and O→0.
 * U is excluded from the alphabet but never mapped (it's reserved to
 * avoid spelling unfortunate words — we treat it as an alphabet error).
 */
function normaliseCode(code: string): string {
  return code.toUpperCase().replace(/-/g, '').replace(/[IL]/g, '1').replace(/O/g, '0');
}

function assertFits(field: string, value: number, bits: number): void {
  const max = (1 << bits) - 1;
  if (!Number.isInteger(value) || value < 0 || value > max) {
    throw new RangeError(
      `${field} must be an integer in [0, ${String(max)}], got ${String(value)}`
    );
  }
}

/**
 * Encode a ShareState as a 12-char Crockford base32 string.
 *
 * @throws RangeError if any field is out of bounds for its bit width.
 */
export function encodeShareCode(state: ShareState): string {
  assertFits('patternId', state.patternId, 5);
  assertFits('themeId', state.themeId, 3);
  if (!Number.isInteger(state.presetId) || state.presetId < 1 || state.presetId > 6) {
    throw new RangeError(`presetId must be an integer in [1, 6], got ${String(state.presetId)}`);
  }
  if (!Number.isInteger(state.seed) || state.seed < 0 || state.seed > 0xffffffff) {
    throw new RangeError(`seed must be a u32 in [0, 2^32), got ${String(state.seed)}`);
  }
  assertFits('configHash', state.configHash, 13);

  // Pack MSB-first into a 60-bit BigInt: [v4][pat5][pre3][thm3][seed32][hash13]
  let payload = 0n;
  payload = (payload << 4n) | BigInt(SHARE_CODE_VERSION & 0xf);
  payload = (payload << 5n) | BigInt(state.patternId);
  payload = (payload << 3n) | BigInt(state.presetId - 1);
  payload = (payload << 3n) | BigInt(state.themeId);
  payload = (payload << 32n) | BigInt(state.seed >>> 0);
  payload = (payload << 13n) | BigInt(state.configHash);

  // 60 bits → 12 base32 chars, MSB-first.
  const chars: string[] = new Array<string>(SHARE_CODE_LENGTH);
  for (let i = SHARE_CODE_LENGTH - 1; i >= 0; i--) {
    chars[i] = SHARE_CODE_ALPHABET[Number(payload & 0x1fn)];
    payload >>= 5n;
  }
  return chars.join('');
}

/**
 * Decode a share code into a {@link ShareState}.
 *
 * @throws {@link ShareCodeError} on length, alphabet, or version mismatch.
 *   `configHash` is *not* validated here — call {@link hashConfig} on the
 *   local config and compare to `state.configHash`, then throw a
 *   `ShareCodeError('configHash', ...)` from the caller on mismatch.
 */
export function decodeShareCode(code: string): ShareState {
  const normalised = normaliseCode(code);
  if (normalised.length !== SHARE_CODE_LENGTH) {
    throw new ShareCodeError(
      'length',
      `Share code must be ${String(SHARE_CODE_LENGTH)} characters (got ${String(normalised.length)} after normalisation)`
    );
  }

  let payload = 0n;
  for (const c of normalised) {
    const v = ALPHABET_INDEX[c];
    if (v === undefined) {
      throw new ShareCodeError(
        'alphabet',
        `Invalid character "${c}" in share code (Crockford base32 excludes I/L/O/U)`
      );
    }
    payload = (payload << 5n) | BigInt(v);
  }

  // Unpack LSB-first, reverse order of encode.
  const configHash = Number(payload & 0x1fffn);
  payload >>= 13n;
  const seed = Number(payload & 0xffffffffn);
  payload >>= 32n;
  const themeId = Number(payload & 0x7n);
  payload >>= 3n;
  const presetId = Number(payload & 0x7n) + 1;
  payload >>= 3n;
  const patternId = Number(payload & 0x1fn);
  payload >>= 5n;
  const version = Number(payload & 0xfn);

  if (version !== SHARE_CODE_VERSION) {
    throw new ShareCodeError(
      'version',
      `Share code is version ${String(version)}, but this build only understands v${String(SHARE_CODE_VERSION)}. ` +
        `Upgrade ascii-splash to play this scene.`
    );
  }

  return { patternId, presetId, themeId, seed, configHash };
}

/**
 * 32-bit FNV-1a hash. Tiny, well-known, no dep — sufficient for a
 * fingerprint where we just need "different bytes → different hash with
 * overwhelming probability". Not cryptographic.
 *
 * Reference: http://www.isthe.com/chongo/tech/comp/fnv/
 */
function fnv1a32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Compute a 13-bit fingerprint of the non-default values in `config`.
 *
 * Two share codes that point at the same pattern + preset + theme + seed
 * but were generated against different configs will decode to different
 * `configHash` values, so `splash play` can detect "this code was made
 * with different settings" before silently producing a different scene.
 *
 * Implementation: stable-serialise `{key=JSON.stringify(value)}` pairs
 * (sorted by key) for every entry in `config` whose value differs from
 * `defaults`, then FNV-1a the resulting string and mask to 13 bits.
 *
 * Treats `undefined` and "matches default" as equivalent — both contribute
 * nothing to the fingerprint, so a user with no `~/.splashrc` overrides
 * gets `hashConfig(defaults, defaults) === hashConfig(undefined, defaults)`.
 */
export function hashConfig(
  config: Record<string, unknown> | undefined,
  defaults: Record<string, unknown>
): number {
  if (!config) return fnv1a32('') & 0x1fff;
  const keys = Object.keys(config).sort();
  const parts: string[] = [];
  for (const k of keys) {
    const v = config[k];
    if (v === undefined) continue;
    // Use JSON equality — sufficient for the primitive scalars that
    // appear in every PatternConfig today (number, boolean, string).
    if (JSON.stringify(v) === JSON.stringify(defaults[k])) continue;
    parts.push(`${k}=${JSON.stringify(v)}`);
  }
  return fnv1a32(parts.join('|')) & 0x1fff;
}
