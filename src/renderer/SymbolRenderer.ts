import { Cell, Color } from '../types/index.js';
import { getSymbolCandidates, SymbolEntry, TAG_ALL } from './symbols.js';

/**
 * Per-pixel preprocessing applied as the matcher reads each source pixel.
 * Same shape as `HalfBlockOptions` so PhotoPattern preset entries can pass
 * the equivalent knobs through. Order: grayscale → invert → contrast.
 */
export interface SymbolOptions {
  /**
   * Bitwise OR of TAG_* constants in `symbols.ts`. The matcher only
   * considers symbols whose tag intersects this mask. Default: all tags.
   */
  tagMask?: number;
  /** 1.0 = no change. Values >1 boost contrast around mid-gray (128). */
  contrast?: number;
  /** Reduce all source pixels to luminance (BT.601). */
  grayscale?: boolean;
  /** Invert source pixels (255 - channel) before matching. */
  invert?: boolean;
}

const FULL_BLOCK = '█';
const SPACE = ' ';

/**
 * Render an RGBA pixel buffer into a `Cell[][]` by choosing, per 8×8 patch,
 * the symbol whose lit/unlit partition best separates that patch's pixels
 * into two color clusters.
 *
 * Algorithm (Appendix E of the v0.4.0 roadmap; chafa's
 * symbol-renderer.c:98-268 is the LGPL reference — we re-implement under
 * MIT from the algorithm description, not the source):
 *
 *   For each cell (cy, cx):
 *     patch = source[cy*8..cy*8+7][cx*8..cx*8+7]   (RGBA, alpha-aware)
 *     for sym in candidates (filtered by tagMask):
 *       fg  = mean(patch[i] for i where sym.bitmap[i] === 1)
 *       bg  = mean(patch[i] for i where sym.bitmap[i] === 0)
 *       err = Σ squared-color-distance(patch[i], expected)
 *     pick lowest err — tie-break by larger litCount (favors fuller shapes
 *     on uniform patches so e.g. all-white renders as █ not space).
 *
 * The cell is emitted with:
 *   - bestSym = space     → { char: ' ', bg }                  (bg only)
 *   - bestSym = █         → { char: '█', color: fg }           (fg only)
 *   - mixed               → { char: codepoint, color: fg, bg } (both)
 *
 * Cells past `cellCols × cellRows` (where the image runs out) are skipped.
 * Cells whose source patch is fully transparent emit a space (transparent).
 *
 * @param buffer    Destination 2D Cell array (row-major, [y][x]).
 * @param pixels    Source RGBA bytes, row-major, 4 bytes per pixel.
 * @param imgWidth  Source image width in pixels (callers should ensure ≥ cellCols * 8).
 * @param imgHeight Source image height in pixels.
 * @param options   Optional tagMask + preprocessing flags.
 */
