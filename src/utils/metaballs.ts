/**
 * Metaball utilities for Lava Lamp pattern
 */

export interface Metaball {
  x: number;
  y: number;
  radius: number;
}

/**
 * Calculate metaball field value at a point
 * Uses inverse square falloff for smooth blending
 * 
 * @param x X coordinate
 * @param y Y coordinate
 * @param balls Array of metaballs
 * @param threshold Field strength threshold for surface (default 1.0)
 * @returns Field strength at point
 */
export function metaballField(x: number, y: number, balls: Metaball[]): number {
  let sum = 0;

  for (const ball of balls) {
    const dx = x - ball.x;
    const dy = y - ball.y;
    const distSquared = dx * dx + dy * dy;

    if (distSquared < 0.0001) {
      // Avoid division by zero at ball center
      sum += ball.radius * ball.radius * 1000;
    } else {
      // Inverse square falloff: strength = radius² / distance²
      sum += (ball.radius * ball.radius) / distSquared;
    }
  }

  return sum;
}

/**
 * Check if a point is inside the metaball surface
 * @param x X coordinate
 * @param y Y coordinate
 * @param balls Array of metaballs
 * @param threshold Surface threshold (default 1.0)
 * @returns true if point is inside surface
 */
export function isInsideMetaball(
  x: number,
  y: number,
  balls: Metaball[],
  threshold: number = 1.0
): boolean {
  return metaballField(x, y, balls) >= threshold;
}

/**
 * Get normalized field intensity (0-1) for coloring
 * @param x X coordinate
 * @param y Y coordinate
 * @param balls Array of metaballs
 * @param maxIntensity Maximum field value for normalization
 * @returns Intensity value between 0 and 1
 */
export function metaballIntensity(
  x: number,
  y: number,
  balls: Metaball[],
  maxIntensity: number = 5.0
): number {
  const field = metaballField(x, y, balls);
  return Math.min(1.0, field / maxIntensity);
}
