/**
 * v0.5.0 Phase 7f: end-to-end determinism guarantees.
 *
 * These tests are the contract behind `splash play <code>`: given the
 * same {patternId, presetId, themeId, seed, configHash}, two
 * independent runs must produce identical frame buffers. If anything in
 * this file goes red, share codes are *broken* — fix the regression
 * before shipping.
 *
 * Coverage:
 *   - Round-trip: every patternId in the registry survives encode→decode.
 *   - Byte-for-byte replay canaries (DNA + Starfield + Fireworks).
 *   - Complete-cell replay across different clock origins for the full
 *     23-pattern procedural registry.
 *   - Version-skew rejection (a fabricated v2 code throws cleanly).
 *   - UX-random carve-out: CommandExecutor's c* / c** / r still use
 *     `Math.random()` and are explicitly NOT deterministic — they're
 *     surprise-me commands, not scene state.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  encodeShareCode,
  decodeShareCode,
  ShareCodeError,
  SHARE_CODE_ALPHABET,
  SHARE_CODE_LENGTH,
  PROCEDURAL_PATTERN_IDS,
  type ShareState,
} from '../../src/utils/shareCode.js';
import { Mulberry32 } from '../../src/utils/random.js';
import { DNAPattern } from '../../src/patterns/DNAPattern.js';
import { StarfieldPattern } from '../../src/patterns/StarfieldPattern.js';
import { FireworksPattern } from '../../src/patterns/FireworksPattern.js';
import type { Cell } from '../../src/types/index.js';
import { createMockTheme, createMockBuffer } from '../utils/mocks.js';
import { createDefaultConfig } from '../../src/config/defaults.js';
import { buildPatternSlots } from '../../src/patterns/PatternCatalog.js';
import { AnimationClock, type TimeSource } from '../../src/engine/AnimationClock.js';

const size = { width: 80, height: 24 };

/**
 * Cell-by-cell buffer comparison. Returns the first divergence (or null
 * if equal), so jest failures point at exactly where determinism broke.
 */
function firstDifference(a: Cell[][], b: Cell[][]): { x: number; y: number } | null {
  const colorsEqual = (left: Cell['color'], right: Cell['color']): boolean => {
    if (!left || !right) return left === right;
    return left.r === right.r && left.g === right.g && left.b === right.b;
  };

  for (let y = 0; y < a.length; y++) {
    for (let x = 0; x < a[y].length; x++) {
      const ca = a[y][x];
      const cb = b[y][x];
      if (ca.char !== cb.char) return { x, y };
      if (!colorsEqual(ca.color, cb.color) || !colorsEqual(ca.bg, cb.bg)) return { x, y };
    }
  }
  return null;
}