export function renderSymbol(
  buffer: Cell[][],
  pixels: Uint8Array | Buffer,
  imgWidth: number,
  imgHeight: number,
  options: SymbolOptions = {}
): void {
  if (imgWidth <= 0 || imgHeight <= 0) return;
  const expectedBytes = imgWidth * imgHeight * 4;
  if (pixels.length < expectedBytes) {
    throw new Error(
      `SymbolRenderer: pixel buffer too small (${String(pixels.length)} bytes, expected ${String(expectedBytes)})`
    );
  }

  const bufHeight = buffer.length;
  const bufWidth = bufHeight > 0 ? buffer[0].length : 0;
  if (bufHeight === 0 || bufWidth === 0) return;

  const tagMask = options.tagMask ?? TAG_ALL;
  if (tagMask === 0) return;
  const candidates = getSymbolCandidates(tagMask);
  if (candidates.length === 0) return;

  const contrast = options.contrast ?? 1;
  const grayscale = options.grayscale ?? false;
  const invert = options.invert ?? false;

  const cellRows = Math.ceil(imgHeight / 8);
  const cellCols = Math.ceil(imgWidth / 8);
  const writeRows = Math.min(cellRows, bufHeight);
  const writeCols = Math.min(cellCols, bufWidth);

  // Per-cell scratch — allocated once, reused across all cells.
  const patchR = new Float32Array(64);
  const patchG = new Float32Array(64);
  const patchB = new Float32Array(64);
  const patchA = new Uint8Array(64);

  for (let cy = 0; cy < writeRows; cy++) {
    for (let cx = 0; cx < writeCols; cx++) {
      const opaqueCount = extractPatch(
        pixels,
        imgWidth,
        imgHeight,
        cx,
        cy,
        patchR,
        patchG,
        patchB,
        patchA,
        contrast,
        grayscale,
        invert
      );

      if (opaqueCount === 0) {
        buffer[cy][cx] = { char: SPACE };
        continue;
      }

      const match = pickBestSymbol(candidates, patchR, patchG, patchB, patchA);

      const fg: Color = {
        r: roundClamp8(match.fgR),
        g: roundClamp8(match.fgG),
        b: roundClamp8(match.fgB),
      };
      const bg: Color = {
        r: roundClamp8(match.bgR),
        g: roundClamp8(match.bgG),
        b: roundClamp8(match.bgB),
      };

      if (match.sym.codepoint === SPACE) {
        buffer[cy][cx] = { char: SPACE, bg };
      } else if (match.sym.codepoint === FULL_BLOCK) {
        buffer[cy][cx] = { char: FULL_BLOCK, color: fg };
      } else {
        buffer[cy][cx] = { char: match.sym.codepoint, color: fg, bg };
      }
    }
  }
}

/**
 * Read an 8×8 patch from the source RGBA pixel buffer into the supplied
 * scratch arrays, applying grayscale → invert → contrast. Returns the
 * count of opaque (non-zero-alpha) dots written. Pixels falling outside
 * the source image are marked transparent (alpha=0 in `patchA`).
 *
 * Hot path: 64 iterations × pixel-channel ops per cell. Kept as a free
 * function so V8 can inline tight loops without going through a class.
 */
function extractPatch(
  pixels: Uint8Array | Buffer,
  imgWidth: number,
  imgHeight: number,
  cx: number,
  cy: number,
  patchR: Float32Array,
  patchG: Float32Array,
  patchB: Float32Array,
  patchA: Uint8Array,
  contrast: number,
  grayscale: boolean,
  invert: boolean
): number {
  let opaqueCount = 0;
  for (let i = 0; i < 64; i++) {
    const py = cy * 8 + (i >> 3);
    const px = cx * 8 + (i & 7);
    if (py >= imgHeight || px >= imgWidth) {
      patchA[i] = 0;
      continue;
    }
    const srcIdx = (py * imgWidth + px) * 4;
    const a = pixels[srcIdx + 3];
    if (a === 0) {
      patchA[i] = 0;
      continue;
    }
    let r = pixels[srcIdx];
    let g = pixels[srcIdx + 1];
    let b = pixels[srcIdx + 2];

    if (grayscale) {
      const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      r = g = b = lum;
    }
    if (invert) {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }
    if (contrast !== 1) {
      r = clamp8(Math.round((r - 128) * contrast + 128));
      g = clamp8(Math.round((g - 128) * contrast + 128));
      b = clamp8(Math.round((b - 128) * contrast + 128));
    }

    patchR[i] = r;
    patchG[i] = g;
    patchB[i] = b;
    patchA[i] = 1;
    opaqueCount++;
  }
  return opaqueCount;
}

interface MatchResult {
  sym: SymbolEntry;
  fgR: number;
  fgG: number;
  fgB: number;
  bgR: number;
  bgG: number;
  bgB: number;
}

/**
 * For one extracted patch, iterate every candidate symbol, compute optimal
 * fg/bg means (under that symbol's bitmap partition), score the squared
 * color error, and return the lowest-error pick.
 *
 * Tie-break priority (every symbol has a bit-complement that scores the
 * same error with fg/bg swapped — e.g. `▘` and `▟`, `▚` and `▞`, `▀` and
 * `▄`. Without a tiebreaker we'd pick arbitrarily between visually
 * equivalent options):
 *
 *   1. strictly lower err wins
 *   2. on err tie: higher fg luminance wins — picks the partition where
 *      lit-side ≈ brighter pixels, the "natural reading" for photo content
 *      where highlights sit in the foreground
 *   3. on err + fgLum tie: higher litCount wins — settles uniform-color
 *      patches (every symbol ties on err + fgLum because fg=bg=patch
 *      color) toward `█` instead of ` `, which avoids leaking the terminal
 *      background through what should be a solid-color photo region
 */
