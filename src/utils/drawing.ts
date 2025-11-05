import { Point } from '../types/index.js';

/**
 * Drawing utilities for patterns
 */

/**
 * Bresenham's line algorithm - generates points along a line
 */
export function bresenhamLine(x0: number, y0: number, x1: number, y1: number): Point[] {
  const points: Point[] = [];
  
  x0 = Math.floor(x0);
  y0 = Math.floor(y0);
  x1 = Math.floor(x1);
  y1 = Math.floor(y1);

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let x = x0;
  let y = y0;

  while (true) {
    points.push({ x, y });

    if (x === x1 && y === y1) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }

  return points;
}

/**
 * Apply radial symmetry to a point
 * @param point Original point
 * @param centerX Center X coordinate
 * @param centerY Center Y coordinate
 * @param symmetry Number of symmetry axes (4, 6, 8, etc.)
 * @returns Array of mirrored points
 */
export function applyRadialSymmetry(
  point: Point,
  centerX: number,
  centerY: number,
  symmetry: number
): Point[] {
  const points: Point[] = [];
  const angleStep = (Math.PI * 2) / symmetry;

  // Translate to origin
  const dx = point.x - centerX;
  const dy = point.y - centerY;

  for (let i = 0; i < symmetry; i++) {
    const angle = angleStep * i;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Rotate and translate back
    const x = dx * cos - dy * sin + centerX;
    const y = dx * sin + dy * cos + centerY;

    points.push({ x: Math.floor(x), y: Math.floor(y) });
  }

  return points;
}

/**
 * Apply mirror symmetry (vertical, horizontal, or both)
 */
export function applyMirrorSymmetry(
  point: Point,
  centerX: number,
  centerY: number,
  axes: 'horizontal' | 'vertical' | 'both'
): Point[] {
  const points: Point[] = [point];

  if (axes === 'horizontal' || axes === 'both') {
    const mirroredX = 2 * centerX - point.x;
    points.push({ x: mirroredX, y: point.y });
  }

  if (axes === 'vertical' || axes === 'both') {
    const mirroredY = 2 * centerY - point.y;
    points.push({ x: point.x, y: mirroredY });
  }

  if (axes === 'both') {
    const mirroredX = 2 * centerX - point.x;
    const mirroredY = 2 * centerY - point.y;
    points.push({ x: mirroredX, y: mirroredY });
  }

  return points;
}

/**
 * Draw a circle (returns points on circumference)
 */
export function drawCircle(centerX: number, centerY: number, radius: number): Point[] {
  const points: Point[] = [];
  const steps = Math.max(8, Math.floor(2 * Math.PI * radius));

  for (let i = 0; i < steps; i++) {
    const angle = (2 * Math.PI * i) / steps;
    const x = Math.floor(centerX + radius * Math.cos(angle));
    const y = Math.floor(centerY + radius * Math.sin(angle));
    points.push({ x, y });
  }

  return points;
}
