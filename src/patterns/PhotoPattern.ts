import sharp from 'sharp';
import { Pattern, Cell, Size, Theme, Point } from '../types/index.js';
import { renderHalfBlock, HalfBlockOptions } from '../renderer/HalfBlockRenderer.js';
import { renderBraille, BrailleOptions } from '../renderer/BrailleRenderer.js';
import { renderSymbol, SymbolOptions } from '../renderer/SymbolRenderer.js';
import { TAG_ALL, TAG_ASCII, TAG_BLOCK, TAG_QUADRANT, TAG_SHADE } from '../renderer/symbols.js';
import { floydSteinberg, bayerOrdered, BAYER_8, BAYER_16 } from '../utils/dither.js';
import {
  rgbaToLuminance,
  sobelMagnitude,
  differenceOfGaussians,
  maskToRgba,
} from '../utils/edges.js';

export type PhotoPreset =
  | 'default'
  | 'high-contrast'
  | 'inverted'
  | 'grayscale'
  | 'bg-tinted'
  | 'edge-only'
  // Phase 2 additions
  | 'edge-dog'
  | 'braille'
  | 'braille-inverted'
  | 'braille-dithered'
  | 'braille-edges'
  | 'halfblock-bayer'
  // Phase 4 additions
  | 'symbol'
  | 'symbol-ascii'
  | 'symbol-block'
  | 'symbol-high-contrast'
  | 'symbol-mono'
  | 'symbol-ascii-mono';

export type PhotoRenderMode = 'halfblock' | 'braille' | 'symbol';
export type PhotoDither = 'none' | 'floyd-steinberg' | 'bayer-8' | 'bayer-16';
export type PhotoEdge = 'off' | 'sobel' | 'dog';

export interface PhotoPatternConfig {
  /** File path or in-memory image bytes (anything sharp can decode). */
  source: string | Buffer | Uint8Array;
  preset?: PhotoPreset;
  /** Injectable image backend for failure/race tests. Defaults to sharp. */
  imageBackend?: PhotoImageBackend;
}

export interface PhotoImageData {
  data: Buffer;
  width: number;
  height: number;
}

export interface PhotoImageBackend {
  decode(source: string | Buffer | Uint8Array): Promise<PhotoImageData>;
  resize(source: PhotoImageData, width: number, height: number): Promise<PhotoImageData>;
}

const sharpImageBackend: PhotoImageBackend = {
  async decode(source) {
    const result = await sharp(source as Buffer | string)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return { data: result.data, width: result.info.width, height: result.info.height };
  },
  async resize(source, width, height) {
    const result = await sharp(source.data, {
      raw: { width: source.width, height: source.height, channels: 4 },
    })
      .resize(width, height, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });
    return { data: result.data, width: result.info.width, height: result.info.height };
  },
};

export interface PhotoPresetEntry {
  id: number;
  name: string;
  description: string;
  preset: PhotoPreset;
  mode: PhotoRenderMode;
  /** Renderer-specific options. Half-block uses HalfBlockOptions; braille uses BrailleOptions; symbol uses SymbolOptions. */
  halfBlock?: HalfBlockOptions;
  braille?: BrailleOptions;
  symbol?: SymbolOptions;
  dither?: PhotoDither;
  edge?: PhotoEdge;
  /** Edge magnitude threshold (0–255). Pixels at-or-above are emitted as white, below as black. */
  edgeThreshold?: number;
  /** Floyd-Steinberg / Bayer quantization levels per channel. Default 2 (1-bit). */
  ditherLevels?: number;
}

