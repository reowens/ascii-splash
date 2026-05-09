/**
 * Unit tests for PhotoPattern (v0.4.0 Phase 1).
 *
 * These tests round-trip a small synthetic image through sharp's encoder
 * (PNG, in-memory) and back through PhotoPattern.load() so we exercise the
 * real decode pipeline without depending on a fixture file. The image is
 * tiny so the test suite stays fast.
 */

import sharp from 'sharp';
import { PhotoPattern, fitWithAspect } from '../../../src/patterns/PhotoPattern.js';
import { UPPER_HALF_BLOCK, LOWER_HALF_BLOCK } from '../../../src/renderer/HalfBlockRenderer.js';
import { Cell } from '../../../src/types/index.js';
import { createMockBuffer, createMockSize, createMockTheme } from '../../utils/mocks.js';

/**
 * Generate a small in-memory PNG buffer with a deterministic gradient so
 * we can verify the rendered output without disk I/O.
 */
async function makeGradientPng(width: number, height: number): Promise<Buffer> {
  const raw = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      raw[i] = (x * 255) / Math.max(1, width - 1); // r ramps left→right
      raw[i + 1] = (y * 255) / Math.max(1, height - 1); // g ramps top→bottom
      raw[i + 2] = 64;
      raw[i + 3] = 255;
    }
  }
  return sharp(raw, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
}

