/**
 * Dithering utilities for v0.4.0 PhotoPattern preprocessing.
 *
 * Two algorithms:
 *   - Floyd-Steinberg error diffusion (1976) — preserves average brightness
 *     exactly; produces "worm" artifacts in flat regions but excels on
 *     photographs.
 *   - Bayer ordered dithering (1973) — pre-generated threshold matrix; faster,
 *     produces structured grid patterns ideal for retro / 1-bit aesthetics.
 *
 * Both operate **in place** on RGBA byte buffers (4 bytes per pixel,
 * row-major, sharp's `.raw()` output format).
 *
 * Algorithms are re-derived from the description in
 * `docs/planning/v0.4.0-ROADMAP.md` (appendix C/D), not copied from chafa
 * (LGPL-3.0).
 */

/**
 * Quantize a single channel value to N evenly-spaced levels in [0, 255].
 * `levels=2` → strict 0/255 (1-bit). `levels=8` → 36-step grid (3-bit).
 */
function quantizeChannel(v: number, levels: number): number {
  if (levels <= 2) return v >= 128 ? 255 : 0;
  const step = 255 / (levels - 1);
  const idx = Math.round(v / step);
  const out = Math.round(idx * step);
  return out < 0 ? 0 : out > 255 ? 255 : out;
}

/**
 * In-place Floyd-Steinberg error-diffusion dither over an RGBA buffer.
 *
 * For each pixel in row-major order:
 *   oldP = pixel; newP = quantize(oldP, levels); pixel = newP
 *   err = oldP - newP
 *   distribute err to neighbours:  7/16 →    (x+1, y)
 *                                  3/16 →    (x-1, y+1)
 *                                  5/16 →    (x,   y+1)
 *                                  1/16 →    (x+1, y+1)
 *
 * Alpha is left untouched. Each color channel is diffused independently.
 *
 * @param pixels RGBA bytes, row-major (4 bytes per pixel).
 * @param width  Image width in pixels.
 * @param height Image height in pixels.
 * @param levels Quantization levels per channel. 2 = 1-bit (black/white),
 *               4 = 2-bit, 8 = 3-bit, etc. Default 2.
 */
export function floydSteinberg(
  pixels: Uint8Array | Buffer,
  width: number,
  height: number,
  levels = 2
): void {
  if (width <= 0 || height <= 0) return;
  const expectedBytes = width * height * 4;
  if (pixels.length < expectedBytes) {
    throw new Error(
      `floydSteinberg: pixel buffer too small (${String(pixels.length)} bytes, expected ${String(expectedBytes)})`
    );
  }

  // Work in Float32 so accumulated negative error doesn't underflow Uint8.
  const work = new Float32Array(width * height * 3);
  for (let i = 0, j = 0; i < width * height; i++) {
    work[j++] = pixels[i * 4];
    work[j++] = pixels[i * 4 + 1];
    work[j++] = pixels[i * 4 + 2];
  }

  const idx = (x: number, y: number, c: number): number => (y * width + x) * 3 + c;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < 3; c++) {
        const oldP = work[idx(x, y, c)];
        const newP = quantizeChannel(oldP, levels);
        work[idx(x, y, c)] = newP;
        const err = oldP - newP;

        if (x + 1 < width) work[idx(x + 1, y, c)] += (err * 7) / 16;
        if (y + 1 < height) {
          if (x > 0) work[idx(x - 1, y + 1, c)] += (err * 3) / 16;
          work[idx(x, y + 1, c)] += (err * 5) / 16;
          if (x + 1 < width) work[idx(x + 1, y + 1, c)] += (err * 1) / 16;
        }
      }
    }
  }

  for (let i = 0, j = 0; i < width * height; i++) {
    pixels[i * 4] = clamp8(work[j++]);
    pixels[i * 4 + 1] = clamp8(work[j++]);
    pixels[i * 4 + 2] = clamp8(work[j++]);
    // alpha untouched
  }
}

