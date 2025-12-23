import { Point, Vector2 } from '../types/index.js';

/**
 * Math utilities for patterns
 */

// ============================================================================
// Vector2 Utilities (for v0.3.0 scene-based patterns)
// ============================================================================

/**
 * Create a new Vector2
 */
export function vec2(x: number, y: number): Vector2 {
  return { x, y };
}

/**
 * Add two vectors
 */
export function vec2Add(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

/**
 * Subtract two vectors (a - b)
 */
export function vec2Subtract(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

/**
 * Multiply vector by scalar
 */
export function vec2Multiply(v: Vector2, scalar: number): Vector2 {
  return { x: v.x * scalar, y: v.y * scalar };
}

/**
 * Divide vector by scalar
 */
export function vec2Divide(v: Vector2, scalar: number): Vector2 {
  return { x: v.x / scalar, y: v.y / scalar };
}

/**
 * Get length (magnitude) of vector
 */
export function vec2Length(v: Vector2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

/**
 * Get squared length (faster, avoids sqrt)
 */
export function vec2LengthSquared(v: Vector2): number {
  return v.x * v.x + v.y * v.y;
}

/**
 * Normalize vector (return unit vector in same direction)
 */
export function vec2Normalize(v: Vector2): Vector2 {
  const len = vec2Length(v);
  if (len === 0) return { x: 0, y: 0 };
  return vec2Divide(v, len);
}

/**
 * Dot product of two vectors
 */
export function vec2Dot(a: Vector2, b: Vector2): number {
  return a.x * b.x + a.y * b.y;
}

/**
 * Distance between two vectors
 */
export function vec2Distance(a: Vector2, b: Vector2): number {
  return vec2Length(vec2Subtract(b, a));
}

/**
 * Squared distance between two vectors (faster)
 */
export function vec2DistanceSquared(a: Vector2, b: Vector2): number {
  return vec2LengthSquared(vec2Subtract(b, a));
}

/**
 * Limit vector magnitude to maximum length
 */
export function vec2Limit(v: Vector2, max: number): Vector2 {
  const lenSq = vec2LengthSquared(v);
  if (lenSq > max * max) {
    return vec2Multiply(vec2Normalize(v), max);
  }
  return v;
}

/**
 * Linear interpolation between two vectors
 */
export function vec2Lerp(a: Vector2, b: Vector2, t: number): Vector2 {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t)
  };
}

/**
 * Rotate vector by angle (radians)
 */
export function vec2Rotate(v: Vector2, angle: number): Vector2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos
  };
}

/**
 * Get angle of vector in radians
 */
export function vec2Angle(v: Vector2): number {
  return Math.atan2(v.y, v.x);
}

/**
 * Create vector from angle and magnitude
 */
export function vec2FromAngle(angle: number, magnitude: number = 1): Vector2 {
  return {
    x: Math.cos(angle) * magnitude,
    y: Math.sin(angle) * magnitude
  };
}

/**
 * Check if two vectors are equal (with optional epsilon for floating point)
 */
export function vec2Equals(a: Vector2, b: Vector2, epsilon: number = 0.0001): boolean {
  return Math.abs(a.x - b.x) < epsilon && Math.abs(a.y - b.y) < epsilon;
}

// ============================================================================
// Original utilities
// ============================================================================

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