const PRESETS: PhotoPresetEntry[] = [
  {
    id: 1,
    name: 'Default',
    description: 'Truecolor half-block rendering at 2× vertical resolution',
    preset: 'default',
    mode: 'halfblock',
    halfBlock: {},
  },
  {
    id: 2,
    name: 'High Contrast',
    description: 'Boosted contrast around mid-gray for punchier output',
    preset: 'high-contrast',
    mode: 'halfblock',
    halfBlock: { contrast: 1.6 },
  },
  {
    id: 3,
    name: 'Inverted',
    description: 'Negative / inverted colors',
    preset: 'inverted',
    mode: 'halfblock',
    halfBlock: { invert: true },
  },
  {
    id: 4,
    name: 'Grayscale',
    description: 'Luminance-only output (BT.601 weights)',
    preset: 'grayscale',
    mode: 'halfblock',
    halfBlock: { grayscale: true },
  },
  {
    id: 5,
    name: 'Background Tinted',
    description: 'Solid-cell single-color aesthetic (loses 2× vertical resolution)',
    preset: 'bg-tinted',
    mode: 'halfblock',
    halfBlock: { bgTint: true },
  },
  {
    id: 6,
    name: 'Edge-Only (Sobel)',
    description: 'Sobel edge magnitude — bright lines on a black field',
    preset: 'edge-only',
    mode: 'halfblock',
    halfBlock: {},
    edge: 'sobel',
    edgeThreshold: 64,
  },
  // ────────── Phase 2 additions ──────────
  {
    id: 7,
    name: 'Edge-Only (DoG)',
    description: 'Difference-of-Gaussians edges — smoother and broader than Sobel',
    preset: 'edge-dog',
    mode: 'halfblock',
    halfBlock: {},
    edge: 'dog',
    edgeThreshold: 16,
  },
  {
    id: 8,
    name: 'Braille',
    description: 'Braille mode at 8× resolution — color from mean of lit dots',
    preset: 'braille',
    mode: 'braille',
    braille: { threshold: 128 },
  },
  {
    id: 9,
    name: 'Braille Inverted',
    description: 'Braille with inverted luminance test (dark regions become lit)',
    preset: 'braille-inverted',
    mode: 'braille',
    braille: { threshold: 128, invert: true },
  },
  {
    id: 10,
    name: 'Braille Dithered',
    description: 'Braille fed by 1-bit Floyd-Steinberg — preserves shading detail',
    preset: 'braille-dithered',
    mode: 'braille',
    braille: { preBinarized: true },
    dither: 'floyd-steinberg',
    ditherLevels: 2,
  },
  {
    id: 11,
    name: 'Braille Edges',
    description: 'Sobel edges rendered as braille line art',
    preset: 'braille-edges',
    mode: 'braille',
    braille: { preBinarized: true },
    edge: 'sobel',
    edgeThreshold: 48,
  },
  {
    id: 12,
    name: 'Halfblock Bayer',
    description: 'Half-block with 8×8 Bayer ordered dither — retro grid texture',
    preset: 'halfblock-bayer',
    mode: 'halfblock',
    halfBlock: {},
    dither: 'bayer-8',
    ditherLevels: 8,
  },
  // ────────── Phase 4 additions ──────────
  {
    id: 13,
    name: 'Symbol',
    description: 'Chafa-style 8×8 symbol matcher — ASCII + blocks + quadrants + shades',
    preset: 'symbol',
    mode: 'symbol',
    symbol: { tagMask: TAG_ALL },
  },
  {
    id: 14,
    name: 'Symbol ASCII',
    description: 'Symbol matcher restricted to ASCII — text-art aesthetic',
    preset: 'symbol-ascii',
    mode: 'symbol',
    symbol: { tagMask: TAG_ASCII },
  },
  {
    id: 15,
    name: 'Symbol Block',
    description: 'Symbol matcher restricted to blocks / quadrants / shades — no letters',
    preset: 'symbol-block',
    mode: 'symbol',
    symbol: { tagMask: TAG_BLOCK | TAG_QUADRANT | TAG_SHADE },
  },
  {
    id: 16,
    name: 'Symbol High-Contrast',
    description: 'Symbol matcher with contrast boost — punchier output',
    preset: 'symbol-high-contrast',
    mode: 'symbol',
    symbol: { tagMask: TAG_ALL, contrast: 1.6 },
  },
  {
    id: 17,
    name: 'Symbol Mono',
    description: 'Symbol matcher with grayscale luminance — single-tone aesthetic',
    preset: 'symbol-mono',
    mode: 'symbol',
    symbol: { tagMask: TAG_ALL, grayscale: true },
  },
  {
    id: 18,
    name: 'Symbol ASCII Mono',
    description: 'Symbol matcher, ASCII only, grayscale — pure text-art monochrome',
    preset: 'symbol-ascii-mono',
    mode: 'symbol',
    symbol: { tagMask: TAG_ASCII, grayscale: true },
  },
];

