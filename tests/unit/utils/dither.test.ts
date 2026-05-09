/**
 * Unit tests for the v0.4.0 Phase 2 dither utilities.
 *
 * Floyd-Steinberg and Bayer ordered dithering both operate in-place on RGBA
 * byte buffers. We test:
 *   - basic determinism (same input + params → same output)
 *   - quantization behaviour at known levels (1-bit, 3-bit)
 *   - alpha pass-through
 *   - mean-brightness preservation (FS only, on uniform input)
 *   - Bayer matrix structure (recursive Bayer property)
 *   - hue preservation in Bayer (same offset to all channels)
 */
import { floydSteinberg, bayerOrdered, BAYER_8, BAYER_16 } from '../../../src/utils/dither.js';

function makeFlatRgba(
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
  a = 255
): Uint8Array {
  const buf = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    buf[i * 4] = r;
    buf[i * 4 + 1] = g;
    buf[i * 4 + 2] = b;
    buf[i * 4 + 3] = a;
  }
  return buf;
}

function meanChannel(buf: Uint8Array, ch: 0 | 1 | 2): number {
  let sum = 0;
  const n = buf.length / 4;
  for (let i = 0; i < n; i++) sum += buf[i * 4 + ch];
  return sum / n;
}

describe('floydSteinberg', () => {
  test('quantizes a flat mid-gray field to black/white at levels=2', () => {
    const buf = makeFlatRgba(8, 8, 128, 128, 128);
    floydSteinberg(buf, 8, 8, 2);
    for (let i = 0; i < buf.length; i += 4) {
      expect([0, 255]).toContain(buf[i]);
      expect([0, 255]).toContain(buf[i + 1]);
      expect([0, 255]).toContain(buf[i + 2]);
    }
  });

  test('preserves average brightness on a flat field within ±5/255', () => {
    const buf = makeFlatRgba(16, 16, 100, 100, 100);
    floydSteinberg(buf, 16, 16, 2);
    expect(meanChannel(buf, 0)).toBeGreaterThan(95);
    expect(meanChannel(buf, 0)).toBeLessThan(105);
  });

  test('leaves alpha untouched', () => {
    const buf = makeFlatRgba(4, 4, 100, 100, 100, 200);
    floydSteinberg(buf, 4, 4, 2);
    for (let i = 0; i < buf.length; i += 4) {
      expect(buf[i + 3]).toBe(200);
    }
  });

  test('is deterministic — same input → same output', () => {
    const a = makeFlatRgba(8, 8, 128, 64, 200);
    const b = makeFlatRgba(8, 8, 128, 64, 200);
    floydSteinberg(a, 8, 8, 2);
    floydSteinberg(b, 8, 8, 2);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  test('levels=8 produces values on a 36-step grid', () => {
    const buf = makeFlatRgba(8, 8, 128, 128, 128);
    floydSteinberg(buf, 8, 8, 8);
    // 8 levels → step = 255/7 ≈ 36.43; allowed values are round(idx * step) for idx 0..7
    const allowed = new Set<number>();
    for (let i = 0; i < 8; i++) allowed.add(Math.round((i * 255) / 7));
    for (let i = 0; i < buf.length; i += 4) {
      expect(allowed.has(buf[i])).toBe(true);
    }
  });

  test('throws on truncated buffer', () => {
    const tiny = new Uint8Array(8); // claims 4×4 = 64 bytes
    expect(() => floydSteinberg(tiny, 4, 4, 2)).toThrow(/too small/);
  });

  test('zero dimensions are a no-op', () => {
    const buf = new Uint8Array(0);
    expect(() => floydSteinberg(buf, 0, 0, 2)).not.toThrow();
  });
});

describe('bayerOrdered', () => {
  test('quantizes a flat mid-gray field to black/white at levels=2', () => {
    const buf = makeFlatRgba(16, 16, 128, 128, 128);
    bayerOrdered(buf, 16, 16, BAYER_8, 8, 64, 2);
    let blacks = 0;
    let whites = 0;
    for (let i = 0; i < buf.length; i += 4) {
      if (buf[i] === 0) blacks++;
      else if (buf[i] === 255) whites++;
    }
    expect(blacks + whites).toBe(16 * 16);
    // Roughly half of each — the 8×8 matrix has a uniform distribution of thresholds.
    expect(blacks).toBeGreaterThan(64);
    expect(whites).toBeGreaterThan(64);
  });

  test('applies the same offset to all channels (hue preserved)', () => {
    // After Bayer, channels with equal input remain equal.
    const buf = makeFlatRgba(16, 16, 100, 100, 100);
    bayerOrdered(buf, 16, 16, BAYER_8, 8, 32, 8);
    for (let i = 0; i < buf.length; i += 4) {
      expect(buf[i + 1]).toBe(buf[i]);
      expect(buf[i + 2]).toBe(buf[i]);
    }
  });

  test('leaves alpha untouched', () => {
    const buf = makeFlatRgba(8, 8, 128, 128, 128, 99);
    bayerOrdered(buf, 8, 8, BAYER_8, 8, 64, 2);
    for (let i = 0; i < buf.length; i += 4) {
      expect(buf[i + 3]).toBe(99);
    }
  });

  test('is deterministic', () => {
    const a = makeFlatRgba(16, 16, 128, 128, 128);
    const b = makeFlatRgba(16, 16, 128, 128, 128);
    bayerOrdered(a, 16, 16, BAYER_8, 8, 64, 2);
    bayerOrdered(b, 16, 16, BAYER_8, 8, 64, 2);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  test('throws if matrix size mismatches declared size', () => {
    const buf = makeFlatRgba(8, 8, 128, 128, 128);
    expect(() => bayerOrdered(buf, 8, 8, BAYER_8, 16, 64, 2)).toThrow(/matrix size mismatch/);
  });
});

describe('BAYER_8 / BAYER_16 matrices', () => {
  test('BAYER_8 has 64 entries spanning [0, 63]', () => {
    expect(BAYER_8.length).toBe(64);
    const seen = new Set<number>();
    for (const v of BAYER_8) seen.add(v);
    expect(seen.size).toBe(64); // each integer 0..63 appears exactly once
    expect(Math.min(...BAYER_8)).toBe(0);
    expect(Math.max(...BAYER_8)).toBe(63);
  });

  test('BAYER_16 has 256 entries spanning [0, 255]', () => {
    expect(BAYER_16.length).toBe(256);
    expect(Math.min(...BAYER_16)).toBe(0);
    expect(Math.max(...BAYER_16)).toBe(255);
  });

  test('BAYER_8 follows the recursive Bayer construction (4·B(4)+offset)', () => {
    // Top-left 2×2 of B(8) should equal 4·B(4)[0,0] + 0 = 0 since B(N)[0,0] = 0.
    expect(BAYER_8[0]).toBe(0);
    // Top-right 2×2 starts at 4·0 + 2 = 2.
    expect(BAYER_8[4]).toBe(2);
    // Bottom-left of the 8×8 quadrant grid starts at 4·0 + 3 = 3.
    expect(BAYER_8[4 * 8 + 0]).toBe(3);
    // Bottom-right of the 8×8 quadrant grid starts at 4·0 + 1 = 1.
    expect(BAYER_8[4 * 8 + 4]).toBe(1);
  });
});
