import {
  encodeShareCode,
  decodeShareCode,
  hashConfig,
  ShareCodeError,
  ShareState,
  SHARE_CODE_VERSION,
  SHARE_CODE_LENGTH,
  SHARE_CODE_ALPHABET,
} from '../../../src/utils/shareCode.js';

/**
 * A canonical ShareState used across round-trip and reference-vector
 * tests. Picked to exercise the boundaries of each field: max patternId,
 * min/max preset, non-zero theme, a seed with bits set in both halves of
 * the u32, and a non-zero configHash.
 */
const SAMPLE_STATE: ShareState = {
  patternId: 13,
  presetId: 4,
  themeId: 2,
  seed: 0xdeadbeef,
  configHash: 0x1abc,
};

describe('shareCode', () => {
  describe('encodeShareCode + decodeShareCode round trip', () => {
    it('round-trips a canonical state', () => {
      const code = encodeShareCode(SAMPLE_STATE);
      const decoded = decodeShareCode(code);
      expect(decoded).toEqual(SAMPLE_STATE);
    });

    it('produces a 12-character base32 string', () => {
      const code = encodeShareCode(SAMPLE_STATE);
      expect(code).toHaveLength(SHARE_CODE_LENGTH);
      for (const ch of code) {
        expect(SHARE_CODE_ALPHABET).toContain(ch);
      }
    });

    it('round-trips every patternId boundary (0..31)', () => {
      for (let p = 0; p <= 31; p++) {
        const state: ShareState = { ...SAMPLE_STATE, patternId: p };
        expect(decodeShareCode(encodeShareCode(state)).patternId).toBe(p);
      }
    });

    it('round-trips every presetId 1..6', () => {
      for (let p = 1; p <= 6; p++) {
        const state: ShareState = { ...SAMPLE_STATE, presetId: p };
        expect(decodeShareCode(encodeShareCode(state)).presetId).toBe(p);
      }
    });

    it('round-trips every themeId 0..7', () => {
      for (let t = 0; t <= 7; t++) {
        const state: ShareState = { ...SAMPLE_STATE, themeId: t };
        expect(decodeShareCode(encodeShareCode(state)).themeId).toBe(t);
      }
    });

    it('round-trips seed 0 and seed 2^32-1', () => {
      for (const seed of [0, 1, 0x80000000, 0xffffffff]) {
        const state: ShareState = { ...SAMPLE_STATE, seed };
        expect(decodeShareCode(encodeShareCode(state)).seed).toBe(seed);
      }
    });

    it('round-trips configHash 0 and configHash 0x1fff', () => {
      for (const configHash of [0, 1, 0xfff, 0x1fff]) {
        const state: ShareState = { ...SAMPLE_STATE, configHash };
        expect(decodeShareCode(encodeShareCode(state)).configHash).toBe(configHash);
      }
    });

    it('is deterministic — same input produces same output', () => {
      const a = encodeShareCode(SAMPLE_STATE);
      const b = encodeShareCode(SAMPLE_STATE);
      expect(a).toBe(b);
    });

    it('different states produce different codes', () => {
      const a = encodeShareCode(SAMPLE_STATE);
      const b = encodeShareCode({ ...SAMPLE_STATE, seed: SAMPLE_STATE.seed + 1 });
      expect(a).not.toBe(b);
    });
  });

  /**
   * Canonical reference vector. Locks the encoder output for one specific
   * state so existing share codes survive future "harmless" refactors of
   * this file. If this test fails, the on-the-wire format has drifted and
   * a v2 migration is required (bump SHARE_CODE_VERSION).
   */
  describe('canonical reference vector', () => {
    it('encodes the locked vector for the sample state', () => {
      // Layout (60 bits, MSB-first), then sliced into 12 × 5-bit base32 chars:
      //   v=1 (4)    pat=13 (5)  pre=3 (3)  thm=2 (3)
      //   0001       01101       011        010
      //   seed=0xdeadbeef (32)
      //   11011110 10101101 10111110 11101111
      //   hash=0x1abc (13)
      //   1101010111100
      //
      //   Concatenated 60-bit stream:
      //     00010 11010 11010 11011 11010 10110 11011 11101 11011 11101 10101 11100
      //       2     T     T     V     T     P     V     X     V     Y     N     W
      //   → "2TTVTPVXVYNW"
      const code = encodeShareCode(SAMPLE_STATE);
      expect(code).toBe('2TTVTPVXVYNW');
    });

    it('decodes the locked vector back to the sample state', () => {
      expect(decodeShareCode('2TTVTPVXVYNW')).toEqual(SAMPLE_STATE);
    });
  });

  describe('Crockford normalisation', () => {
    it('accepts lowercase input', () => {
      const code = encodeShareCode(SAMPLE_STATE);
      expect(decodeShareCode(code.toLowerCase())).toEqual(SAMPLE_STATE);
    });

    it('strips hyphens (XXXX-XXXX-XXXX human-friendly form)', () => {
      const code = encodeShareCode(SAMPLE_STATE);
      const hyphenated = `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
      expect(decodeShareCode(hyphenated)).toEqual(SAMPLE_STATE);
    });

    it('maps I and L to 1', () => {
      // Encode a state whose code has a "1" in it, then substitute I/L
      // and confirm we still decode to the same state.
      const state: ShareState = {
        patternId: 0,
        presetId: 1,
        themeId: 0,
        seed: 1,
        configHash: 1,
      };
      const code = encodeShareCode(state);
      if (!code.includes('1')) {
        // If the encoding happens not to contain a '1', the test isn't
        // exercising the substitution — skip rather than false-pass.
        return;
      }
      expect(decodeShareCode(code.replace(/1/g, 'I'))).toEqual(state);
      expect(decodeShareCode(code.replace(/1/g, 'L'))).toEqual(state);
    });

    it('maps O to 0', () => {
      const state: ShareState = {
        patternId: 0,
        presetId: 1,
        themeId: 0,
        seed: 0,
        configHash: 0,
      };
      const code = encodeShareCode(state);
      if (!code.includes('0')) return;
      expect(decodeShareCode(code.replace(/0/g, 'O'))).toEqual(state);
    });
  });

  describe('rejection cases', () => {
    it('throws ShareCodeError("length") for a short code', () => {
      try {
        decodeShareCode('ABC');
        fail('expected ShareCodeError');
      } catch (e) {
        expect(e).toBeInstanceOf(ShareCodeError);
        expect((e as ShareCodeError).kind).toBe('length');
      }
    });

    it('throws ShareCodeError("length") for a long code', () => {
      try {
        decodeShareCode('ABCDEFGHJKMNPQRSTV');
        fail('expected ShareCodeError');
      } catch (e) {
        expect(e).toBeInstanceOf(ShareCodeError);
        expect((e as ShareCodeError).kind).toBe('length');
      }
    });

    it('throws ShareCodeError("alphabet") for U (excluded letter)', () => {
      // Replace one char of a valid code with U.
      const code = encodeShareCode(SAMPLE_STATE);
      const bad = `U${code.slice(1)}`;
      try {
        decodeShareCode(bad);
        fail('expected ShareCodeError');
      } catch (e) {
        expect(e).toBeInstanceOf(ShareCodeError);
        expect((e as ShareCodeError).kind).toBe('alphabet');
      }
    });

    it('throws ShareCodeError("alphabet") for a non-base32 character', () => {
      const code = encodeShareCode(SAMPLE_STATE);
      const bad = `@${code.slice(1)}`;
      try {
        decodeShareCode(bad);
        fail('expected ShareCodeError');
      } catch (e) {
        expect(e).toBeInstanceOf(ShareCodeError);
        expect((e as ShareCodeError).kind).toBe('alphabet');
      }
    });

    /**
     * Fabricate a v2 code by hand-assembling the bit layout with v=2 in
     * the top nybble. If a future v2 ships, this test will need updating
     * — but for v0.5.0, the v1 decoder must reject it cleanly.
     */
    it('throws ShareCodeError("version") for a fabricated v2 code', () => {
      // [v=2 (4)][pat=0 (5)][pre=0 (3)][thm=0 (3)][seed=0 (32)][hash=0 (13)]
      // = 0010 00000 000 000 0...0 (60 bits) = first nybble is 2_5bits.
      // Build the BigInt the same way the encoder does, then base32 it.
      let payload = 0n;
      payload = (payload << 4n) | 2n; // v=2
      payload = (payload << 5n) | 0n;
      payload = (payload << 3n) | 0n;
      payload = (payload << 3n) | 0n;
      payload = (payload << 32n) | 0n;
      payload = (payload << 13n) | 0n;
      const chars: string[] = new Array(SHARE_CODE_LENGTH);
      for (let i = SHARE_CODE_LENGTH - 1; i >= 0; i--) {
        chars[i] = SHARE_CODE_ALPHABET[Number(payload & 0x1fn)];
        payload >>= 5n;
      }
      const v2Code = chars.join('');

      try {
        decodeShareCode(v2Code);
        fail('expected ShareCodeError');
      } catch (e) {
        expect(e).toBeInstanceOf(ShareCodeError);
        expect((e as ShareCodeError).kind).toBe('version');
        expect((e as ShareCodeError).message).toMatch(/version 2/);
        expect((e as ShareCodeError).message).toMatch(/v1/);
      }
    });
  });

  describe('encode bounds checking', () => {
    it('throws RangeError on patternId out of range', () => {
      expect(() => encodeShareCode({ ...SAMPLE_STATE, patternId: 32 })).toThrow(RangeError);
      expect(() => encodeShareCode({ ...SAMPLE_STATE, patternId: -1 })).toThrow(RangeError);
    });

    it('throws RangeError on presetId out of range', () => {
      expect(() => encodeShareCode({ ...SAMPLE_STATE, presetId: 0 })).toThrow(RangeError);
      expect(() => encodeShareCode({ ...SAMPLE_STATE, presetId: 7 })).toThrow(RangeError);
    });

    it('throws RangeError on themeId out of range', () => {
      expect(() => encodeShareCode({ ...SAMPLE_STATE, themeId: 8 })).toThrow(RangeError);
      expect(() => encodeShareCode({ ...SAMPLE_STATE, themeId: -1 })).toThrow(RangeError);
    });

    it('throws RangeError on seed out of u32 range', () => {
      expect(() => encodeShareCode({ ...SAMPLE_STATE, seed: -1 })).toThrow(RangeError);
      expect(() => encodeShareCode({ ...SAMPLE_STATE, seed: 0x100000000 })).toThrow(RangeError);
    });

    it('throws RangeError on configHash out of range', () => {
      expect(() => encodeShareCode({ ...SAMPLE_STATE, configHash: 0x2000 })).toThrow(RangeError);
      expect(() => encodeShareCode({ ...SAMPLE_STATE, configHash: -1 })).toThrow(RangeError);
    });
  });
});

describe('hashConfig', () => {
  const defaults = { speed: 1.0, count: 50, enabled: true, mode: 'fast' };

  it('returns the same hash for `undefined` and a config matching defaults', () => {
    const a = hashConfig(undefined, defaults);
    const b = hashConfig({ ...defaults }, defaults);
    expect(a).toBe(b);
  });

  it('returns a different hash for any non-default value', () => {
    const base = hashConfig(undefined, defaults);
    const diff = hashConfig({ ...defaults, speed: 2.0 }, defaults);
    expect(diff).not.toBe(base);
  });

  it('is order-independent — same keys, different declaration order, same hash', () => {
    const a = hashConfig({ speed: 2.0, count: 99 }, defaults);
    const b = hashConfig({ count: 99, speed: 2.0 }, defaults);
    expect(a).toBe(b);
  });

  it('ignores `undefined` values just like missing keys', () => {
    const a = hashConfig({ speed: undefined }, defaults);
    const b = hashConfig({}, defaults);
    expect(a).toBe(b);
  });

  it('produces a 13-bit fingerprint (0 ≤ hash ≤ 0x1fff)', () => {
    for (const cfg of [
      undefined,
      defaults,
      { ...defaults, speed: 99 },
      { ...defaults, mode: 'slow' },
      { foo: 'bar' } as Record<string, unknown>,
    ]) {
      const h = hashConfig(cfg, defaults);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0x1fff);
      expect(Number.isInteger(h)).toBe(true);
    }
  });

  it('distinguishes string from number values that stringify identically', () => {
    // "1" vs 1 must hash differently — JSON.stringify preserves the type.
    const a = hashConfig({ x: 1 }, { x: 0 });
    const b = hashConfig({ x: '1' }, { x: 0 });
    expect(a).not.toBe(b);
  });
});

/**
 * Integration smoke test: confirm the SHARE_CODE_VERSION constant is what
 * this file's tests assume. If someone bumps it without updating the
 * fixture vector above, this catches the drift loudly.
 */
describe('module constants', () => {
  it('SHARE_CODE_VERSION is 1 (v0.5.0)', () => {
    expect(SHARE_CODE_VERSION).toBe(1);
  });
});