/**
 * PhotoPattern renders an arbitrary image into the existing Cell[][] buffer
 * via a preprocessor pipeline (edge detection → dither → render).
 *
 * Lifecycle:
 *   1. constructor — stores config; no I/O.
 *   2. await pattern.load() — decodes the source via sharp into raw RGBA.
 *      Must be called once before the first render() (typically by the
 *      caller in main.ts before starting the engine).
 *   3. render() runs synchronously each frame. If the terminal has resized
 *      OR the active preset's mode requires a different resolution, it kicks
 *      off an async re-resize and renders whatever is currently cached
 *      (blank on first frame after a resize until the new buffer lands —
 *      typically <16ms for sharp).
 *
 * Sharp is async-only, so all image work happens off the render path.
 */
export class PhotoPattern implements Pattern {
  name = 'photo';

  private readonly source: string | Buffer | Uint8Array;
  private readonly imageBackend: PhotoImageBackend;
  private currentPresetEntry: PhotoPresetEntry;

  private rawImage: PhotoImageData | null = null;
  private resized: PhotoImageData | null = null;
  private renderedCache: {
    cells: Cell[][];
    width: number;
    height: number;
    resizedGeneration: number;
    presetId: number;
  } | null = null;
  private preparedSize: Size | null = null;
  private sourceGeneration = 0;
  private resizedGeneration = 0;
  private latestResizeRequest = 0;
  private pendingResizes = 0;
  private lastScheduledKey: string | null = null;
  private cacheBuilds = 0;
  private loadError: Error | null = null;

  constructor(_theme: Theme, config: PhotoPatternConfig) {
    this.source = config.source;
    this.imageBackend = config.imageBackend ?? sharpImageBackend;
    this.currentPresetEntry =
      PRESETS.find(p => p.preset === (config.preset ?? 'default')) ?? PRESETS[0];
  }

  /**
   * Decode the source image into raw RGBA bytes. Must be called once before
   * the first render. Throws on decode failure.
   */
  async load(): Promise<void> {
    try {
      const result = await this.imageBackend.decode(this.source);
      this.latestResizeRequest++;
      this.sourceGeneration++;
      this.rawImage = result;
      this.resized = null;
      this.renderedCache = null;
      this.preparedSize = null;
      this.lastScheduledKey = null;
      this.loadError = null;
    } catch (err) {
      this.loadError = err instanceof Error ? err : new Error(String(err));
      throw this.loadError;
    }
  }

  /**
   * Resize the cached raw image to fit inside the source-pixel canvas implied
   * by the active mode (halfblock = `width × height·2`; braille =
   * `width·2 × height·4`), preserving the source aspect ratio.
   *
   * Concurrent calls are generation-guarded — only the newest request may
   * replace the last successful resized image.
   */
  async prepareForSize(size: Size): Promise<void> {
    if (!this.rawImage) {
      throw new Error('PhotoPattern.load() must be called before prepareForSize()');
    }
    if (size.width <= 0 || size.height <= 0) return;

    const canvas = canvasForMode(this.currentPresetEntry.mode, size);
    const fit = fitWithAspect(
      this.rawImage.width,
      this.rawImage.height,
      canvas.canvasW,
      canvas.canvasH
    );
    if (fit.width <= 0 || fit.height <= 0) return;

    const requestId = ++this.latestResizeRequest;
    const sourceGeneration = this.sourceGeneration;
    const requestedSize = { ...size };
    this.lastScheduledKey = this.resizeKey(size);

    if (this.resized?.width === fit.width && this.resized.height === fit.height) {
      if (
        this.preparedSize?.width !== requestedSize.width ||
        this.preparedSize.height !== requestedSize.height
      ) {
        this.renderedCache = null;
      }
      this.preparedSize = requestedSize;
      this.loadError = null;
      return;
    }

    this.pendingResizes++;
    try {
      const out = await this.imageBackend.resize(this.rawImage, fit.width, fit.height);
      if (requestId !== this.latestResizeRequest || sourceGeneration !== this.sourceGeneration) {
        return;
      }
      this.resized = out;
      this.resizedGeneration++;
      this.renderedCache = null;
      this.preparedSize = requestedSize;
      this.loadError = null;
    } catch (err) {
      if (requestId === this.latestResizeRequest && sourceGeneration === this.sourceGeneration) {
        this.loadError = err instanceof Error ? err : new Error(String(err));
      }
      throw err;
    } finally {
      this.pendingResizes--;
    }
  }