describe('determinism — v0.5.0 share-code replay contract', () => {
  class ManualTimeSource implements TimeSource {
    constructor(private value: number) {}

    now(): number {
      return this.value;
    }

    advance(milliseconds: number): void {
      this.value += milliseconds;
    }
  }

  describe('encode/decode round-trip across the full registry', () => {
    it('every patternId in PROCEDURAL_PATTERN_IDS survives a round-trip', () => {
      for (let patternId = 0; patternId < PROCEDURAL_PATTERN_IDS.length; patternId++) {
        const state: ShareState = {
          patternId,
          presetId: ((patternId % 6) + 1) as ShareState['presetId'],
          themeId: patternId % 5,
          seed: (0xdeadbeef ^ (patternId * 0x9e3779b9)) >>> 0,
          configHash: (patternId * 17) & 0x1fff,
        };
        const code = encodeShareCode(state);
        expect(decodeShareCode(code)).toEqual(state);
      }
    });
  });

  describe('byte-for-byte pattern replay (canary patterns)', () => {
    const theme = createMockTheme();

    /**
     * Render N frames of a pattern from a fresh PRNG and return the
     * final buffer. Time progression simulates ~30 fps so any
     * time-based motion has a chance to consume RNG and diverge.
     */
    function runPattern<P extends DNAPattern | StarfieldPattern | FireworksPattern>(
      factory: () => P,
      frames: number
    ): Cell[][] {
      const pattern = factory();
      const buf = createMockBuffer(size.width, size.height);
      for (let frame = 0; frame < frames; frame++) {
        pattern.render(buf, frame * 33.333, size);
      }
      return buf;
    }

    describe('DNAPattern (7a proof-of-concept)', () => {
      const seed = 0x12345678;

      it('produces identical buffers for two runs with the same seed', () => {
        const a = runPattern(() => new DNAPattern(theme, new Mulberry32(seed)), 30);
        const b = runPattern(() => new DNAPattern(theme, new Mulberry32(seed)), 30);
        expect(firstDifference(a, b)).toBeNull();
      });

      it('produces different buffers for different seeds', () => {
        const a = runPattern(() => new DNAPattern(theme, new Mulberry32(seed)), 30);
        const b = runPattern(() => new DNAPattern(theme, new Mulberry32(seed ^ 0xff)), 30);
        expect(firstDifference(a, b)).not.toBeNull();
      });
    });

    describe('StarfieldPattern (simplest sparse case)', () => {
      const seed = 0xc0ffee01;

      it('produces identical buffers for two runs with the same seed', () => {
        const a = runPattern(() => new StarfieldPattern(theme, new Mulberry32(seed)), 30);
        const b = runPattern(() => new StarfieldPattern(theme, new Mulberry32(seed)), 30);
        expect(firstDifference(a, b)).toBeNull();
      });

      it('produces different buffers for different seeds', () => {
        const a = runPattern(() => new StarfieldPattern(theme, new Mulberry32(seed)), 30);
        const b = runPattern(() => new StarfieldPattern(theme, new Mulberry32(seed + 1)), 30);
        // Two starfields with different seeds and 30 frames of motion
        // virtually never collide cell-for-cell.
        expect(firstDifference(a, b)).not.toBeNull();
      });
    });

    describe('FireworksPattern (worst-case stochastic stress)', () => {
      const seed = 0xfeedface;
      // Fireworks need several spawn intervals (~1500ms) to fire bursts.
      // 200 frames @ ~33ms ≈ 6.6s — plenty to exercise multiple bursts.
      const frames = 200;

      it('produces identical buffers for two runs with the same seed', () => {
        const a = runPattern(() => new FireworksPattern(theme, new Mulberry32(seed)), frames);
        const b = runPattern(() => new FireworksPattern(theme, new Mulberry32(seed)), frames);
        const diff = firstDifference(a, b);
        if (diff) {
          // Surface the divergence loudly — this is the canary for
          // accidental Math.random reintroduction into a pattern.
          throw new Error(
            `FireworksPattern replay diverged at (${String(diff.x)}, ${String(diff.y)}) — ` +
              `share-code byte-for-byte guarantee is broken.`
          );
        }
        expect(diff).toBeNull();
      });

      it('produces different buffers for different seeds', () => {
        const a = runPattern(() => new FireworksPattern(theme, new Mulberry32(seed)), frames);
        const b = runPattern(
          () => new FireworksPattern(theme, new Mulberry32(seed ^ 0xdeadbeef)),
          frames
        );
        expect(firstDifference(a, b)).not.toBeNull();
      });
    });
  });

  describe('different-origin replay across the procedural registry', () => {
    it('renders identical complete cells for all 23 patterns', () => {
      const theme = createMockTheme();
      const seeds = new Map(
        PROCEDURAL_PATTERN_IDS.map((key, index) => [key, (0x9e3779b9 * (index + 1)) >>> 0])
      );
      const makeSlots = () =>
        buildPatternSlots({
          config: createDefaultConfig(),
          theme,
          seedOverrides: seeds,
          seedFactory: () => 0,
        });
      const slotsA = makeSlots();
      const slotsB = makeSlots();
      const sourceA = new ManualTimeSource(1000);
      const sourceB = new ManualTimeSource(900000000);
      const clockA = new AnimationClock(sourceA);
      const clockB = new AnimationClock(sourceB);
      clockA.start();
      clockB.start();
      const schedule = [16, 17, 33, 34, 50, 16, 100, 33, 33, 40];
      const timesA = schedule.map(delta => {
        sourceA.advance(delta);
        return clockA.frame();
      });
      const timesB = schedule.map(delta => {
        sourceB.advance(delta);
        return clockB.frame();
      });

      for (let index = 0; index < PROCEDURAL_PATTERN_IDS.length; index++) {
        const bufferA = createMockBuffer(size.width, size.height);
        const bufferB = createMockBuffer(size.width, size.height);
        for (let frame = 0; frame < schedule.length; frame++) {
          for (let y = 0; y < size.height; y++) {
            for (let x = 0; x < size.width; x++) {
              bufferA[y][x] = { char: ' ' };
              bufferB[y][x] = { char: ' ' };
            }
          }
          slotsA[index].pattern.render(
            bufferA,
            timesA[frame].sceneTime,
            size,
            undefined,
            timesA[frame]
          );
          slotsB[index].pattern.render(
            bufferB,
            timesB[frame].sceneTime,
            size,
            undefined,
            timesB[frame]
          );
        }

        const difference = firstDifference(bufferA, bufferB);
        if (difference) {
          throw new Error(
            `${PROCEDURAL_PATTERN_IDS[index]} differed across clock origins at ` +
              `(${String(difference.x)}, ${String(difference.y)})`
          );
        }
      }
    });
  });

  describe('version-skew rejection (v1 decoder vs hand-crafted v2)', () => {
    /**
     * Hand-assemble a 12-char share code with `v=2` in the top nybble.
     * If a real v2 ever ships, this test will need updating with v2's
     * own decoder — but until then, the v1 decoder must reject it
     * clearly so users get an "upgrade ascii-splash" message instead
     * of a silently-wrong scene.
     */
    function craftV2Code(): string {
      let payload = 0n;
      payload = (payload << 4n) | 2n; // v=2
      payload = (payload << 5n) | 0n; // pat
      payload = (payload << 3n) | 0n; // pre
      payload = (payload << 3n) | 0n; // thm
      payload = (payload << 32n) | 0n; // seed
      payload = (payload << 13n) | 0n; // hash
      const chars: string[] = new Array<string>(SHARE_CODE_LENGTH);
      for (let i = SHARE_CODE_LENGTH - 1; i >= 0; i--) {
        chars[i] = SHARE_CODE_ALPHABET[Number(payload & 0x1fn)];
        payload >>= 5n;
      }
      return chars.join('');
    }

    it('rejects with ShareCodeError("version")', () => {
      try {
        decodeShareCode(craftV2Code());
        fail('expected ShareCodeError');
      } catch (e) {
        expect(e).toBeInstanceOf(ShareCodeError);
        expect((e as ShareCodeError).kind).toBe('version');
      }
    });
  });

  describe('UX-random carve-out: CommandExecutor stays non-deterministic', () => {
    /**
     * The c* / c** / r ("surprise me") commands are intentionally NOT
     * threaded through the seeded Random — they're UX, not scene state.
     * A future refactor might be tempted to plumb the seeded PRNG in for
     * "consistency"; these tests guard against that.
     */
    const commandExecutorPath = join(
      import.meta.dirname,
      '..',
      '..',
      'src',
      'engine',
      'CommandExecutor.ts'
    );
    let src: string;
    beforeAll(() => {
      src = readFileSync(commandExecutorPath, 'utf8');
    });

    it('still calls Math.random() (UX-random carve-out intact)', () => {
      expect(src).toMatch(/Math\.random\s*\(/);
    });

    it('does not import the deterministic Random / Mulberry32', () => {
      expect(src).not.toMatch(/from\s+['"][^'"]*utils\/random/);
      expect(src).not.toMatch(/\bMulberry32\b/);
    });
  });
});
