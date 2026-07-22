import { describe, expect, test } from '@jest/globals';
import {
  PhotoPattern,
  type PhotoImageBackend,
  type PhotoImageData,
} from '../../src/patterns/PhotoPattern.js';
import { LayeredPattern } from '../../src/patterns/LayeredPattern.js';
import type { Pattern, Size } from '../../src/types/index.js';
import { createMockBuffer, createMockTheme } from '../utils/mocks.js';

function image(width: number, height: number): PhotoImageData {
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = i % 256;
    data[i * 4 + 1] = (i * 3) % 256;
    data[i * 4 + 2] = (i * 7) % 256;
    data[i * 4 + 3] = 255;
  }
  return { data, width, height };
}

function canvasForPreset(presetId: number, size: Size): Size {
  if (presetId >= 13) return { width: size.width * 8, height: size.height * 8 };
  if (presetId >= 8 && presetId <= 11) {
    return { width: size.width * 2, height: size.height * 4 };
  }
  return { width: size.width, height: size.height * 2 };
}

async function preparedPhoto(presetId: number, size: Size): Promise<PhotoPattern> {
  const source = image(
    canvasForPreset(presetId, size).width,
    canvasForPreset(presetId, size).height
  );
  const backend: PhotoImageBackend = {
    decode: async () => source,
    resize: async (_source, width, height) => image(width, height),
  };
  const photo = new PhotoPattern(createMockTheme(), {
    source: Buffer.alloc(1),
    imageBackend: backend,
  });
  photo.applyPreset(presetId);
  await photo.load();
  await photo.prepareForSize(size);
  return photo;
}

function measureWarm(pattern: Pattern, size: Size, frames = 100): number {
  const buffer = createMockBuffer(size.width, size.height);
  pattern.render(buffer, 0, size); // cold cache build
  const start = performance.now();
  for (let frame = 0; frame < frames; frame++) pattern.render(buffer, frame * 16, size);
  return (performance.now() - start) / frames;
}

describe('PhotoPattern rendered-cell cache performance', () => {
  test.each([
    ['halfblock', 1, { width: 80, height: 24 }],
    ['braille', 8, { width: 80, height: 24 }],
    ['symbol-all', 13, { width: 80, height: 24 }],
    ['symbol-ascii', 14, { width: 80, height: 24 }],
    ['halfblock-large', 1, { width: 160, height: 48 }],
    ['braille-large', 8, { width: 160, height: 48 }],
    ['symbol-all-large', 13, { width: 160, height: 48 }],
    ['symbol-ascii-large', 14, { width: 160, height: 48 }],
  ])('%s separates cold rebuild from 100 warm blits', async (_name, presetId, size) => {
    const photo = await preparedPhoto(presetId as number, size as Size);
    const buffer = createMockBuffer((size as Size).width, (size as Size).height);
    const coldStart = performance.now();
    photo.render(buffer, 0, size as Size);
    const coldMs = performance.now() - coldStart;
    const warmAvg = measureWarm(photo, size as Size);

    expect(coldMs).toBeLessThan(5000);
    expect(warmAvg).toBeLessThan(5);
    expect(photo.getMetrics().cacheBuilds).toBe(1);
  });

  test('layered photo plus sparse overlay remains a warm-cache blit', async () => {
    const size = { width: 80, height: 24 };
    const photo = await preparedPhoto(13, size);
    const overlay: Pattern = {
      name: 'sparse',
      render(buffer) {
        buffer[0][0] = { char: '*', color: { r: 255, g: 255, b: 255 } };
      },
      reset() {},
    };
    const layered = new LayeredPattern(photo, overlay);

    expect(measureWarm(layered, size)).toBeLessThan(5);
    expect(photo.getMetrics().cacheBuilds).toBe(1);
  });
});