  render(buffer: Cell[][], _time: number, size: Size, _mousePos?: Point): void {
    if (!this.rawImage) return;

    const canvas = canvasForMode(this.currentPresetEntry.mode, size);
    const fit = fitWithAspect(
      this.rawImage.width,
      this.rawImage.height,
      canvas.canvasW,
      canvas.canvasH
    );
    if (
      this.resized?.width !== fit.width ||
      this.resized.height !== fit.height ||
      this.preparedSize?.width !== size.width ||
      this.preparedSize.height !== size.height
    ) {
      this.schedulePrepareForSize(size);
    }

    if (
      this.renderedCache &&
      (this.renderedCache.resizedGeneration !== this.resizedGeneration ||
        this.renderedCache.presetId !== this.currentPresetEntry.id)
    ) {
      this.renderedCache = null;
    }
    if (!this.renderedCache && this.resized) this.buildRenderedCache(size);
    this.blitRenderedCache(buffer);
  }

  onResize(size: Size): void {
    if (this.rawImage) {
      this.schedulePrepareForSize(size);
    }
  }

  private resizeKey(size: Size): string {
    return `${String(this.sourceGeneration)}:${String(this.currentPresetEntry.id)}:${String(size.width)}x${String(size.height)}`;
  }

  private schedulePrepareForSize(size: Size): void {
    const key = this.resizeKey(size);
    if (key === this.lastScheduledKey) return;
    this.lastScheduledKey = key;
    void this.prepareForSize(size).catch(() => {
      // prepareForSize records the newest failure. Keeping this terminal catch
      // prevents background resize work from becoming an unhandled rejection.
    });
  }

  private buildRenderedCache(size: Size): void {
    if (!this.resized || size.width <= 0 || size.height <= 0) return;
    const cells: Cell[][] = Array.from({ length: size.height }, () =>
      Array.from({ length: size.width }, () => ({ char: ' ' }))
    );
    const work = applyPipeline(
      this.resized.data,
      this.resized.width,
      this.resized.height,
      this.currentPresetEntry
    );

    if (this.currentPresetEntry.mode === 'braille') {
      renderBraille(
        cells,
        work,
        this.resized.width,
        this.resized.height,
        this.currentPresetEntry.braille ?? {}
      );
    } else if (this.currentPresetEntry.mode === 'symbol') {
      renderSymbol(
        cells,
        work,
        this.resized.width,
        this.resized.height,
        this.currentPresetEntry.symbol ?? {}
      );
    } else {
      renderHalfBlock(
        cells,
        work,
        this.resized.width,
        this.resized.height,
        this.currentPresetEntry.halfBlock ?? {}
      );
    }

    for (const row of cells) {
      for (const cell of row) {
        if (cell.color) Object.freeze(cell.color);
        if (cell.bg) Object.freeze(cell.bg);
        Object.freeze(cell);
      }
      Object.freeze(row);
    }
    this.renderedCache = {
      cells,
      width: size.width,
      height: size.height,
      resizedGeneration: this.resizedGeneration,
      presetId: this.currentPresetEntry.id,
    };
    this.cacheBuilds++;
  }

  private blitRenderedCache(buffer: Cell[][]): void {
    if (!this.renderedCache) return;
    const height = Math.min(buffer.length, this.renderedCache.height);
    for (let y = 0; y < height; y++) {
      const width = Math.min(buffer[y]?.length ?? 0, this.renderedCache.width);
      for (let x = 0; x < width; x++) buffer[y][x] = this.renderedCache.cells[y][x];
    }
  }

  reset(): void {
    // Intentionally a no-op: keep the decoded image and resized cache.
    // Re-decoding is expensive and reset() can fire on every pattern switch.
  }

  applyPreset(presetId: number): boolean {
    const preset = PRESETS.find(p => p.id === presetId);
    if (!preset) return false;
    this.currentPresetEntry = preset;
    this.renderedCache = null;
    this.lastScheduledKey = null;
    return true;
  }

  /** Currently-applied preset (for UI / metrics). */
  getCurrentPreset(): PhotoPresetEntry {
    return this.currentPresetEntry;
  }

  static getPresets(): PhotoPresetEntry[] {
    return PRESETS.map(p => clonePreset(p));
  }

  static getPreset(id: number): PhotoPresetEntry | undefined {
    const found = PRESETS.find(p => p.id === id);
    return found ? clonePreset(found) : undefined;
  }

