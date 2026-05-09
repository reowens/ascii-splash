import sharp from 'sharp';
import { Pattern, Cell, Size, Theme, Point } from '../types/index.js';
import { renderHalfBlock, HalfBlockOptions } from '../renderer/HalfBlockRenderer.js';

export type PhotoPreset =
  | 'default'
  | 'high-contrast'
  | 'inverted'
  | 'grayscale'
  | 'bg-tinted'
  | 'edge-only';

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
  options: HalfBlockOptions;
}

const PRESETS: PhotoPresetEntry[] = [
  {
    id: 1,
    name: 'Default',
    description: 'Truecolor half-block rendering at 2× vertical resolution',
    preset: 'default',
    options: {},
  },
  {
    id: 2,
    name: 'High Contrast',
    description: 'Boosted contrast around mid-gray for punchier output',
    preset: 'high-contrast',
    options: { contrast: 1.6 },
  },
  {
    id: 3,
    name: 'Inverted',
    description: 'Negative / inverted colors',
    preset: 'inverted',
    options: { invert: true },
  },
  {
    id: 4,
    name: 'Grayscale',
    description: 'Luminance-only output (BT.601 weights)',
    preset: 'grayscale',
    options: { grayscale: true },
  },
  {
    id: 5,
    name: 'Background Tinted',
    description: 'Solid-cell single-color aesthetic (loses 2× vertical resolution)',
    preset: 'bg-tinted',
    options: { bgTint: true },
  },
  {
    id: 6,
    name: 'Edge-Only (stub)',
    description: 'Hard-threshold preview; full Sobel/DoG edge detection arrives in v0.4 Phase 2',
    preset: 'edge-only',
    options: { grayscale: true, contrast: 2.0, threshold: 128 },
  },
];

/**
 * PhotoPattern renders an arbitrary image into the existing Cell[][] buffer
 * at 2× vertical resolution using upper/lower half-block characters
 * (Phase 1 of the v0.4.0 roadmap).
 *
 * Lifecycle:
 *   1. constructor — stores config; no I/O.
 *   2. await pattern.load() — decodes the source via sharp into raw RGBA.
 *      Must be called once before the first render() (typically by the
 *      caller in main.ts before starting the engine).
 *   3. render() runs synchronously each frame. If the terminal has resized,
 *      it kicks off an async re-resize and renders whatever is currently
 *      cached (blank on first frame after a resize until the new buffer
 *      lands — typically <16ms for sharp).
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
   * Resize the cached raw image to fit inside (size.width × size.height*2)
   * source pixels while preserving the source aspect ratio (mirrors viuer's
   * `fit_dimensions`, `mod.rs:194-216`). The result may be smaller than
   * the canvas; the unfilled region renders as default-color spaces because
   * `AnimationEngine.update()` clears the buffer every frame.
   *
   * Coalesces concurrent calls — only the most recent target size wins.
   */
  async prepareForSize(size: Size): Promise<void> {
    if (!this.rawImage) {
      throw new Error('PhotoPattern.load() must be called before prepareForSize()');
    }
    if (size.width <= 0 || size.height <= 0) return;

    const fit = fitWithAspect(
      this.rawImage.width,
      this.rawImage.height,
      size.width,
      size.height * 2
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

    const fit = fitWithAspect(
      this.rawImage.width,
      this.rawImage.height,
      size.width,
      size.height * 2
    );
    if (this.resized?.width !== fit.width || this.resized.height !== fit.height) {
      // Kick off async resize; render whatever is cached (or nothing) this frame.
      void this.prepareForSize(size);
    }

    if (!this.resized) return;

    renderHalfBlock(
      buffer,
      this.resized.data,
      this.resized.width,
      this.resized.height,
      this.currentPresetEntry.options
    );
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
    this.currentPresetEntry = preset;
    return true;
  }

  /** Currently-applied preset (for UI / metrics). */
  getCurrentPreset(): PhotoPresetEntry {
    return this.currentPresetEntry;
  }

  static getPresets(): PhotoPresetEntry[] {
    return PRESETS.map(p => ({ ...p, options: { ...p.options } }));
  }

  static getPreset(id: number): PhotoPresetEntry | undefined {
    const found = PRESETS.find(p => p.id === id);
    return found ? { ...found, options: { ...found.options } } : undefined;
  }

  getMetrics(): Record<string, number> {
    return {
      sourceWidth: this.rawImage?.width ?? 0,
      sourceHeight: this.rawImage?.height ?? 0,
      cachedWidth: this.resized?.width ?? 0,
      cachedHeight: this.resized?.height ?? 0,
      preset: this.currentPresetEntry.id,
      hasError: this.loadError ? 1 : 0,
    };
  }
}

/**
 * Largest box of (srcW, srcH) aspect that fits inside the source-pixel canvas
 * (canvasW × canvasH). For half-block rendering, callers pass `canvasH =
 * 2 * terminalCellRows` since each cell encodes two stacked source pixels.
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