function pickBestSymbol(
  candidates: readonly SymbolEntry[],
  patchR: Float32Array,
  patchG: Float32Array,
  patchB: Float32Array,
  patchA: Uint8Array
): MatchResult {
  let bestErr = Infinity;
  let bestSym = candidates[0];
  let bestFgR = 0;
  let bestFgG = 0;
  let bestFgB = 0;
  let bestBgR = 0;
  let bestBgG = 0;
  let bestBgB = 0;
  let bestFgLum = -1;
  let bestLitCount = -1;

  for (const sym of candidates) {
    const bitmap = sym.bitmap;

    // Pass 1: accumulate fg / bg sums and counts over opaque dots only.
    let litR = 0;
    let litG = 0;
    let litB = 0;
    let unlitR = 0;
    let unlitG = 0;
    let unlitB = 0;
    let litN = 0;
    let unlitN = 0;
    for (let i = 0; i < 64; i++) {
      if (patchA[i] === 0) continue;
      if (bitmap[i] === 1) {
        litR += patchR[i];
        litG += patchG[i];
        litB += patchB[i];
        litN++;
      } else {
        unlitR += patchR[i];
        unlitG += patchG[i];
        unlitB += patchB[i];
        unlitN++;
      }
    }

    let fgR = litN > 0 ? litR / litN : 0;
    let fgG = litN > 0 ? litG / litN : 0;
    let fgB = litN > 0 ? litB / litN : 0;
    let bgR = unlitN > 0 ? unlitR / unlitN : 0;
    let bgG = unlitN > 0 ? unlitG / unlitN : 0;
    let bgB = unlitN > 0 ? unlitB / unlitN : 0;

    // Degenerate: when one side has no opaque coverage in this patch
    // (e.g. full-block symbol but patch has unlit-side transparency, or
    // space-symbol but patch has no unlit-side opaques), fall back so
    // both colors agree — keeps the emitted cell from carrying garbage.
    if (litN === 0) {
      fgR = bgR;
      fgG = bgG;
      fgB = bgB;
    }
    if (unlitN === 0) {
      bgR = fgR;
      bgG = fgG;
      bgB = fgB;
    }

    // Pass 2: squared error vs the expected (fg or bg) color.
    let err = 0;
    for (let i = 0; i < 64; i++) {
      if (patchA[i] === 0) continue;
      let dr: number;
      let dg: number;
      let db: number;
      if (bitmap[i] === 1) {
        dr = patchR[i] - fgR;
        dg = patchG[i] - fgG;
        db = patchB[i] - fgB;
      } else {
        dr = patchR[i] - bgR;
        dg = patchG[i] - bgG;
        db = patchB[i] - bgB;
      }
      err += dr * dr + dg * dg + db * db;
    }

    const fgLum = 0.299 * fgR + 0.587 * fgG + 0.114 * fgB;
    let take = false;
    if (err < bestErr) {
      take = true;
    } else if (err === bestErr) {
      if (fgLum > bestFgLum) {
        take = true;
      } else if (fgLum === bestFgLum && sym.litCount > bestLitCount) {
        take = true;
      }
    }

    if (take) {
      bestErr = err;
      bestSym = sym;
      bestFgR = fgR;
      bestFgG = fgG;
      bestFgB = fgB;
      bestBgR = bgR;
      bestBgG = bgG;
      bestBgB = bgB;
      bestFgLum = fgLum;
      bestLitCount = sym.litCount;
    }
  }

  return {
    sym: bestSym,
    fgR: bestFgR,
    fgG: bestFgG,
    fgB: bestFgB,
    bgR: bestBgR,
    bgG: bestBgG,
    bgB: bestBgB,
  };
}

function clamp8(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

function roundClamp8(v: number): number {
  const r = Math.round(v);
  return r < 0 ? 0 : r > 255 ? 255 : r;
}
