/**
 * Edge-detection preprocessors for v0.4.0 PhotoPattern.
 *
 * Two operators:
 *   - Sobel  — 3×3 separable gradient; cheap; good general edge detection.
 *   - DoG    — Difference of Gaussians; tunable bandpass, picks out
 *              fine vs. coarse edges depending on (σ1, σ2).
 *
 * Both operate on a single-channel luminance image (Uint8ClampedArray, one
 * byte per pixel) and return a new same-size buffer with the edge magnitude
 * clamped into [0, 255].
 *
 * The pipeline in PhotoPattern is:
 *   resized RGBA → rgbaToLuminance → sobel/DoG → render path
 *
 * (The renderer that consumes the result wraps the single-channel buffer back
 * into RGBA where lit/unlit dots are decided by a luminance threshold, so
 * we never need to keep the resulting magnitude in the truecolor domain.)
 */

/**
 * Convert RGBA bytes to a single-channel luminance image using BT.601 weights
 * (matches `HalfBlockOptions.grayscale`).
 *
 * Transparent pixels (alpha=0) are written as 0 — caller can then treat
 * "0 luminance" as "no signal" for edge detection purposes.
 */
export function rgbaToLuminance(
  pixels: Uint8Array | Buffer,
  width: number,
  height: number
): Uint8ClampedArray {
  const expectedBytes = width * height * 4;
  if (pixels.length < expectedBytes) {
    throw new Error(
      `rgbaToLuminance: pixel buffer too small (${String(pixels.length)} bytes, expected ${String(expectedBytes)})`
    );
  }
  const out = new Uint8ClampedArray(width * height);
  for (let i = 0; i < width * height; i++) {
    const a = pixels[i * 4 + 3];
    if (a === 0) {
      out[i] = 0;
      continue;
    }
    const r = pixels[i * 4];
    const g = pixels[i * 4 + 1];
    const b = pixels[i * 4 + 2];
    out[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }
  return out;
}

/**
 * Sobel edge magnitude. Computes
 *   Gx = [[-1, 0, +1], [-2, 0, +2], [-1, 0, +1]]
 *   Gy = [[-1,-2, -1], [ 0, 0,  0], [+1,+2, +1]]
 *   mag = sqrt(Gx² + Gy²)   (clamped to 0..255)
 *
 * Border pixels (1-row / 1-col edge of the image) are written as 0 since
 * the 3×3 stencil isn't fully defined there.
 */
export function sobelMagnitude(
  lum: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height);
  if (width < 3 || height < 3) return out;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const tl = lum[(y - 1) * width + (x - 1)];
      const tc = lum[(y - 1) * width + x];
      const tr = lum[(y - 1) * width + (x + 1)];
      const ml = lum[y * width + (x - 1)];
      const mr = lum[y * width + (x + 1)];
      const bl = lum[(y + 1) * width + (x - 1)];
      const bc = lum[(y + 1) * width + x];
      const br = lum[(y + 1) * width + (x + 1)];

      const gx = -tl + tr - 2 * ml + 2 * mr - bl + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
      const mag = Math.sqrt(gx * gx + gy * gy);
      out[y * width + x] = mag > 255 ? 255 : Math.round(mag);
    }
  }
  return out;
}

/**
 * One-dimensional Gaussian kernel for the given σ. Kernel size is
 * `2 * ceil(3σ) + 1` (covers ~99.7 % of the bell). Normalized to sum to 1.
 */
function gaussianKernel(sigma: number): Float32Array {
  if (sigma <= 0) {
    const k = new Float32Array(1);
    k[0] = 1;
    return k;
  }
  const radius = Math.max(1, Math.ceil(3 * sigma));
  const size = 2 * radius + 1;
  const k = new Float32Array(size);
  const denom = 2 * sigma * sigma;
  let sum = 0;
  for (let i = -radius; i <= radius; i++) {
    const v = Math.exp((-i * i) / denom);
    k[i + radius] = v;
    sum += v;
  }
  for (let i = 0; i < size; i++) k[i] /= sum;
  return k;
}

/**
 * Separable Gaussian blur. Applies the 1-D kernel horizontally then
 * vertically; uses clamp-to-edge sampling for border pixels.
 */
function gaussianBlur(
  lum: Uint8ClampedArray,
  width: number,
  height: number,
  sigma: number
): Float32Array {
  const k = gaussianKernel(sigma);
  const radius = (k.length - 1) >> 1;
  const tmp = new Float32Array(width * height);
  const out = new Float32Array(width * height);

  // Horizontal pass: lum → tmp
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let acc = 0;
      for (let i = -radius; i <= radius; i++) {
        let xi = x + i;
        if (xi < 0) xi = 0;
        else if (xi >= width) xi = width - 1;
        acc += lum[y * width + xi] * k[i + radius];
      }
      tmp[y * width + x] = acc;
    }
  }

  // Vertical pass: tmp → out
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let acc = 0;
      for (let i = -radius; i <= radius; i++) {
        let yi = y + i;
        if (yi < 0) yi = 0;
        else if (yi >= height) yi = height - 1;
        acc += tmp[yi * width + x] * k[i + radius];
      }
      out[y * width + x] = acc;
    }
  }

  return out;
}

/**
 * Difference-of-Gaussians edge detector.
 *
 *   blur1 = gaussianBlur(lum, σ1)
 *   blur2 = gaussianBlur(lum, σ2)   // σ2 > σ1
 *   dog   = blur1 - blur2           // signed
 *   out   = clamp(|dog|, 0, 255)
 *
 * Acts as a band-pass filter. With σ1=1, σ2≈1.6 it approximates the
 * Laplacian of Gaussian (Marr & Hildreth 1980) — a smoother edge detector
 * than Sobel on noisy images.
 *
 * Defaults (σ1=1, σ2=2) trade some band-pass purity for a stronger response
 * at the small canvas sizes typical for half-block / braille rendering
 * (~70×50 to ~140×100 pixels). The canonical (σ1=1, σ2=1.6) Marr–Hildreth
 * pair underflows on these sizes — empirically max magnitude only reaches
 * ~33/255 on a real photo at 71×48, vs. ~47/255 at σ2=2. Override per-call
 * for higher-resolution sources.
 */
export function differenceOfGaussians(
  lum: Uint8ClampedArray,
  width: number,
  height: number,
  sigma1 = 1,
  sigma2 = 2
): Uint8ClampedArray {
  if (sigma2 <= sigma1) {
    throw new Error(
      `differenceOfGaussians: sigma2 (${String(sigma2)}) must be > sigma1 (${String(sigma1)})`
    );
  }
  const out = new Uint8ClampedArray(width * height);
  if (width === 0 || height === 0) return out;

  const blur1 = gaussianBlur(lum, width, height, sigma1);
  const blur2 = gaussianBlur(lum, width, height, sigma2);

  for (let i = 0; i < width * height; i++) {
    const v = Math.abs(blur1[i] - blur2[i]);
    out[i] = v > 255 ? 255 : Math.round(v);
  }
  return out;
}

/**
 * Wrap a single-channel mask back into an RGBA buffer suitable for the
 * existing half-block / braille renderers. Each pixel becomes
 * `(v, v, v, 255)` — i.e. the renderer will see a grayscale image where
 * bright spots are edges.
 */
export function maskToRgba(mask: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const out = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const v = mask[i];
    out[i * 4] = v;
    out[i * 4 + 1] = v;
    out[i * 4 + 2] = v;
    out[i * 4 + 3] = 255;
  }
  return out;
}
