import { Cell, Color } from '../types/index.js';

export const UPPER_HALF_BLOCK = '▀'; // ▀
export const LOWER_HALF_BLOCK = '▄'; // ▄

/**
 * Per-channel image post-processing applied as the renderer reads each pixel.
 * Order: grayscale → invert → contrast → threshold. Pure functions of pixel
 * input so the renderer remains deterministic.
 */
export interface HalfBlockOptions {
  invert?: boolean;
  grayscale?: boolean;
  /** 1.0 = no change. Values >1 boost contrast around mid-gray (128). */
  contrast?: number;
  /** 0-255. When set, each channel is hard-clipped to 0 or 255. */
  threshold?: number;
  /**
   * When true, emit a space character with `bg` set to the per-cell average
   * color of the two source pixels. This loses the 2× vertical resolution
   * but produces a blocky single-color-per-cell aesthetic.
   */
  bgTint?: boolean;
}

/**
 * Render an RGBA pixel buffer into a Cell[][] using upper/lower half-block
 * unicode characters to encode 2 stacked pixels per terminal cell.
 *
 * Algorithm (ported from viuer's `block.rs`, MIT-licensed):
 * - Each terminal cell maps to two source rows (`2*row` and `2*row+1`).
 * - Both pixels opaque → emit ▄ with fg=bottom, bg=top.
 * - Only top opaque → emit ▀ with fg=top.
 * - Only bottom opaque → emit ▄ with fg=bottom.
 * - Both transparent → leave cell as ' ' (space-transparency convention).
 * - Last row of an odd-height image is unpaired → emit ▀ with fg=top
 *   (or space if transparent).
 *
 * The renderer writes only into the region `min(width, bufW) ×
 * min(ceil(height/2), bufH)` so the caller may pass in over-sized images
 * without crashing; cells outside that region are left untouched.
 *
 * @param buffer       Destination 2D Cell array (row-major, [y][x]).
 * @param pixels       Source RGBA bytes, row-major, 4 bytes per pixel.
 * @param imgWidth     Source image width in pixels.
 * @param imgHeight    Source image height in pixels.
 * @param options      Optional pre-processing flags.
 */
export function renderHalfBlock(
  buffer: Cell[][],
  pixels: Uint8Array | Buffer,
  imgWidth: number,
  imgHeight: number,
  options: HalfBlockOptions = {}
): void {
  if (imgWidth <= 0 || imgHeight <= 0) return;
  const expectedBytes = imgWidth * imgHeight * 4;
  if (pixels.length < expectedBytes) {
    throw new Error(
      `HalfBlockRenderer: pixel buffer too small (${String(pixels.length)} bytes, expected ${String(expectedBytes)})`
    );
  }

  const bufHeight = buffer.length;
  const bufWidth = bufHeight > 0 ? buffer[0].length : 0;
  if (bufHeight === 0 || bufWidth === 0) return;

  const cellRows = Math.ceil(imgHeight / 2);
  const writeCols = Math.min(imgWidth, bufWidth);
  const writeRows = Math.min(cellRows, bufHeight);

  for (let row = 0; row < writeRows; row++) {
    const topY = row * 2;
    const botY = row * 2 + 1;
    const isLastUnpaired = botY >= imgHeight;

    for (let x = 0; x < writeCols; x++) {
      const topIdx = (topY * imgWidth + x) * 4;
      const top = readPixel(pixels, topIdx, options);

      if (isLastUnpaired) {
        if (top === null) {
          buffer[row][x] = { char: ' ' };
        } else if (options.bgTint) {
          buffer[row][x] = { char: ' ', bg: top };
        } else {
          buffer[row][x] = { char: UPPER_HALF_BLOCK, color: top };
        }
        continue;
      }

      const botIdx = (botY * imgWidth + x) * 4;
      const bot = readPixel(pixels, botIdx, options);

      // Branch on (top, bot) opacity in the order that lets TS narrow each
      // pixel to a non-null Color without `!` assertions.
      if (options.bgTint) {
        if (top !== null && bot !== null) {
          buffer[row][x] = {
            char: ' ',
            bg: {
              r: (top.r + bot.r) >> 1,
              g: (top.g + bot.g) >> 1,
              b: (top.b + bot.b) >> 1,
            },
          };
        } else if (top !== null) {
          buffer[row][x] = { char: ' ', bg: top };
        } else if (bot !== null) {
          buffer[row][x] = { char: ' ', bg: bot };
        } else {
          buffer[row][x] = { char: ' ' };
        }
        continue;
      }

      if (top !== null && bot !== null) {
        buffer[row][x] = { char: LOWER_HALF_BLOCK, color: bot, bg: top };
      } else if (top !== null) {
        buffer[row][x] = { char: UPPER_HALF_BLOCK, color: top };
      } else if (bot !== null) {
        buffer[row][x] = { char: LOWER_HALF_BLOCK, color: bot };
      } else {
        buffer[row][x] = { char: ' ' };
      }
    }
  }
}

function readPixel(
  pixels: Uint8Array | Buffer,
  idx: number,
  options: HalfBlockOptions
): Color | null {
  const a = pixels[idx + 3];
  if (a === 0) return null;

  let r = pixels[idx];
  let g = pixels[idx + 1];
  let b = pixels[idx + 2];

  if (options.grayscale) {
    const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    r = g = b = lum;
  }

  if (options.invert) {
    r = 255 - r;
    g = 255 - g;
    b = 255 - b;
  }

  if (options.contrast !== undefined && options.contrast !== 1) {
    const c = options.contrast;
    r = clamp8(Math.round((r - 128) * c + 128));
    g = clamp8(Math.round((g - 128) * c + 128));
    b = clamp8(Math.round((b - 128) * c + 128));
  }

  if (options.threshold !== undefined) {
    const t = options.threshold;
    r = r >= t ? 255 : 0;
    g = g >= t ? 255 : 0;
    b = b >= t ? 255 : 0;
  }

  return { r, g, b };
}

function clamp8(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}