describe('PhotoPattern', () => {
  const theme = createMockTheme('ocean');

  describe('Construction', () => {
    test('initializes with default preset', () => {
      const pattern = new PhotoPattern(theme, { source: Buffer.alloc(1) });
      expect(pattern.name).toBe('photo');
      expect(pattern.getCurrentPreset().preset).toBe('default');
    });

    test('honors a non-default preset in config', () => {
      const pattern = new PhotoPattern(theme, {
        source: Buffer.alloc(1),
        preset: 'inverted',
      });
      expect(pattern.getCurrentPreset().preset).toBe('inverted');
    });

    test('exposes 12 presets after Phase 2 (Phase 1 ids 1–6 plus Phase 2 ids 7–12)', () => {
      const presets = PhotoPattern.getPresets();
      expect(presets).toHaveLength(12);
      expect(presets.map(p => p.preset)).toEqual([
        'default',
        'high-contrast',
        'inverted',
        'grayscale',
        'bg-tinted',
        'edge-only',
        'edge-dog',
        'braille',
        'braille-inverted',
        'braille-dithered',
        'braille-edges',
        'halfblock-bayer',
      ]);
    });

    test('Phase 1 preset ids 1–6 keep their original semantics', () => {
      const ids = [1, 2, 3, 4, 5, 6].map(id => {
        const p = PhotoPattern.getPreset(id);
        return p?.preset;
      });
      expect(ids).toEqual([
        'default',
        'high-contrast',
        'inverted',
        'grayscale',
        'bg-tinted',
        'edge-only',
      ]);
    });
  });

  describe('load()', () => {
    test('decodes a valid PNG into raw RGBA', async () => {
      const png = await makeGradientPng(4, 4);
      const pattern = new PhotoPattern(theme, { source: png });
      await pattern.load();

      const metrics = pattern.getMetrics();
      expect(metrics.sourceWidth).toBe(4);
      expect(metrics.sourceHeight).toBe(4);
      expect(metrics.hasError).toBe(0);
    });

    test('throws on invalid image data', async () => {
      const pattern = new PhotoPattern(theme, {
        source: Buffer.from('not-an-image'),
      });
      await expect(pattern.load()).rejects.toThrow();
    });
  });

  describe('render()', () => {
    test('writes half-block characters into buffer after load+prepare', async () => {
      const png = await makeGradientPng(4, 4);
      const pattern = new PhotoPattern(theme, { source: png });
      await pattern.load();

      const size = createMockSize(2, 1); // 2 wide × 1 tall = 2 source rows
      await pattern.prepareForSize(size);

      const buffer: Cell[][] = createMockBuffer(size.width, size.height);
      pattern.render(buffer, 0, size);

      // Expected: each cell holds a half-block (lower or upper) since all
      // gradient pixels are opaque.
      for (let x = 0; x < size.width; x++) {
        const ch = buffer[0][x].char;
        expect([LOWER_HALF_BLOCK, UPPER_HALF_BLOCK]).toContain(ch);
        expect(buffer[0][x].color).toBeDefined();
      }
    });

    test('renders nothing before load() is called', () => {
      const pattern = new PhotoPattern(theme, { source: Buffer.alloc(1) });
      const size = createMockSize(4, 2);
      const buffer: Cell[][] = createMockBuffer(size.width, size.height);
      const before = JSON.stringify(buffer);
      pattern.render(buffer, 0, size);
      expect(JSON.stringify(buffer)).toBe(before);
    });
  });

  describe('applyPreset()', () => {
    test('switches the active preset by id', async () => {
      const pattern = new PhotoPattern(theme, { source: Buffer.alloc(1) });
      expect(pattern.applyPreset(3)).toBe(true);
      expect(pattern.getCurrentPreset().preset).toBe('inverted');
      expect(pattern.applyPreset(4)).toBe(true);
      expect(pattern.getCurrentPreset().preset).toBe('grayscale');
    });

    test('returns false for invalid preset ids', () => {
      const pattern = new PhotoPattern(theme, { source: Buffer.alloc(1) });
      expect(pattern.applyPreset(0)).toBe(false);
      expect(pattern.applyPreset(13)).toBe(false);
      expect(pattern.applyPreset(-1)).toBe(false);
    });

    test('inverted preset produces inverted colors in the rendered output', async () => {
      const png = await makeGradientPng(4, 4);
      const pattern = new PhotoPattern(theme, { source: png });
      await pattern.load();

      const size = createMockSize(4, 2);

      pattern.applyPreset(1); // default
      await pattern.prepareForSize(size);
      const defaultBuf: Cell[][] = createMockBuffer(size.width, size.height);
      pattern.render(defaultBuf, 0, size);

      pattern.applyPreset(3); // inverted
      const invertedBuf: Cell[][] = createMockBuffer(size.width, size.height);
      pattern.render(invertedBuf, 0, size);

      // Pick any cell with both fg and bg defined; inverted should be the
      // channel-wise complement of the default.
      const def = defaultBuf[0][0];
      const inv = invertedBuf[0][0];
      expect(def.color).toBeDefined();
      expect(inv.color).toBeDefined();
      expect(inv.color!.r).toBe(255 - def.color!.r);
      expect(inv.color!.g).toBe(255 - def.color!.g);
      expect(inv.color!.b).toBe(255 - def.color!.b);
    });
  });

  describe('prepareForSize()', () => {
    test('throws if called before load()', async () => {
      const pattern = new PhotoPattern(theme, { source: Buffer.alloc(1) });
      await expect(pattern.prepareForSize(createMockSize(10, 5))).rejects.toThrow(
        /load\(\) must be called/
      );
    });

    test('caches resized buffer and skips re-resize for same size', async () => {
      const png = await makeGradientPng(8, 8);
      const pattern = new PhotoPattern(theme, { source: png });
      await pattern.load();

      const size = createMockSize(4, 2);
      await pattern.prepareForSize(size);
      const m1 = pattern.getMetrics();
      await pattern.prepareForSize(size);
      const m2 = pattern.getMetrics();
      expect(m1.cachedWidth).toBe(m2.cachedWidth);
      expect(m1.cachedHeight).toBe(m2.cachedHeight);
      expect(m2.cachedWidth).toBe(4);
      expect(m2.cachedHeight).toBe(4);
    });
  });

  describe('aspect-preserving resize', () => {
    test('square source on a wide canvas → letterboxed (square fit)', async () => {
      // 8×8 square source, canvas 8×4 cells = 8×8 source pixels. Already fits → unchanged.
      const png = await makeGradientPng(8, 8);
      const pattern = new PhotoPattern(theme, { source: png });
      await pattern.load();
      await pattern.prepareForSize(createMockSize(8, 4));
      const m = pattern.getMetrics();
      expect(m.cachedWidth).toBe(8);
      expect(m.cachedHeight).toBe(8);
    });

    test('1:1 source larger than canvas → scaled down preserving aspect (no stretch)', async () => {
      // 16×16 source, terminal 8 cells × 4 cells = 8×8 source pixel canvas.
      // Best fit preserving 1:1 = 8×8 source pixels.
      const png = await makeGradientPng(16, 16);
      const pattern = new PhotoPattern(theme, { source: png });
      await pattern.load();
      await pattern.prepareForSize(createMockSize(8, 4));
      const m = pattern.getMetrics();
      expect(m.cachedWidth).toBe(8);
      expect(m.cachedHeight).toBe(8);
    });

    test('wide source on a wide canvas → fills width, vertical letterbox', async () => {
      // 32×8 source (4:1), canvas 8 cells × 4 cells = 8×8.
      // Aspect-preserving fit: width=8, height=2 (8×8 / 32 ≈ 2).
      const png = await makeGradientPng(32, 8);
      const pattern = new PhotoPattern(theme, { source: png });
      await pattern.load();
      await pattern.prepareForSize(createMockSize(8, 4));
      const m = pattern.getMetrics();
      expect(m.cachedWidth).toBe(8);
      expect(m.cachedHeight).toBe(2);
    });

    test('tall source on a wide canvas → fills height, horizontal letterbox', async () => {
      // 8×32 source (1:4), canvas 8×4 cells = 8×8 source-pixel.
      // Best fit: height=8, width=2.
      const png = await makeGradientPng(8, 32);
      const pattern = new PhotoPattern(theme, { source: png });
      await pattern.load();
      await pattern.prepareForSize(createMockSize(8, 4));
      const m = pattern.getMetrics();
      expect(m.cachedWidth).toBe(2);
      expect(m.cachedHeight).toBe(8);
    });
  });

  describe('fitWithAspect()', () => {
    test('returns source unchanged when smaller than canvas', () => {
      expect(fitWithAspect(50, 30, 100, 100)).toEqual({ width: 50, height: 30 });
    });

    test('1:1 source in non-square canvas → fits the smaller dimension', () => {
      // Canvas 80×40 (= 80×40 source pixels for halfblock). 100×100 source.
      expect(fitWithAspect(100, 100, 80, 40)).toEqual({ width: 40, height: 40 });
    });

    test('wide source → constrained by width', () => {
      // 200×100 (2:1) into 80×80 canvas → width=80, height=40.
      expect(fitWithAspect(200, 100, 80, 80)).toEqual({ width: 80, height: 40 });
    });

    test('tall source → constrained by height', () => {
      // 100×200 (1:2) into 80×80 canvas → height=80, width=40.
      expect(fitWithAspect(100, 200, 80, 80)).toEqual({ width: 40, height: 80 });
    });

    test('zero or negative dimensions → zero result', () => {
      expect(fitWithAspect(0, 0, 80, 24)).toEqual({ width: 0, height: 0 });
      expect(fitWithAspect(100, 100, 0, 24)).toEqual({ width: 0, height: 0 });
    });

    test('clamps minimum to 1 to avoid zero dimensions on extreme aspects', () => {
      // 10000×1 source into 100×100 canvas → height rounds to 0 without clamp.
      const fit = fitWithAspect(10000, 1, 100, 100);
      expect(fit.width).toBeGreaterThan(0);
      expect(fit.height).toBeGreaterThanOrEqual(1);
    });
  });

  describe('reset()', () => {
    test('does not drop the decoded image', async () => {
      const png = await makeGradientPng(4, 4);
      const pattern = new PhotoPattern(theme, { source: png });
      await pattern.load();
      pattern.reset();
      const metrics = pattern.getMetrics();
      expect(metrics.sourceWidth).toBe(4);
      expect(metrics.sourceHeight).toBe(4);
    });
  });

  describe('Phase 2: braille mode', () => {
    test('switching to a braille preset reports mode=1 in metrics', async () => {
      const png = await makeGradientPng(4, 8);
      const pattern = new PhotoPattern(theme, { source: png });
      await pattern.load();
      expect(pattern.applyPreset(8)).toBe(true); // braille
      expect(pattern.getMetrics().mode).toBe(1);
      expect(pattern.applyPreset(1)).toBe(true); // back to halfblock default
      expect(pattern.getMetrics().mode).toBe(0);
    });

    test('braille preset uses 2× wider × 4× taller source canvas than halfblock', async () => {
      // 16×16 source → halfblock with terminal 4×4 wants 4×8 source (canvas 4×8);
      // braille on the same terminal wants 8×16 (canvas 8×16); 16×16 source fits both
      // letterbox-style. We verify by inspecting the resize cache.
      const png = await makeGradientPng(16, 16);
      const pattern = new PhotoPattern(theme, { source: png });
      await pattern.load();

      const size = createMockSize(4, 4);

      pattern.applyPreset(1); // halfblock default — canvas 4×8 → fit 1:1 → 4×4? No, 4×8 canvas, 1:1 input → fits in 4×4.
      await pattern.prepareForSize(size);
      const halfMetrics = pattern.getMetrics();

      pattern.applyPreset(8); // braille — canvas 8×16 → 1:1 input → fits 8×8.
      await pattern.prepareForSize(size);
      const brailleMetrics = pattern.getMetrics();

      expect(brailleMetrics.cachedWidth).toBeGreaterThanOrEqual(halfMetrics.cachedWidth);
      expect(brailleMetrics.cachedHeight).toBeGreaterThanOrEqual(halfMetrics.cachedHeight);
    });

    test('braille preset writes Unicode Braille codepoints into the buffer', async () => {
      const png = await makeGradientPng(8, 16); // 1:2 source → fits braille canvas
      const pattern = new PhotoPattern(theme, { source: png });
      await pattern.load();
      pattern.applyPreset(8); // braille, threshold 128

      const size = createMockSize(4, 4);
      await pattern.prepareForSize(size);
      const buffer: Cell[][] = createMockBuffer(size.width, size.height);
      pattern.render(buffer, 0, size);

      // Find at least one cell whose char is in U+2800–U+28FF.
      let foundBraille = false;
      for (const row of buffer) {
        for (const cell of row) {
          const code = cell.char.charCodeAt(0);
          if (code >= 0x2800 && code <= 0x28ff) {
            foundBraille = true;
            break;
          }
        }
      }
      expect(foundBraille).toBe(true);
    });
  });

  describe('Phase 2: edge presets', () => {
    test('Sobel edge-only preset produces edge-thresholded output (only 0 or 255 fg)', async () => {
      const png = await makeGradientPng(8, 8);
      const pattern = new PhotoPattern(theme, { source: png });
      await pattern.load();
      pattern.applyPreset(6); // edge-only Sobel

      const size = createMockSize(8, 4);
      await pattern.prepareForSize(size);
      const buffer: Cell[][] = createMockBuffer(size.width, size.height);
      pattern.render(buffer, 0, size);

      // Every fg/bg color channel should be exactly 0 or 255 (post-threshold mask).
      for (const row of buffer) {
        for (const cell of row) {
          if (cell.color) {
            expect([0, 255]).toContain(cell.color.r);
            expect([0, 255]).toContain(cell.color.g);
            expect([0, 255]).toContain(cell.color.b);
          }
          if (cell.bg) {
            expect([0, 255]).toContain(cell.bg.r);
            expect([0, 255]).toContain(cell.bg.g);
            expect([0, 255]).toContain(cell.bg.b);
          }
        }
      }
    });

    test('DoG edge preset is selectable', async () => {
      const png = await makeGradientPng(8, 8);
      const pattern = new PhotoPattern(theme, { source: png });
      await pattern.load();
      expect(pattern.applyPreset(7)).toBe(true);
      expect(pattern.getCurrentPreset().preset).toBe('edge-dog');
      expect(pattern.getCurrentPreset().edge).toBe('dog');
    });
  });

  describe('Phase 2: dither presets', () => {
    test('Floyd-Steinberg + braille preset is selectable and binarized', () => {
      const pattern = new PhotoPattern(theme, { source: Buffer.alloc(1) });
      expect(pattern.applyPreset(10)).toBe(true);
      const p = pattern.getCurrentPreset();
      expect(p.preset).toBe('braille-dithered');
      expect(p.dither).toBe('floyd-steinberg');
      expect(p.ditherLevels).toBe(2);
      expect(p.braille?.preBinarized).toBe(true);
    });

    test('Bayer halfblock preset is selectable', () => {
      const pattern = new PhotoPattern(theme, { source: Buffer.alloc(1) });
      expect(pattern.applyPreset(12)).toBe(true);
      const p = pattern.getCurrentPreset();
      expect(p.preset).toBe('halfblock-bayer');
      expect(p.dither).toBe('bayer-8');
      expect(p.ditherLevels).toBe(8);
    });
  });
});
