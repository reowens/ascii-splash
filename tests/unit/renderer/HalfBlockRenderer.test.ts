/**
 * Unit tests for HalfBlockRenderer (v0.4.0 Phase 1).
 *
 * The renderer is a direct port of viuer's `block.rs` algorithm but
 * targets a Cell[][] buffer rather than ANSI bytes. Tests below verify
 * the same invariants viuer's tests verify (block.rs:233-372), translated
 * to our model:
 *
 *   - Both pixels opaque       → ▄ with fg=bottom, bg=top
 *   - Only top opaque          → ▀ with fg=top, no bg
 *   - Only bottom opaque       → ▄ with fg=bottom, no bg
 *   - Both transparent         → space, no color
 *   - Last unpaired (odd H) row → ▀ with fg=top
 */

import {
  renderHalfBlock,
  UPPER_HALF_BLOCK,
  LOWER_HALF_BLOCK,
} from '../../../src/renderer/HalfBlockRenderer.js';
import { Cell } from '../../../src/types/index.js';
import { createMockBuffer } from '../../utils/mocks.js';

/**
 * Pack an array of pixel objects into a flat RGBA Uint8Array, row-major.
 * Each pixel is [r, g, b, a].
 */
function packPixels(
  width: number,
  height: number,
  pixels: Array<[number, number, number, number]>
): Uint8Array {
  if (pixels.length !== width * height) {
    throw new Error(`packPixels: got ${pixels.length} pixels, expected ${width * height}`);
  }
  const out = new Uint8Array(width * height * 4);
  for (let i = 0; i < pixels.length; i++) {
    out[i * 4] = pixels[i][0];
    out[i * 4 + 1] = pixels[i][1];
    out[i * 4 + 2] = pixels[i][2];
    out[i * 4 + 3] = pixels[i][3];
  }
  return out;
}

