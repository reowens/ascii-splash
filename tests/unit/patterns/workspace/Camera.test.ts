import { describe, expect, test } from '@jest/globals';
import { Camera, CELL_ASPECT } from '../../../../src/patterns/workspace/Camera.js';

describe('Camera', () => {
  test('snaps to the initial target', () => {
    const camera = new Camera();
    camera.snapTo({ x: 2, y: -1, zoom: 3 });
    expect(camera).toMatchObject({ x: 2, y: -1, zoom: 3, initialized: true });
  });

  test('uses frame-rate-independent exponential damping', () => {
    const one = new Camera();
    const two = new Camera();
    one.moveToward({ x: 10, y: 5, zoom: 2 }, 16, 100);
    two.moveToward({ x: 10, y: 5, zoom: 2 }, 8, 100);
    two.moveToward({ x: 10, y: 5, zoom: 2 }, 8, 100);
    expect(two.x).toBeCloseTo(one.x, 10);
    expect(two.zoom).toBeCloseTo(one.zoom, 10);
  });

  test('ignores non-positive delta and tau', () => {
    const camera = new Camera();
    camera.moveToward({ x: 5, y: 5, zoom: 5 }, 0, 10);
    camera.moveToward({ x: 5, y: 5, zoom: 5 }, 10, 0);
    expect(camera).toMatchObject({ x: 0, y: 0, zoom: 1 });
  });

  test('world/screen transforms are inverses with cell aspect correction', () => {
    const camera = new Camera();
    camera.snapTo({ x: 1, y: 2, zoom: 3 });
    const size = { width: 80, height: 24 };
    const screen = camera.worldToScreen(4, 6, size);
    expect(screen.x).toBe(40 + 3 * 3 * CELL_ASPECT);
    expect(camera.screenToWorld(screen.x, screen.y, size)).toEqual({ x: 4, y: 6 });
  });

  test('fitZoom is finite for zero radius and tiny screens', () => {
    expect(Number.isFinite(Camera.fitZoom(0, { width: 1, height: 1 }))).toBe(true);
    expect(Camera.fitZoom(2, { width: 80, height: 24 })).toBeGreaterThan(0);
  });
});
