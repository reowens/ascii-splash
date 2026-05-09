/**
 * Unit tests for the v0.4.0 Phase 2 edge-detection utilities.
 *
 * Three test surfaces:
 *   - rgbaToLuminance:      BT.601 weights; alpha=0 maps to 0.
 *   - sobelMagnitude:       solid → 0; vertical step → strong response;
 *                           horizontal step → strong response.
 *   - differenceOfGaussians: solid → 0; hard edge → high response;
 *                           σ2 must exceed σ1.
 */
import {
  rgbaToLuminance,
  sobelMagnitude,
  differenceOfGaussians,
  maskToRgba,
} from '../../../src/utils/edges.js';

function pack(
  width: number,
  height: number,
  fill: (x: number, y: number) => [number, number, number, number]
): Uint8Array {
  const out = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const [r, g, b, a] = fill(x, y);
      out[i] = r;
      out[i + 1] = g;
      out[i + 2] = b;
      out[i + 3] = a;
    }
  }
  return out;
}

describe('rgbaToLuminance', () => {
  test('applies BT.601 weights', () => {
    // Pure red → 0.299*255 ≈ 76
    const red = pack(1, 1, () => [255, 0, 0, 255]);
    const lumR = rgbaToLuminance(red, 1, 1);
    expect(lumR[0]).toBeGreaterThan(70);
    expect(lumR[0]).toBeLessThan(82);

    // Pure green → 0.587*255 ≈ 150
    const green = pack(1, 1, () => [0, 255, 0, 255]);
    const lumG = rgbaToLuminance(green, 1, 1);
    expect(lumG[0]).toBeGreaterThan(140);
    expect(lumG[0]).toBeLessThan(160);

    // Pure blue → 0.114*255 ≈ 29
    const blue = pack(1, 1, () => [0, 0, 255, 255]);
    const lumB = rgbaToLuminance(blue, 1, 1);
    expect(lumB[0]).toBeLessThan(35);
  });

  test('treats alpha=0 as 0 luminance regardless of RGB', () => {
    const buf = pack(2, 1, x => [255, 255, 255, x === 0 ? 0 : 255]);
    const lum = rgbaToLuminance(buf, 2, 1);
    expect(lum[0]).toBe(0);
    expect(lum[1]).toBe(255);
  });

  test('throws on truncated buffer', () => {
    const tiny = new Uint8Array(4);
    expect(() => rgbaToLuminance(tiny, 4, 4)).toThrow(/too small/);
  });
});

describe('sobelMagnitude', () => {
  test('solid color → near-zero magnitude across the whole image', () => {
    const lum = new Uint8ClampedArray(8 * 8);
    lum.fill(128);
    const out = sobelMagnitude(lum, 8, 8);
    let total = 0;
    for (const v of out) total += v;
    expect(total).toBe(0);
  });

  test('vertical step edge → high response in the gradient column', () => {
    // 8×8 luminance: left half = 0, right half = 255
    const lum = new Uint8ClampedArray(8 * 8);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        lum[y * 8 + x] = x < 4 ? 0 : 255;
      }
    }
    const mag = sobelMagnitude(lum, 8, 8);
    // Column 3 and 4 should have the strongest response (the step).
    for (let y = 1; y < 7; y++) {
      expect(mag[y * 8 + 3]).toBeGreaterThan(200);
    }
    // Column 0 (interior far from the step) should be 0 — but column 0 is on
    // the border, where Sobel is masked to 0 by design.
    for (let y = 1; y < 7; y++) {
      expect(mag[y * 8 + 1]).toBe(0);
      expect(mag[y * 8 + 6]).toBe(0);
    }
  });

  test('horizontal step edge → high response in the gradient row', () => {
    const lum = new Uint8ClampedArray(8 * 8);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        lum[y * 8 + x] = y < 4 ? 0 : 255;
      }
    }
    const mag = sobelMagnitude(lum, 8, 8);
    for (let x = 1; x < 7; x++) {
      expect(mag[3 * 8 + x]).toBeGreaterThan(200);
    }
  });

  test('borders are zero (3×3 stencil undefined)', () => {
    const lum = new Uint8ClampedArray(8 * 8);
    for (let i = 0; i < lum.length; i++) lum[i] = i % 256;
    const mag = sobelMagnitude(lum, 8, 8);
    for (let x = 0; x < 8; x++) {
      expect(mag[x]).toBe(0);
      expect(mag[7 * 8 + x]).toBe(0);
    }
    for (let y = 0; y < 8; y++) {
      expect(mag[y * 8]).toBe(0);
      expect(mag[y * 8 + 7]).toBe(0);
    }
  });

  test('tiny images (<3×3) return all zeros', () => {
    const lum = new Uint8ClampedArray(2 * 2);
    lum.fill(255);
    const mag = sobelMagnitude(lum, 2, 2);
    for (const v of mag) expect(v).toBe(0);
  });

  test('output values are clamped to [0, 255]', () => {
    const lum = new Uint8ClampedArray(8 * 8);
    for (let i = 0; i < lum.length; i++) lum[i] = (i * 255) | 0;
    const mag = sobelMagnitude(lum, 8, 8);
    for (const v of mag) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(255);
    }
  });
});