describe('HalfBlockRenderer', () => {
  describe('Both pixels opaque (paired rows)', () => {
    test('emits ▄ with fg=bottom and bg=top for a 1×2 image', () => {
      const buffer: Cell[][] = createMockBuffer(1, 1);
      const pixels = packPixels(1, 2, [
        [10, 20, 30, 255], // row 0 (top)
        [40, 50, 60, 255], // row 1 (bottom)
      ]);

      renderHalfBlock(buffer, pixels, 1, 2);

      expect(buffer[0][0]).toEqual({
        char: LOWER_HALF_BLOCK,
        color: { r: 40, g: 50, b: 60 },
        bg: { r: 10, g: 20, b: 30 },
      });
    });

    test('renders 2×4 source as 2×2 cell output', () => {
      const buffer: Cell[][] = createMockBuffer(2, 2);
      const pixels = packPixels(2, 4, [
        [10, 0, 0, 255],
        [20, 0, 0, 255], // row 0
        [30, 0, 0, 255],
        [40, 0, 0, 255], // row 1 → cell (0, 0..1) bottom
        [50, 0, 0, 255],
        [60, 0, 0, 255], // row 2 → cell (1, 0..1) top
        [70, 0, 0, 255],
        [80, 0, 0, 255], // row 3
      ]);

      renderHalfBlock(buffer, pixels, 2, 4);

      // Cell (0, 0): top = 10, bottom = 30
      expect(buffer[0][0].char).toBe(LOWER_HALF_BLOCK);
      expect(buffer[0][0].color).toEqual({ r: 30, g: 0, b: 0 });
      expect(buffer[0][0].bg).toEqual({ r: 10, g: 0, b: 0 });

      // Cell (0, 1): top = 20, bottom = 40
      expect(buffer[0][1].color).toEqual({ r: 40, g: 0, b: 0 });
      expect(buffer[0][1].bg).toEqual({ r: 20, g: 0, b: 0 });

      // Cell (1, 0): top = 50, bottom = 70
      expect(buffer[1][0].color).toEqual({ r: 70, g: 0, b: 0 });
      expect(buffer[1][0].bg).toEqual({ r: 50, g: 0, b: 0 });

      // Cell (1, 1): top = 60, bottom = 80
      expect(buffer[1][1].color).toEqual({ r: 80, g: 0, b: 0 });
      expect(buffer[1][1].bg).toEqual({ r: 60, g: 0, b: 0 });
    });
  });

  describe('Transparent pixels', () => {
    test('both transparent → leaves cell as space with no colors', () => {
      const buffer: Cell[][] = createMockBuffer(1, 1);
      const pixels = packPixels(1, 2, [
        [255, 0, 0, 0], // alpha 0 = transparent
        [0, 255, 0, 0],
      ]);

      renderHalfBlock(buffer, pixels, 1, 2);

      expect(buffer[0][0]).toEqual({ char: ' ' });
    });

    test('only top opaque → ▀ with fg=top, no bg', () => {
      const buffer: Cell[][] = createMockBuffer(1, 1);
      const pixels = packPixels(1, 2, [
        [11, 22, 33, 255],
        [99, 88, 77, 0],
      ]);

      renderHalfBlock(buffer, pixels, 1, 2);

      expect(buffer[0][0].char).toBe(UPPER_HALF_BLOCK);
      expect(buffer[0][0].color).toEqual({ r: 11, g: 22, b: 33 });
      expect(buffer[0][0].bg).toBeUndefined();
    });

    test('only bottom opaque → ▄ with fg=bottom, no bg', () => {
      const buffer: Cell[][] = createMockBuffer(1, 1);
      const pixels = packPixels(1, 2, [
        [99, 88, 77, 0],
        [11, 22, 33, 255],
      ]);

      renderHalfBlock(buffer, pixels, 1, 2);

      expect(buffer[0][0].char).toBe(LOWER_HALF_BLOCK);
      expect(buffer[0][0].color).toEqual({ r: 11, g: 22, b: 33 });
      expect(buffer[0][0].bg).toBeUndefined();
    });
  });

  describe('Odd-height images (last unpaired row)', () => {
    test('1×3 image → 2 cell rows, last cell uses ▀ with fg=top', () => {
      const buffer: Cell[][] = createMockBuffer(1, 2);
      const pixels = packPixels(1, 3, [
        [10, 0, 0, 255], // cell row 0 top
        [20, 0, 0, 255], // cell row 0 bottom
        [30, 0, 0, 255], // cell row 1 top (unpaired)
      ]);

      renderHalfBlock(buffer, pixels, 1, 3);

      // First cell is paired
      expect(buffer[0][0].char).toBe(LOWER_HALF_BLOCK);
      expect(buffer[0][0].color).toEqual({ r: 20, g: 0, b: 0 });
      expect(buffer[0][0].bg).toEqual({ r: 10, g: 0, b: 0 });

      // Last cell is unpaired → upper-half-block
      expect(buffer[1][0].char).toBe(UPPER_HALF_BLOCK);
      expect(buffer[1][0].color).toEqual({ r: 30, g: 0, b: 0 });
      expect(buffer[1][0].bg).toBeUndefined();
    });

    test('1×3 image with transparent last row → space', () => {
      const buffer: Cell[][] = createMockBuffer(1, 2);
      const pixels = packPixels(1, 3, [
        [10, 0, 0, 255],
        [20, 0, 0, 255],
        [30, 0, 0, 0], // transparent unpaired row
      ]);

      renderHalfBlock(buffer, pixels, 1, 3);

      expect(buffer[1][0]).toEqual({ char: ' ' });
    });
  });

  describe('Buffer bounds protection', () => {
    test('does not crash when image is larger than buffer', () => {
      const buffer: Cell[][] = createMockBuffer(2, 2);
      // 4×6 source → would want a 4×3 cell output, but buffer is only 2×2
      const pixels = packPixels(
        4,
        6,
        Array(24).fill([100, 100, 100, 255]) as Array<[number, number, number, number]>
      );

      expect(() => renderHalfBlock(buffer, pixels, 4, 6)).not.toThrow();
      // Region inside the buffer is filled
      expect(buffer[0][0].char).toBe(LOWER_HALF_BLOCK);
      expect(buffer[1][1].char).toBe(LOWER_HALF_BLOCK);
    });

    test('handles empty buffer gracefully', () => {
      const buffer: Cell[][] = [];
      const pixels = packPixels(1, 2, [
        [10, 0, 0, 255],
        [20, 0, 0, 255],
      ]);
      expect(() => renderHalfBlock(buffer, pixels, 1, 2)).not.toThrow();
    });

    test('throws on truncated pixel buffer', () => {
      const buffer: Cell[][] = createMockBuffer(2, 1);
      const pixels = new Uint8Array(4); // Need 2*2*4 = 16 bytes
      expect(() => renderHalfBlock(buffer, pixels, 2, 2)).toThrow(/too small/);
    });
  });

  describe('Options: invert', () => {
    test('inverts pixel channels', () => {
      const buffer: Cell[][] = createMockBuffer(1, 1);
      const pixels = packPixels(1, 2, [
        [10, 20, 30, 255],
        [40, 50, 60, 255],
      ]);

      renderHalfBlock(buffer, pixels, 1, 2, { invert: true });

      expect(buffer[0][0].color).toEqual({ r: 215, g: 205, b: 195 }); // 255-40, 255-50, 255-60
      expect(buffer[0][0].bg).toEqual({ r: 245, g: 235, b: 225 }); // 255-10, 255-20, 255-30
    });
  });

  describe('Options: grayscale', () => {
    test('emits luminance-based grayscale', () => {
      const buffer: Cell[][] = createMockBuffer(1, 1);
      // Pure red top, pure green bottom
      const pixels = packPixels(1, 2, [
        [255, 0, 0, 255], // luminance = 0.299*255 ≈ 76
        [0, 255, 0, 255], // luminance = 0.587*255 ≈ 150
      ]);

      renderHalfBlock(buffer, pixels, 1, 2, { grayscale: true });

      expect(buffer[0][0].bg!.r).toBe(buffer[0][0].bg!.g);
      expect(buffer[0][0].bg!.g).toBe(buffer[0][0].bg!.b);
      expect(buffer[0][0].color!.r).toBe(buffer[0][0].color!.g);
      expect(buffer[0][0].color!.g).toBe(buffer[0][0].color!.b);

      // Bottom (green) should be brighter than top (red) per BT.601 weights
      expect(buffer[0][0].color!.r).toBeGreaterThan(buffer[0][0].bg!.r);
    });
  });

  describe('Options: contrast', () => {
    test('contrast=1 leaves pixels unchanged', () => {
      const buffer: Cell[][] = createMockBuffer(1, 1);
      const pixels = packPixels(1, 2, [
        [50, 100, 150, 255],
        [200, 100, 50, 255],
      ]);

      renderHalfBlock(buffer, pixels, 1, 2, { contrast: 1 });

      expect(buffer[0][0].bg).toEqual({ r: 50, g: 100, b: 150 });
      expect(buffer[0][0].color).toEqual({ r: 200, g: 100, b: 50 });
    });

    test('contrast > 1 pushes values away from mid-gray', () => {
      const buffer: Cell[][] = createMockBuffer(1, 1);
      // 200 → (200-128)*2 + 128 = 272 → clamped to 255
      // 50 → (50-128)*2 + 128 = -28 → clamped to 0
      const pixels = packPixels(1, 2, [
        [50, 50, 50, 255],
        [200, 200, 200, 255],
      ]);

      renderHalfBlock(buffer, pixels, 1, 2, { contrast: 2 });

      expect(buffer[0][0].bg).toEqual({ r: 0, g: 0, b: 0 });
      expect(buffer[0][0].color).toEqual({ r: 255, g: 255, b: 255 });
    });
  });

  describe('Options: threshold', () => {
    test('hard-thresholds each channel', () => {
      const buffer: Cell[][] = createMockBuffer(1, 1);
      const pixels = packPixels(1, 2, [
        [10, 130, 200, 255],
        [127, 128, 250, 255],
      ]);

      renderHalfBlock(buffer, pixels, 1, 2, { threshold: 128 });

      // Top: 10<128→0, 130>=128→255, 200>=128→255
      expect(buffer[0][0].bg).toEqual({ r: 0, g: 255, b: 255 });
      // Bottom: 127<128→0, 128>=128→255, 250>=128→255
      expect(buffer[0][0].color).toEqual({ r: 0, g: 255, b: 255 });
    });
  });

  describe('Options: bgTint', () => {
    test('emits space + averaged bg color when both pixels opaque', () => {
      const buffer: Cell[][] = createMockBuffer(1, 1);
      const pixels = packPixels(1, 2, [
        [100, 100, 100, 255],
        [200, 200, 200, 255],
      ]);

      renderHalfBlock(buffer, pixels, 1, 2, { bgTint: true });

      expect(buffer[0][0]).toEqual({
        char: ' ',
        bg: { r: 150, g: 150, b: 150 },
      });
    });

    test('handles transparency in bgTint mode', () => {
      const buffer: Cell[][] = createMockBuffer(1, 1);
      const pixels = packPixels(1, 2, [
        [100, 100, 100, 255],
        [200, 200, 200, 0],
      ]);

      renderHalfBlock(buffer, pixels, 1, 2, { bgTint: true });

      expect(buffer[0][0].char).toBe(' ');
      expect(buffer[0][0].bg).toEqual({ r: 100, g: 100, b: 100 });
    });

    test('both transparent in bgTint mode → space, no bg', () => {
      const buffer: Cell[][] = createMockBuffer(1, 1);
      const pixels = packPixels(1, 2, [
        [100, 100, 100, 0],
        [200, 200, 200, 0],
      ]);

      renderHalfBlock(buffer, pixels, 1, 2, { bgTint: true });

      expect(buffer[0][0]).toEqual({ char: ' ' });
    });
  });

  describe('Determinism', () => {
    test('two renders with the same inputs produce identical buffers', () => {
      const pixels = packPixels(2, 4, [
        [10, 20, 30, 255],
        [40, 50, 60, 255],
        [70, 80, 90, 255],
        [100, 110, 120, 255],
        [130, 140, 150, 255],
        [160, 170, 180, 0],
        [190, 200, 210, 255],
        [220, 230, 240, 255],
      ]);

      const a: Cell[][] = createMockBuffer(2, 2);
      const b: Cell[][] = createMockBuffer(2, 2);

      renderHalfBlock(a, pixels, 2, 4, { invert: true, contrast: 1.4 });
      renderHalfBlock(b, pixels, 2, 4, { invert: true, contrast: 1.4 });

      expect(a).toEqual(b);
    });
  });
});
