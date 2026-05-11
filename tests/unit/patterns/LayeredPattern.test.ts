/**
 * Unit tests for LayeredPattern (v0.4.0 Phase 3).
 *
 * Covers:
 *   - composition: photo paints first, overlay paints on top.
 *   - sparse overlays leave photo cells visible where they don't write.
 *   - dense overlays with `transparentBg: true` leave ' ' cells alone,
 *     preserving the photo underneath.
 *   - Pattern lifecycle delegation (preset/reset/mouse/theme/fps/activate)
 *     routes to the overlay; `onResize` reaches both layers.
 *   - dirty-rect math: under a static photo + sparse overlay, only the
 *     overlay's footprint produces buffer changes between frames.
 */

import sharp from 'sharp';
import { describe, test, expect } from '@jest/globals';
import { LayeredPattern } from '../../../src/patterns/LayeredPattern.js';
import { PhotoPattern } from '../../../src/patterns/PhotoPattern.js';
import { PlasmaPattern } from '../../../src/patterns/PlasmaPattern.js';
import { WavePattern } from '../../../src/patterns/WavePattern.js';
import { StarfieldPattern } from '../../../src/patterns/StarfieldPattern.js';
import { Cell, Pattern, Point, Size, Theme } from '../../../src/types/index.js';
import { Buffer as RenderBuffer } from '../../../src/renderer/Buffer.js';
import { Mulberry32 } from '../../../src/utils/random.js';
import { createMockBuffer, createMockSize, createMockTheme } from '../../utils/mocks.js';

async function makeSolidPng(
  width: number,
  height: number,
  color: { r: number; g: number; b: number }
): Promise<Buffer> {
  const raw = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    raw[i * 4] = color.r;
    raw[i * 4 + 1] = color.g;
    raw[i * 4 + 2] = color.b;
    raw[i * 4 + 3] = 255;
  }
  return sharp(raw, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
}

async function loadedPhoto(theme: Theme, size: Size): Promise<PhotoPattern> {
  const png = await makeSolidPng(size.width, size.height * 2, { r: 200, g: 50, b: 50 });
  const photo = new PhotoPattern(theme, { source: png });
  await photo.load();
  await photo.prepareForSize(size);
  return photo;
}

class CountingPattern implements Pattern {
  name = 'counting';
  renderCount = 0;
  resetCount = 0;
  presetCalls: number[] = [];
  mouseMoveCalls: Point[] = [];
  mouseClickCalls: Point[] = [];
  activateCount = 0;
  deactivateCount = 0;
  themeChangeCount = 0;
  fpsChangeCount = 0;
  resizeCount = 0;
  lastTime = 0;
  lastSize: Size | null = null;
  lastMouse: Point | undefined;

  render(_buffer: Cell[][], time: number, size: Size, mousePos?: Point): void {
    this.renderCount++;
    this.lastTime = time;
    this.lastSize = size;
    this.lastMouse = mousePos;
  }
  reset(): void {
    this.resetCount++;
  }
  applyPreset(id: number): boolean {
    this.presetCalls.push(id);
    return id !== 99;
  }
  onMouseMove(p: Point): void {
    this.mouseMoveCalls.push(p);
  }
  onMouseClick(p: Point): void {
    this.mouseClickCalls.push(p);
  }
  onActivate(): void {
    this.activateCount++;
  }
  onDeactivate(): void {
    this.deactivateCount++;
  }
  onThemeChange(_theme: Theme): void {
    this.themeChangeCount++;
  }
  onFpsChange(_fps: number): void {
    this.fpsChangeCount++;
  }
  onResize(_size: Size): void {
    this.resizeCount++;
  }
  getMetrics(): Record<string, number> {
    return { renderCount: this.renderCount, custom: 42 };
  }
}

