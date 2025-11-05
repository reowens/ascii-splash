import { Point } from '../types/index.js';

/**
 * Math utilities for patterns
 */

// Complex number operations (for Mandelbrot pattern)
export interface Complex {
  real: number;
  imag: number;
}

export function complexAdd(a: Complex, b: Complex): Complex {
  return {
    real: a.real + b.real,
    imag: a.imag + b.imag
  };
}

export function complexMult(a: Complex, b: Complex): Complex {
  return {
    real: a.real * b.real - a.imag * b.imag,
    imag: a.real * b.imag + a.imag * b.real
  };
}

export function complexMagnitudeSquared(c: Complex): number {
  return c.real * c.real + c.imag * c.imag;
}

// 3D point and projection (for DNA Helix pattern)
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export function projectTo2D(point: Point3D, fov: number = 500): Point {
  // Simple perspective projection
  const scale = fov / (fov + point.z);
  return {
    x: point.x * scale,
    y: point.y * scale
  };
}

export function rotateY(point: Point3D, angle: number): Point3D {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: point.x * cos + point.z * sin,
    y: point.y,
    z: -point.x * sin + point.z * cos
  };
}

export function rotateZ(point: Point3D, angle: number): Point3D {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
    z: point.z
  };
}

// Bounds checking
export function inBounds(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && x < width && y >= 0 && y < height;
}

// Character selection by intensity
export function selectChar(intensity: number, charSet: string[]): string {
  const index = Math.floor(intensity * (charSet.length - 1));
  return charSet[Math.max(0, Math.min(charSet.length - 1, index))];
}

// Clamp value to range
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Linear interpolation
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Distance between two points (squared to avoid sqrt)
export function distanceSquared(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

// Actual distance
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(distanceSquared(x1, y1, x2, y2));
}