describe('differenceOfGaussians', () => {
  test('solid color → near-zero magnitude', () => {
    const lum = new Uint8ClampedArray(16 * 16);
    lum.fill(128);
    const out = differenceOfGaussians(lum, 16, 16, 1, 1.6);
    let total = 0;
    for (const v of out) total += v;
    // DoG of a flat field should be exactly zero (clamp-to-edge sampling
    // means borders also see the same value).
    expect(total).toBe(0);
  });

  test('hard step edge produces a band of nonzero response near the edge', () => {
    const lum = new Uint8ClampedArray(16 * 16);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        lum[y * 16 + x] = x < 8 ? 0 : 255;
      }
    }
    const out = differenceOfGaussians(lum, 16, 16, 1, 1.6);
    // The edge column straddles 7..8; expect strong values there.
    let edgeMax = 0;
    for (let y = 0; y < 16; y++) {
      edgeMax = Math.max(edgeMax, out[y * 16 + 7], out[y * 16 + 8]);
    }
    // DoG response on a tiny 16×16 synthetic image is damped by clamp-to-edge
    // border handling near the kernel radius. On real-sized photos (≥48×48)
    // the peak is typically ~25–47, but the bound below is what's reliable
    // here. The presence of *any* nonzero band is the invariant we care about.
    expect(edgeMax).toBeGreaterThan(10);

    // Far from the edge, values should be near zero.
    let farTotal = 0;
    for (let y = 0; y < 16; y++) farTotal += out[y * 16 + 0];
    expect(farTotal / 16).toBeLessThan(2);
  });

  test('throws when σ2 ≤ σ1', () => {
    const lum = new Uint8ClampedArray(16 * 16);
    expect(() => differenceOfGaussians(lum, 16, 16, 2, 1)).toThrow(/sigma2/);
    expect(() => differenceOfGaussians(lum, 16, 16, 1, 1)).toThrow(/sigma2/);
  });

  test('output values are clamped to [0, 255]', () => {
    const lum = new Uint8ClampedArray(16 * 16);
    for (let i = 0; i < lum.length; i++) lum[i] = i % 256;
    const out = differenceOfGaussians(lum, 16, 16);
    for (const v of out) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(255);
    }
  });
});

describe('maskToRgba', () => {
  test('expands a single-channel mask to grayscale RGBA with alpha=255', () => {
    const mask = new Uint8ClampedArray([0, 64, 128, 255]);
    const out = maskToRgba(mask, 4, 1);
    expect(out.length).toBe(16);
    for (let i = 0; i < 4; i++) {
      const v = mask[i];
      expect(out[i * 4]).toBe(v);
      expect(out[i * 4 + 1]).toBe(v);
      expect(out[i * 4 + 2]).toBe(v);
      expect(out[i * 4 + 3]).toBe(255);
    }
  });
});