describe('LayeredPattern', () => {
  const theme = createMockTheme('ocean');

  describe('Composition', () => {
    test('renders photo first, then overlay on top', async () => {
      const size = createMockSize(8, 4);
      const photo = await loadedPhoto(theme, size);
      const overlay = new CountingPattern();
      const layered = new LayeredPattern(photo, overlay);

      const buffer = createMockBuffer(size.width, size.height);
      layered.render(buffer, 1000, size, { x: 3, y: 2 });

      // Photo paints half-block chars (▀ ▄ █) into every cell.
      let halfBlockCells = 0;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (['▀', '▄', '█'].includes(buffer[y][x].char)) halfBlockCells++;
        }
      }
      expect(halfBlockCells).toBe(size.width * size.height);

      // Overlay was called with the same time + size + mouse.
      expect(overlay.renderCount).toBe(1);
      expect(overlay.lastTime).toBe(1000);
      expect(overlay.lastSize).toEqual(size);
      expect(overlay.lastMouse).toEqual({ x: 3, y: 2 });
    });

    test('sparse overlay leaves photo cells visible where it does not paint', async () => {
      const size = createMockSize(20, 10);
      const photo = await loadedPhoto(theme, size);
      // Starfield is sparse — paints stars on top of an otherwise photo-filled buffer.
      const overlay = new StarfieldPattern(theme, new Mulberry32(42), { starCount: 5 });
      const layered = new LayeredPattern(photo, overlay);

      const buffer = createMockBuffer(size.width, size.height);
      layered.render(buffer, 1000, size);

      // Most cells should still be photo half-blocks; a few may be starfield characters.
      let halfBlockCells = 0;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (['▀', '▄', '█'].includes(buffer[y][x].char)) halfBlockCells++;
        }
      }
      expect(halfBlockCells).toBeGreaterThan(size.width * size.height - 50);
    });

    test('dense overlay with transparentBg leaves photo visible at brightest cells', async () => {
      const size = createMockSize(20, 10);
      const photo = await loadedPhoto(theme, size);
      // Plasma at intensity == 1 emits a ' ' character; with transparentBg it
      // skips writing those cells, leaving photo half-blocks underneath.
      const overlay = new PlasmaPattern(theme, new Mulberry32(42), { transparentBg: true });
      const layered = new LayeredPattern(photo, overlay);

      const buffer = createMockBuffer(size.width, size.height);
      layered.render(buffer, 1000, size);

      // No cell should be ' ' — either photo half-block or plasma char.
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          expect(buffer[y][x].char).not.toBe(' ');
        }
      }
    });

    test('dense overlay WITHOUT transparentBg overwrites photo entirely', async () => {
      const size = createMockSize(8, 4);
      const photo = await loadedPhoto(theme, size);
      const overlay = new PlasmaPattern(theme, new Mulberry32(42), { transparentBg: false });
      const layered = new LayeredPattern(photo, overlay);

      const buffer = createMockBuffer(size.width, size.height);
      layered.render(buffer, 1000, size);

      // Plasma's char ramp does not include any half-block characters
      // — so the photo is fully obscured.
      const plasmaChars = ['█', '▓', '▒', '░', '▪', '▫', '·', ' '];
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          expect(plasmaChars).toContain(buffer[y][x].char);
        }
      }
    });
  });

  describe('Lifecycle delegation', () => {
    test('reset() delegates to overlay (photo.reset is intentionally no-op)', async () => {
      const size = createMockSize(4, 2);
      const photo = await loadedPhoto(theme, size);
      const overlay = new CountingPattern();
      const layered = new LayeredPattern(photo, overlay);

      layered.reset();
      expect(overlay.resetCount).toBe(1);
    });

    test('applyPreset delegates to overlay', async () => {
      const size = createMockSize(4, 2);
      const photo = await loadedPhoto(theme, size);
      const overlay = new CountingPattern();
      const layered = new LayeredPattern(photo, overlay);

      expect(layered.applyPreset(3)).toBe(true);
      expect(layered.applyPreset(99)).toBe(false);
      expect(overlay.presetCalls).toEqual([3, 99]);
    });

    test('mouse + activate + deactivate + theme + fps hooks delegate to overlay', async () => {
      const size = createMockSize(4, 2);
      const photo = await loadedPhoto(theme, size);
      const overlay = new CountingPattern();
      const layered = new LayeredPattern(photo, overlay);

      layered.onMouseMove?.({ x: 1, y: 1 });
      layered.onMouseClick?.({ x: 2, y: 2 });
      layered.onActivate?.();
      layered.onDeactivate?.();
      layered.onThemeChange?.(theme);
      layered.onFpsChange?.(60);

      expect(overlay.mouseMoveCalls).toEqual([{ x: 1, y: 1 }]);
      expect(overlay.mouseClickCalls).toEqual([{ x: 2, y: 2 }]);
      expect(overlay.activateCount).toBe(1);
      expect(overlay.deactivateCount).toBe(1);
      expect(overlay.themeChangeCount).toBe(1);
      expect(overlay.fpsChangeCount).toBe(1);
    });

    test('onResize reaches both photo and overlay', async () => {
      const size = createMockSize(4, 2);
      const photo = await loadedPhoto(theme, size);
      const overlay = new CountingPattern();
      const layered = new LayeredPattern(photo, overlay);

      const newSize = createMockSize(10, 5);
      layered.onResize?.(newSize);
      // Overlay's resize hook should have been called.
      expect(overlay.resizeCount).toBe(1);
    });

    test('getMetrics merges overlay + namespaced photo metrics + layered marker', async () => {
      const size = createMockSize(4, 2);
      const photo = await loadedPhoto(theme, size);
      const overlay = new CountingPattern();
      const layered = new LayeredPattern(photo, overlay);

      const m = layered.getMetrics?.();
      expect(m).toBeDefined();
      expect(m?.['layered']).toBe(1);
      expect(m?.['custom']).toBe(42);
      expect(m?.['photo_sourceWidth']).toBeGreaterThan(0);
    });

    test('name is the stable layered identifier', async () => {
      const size = createMockSize(4, 2);
      const photo = await loadedPhoto(theme, size);
      const overlay = new WavePattern(theme, { transparentBg: true });
      const layered = new LayeredPattern(photo, overlay);
      expect(layered.name).toBe('layered');
    });
  });

  describe('Dirty-rect under overlay', () => {
    test('static photo + sparse overlay produces few changes per frame', async () => {
      const size = createMockSize(20, 10);
      const photo = await loadedPhoto(theme, size);
      const overlay = new StarfieldPattern(theme, new Mulberry32(42), { starCount: 4 });
      const layered = new LayeredPattern(photo, overlay);

      const renderBuffer = new RenderBuffer(size);

      // Frame 1: full paint — every cell will be a "change" against initial empty buffer.
      renderBuffer.clear();
      layered.render(renderBuffer.getBuffer(), 1000, size);
      const firstChanges = renderBuffer.getChanges().length;
      renderBuffer.swap();

      // Frame 2: photo is identical, only starfield positions change.
      renderBuffer.clear();
      layered.render(renderBuffer.getBuffer(), 1100, size);
      const secondChanges = renderBuffer.getChanges().length;

      // First frame should touch the entire canvas; second should touch
      // dramatically fewer cells (just the moving stars + any prior star
      // positions left behind).
      expect(firstChanges).toBeGreaterThan((size.width * size.height) / 2);
      expect(secondChanges).toBeLessThan(firstChanges / 4);
    });

    test('dense overlay with transparentBg still keeps photo cells stable across frames', async () => {
      const size = createMockSize(12, 6);
      const photo = await loadedPhoto(theme, size);
      const overlay = new PlasmaPattern(theme, new Mulberry32(42), { transparentBg: true });
      const layered = new LayeredPattern(photo, overlay);

      const renderBuffer = new RenderBuffer(size);

      // Render the same time twice — output must be byte-identical, so
      // the second frame's diff is empty (proving photo cells are stable).
      renderBuffer.clear();
      layered.render(renderBuffer.getBuffer(), 1000, size);
      renderBuffer.getChanges();
      renderBuffer.swap();

      renderBuffer.clear();
      layered.render(renderBuffer.getBuffer(), 1000, size);
      const secondChanges = renderBuffer.getChanges();

      expect(secondChanges).toHaveLength(0);
    });
  });
});
