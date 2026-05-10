import { Pattern, Cell, Size, Point, Theme } from '../types/index.js';
import { PhotoPattern } from './PhotoPattern.js';

/**
 * LayeredPattern composes a {@link PhotoPattern} background with an arbitrary
 * procedural overlay {@link Pattern} (v0.4.0 Phase 3 — "scene composition").
 *
 * Render order is fixed: photo first, then overlay on top. The overlay uses
 * the existing space-character transparency convention
 * (`SpriteManager.ts:138`) — overlays that paint every cell (Plasma, Wave)
 * must opt-in via `transparentBg` to leave the photo visible.
 *
 * The buffer is cleared each frame by `AnimationEngine.update()`, so both
 * layers paint from a clean slate. PhotoPattern caches its decoded + resized
 * source image per terminal size; the heavy work runs only on resize. The
 * per-frame cost is the half-block / braille encode plus the overlay's
 * normal render, which is what the v0.4 perf budget already targets.
 *
 * `name` mirrors the overlay's name so the status bar and patternNames
 * lookup behave identically to the standalone procedural pattern. Lifecycle
 * hooks (preset, reset, mouse, theme, fps, activate/deactivate) delegate to
 * the overlay; the photo gets `onResize` so its cached resize tracks the
 * terminal. The photo's preset is fixed at construction — to change it,
 * cycle to the standalone PhotoPattern entry (still present in the
 * patterns list) and apply a preset there.
 */
export class LayeredPattern implements Pattern {
  /** Stable identifier — main.ts wires `patternNames` / `patternDisplayNames`
   * with `'layered'` so the status bar reads "Photo + <Overlay>". */
  readonly name = 'layered';

  constructor(
    private readonly photo: PhotoPattern,
    private readonly overlay: Pattern
  ) {}

  render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void {
    this.photo.render(buffer, time, size);
    this.overlay.render(buffer, time, size, mousePos);
  }

  reset(): void {
    // PhotoPattern.reset() is intentionally a no-op (preserves the decoded
    // image cache across pattern switches). Only the overlay needs a real
    // reset between activations.
    this.overlay.reset();
  }

  applyPreset(presetId: number): boolean {
    return this.overlay.applyPreset?.(presetId) ?? false;
  }

  onMouseMove(pos: Point): void {
    this.overlay.onMouseMove?.(pos);
  }

  onMouseClick(pos: Point): void {
    this.overlay.onMouseClick?.(pos);
  }

  onActivate(): void {
    this.overlay.onActivate?.();
  }

  onDeactivate(): void {
    this.overlay.onDeactivate?.();
  }

  onThemeChange(theme: Theme): void {
    // Photo is absolute color (themes don't apply); only the overlay rethemes.
    this.overlay.onThemeChange?.(theme);
  }

  onResize(size: Size): void {
    this.photo.onResize?.(size);
    this.overlay.onResize?.(size);
  }

  onFpsChange(fps: number): void {
    this.overlay.onFpsChange?.(fps);
  }

  getMetrics(): Record<string, number> {
    const overlayMetrics = this.overlay.getMetrics?.() ?? {};
    const photoMetrics = this.photo.getMetrics();
    // Prefix photo metrics so they don't collide with overlay keys.
    const photoNamespaced: Record<string, number> = {};
    for (const [k, v] of Object.entries(photoMetrics)) {
      photoNamespaced[`photo_${k}`] = v;
    }
    return { ...overlayMetrics, ...photoNamespaced, layered: 1 };
  }

  /** Test/diagnostic accessors. */
  getPhotoLayer(): PhotoPattern {
    return this.photo;
  }

  getOverlayLayer(): Pattern {
    return this.overlay;
  }
}