/**
 * Generate an N×N Bayer matrix recursively. N must be a power of two.
 * Output values are integers in `[0, N² - 1]` (the indices in the recursive
 * Bayer pattern; callers normalize to a signed offset).
 *
 * Recurrence (re-derived from the original 1973 paper):
 *   B(1) = [[0]]
 *   B(2N) = [[4·B(N)+0, 4·B(N)+2],
 *            [4·B(N)+3, 4·B(N)+1]]
 */
function generateBayerMatrix(size: number): Float32Array {
  if (size < 1 || (size & (size - 1)) !== 0) {
    throw new Error(`generateBayerMatrix: size must be a power of two, got ${String(size)}`);
  }
  const m = new Float32Array(size * size);
  if (size === 1) return m;

  const half = size / 2;
  const sub = generateBayerMatrix(half);
  for (let i = 0; i < half; i++) {
    for (let j = 0; j < half; j++) {
      const v = sub[i * half + j];
      m[i * size + j] = 4 * v + 0;
      m[i * size + (j + half)] = 4 * v + 2;
      m[(i + half) * size + j] = 4 * v + 3;
      m[(i + half) * size + (j + half)] = 4 * v + 1;
    }
  }
  return m;
}

/** 8×8 Bayer matrix. Lazy-initialized so unused renderers don't pay the cost. */
export const BAYER_8 = generateBayerMatrix(8);

/** 16×16 Bayer matrix. */
export const BAYER_16 = generateBayerMatrix(16);

/**
 * In-place Bayer ordered dither over an RGBA buffer.
 *
 * For each pixel:
 *   offset = (bayer[y % N][x % N] / N² - 0.5) · 2 · strength
 *   pixel.r = clamp(pixel.r + offset, 0, 255); same for g, b
 *   pixel = quantize(pixel, levels)
 *
 * The same signed offset is applied to all three channels — preserves hue
 * while pushing pixels above or below the quantization midpoint. This is
 * chafa's convention (`chafa-dither.c`).
 *
 * @param pixels   RGBA bytes, row-major.
 * @param width    Image width in pixels.
 * @param height   Image height in pixels.
 * @param matrix   Bayer matrix (use `BAYER_8` or `BAYER_16`).
 * @param size     Matrix dimension (8 for `BAYER_8`, 16 for `BAYER_16`).
 * @param strength Maximum magnitude of the offset. Default 64 (≈ ±64 / 255).
 *                 Larger values produce more visible patterning.
 * @param levels   Quantization levels per channel. Default 2 (1-bit).
 */
export function bayerOrdered(
  pixels: Uint8Array | Buffer,
  width: number,
  height: number,
  matrix: Float32Array,
  size: number,
  strength = 64,
  levels = 2
): void {
  if (width <= 0 || height <= 0) return;
  const expectedBytes = width * height * 4;
  if (pixels.length < expectedBytes) {
    throw new Error(
      `bayerOrdered: pixel buffer too small (${String(pixels.length)} bytes, expected ${String(expectedBytes)})`
    );
  }
  if (matrix.length !== size * size) {
    throw new Error(
      `bayerOrdered: matrix size mismatch (got ${String(matrix.length)} entries, expected ${String(size * size)} for ${String(size)}×${String(size)})`
    );
  }

  const denom = size * size;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = matrix[(y % size) * size + (x % size)] / denom; // [0, 1)
      const offset = (t - 0.5) * 2 * strength; // [-strength, +strength)
      const i = (y * width + x) * 4;
      pixels[i] = quantizeChannel(clamp8(pixels[i] + offset), levels);
      pixels[i + 1] = quantizeChannel(clamp8(pixels[i + 1] + offset), levels);
      pixels[i + 2] = quantizeChannel(clamp8(pixels[i + 2] + offset), levels);
      // alpha untouched
    }
  }
}

function clamp8(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}