  getMetrics(): Record<string, number> {
    return {
      sourceWidth: this.rawImage?.width ?? 0,
      sourceHeight: this.rawImage?.height ?? 0,
      cachedWidth: this.resized?.width ?? 0,
      cachedHeight: this.resized?.height ?? 0,
      cachedCells: this.renderedCache ? this.renderedCache.width * this.renderedCache.height : 0,
      cacheBuilds: this.cacheBuilds,
      resizePending: this.pendingResizes,
      preset: this.currentPresetEntry.id,
      mode: modeMetric(this.currentPresetEntry.mode),
      hasError: this.loadError ? 1 : 0,
    };
  }
}

function modeMetric(mode: PhotoRenderMode): number {
  if (mode === 'braille') return 1;
  if (mode === 'symbol') return 2;
  return 0;
}

/**
 * Apply the optional edge / dither preprocessors to a copy of the resized
 * source pixels. Returns a new Uint8Array (RGBA, same dimensions).
 *
 * Always copies to keep the cached `resized.data` clean across preset changes.
 */
function applyPipeline(
  src: Buffer,
  width: number,
  height: number,
  preset: PhotoPresetEntry
): Uint8Array {
  // Copy resized pixels into a Uint8Array so dither / edge ops can mutate freely.
  let work: Uint8Array = Uint8Array.from(src);

  // Edge stage replaces the working buffer with a thresholded grayscale mask.
  if (preset.edge && preset.edge !== 'off') {
    const lum = rgbaToLuminance(work, width, height);
    const mask =
      preset.edge === 'dog'
        ? differenceOfGaussians(lum, width, height)
        : sobelMagnitude(lum, width, height);
    const t = preset.edgeThreshold ?? 64;
    for (let i = 0; i < mask.length; i++) {
      mask[i] = mask[i] >= t ? 255 : 0;
    }
    work = maskToRgba(mask, width, height);
  }

  // Dither stage runs in-place on the working buffer.
  if (preset.dither && preset.dither !== 'none') {
    const levels = preset.ditherLevels ?? 2;
    if (preset.dither === 'floyd-steinberg') {
      floydSteinberg(work, width, height, levels);
    } else if (preset.dither === 'bayer-8') {
      bayerOrdered(work, width, height, BAYER_8, 8, 64, levels);
    } else if (preset.dither === 'bayer-16') {
      bayerOrdered(work, width, height, BAYER_16, 16, 64, levels);
    }
  }

  return work;
}

function canvasForMode(mode: PhotoRenderMode, size: Size): { canvasW: number; canvasH: number } {
  if (mode === 'symbol') {
    return { canvasW: size.width * 8, canvasH: size.height * 8 };
  }
  if (mode === 'braille') {
    return { canvasW: size.width * 2, canvasH: size.height * 4 };
  }
  return { canvasW: size.width, canvasH: size.height * 2 };
}

function clonePreset(p: PhotoPresetEntry): PhotoPresetEntry {
  return {
    ...p,
    halfBlock: p.halfBlock ? { ...p.halfBlock } : undefined,
    braille: p.braille ? { ...p.braille } : undefined,
    symbol: p.symbol ? { ...p.symbol } : undefined,
  };
}

/**
 * Largest box of (srcW, srcH) aspect that fits inside the source-pixel canvas
 * (canvasW × canvasH). For half-block rendering, callers pass `canvasH =
 * 2 * terminalCellRows` since each cell encodes two stacked source pixels;
 * for braille, `canvasW = 2 * terminalCellCols, canvasH = 4 * terminalCellRows`.
 *
 * Mirrors viuer's `fit_dimensions` (printer/mod.rs:194-216): only scales
 * down. Returns floor-rounded integer dimensions, clamped to >= 1.
 *
 * Exported for tests; not a public API.
 */
export function fitWithAspect(
  srcW: number,
  srcH: number,
  canvasW: number,
  canvasH: number
): { width: number; height: number } {
  if (srcW <= 0 || srcH <= 0 || canvasW <= 0 || canvasH <= 0) {
    return { width: 0, height: 0 };
  }
  if (srcW <= canvasW && srcH <= canvasH) {
    return { width: srcW, height: srcH };
  }
  const wRatio = canvasW / srcW;
  const hRatio = canvasH / srcH;
  const scale = Math.min(wRatio, hRatio);
  return {
    width: Math.max(1, Math.floor(srcW * scale)),
    height: Math.max(1, Math.floor(srcH * scale)),
  };
}
