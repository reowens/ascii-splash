/**
 * Unit tests for SymbolRenderer (v0.4.0 Phase 4).
 *
 * The matcher picks, per terminal cell, the bitmap symbol whose lit/unlit
 * partition best separates the 8×8 source patch into two color clusters.
 * Tests synthesize patches that exactly match specific symbol bitmaps so
 * the matcher has a unique zero-error winner, then assert that winner is
 * the expected codepoint.
 */

import { renderSymbol } from '../../../src/renderer/SymbolRenderer.js';
import {
  SYMBOLS,
  SymbolEntry,
  TAG_ALL,
  TAG_ASCII,
  TAG_BLOCK,
  TAG_QUADRANT,
  TAG_SHADE,
  getSymbolCandidates,
} from '../../../src/renderer/symbols.js';
import { createMockBuffer } from '../../utils/mocks.js';

function symbolByCodepoint(cp: string): SymbolEntry {
  const found = SYMBOLS.find(s => s.codepoint === cp);
  if (!found) throw new Error(`No symbol with codepoint ${JSON.stringify(cp)}`);
  return found;
}

/**
 * Synthesize an 8×8 RGBA patch where pixels at lit positions of the given
 * bitmap take `litRgb`, unlit positions take `unlitRgb`, all alpha=255.
 *
 * The resulting patch makes the source symbol an exact zero-error match
 * for the matcher: fg = litRgb, bg = unlitRgb, err = 0.
 */
function patchFromBitmap(
  bitmap: Uint8Array,
  litRgb: [number, number, number],
  unlitRgb: [number, number, number]
): Uint8Array {
  const out = new Uint8Array(8 * 8 * 4);
  for (let i = 0; i < 64; i++) {
    const [r, g, b] = bitmap[i] === 1 ? litRgb : unlitRgb;
    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = 255;
  }
  return out;
}

/** Fill an N×N pixel buffer with a single solid color (alpha=255). */
function solidPatch(width: number, height: number, r: number, g: number, b: number): Uint8Array {
  const out = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = 255;
  }
  return out;
}

