import { Cell, Color } from '../types/index.js';

/**
 * Each terminal cell encodes 2 columns × 4 rows of "dots" packed into a
 * single Unicode Braille Pattern codepoint (U+2800–U+28FF).
 *
 * Bit layout (re-derived from the Unicode 8-dot Braille standard, not copied
 * from drawille — AGPL-3.0):
 *
 *   ┌─────┬─────┐
 *   │ 0x01│ 0x08│   ← row 0 (top)
 *   ├─────┼─────┤
 *   │ 0x02│ 0x10│   ← row 1
 *   ├─────┼─────┤
 *   │ 0x04│ 0x20│   ← row 2
 *   ├─────┼─────┤
 *   │ 0x40│ 0x80│   ← row 3 (bottom)
 *   └─────┴─────┘
 *
 * Codepoint = 0x2800 + bitfield. All 8 dots lit → 0x28FF. None lit → 0x2800
 * (rendered as a "blank" Braille char which we emit as a regular space so the
 * renderer can naturally compose with overlays via the space-transparency
 * convention used by the rest of the engine).
 */
const PIXEL_MAP: readonly (readonly number[])[] = [
  [0x01, 0x08],
  [0x02, 0x10],
  [0x04, 0x20],
  [0x40, 0x80],
];

/** First codepoint in the Unicode Braille Patterns block. */
export const BRAILLE_BASE = 0x2800;

export interface BrailleOptions {
  /**
   * Luminance threshold (0–255) above which a dot is "lit". Default 128.
   * Ignored when `preBinarized` is true.
   */
  threshold?: number;

  /** Invert the luminance test (lit ↔ unlit). */
  invert?: boolean;

  /**
   * When the input has already been binarized (e.g. by Floyd-Steinberg with
   * `levels=2`, or by an edge-detection preprocessor that wrote 0 / 255), skip
   * the BT.601 luminance calculation: a dot is lit iff its red channel is
   * nonzero. Faster and avoids the threshold round-trip.
   */
  preBinarized?: boolean;
}

/**
 * Render an RGBA pixel buffer into a `Cell[][]` using Unicode Braille
 * Pattern codepoints — each terminal cell encodes 2 wide × 4 tall = 8
 * monochrome "dots", giving 8× resolution vs. plain ASCII.
 *
 * Color comes from the **mean RGB of lit dots** in each cell. When no dots
 * are lit, the cell is left as a space so the layer below shows through.
 *
 * Algorithm:
 *   For each cell (cy, cx):
 *     bitfield = 0
 *     sumR = sumG = sumB = 0
 *     count = 0
 *     For each dot (dy in 0..3, dx in 0..1):
 *       px = source[cy*4 + dy][cx*2 + dx]    (clipped to image bounds)
 *       lit = preBinarized ? (px.r > 0)
 *           : invert        ? (luminance(px) <  threshold)
 *           :                 (luminance(px) >= threshold)
 *       if lit and px.alpha > 0:
 *         bitfield |= PIXEL_MAP[dy][dx]
 *         sumR += px.r; sumG += px.g; sumB += px.b; count++
 *     if bitfield == 0:
 *       cell = { char: ' ' }
 *     else:
 *       cell = { char: chr(0x2800 + bitfield), color: avgRGB }
 *
 * Source-pixel rows / cols past `imgHeight` / `imgWidth` are treated as
 * unlit (transparent).
 *
 * @param buffer    Destination 2D Cell array (row-major, [y][x]).
 * @param pixels    Source RGBA bytes, row-major, 4 bytes per pixel.
 * @param imgWidth  Source image width in pixels.
 * @param imgHeight Source image height in pixels.
 * @param options   Optional thresholding flags.
 */
export function renderBraille(
  buffer: Cell[][],
  pixels: Uint8Array | Buffer,
  imgWidth: number,
  imgHeight: number,
  options: BrailleOptions = {}
): void {
  if (imgWidth <= 0 || imgHeight <= 0) return;
  const expectedBytes = imgWidth * imgHeight * 4;
  if (pixels.length < expectedBytes) {
    throw new Error(
      `BrailleRenderer: pixel buffer too small (${String(pixels.length)} bytes, expected ${String(expectedBytes)})`
    );
  }

  const bufHeight = buffer.length;
  const bufWidth = bufHeight > 0 ? buffer[0].length : 0;
  if (bufHeight === 0 || bufWidth === 0) return;

  const threshold = options.threshold ?? 128;
  const invert = options.invert ?? false;
  const preBinarized = options.preBinarized ?? false;

  const cellRows = Math.ceil(imgHeight / 4);
  const cellCols = Math.ceil(imgWidth / 2);
  const writeRows = Math.min(cellRows, bufHeight);
  const writeCols = Math.min(cellCols, bufWidth);

  for (let cy = 0; cy < writeRows; cy++) {
    for (let cx = 0; cx < writeCols; cx++) {
      let bitfield = 0;
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let count = 0;

      for (let dy = 0; dy < 4; dy++) {
        const py = cy * 4 + dy;
        if (py >= imgHeight) continue;
        for (let dx = 0; dx < 2; dx++) {
          const px = cx * 2 + dx;
          if (px >= imgWidth) continue;
          const idx = (py * imgWidth + px) * 4;
          const a = pixels[idx + 3];
          if (a === 0) continue;

          const r = pixels[idx];
          const g = pixels[idx + 1];
          const b = pixels[idx + 2];

          let lit: boolean;
          if (preBinarized) {
            lit = r > 0;
          } else {
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            lit = invert ? lum < threshold : lum >= threshold;
          }

          if (lit) {
            bitfield |= PIXEL_MAP[dy][dx];
            sumR += r;
            sumG += g;
            sumB += b;
            count++;
          }
        }
      }

      if (bitfield === 0 || count === 0) {
        buffer[cy][cx] = { char: ' ' };
        continue;
      }

      const color: Color = {
        r: Math.round(sumR / count),
        g: Math.round(sumG / count),
        b: Math.round(sumB / count),
      };
      buffer[cy][cx] = {
        char: String.fromCharCode(BRAILLE_BASE + bitfield),
        color,
      };
    }
  }
}
