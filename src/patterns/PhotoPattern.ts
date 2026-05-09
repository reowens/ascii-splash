import sharp from 'sharp';
import { Pattern, Cell, Size, Theme, Point } from '../types/index.js';
import { renderHalfBlock, HalfBlockOptions } from '../renderer/HalfBlockRenderer.js';
import { renderBraille, BrailleOptions } from '../renderer/BrailleRenderer.js';
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
  | 'halfblock-bayer';

export type PhotoRenderMode = 'halfblock' | 'braille';
export type PhotoDither = 'none' | 'floyd-steinberg' | 'bayer-8' | 'bayer-16';
export type PhotoEdge = 'off' | 'sobel' | 'dog';

export interface PhotoPatternConfig {
  /** File path or in-memory image bytes (anything sharp can decode). */
  source: string | Buffer | Uint8Array;
  preset?: PhotoPreset;
}

export interface PhotoPresetEntry {
  id: number;
  name: string;
  description: string;
  preset: PhotoPreset;
  mode: PhotoRenderMode;
  /** Renderer-specific options. Half-block uses HalfBlockOptions; braille uses BrailleOptions. */
  halfBlock?: HalfBlockOptions;
  braille?: BrailleOptions;
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
  private currentPresetEntry: PhotoPresetEntry;

  private rawImage: { data: Buffer; width: number; height: number } | null = null;

  private resized: { data: Buffer; width: number; height: number } | null = null;
  private lastResizeRequest: { width: number; height: number } = { width: 0, height: 0 };
  private resizeInFlight = false;
  private loadError: Error | null = null;

  constructor(_theme: Theme, config: PhotoPatternConfig) {
    this.source = config.source;
    this.currentPresetEntry =
      PRESETS.find(p => p.preset === (config.preset ?? 'default')) ?? PRESETS[0];
  }

  /**
   * Decode the source image into raw RGBA bytes. Must be called once before
   * the first render. Throws on decode failure.
   */
  async load(): Promise<void> {
    try {
      const result = await sharp(this.source as Buffer | string)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      this.rawImage = {
        data: result.data,
        width: result.info.width,
        height: result.info.height,
      };
      this.resized = null;
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
   * Coalesces concurrent calls — only the most recent target size wins.
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

    if (this.resized?.width === fit.width && this.resized.height === fit.height) {
      return;
    }

    this.lastResizeRequest = { width: fit.width, height: fit.height };
    if (this.resizeInFlight) return;

    this.resizeInFlight = true;
    try {
      while (true) {
        const req = this.lastResizeRequest;
        const out = await sharp(this.rawImage.data, {
          raw: {
            width: this.rawImage.width,
            height: this.rawImage.height,
            channels: 4,
          },
        })
          .resize(req.width, req.height, { fit: 'fill' })
          .raw()
          .toBuffer({ resolveWithObject: true });

        this.resized = {
          data: out.data,
          width: out.info.width,
          height: out.info.height,
        };

        if (
          this.lastResizeRequest.width === req.width &&
          this.lastResizeRequest.height === req.height
        ) {
          break;
        }
      }
    } finally {
      this.resizeInFlight = false;
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
    if (this.resized?.width !== fit.width || this.resized.height !== fit.height) {
      // Kick off async resize; render whatever is cached (or nothing) this frame.
      void this.prepareForSize(size);
    }

    if (!this.resized) return;

    const work = applyPipeline(
      this.resized.data,
      this.resized.width,
      this.resized.height,
      this.currentPresetEntry
    );

    if (this.currentPresetEntry.mode === 'braille') {
      renderBraille(
        buffer,
        work,
        this.resized.width,
        this.resized.height,
        this.currentPresetEntry.braille ?? {}
      );
    } else {
      renderHalfBlock(
        buffer,
        work,
        this.resized.width,
        this.resized.height,
        this.currentPresetEntry.halfBlock ?? {}
      );
    }
  }

  onResize(size: Size): void {
    if (this.rawImage) {
      void this.prepareForSize(size);
    }
  }

  reset(): void {
    // Intentionally a no-op: keep the decoded image and resized cache.
    // Re-decoding is expensive and reset() can fire on every pattern switch.
  }

  applyPreset(presetId: number): boolean {
    const preset = PRESETS.find(p => p.id === presetId);
    if (!preset) return false;
    const modeChanged = preset.mode !== this.currentPresetEntry.mode;
    this.currentPresetEntry = preset;
    // Mode change implies a different target canvas size; invalidate cache so
    // render() kicks off the appropriate resize on its next frame.
    if (modeChanged) {
      this.resized = null;
    }
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
      preset: this.currentPresetEntry.id,
      mode: this.currentPresetEntry.mode === 'braille' ? 1 : 0,
      hasError: this.loadError ? 1 : 0,
    };
  }
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
