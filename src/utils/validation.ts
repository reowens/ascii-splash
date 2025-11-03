/**
 * Validation utilities for pattern configuration values
 */

/**
 * Clamp a numeric value between min and max bounds
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Ensure a value is positive (> 0)
 */
export function ensurePositive(value: number, defaultValue: number = 1): number {
  return value > 0 ? value : defaultValue;
}

/**
 * Ensure a value is non-negative (>= 0)
 */
export function ensureNonNegative(value: number, defaultValue: number = 0): number {
  return value >= 0 ? value : defaultValue;
}

/**
 * Validate a density value (0-1 range)
 */
export function validateDensity(density: number): number {
  return clamp(density, 0, 1);
}

/**
 * Validate a probability value (0-1 range)
 */
export function validateProbability(probability: number): number {
  return clamp(probability, 0, 1);
}

/**
 * Validate an integer count (non-negative)
 */
export function validateCount(count: number, max?: number): number {
  const clamped = Math.floor(ensureNonNegative(count, 0));
  return max !== undefined ? Math.min(clamped, max) : clamped;
}

/**
 * Validate a speed value (positive)
 */
export function validateSpeed(speed: number, min: number = 0.1, max: number = 10): number {
  return clamp(ensurePositive(speed, min), min, max);
}

/**
 * Validate angle in radians (0 to 2π)
 */
export function validateAngle(angle: number): number {
  const TWO_PI = Math.PI * 2;
  let normalized = angle % TWO_PI;
  if (normalized < 0) normalized += TWO_PI;
  return normalized;
}

/**
 * Validate angle in degrees (0 to 360)
 */
export function validateAngleDegrees(angle: number): number {
  let normalized = angle % 360;
  if (normalized < 0) normalized += 360;
  return normalized;
}

/**
 * Validate a time interval in milliseconds (positive)
 */
export function validateInterval(interval: number, min: number = 1, max: number = 10000): number {
  return Math.floor(clamp(ensurePositive(interval, min), min, max));
}

/**
 * Validate intensity/opacity value (0-1 range)
 */
export function validateIntensity(intensity: number): number {
  return clamp(intensity, 0, 1);
}

/**
 * Check if a value is a valid number (not NaN, not Infinity)
 */
export function isValidNumber(value: number): boolean {
  return typeof value === 'number' && isFinite(value);
}

/**
 * Sanitize a numeric config value with validation
 */
export function sanitizeNumeric(
  value: number,
  defaultValue: number,
  validator?: (val: number) => number
): number {
  if (!isValidNumber(value)) {
    return defaultValue;
  }
  return validator ? validator(value) : value;
}