describe('SymbolRenderer', () => {
  describe('Exact-match patches → expected symbol wins', () => {
    test('vertical pipe shape → `|` under ASCII tag', () => {
      const sym = symbolByCodepoint('|');
      const pixels = patchFromBitmap(sym.bitmap, [255, 255, 255], [0, 0, 0]);
      const buffer = createMockBuffer(1, 1);

      renderSymbol(buffer, pixels, 8, 8, { tagMask: TAG_ASCII });

      expect(buffer[0][0].char).toBe('|');
      expect(buffer[0][0].color).toEqual({ r: 255, g: 255, b: 255 });
      expect(buffer[0][0].bg).toEqual({ r: 0, g: 0, b: 0 });
    });

    test('plus shape → `+` under ASCII tag', () => {
      const sym = symbolByCodepoint('+');
      const pixels = patchFromBitmap(sym.bitmap, [255, 255, 0], [10, 20, 30]);
      const buffer = createMockBuffer(1, 1);

      renderSymbol(buffer, pixels, 8, 8, { tagMask: TAG_ASCII });

      expect(buffer[0][0].char).toBe('+');
      expect(buffer[0][0].color).toEqual({ r: 255, g: 255, b: 0 });
      expect(buffer[0][0].bg).toEqual({ r: 10, g: 20, b: 30 });
    });

    test('upper-half shape → `▀` under BLOCK tag', () => {
      const sym = symbolByCodepoint('▀');
      const pixels = patchFromBitmap(sym.bitmap, [200, 100, 50], [0, 0, 100]);
      const buffer = createMockBuffer(1, 1);

      renderSymbol(buffer, pixels, 8, 8, { tagMask: TAG_BLOCK });

      expect(buffer[0][0].char).toBe('▀');
      expect(buffer[0][0].color).toEqual({ r: 200, g: 100, b: 50 });
      expect(buffer[0][0].bg).toEqual({ r: 0, g: 0, b: 100 });
    });

    test('UL quadrant shape → `▘` under QUADRANT tag', () => {
      const sym = symbolByCodepoint('▘');
      const pixels = patchFromBitmap(sym.bitmap, [255, 255, 255], [50, 50, 50]);
      const buffer = createMockBuffer(1, 1);

      renderSymbol(buffer, pixels, 8, 8, { tagMask: TAG_QUADRANT });

      expect(buffer[0][0].char).toBe('▘');
    });

    test('diagonal `▚` shape → `▚` under QUADRANT tag', () => {
      const sym = symbolByCodepoint('▚');
      const pixels = patchFromBitmap(sym.bitmap, [255, 0, 0], [0, 0, 255]);
      const buffer = createMockBuffer(1, 1);

      renderSymbol(buffer, pixels, 8, 8, { tagMask: TAG_QUADRANT });

      expect(buffer[0][0].char).toBe('▚');
      expect(buffer[0][0].color).toEqual({ r: 255, g: 0, b: 0 });
      expect(buffer[0][0].bg).toEqual({ r: 0, g: 0, b: 255 });
    });

    test('medium-shade checkerboard → `▒` under SHADE tag', () => {
      const sym = symbolByCodepoint('▒');
      const pixels = patchFromBitmap(sym.bitmap, [255, 255, 255], [0, 0, 0]);
      const buffer = createMockBuffer(1, 1);

      renderSymbol(buffer, pixels, 8, 8, { tagMask: TAG_SHADE });

      expect(buffer[0][0].char).toBe('▒');
    });
  });

  describe('Uniform-color patches', () => {
    test('all-white patch → `█` with white fg (tie-break favors fuller symbol)', () => {
      const pixels = solidPatch(8, 8, 255, 255, 255);
      const buffer = createMockBuffer(1, 1);

      renderSymbol(buffer, pixels, 8, 8, { tagMask: TAG_ALL });

      expect(buffer[0][0].char).toBe('█');
      expect(buffer[0][0].color).toEqual({ r: 255, g: 255, b: 255 });
      expect(buffer[0][0].bg).toBeUndefined();
    });

    test('all-black patch → `█` with black fg', () => {
      const pixels = solidPatch(8, 8, 0, 0, 0);
      const buffer = createMockBuffer(1, 1);

      renderSymbol(buffer, pixels, 8, 8, { tagMask: TAG_ALL });

      // Tie-break (larger litCount wins on ties) picks `█` for uniform patches.
      // Emits a solid cell, not a transparent space — avoids leaking the terminal
      // background through what should be a black photo region.
      expect(buffer[0][0].char).toBe('█');
      expect(buffer[0][0].color).toEqual({ r: 0, g: 0, b: 0 });
    });

    test('uniform mid-gray patch → `█` mid-gray (tie-break)', () => {
      const pixels = solidPatch(8, 8, 128, 128, 128);
      const buffer = createMockBuffer(1, 1);

      renderSymbol(buffer, pixels, 8, 8, { tagMask: TAG_ALL });

      expect(buffer[0][0].char).toBe('█');
      expect(buffer[0][0].color).toEqual({ r: 128, g: 128, b: 128 });
    });
  });

  describe('Tag filtering', () => {
    test('ASCII-only tag never selects block / quadrant / shade codepoints', () => {
      // Render a `▌` (left-half) shape and an `▘` (UL-quadrant) shape under ASCII tag.
      // None of the candidates carry those codepoints, so it must pick an ASCII char.
      const cases = [
        symbolByCodepoint('▌').bitmap,
        symbolByCodepoint('▘').bitmap,
        symbolByCodepoint('▚').bitmap,
        symbolByCodepoint('░').bitmap,
      ];

      for (const bitmap of cases) {
        const pixels = patchFromBitmap(bitmap, [255, 255, 255], [0, 0, 0]);
        const buffer = createMockBuffer(1, 1);

        renderSymbol(buffer, pixels, 8, 8, { tagMask: TAG_ASCII });

        const ch = buffer[0][0].char;
        const candidate = SYMBOLS.find(s => s.codepoint === ch);
        expect(candidate).toBeDefined();
        // Picked codepoint must be tagged ASCII.
        expect(candidate && (candidate.tag & TAG_ASCII) !== 0).toBe(true);
      }
    });

    test('BLOCK tag returns only the 5 half-block codepoints (+ space + full)', () => {
      const candidates = getSymbolCandidates(TAG_BLOCK);
      const codepoints = candidates.map(c => c.codepoint).sort();
      // Per symbols.ts: space + ▀ + ▄ + ▌ + ▐ + █ all carry TAG_BLOCK.
      expect(codepoints).toEqual([' ', '█', '▀', '▄', '▌', '▐'].sort());
    });

    test('tagMask=0 emits no writes (cells remain at initial state)', () => {
      const pixels = solidPatch(8, 8, 200, 200, 200);
      const buffer = createMockBuffer(1, 1);
      const initial = buffer[0][0];

      renderSymbol(buffer, pixels, 8, 8, { tagMask: 0 });

      expect(buffer[0][0]).toBe(initial);
    });

    test('default tagMask (omitted) is TAG_ALL — all symbols available', () => {
      const sym = symbolByCodepoint('▞'); // QUADRANT-only — would be unreachable under ASCII tag
      // Use white-on-black so `▞`'s lit positions hold the brighter color —
      // the renderer's natural-reading tiebreaker prefers fg-brighter on err
      // ties, picking `▞` over its bit-complement `▚`.
      const pixels = patchFromBitmap(sym.bitmap, [255, 255, 255], [0, 0, 0]);
      const buffer = createMockBuffer(1, 1);

      renderSymbol(buffer, pixels, 8, 8);

      expect(buffer[0][0].char).toBe('▞');
    });
  });

  describe('Preprocessing options', () => {
    test('grayscale=true reduces both fg and bg to luminance', () => {
      const sym = symbolByCodepoint('|');
      // Lit pixels = red (255,0,0) → luminance 76; unlit = green (0,255,0) → 150.
      const pixels = patchFromBitmap(sym.bitmap, [255, 0, 0], [0, 255, 0]);
      const buffer = createMockBuffer(1, 1);

      renderSymbol(buffer, pixels, 8, 8, { tagMask: TAG_ASCII, grayscale: true });

      expect(buffer[0][0].char).toBe('|');
      // BT.601: round(0.299*255) = 76; round(0.587*255) = 150.
      expect(buffer[0][0].color).toEqual({ r: 76, g: 76, b: 76 });
      expect(buffer[0][0].bg).toEqual({ r: 150, g: 150, b: 150 });
    });

    test('invert=true flips channels before matching', () => {
      const sym = symbolByCodepoint('|');
      // Patch has lit=black, unlit=white. After invert, lit becomes white, unlit black.
      const pixels = patchFromBitmap(sym.bitmap, [0, 0, 0], [255, 255, 255]);
      const buffer = createMockBuffer(1, 1);

      renderSymbol(buffer, pixels, 8, 8, { tagMask: TAG_ASCII, invert: true });

      expect(buffer[0][0].char).toBe('|');
      expect(buffer[0][0].color).toEqual({ r: 255, g: 255, b: 255 });
      expect(buffer[0][0].bg).toEqual({ r: 0, g: 0, b: 0 });
    });
  });

  describe('Edge cases', () => {
    test('zero-width / zero-height image is a no-op', () => {
      const buffer = createMockBuffer(1, 1);
      const initial = buffer[0][0];
      renderSymbol(buffer, new Uint8Array(0), 0, 0);
      expect(buffer[0][0]).toBe(initial);
    });

    test('empty buffer is a no-op (no throw)', () => {
      const pixels = solidPatch(8, 8, 0, 0, 0);
      expect(() => renderSymbol([], pixels, 8, 8)).not.toThrow();
    });

    test('pixel buffer smaller than declared size throws', () => {
      const buffer = createMockBuffer(1, 1);
      const tooSmall = new Uint8Array(8); // claims 8×8 but only 8 bytes
      expect(() => renderSymbol(buffer, tooSmall, 8, 8)).toThrow(/too small/);
    });

    test('fully-transparent patch emits a space (no fg, no bg)', () => {
      const pixels = new Uint8Array(8 * 8 * 4); // all-zero (alpha=0 everywhere)
      const buffer = createMockBuffer(1, 1);

      renderSymbol(buffer, pixels, 8, 8);

      expect(buffer[0][0]).toEqual({ char: ' ' });
    });

    test('image smaller than buffer leaves untouched cells alone', () => {
      const pixels = solidPatch(8, 8, 100, 200, 50);
      const buffer = createMockBuffer(3, 3);
      const original_1_1 = buffer[1][1];
      const original_2_2 = buffer[2][2];

      renderSymbol(buffer, pixels, 8, 8); // 1×1 cell of image; 3×3 of buffer

      // (0,0) was written
      expect(buffer[0][0].char).toBe('█');
      // (1,1) and (2,2) keep their original references (renderer skipped them)
      expect(buffer[1][1]).toBe(original_1_1);
      expect(buffer[2][2]).toBe(original_2_2);
    });

    test('multi-cell image renders each cell independently', () => {
      // 16×8 image = 2 horizontally-adjacent 8×8 cells.
      const pipeSym = symbolByCodepoint('|');
      const plusSym = symbolByCodepoint('+');
      const pixels = new Uint8Array(16 * 8 * 4);

      // Cell 0: `|` shape, red on black.
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const i = y * 8 + x;
          const idx = (y * 16 + x) * 4;
          if (pipeSym.bitmap[i] === 1) {
            pixels[idx] = 255;
          }
          pixels[idx + 3] = 255;
        }
      }
      // Cell 1 (offset 8 cols): `+` shape, green on black.
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const i = y * 8 + x;
          const idx = (y * 16 + (x + 8)) * 4;
          if (plusSym.bitmap[i] === 1) {
            pixels[idx + 1] = 255;
          }
          pixels[idx + 3] = 255;
        }
      }

      const buffer = createMockBuffer(2, 1);
      renderSymbol(buffer, pixels, 16, 8, { tagMask: TAG_ASCII });

      expect(buffer[0][0].char).toBe('|');
      expect(buffer[0][0].color).toEqual({ r: 255, g: 0, b: 0 });
      expect(buffer[0][1].char).toBe('+');
      expect(buffer[0][1].color).toEqual({ r: 0, g: 255, b: 0 });
    });
  });

  describe('Performance sanity', () => {
    test('80×24 frame with full symbol set renders in < 200ms', () => {
      // Pessimistic upper bound: brief's microbenchmark hit ~20ms on a similar
      // workload. CI hardware variance pushes the limit up to 200ms. The point
      // is to catch order-of-magnitude regressions (e.g. quadratic blow-up),
      // not to assert a tight perf SLO.
      const W = 80;
      const H = 24;
      const imgW = W * 8;
      const imgH = H * 8;

      // Procedural gradient — varied enough that the matcher exercises all
      // candidates, not a degenerate uniform-color shortcut.
      const pixels = new Uint8Array(imgW * imgH * 4);
      for (let y = 0; y < imgH; y++) {
        for (let x = 0; x < imgW; x++) {
          const idx = (y * imgW + x) * 4;
          pixels[idx] = (x * 7 + y * 3) & 0xff;
          pixels[idx + 1] = (x * 5 - y * 11) & 0xff;
          pixels[idx + 2] = (x ^ y) & 0xff;
          pixels[idx + 3] = 255;
        }
      }

      const buffer = createMockBuffer(W, H);
      const start = Date.now();
      renderSymbol(buffer, pixels, imgW, imgH, { tagMask: TAG_ALL });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(200);
    });
  });
});
