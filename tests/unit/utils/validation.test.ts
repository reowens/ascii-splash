import {
  clamp,
  ensurePositive,
  ensureNonNegative,
  validateDensity,
  validateProbability,
  validateCount,
  validateSpeed,
  validateAngle,
  validateAngleDegrees,
  validateInterval,
  validateIntensity,
  isValidNumber,
  sanitizeNumeric
} from '../../../src/utils/validation';

describe('Validation Utils', () => {
  describe('clamp', () => {
    it('returns value within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });

    it('clamps value below min to min', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(-100, 0, 10)).toBe(0);
    });

    it('clamps value above max to max', () => {
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(100, 0, 10)).toBe(10);
    });

    it('works with negative ranges', () => {
      expect(clamp(-5, -10, -1)).toBe(-5);
      expect(clamp(-15, -10, -1)).toBe(-10);
      expect(clamp(0, -10, -1)).toBe(-1);
    });
  });

  describe('ensurePositive', () => {
    it('returns value if positive', () => {
      expect(ensurePositive(5)).toBe(5);
      expect(ensurePositive(0.1)).toBe(0.1);
    });

    it('returns default if zero', () => {
      expect(ensurePositive(0, 1)).toBe(1);
    });

    it('returns default if negative', () => {
      expect(ensurePositive(-5, 1)).toBe(1);
      expect(ensurePositive(-0.1, 2)).toBe(2);
    });

    it('uses default value of 1 if not specified', () => {
      expect(ensurePositive(0)).toBe(1);
      expect(ensurePositive(-5)).toBe(1);
    });
  });

  describe('ensureNonNegative', () => {
    it('returns value if non-negative', () => {
      expect(ensureNonNegative(5)).toBe(5);
      expect(ensureNonNegative(0)).toBe(0);
    });

    it('returns default if negative', () => {
      expect(ensureNonNegative(-5, 0)).toBe(0);
      expect(ensureNonNegative(-0.1, 1)).toBe(1);
    });

    it('uses default value of 0 if not specified', () => {
      expect(ensureNonNegative(-5)).toBe(0);
    });
  });

  describe('validateDensity', () => {
    it('returns value within 0-1 range', () => {
      expect(validateDensity(0.5)).toBe(0.5);
      expect(validateDensity(0)).toBe(0);
      expect(validateDensity(1)).toBe(1);
    });

    it('clamps value below 0 to 0', () => {
      expect(validateDensity(-0.5)).toBe(0);
      expect(validateDensity(-10)).toBe(0);
    });

    it('clamps value above 1 to 1', () => {
      expect(validateDensity(1.5)).toBe(1);
      expect(validateDensity(10)).toBe(1);
    });
  });

  describe('validateProbability', () => {
    it('returns value within 0-1 range', () => {
      expect(validateProbability(0.25)).toBe(0.25);
      expect(validateProbability(0)).toBe(0);
      expect(validateProbability(1)).toBe(1);
    });

    it('clamps value below 0 to 0', () => {
      expect(validateProbability(-0.5)).toBe(0);
    });

    it('clamps value above 1 to 1', () => {
      expect(validateProbability(1.5)).toBe(1);
    });
  });

  describe('validateCount', () => {
    it('returns positive integer count', () => {
      expect(validateCount(100)).toBe(100);
      expect(validateCount(0)).toBe(0);
    });

    it('floors decimal values', () => {
      expect(validateCount(5.7)).toBe(5);
      expect(validateCount(10.2)).toBe(10);
    });

    it('converts negative to 0', () => {
      expect(validateCount(-5)).toBe(0);
    });

    it('respects max limit if provided', () => {
      expect(validateCount(100, 50)).toBe(50);
      expect(validateCount(10, 50)).toBe(10);
    });
  });

  describe('validateSpeed', () => {
    it('returns speed within range', () => {
      expect(validateSpeed(1.0)).toBe(1.0);
      expect(validateSpeed(5.0, 0.1, 10)).toBe(5.0);
    });

    it('clamps to min if too low', () => {
      expect(validateSpeed(0.05, 0.1, 10)).toBe(0.1);
      expect(validateSpeed(-1, 0.1, 10)).toBe(0.1);
    });

    it('clamps to max if too high', () => {
      expect(validateSpeed(15, 0.1, 10)).toBe(10);
    });

    it('ensures positive values', () => {
      expect(validateSpeed(0, 0.1, 10)).toBe(0.1);
    });
  });

  describe('validateAngle', () => {
    it('returns angle within 0 to 2π', () => {
      expect(validateAngle(Math.PI)).toBe(Math.PI);
      expect(validateAngle(0)).toBe(0);
    });

    it('wraps negative angles', () => {
      const result = validateAngle(-Math.PI / 2);
      expect(result).toBeCloseTo(Math.PI * 1.5, 10);
    });

    it('wraps angles above 2π', () => {
      const result = validateAngle(Math.PI * 3);
      expect(result).toBeCloseTo(Math.PI, 10);
    });
  });

  describe('validateAngleDegrees', () => {
    it('returns angle within 0 to 360', () => {
      expect(validateAngleDegrees(180)).toBe(180);
      expect(validateAngleDegrees(0)).toBe(0);
    });

    it('wraps negative angles', () => {
      expect(validateAngleDegrees(-90)).toBe(270);
    });

    it('wraps angles above 360', () => {
      expect(validateAngleDegrees(450)).toBe(90);
    });
  });

  describe('validateInterval', () => {
    it('returns interval within range', () => {
      expect(validateInterval(1000)).toBe(1000);
      expect(validateInterval(500, 100, 2000)).toBe(500);
    });

    it('clamps to min if too low', () => {
      expect(validateInterval(50, 100, 2000)).toBe(100);
    });

    it('clamps to max if too high', () => {
      expect(validateInterval(5000, 100, 2000)).toBe(2000);
    });

    it('floors to integer', () => {
      expect(validateInterval(1500.7)).toBe(1500);
    });

    it('ensures positive', () => {
      expect(validateInterval(-100, 1, 1000)).toBe(1);
    });
  });

  describe('validateIntensity', () => {
    it('returns value within 0-1 range', () => {
      expect(validateIntensity(0.5)).toBe(0.5);
      expect(validateIntensity(0)).toBe(0);
      expect(validateIntensity(1)).toBe(1);
    });

    it('clamps value below 0 to 0', () => {
      expect(validateIntensity(-0.5)).toBe(0);
    });

    it('clamps value above 1 to 1', () => {
      expect(validateIntensity(1.5)).toBe(1);
    });
  });

  describe('isValidNumber', () => {
    it('returns true for valid numbers', () => {
      expect(isValidNumber(0)).toBe(true);
      expect(isValidNumber(123)).toBe(true);
      expect(isValidNumber(-45.6)).toBe(true);
    });

    it('returns false for NaN', () => {
      expect(isValidNumber(NaN)).toBe(false);
    });

    it('returns false for Infinity', () => {
      expect(isValidNumber(Infinity)).toBe(false);
      expect(isValidNumber(-Infinity)).toBe(false);
    });

    it('returns false for non-numbers', () => {
      expect(isValidNumber('123' as any)).toBe(false);
      expect(isValidNumber(null as any)).toBe(false);
      expect(isValidNumber(undefined as any)).toBe(false);
    });
  });

  describe('sanitizeNumeric', () => {
    it('returns value if valid', () => {
      expect(sanitizeNumeric(123, 0)).toBe(123);
      expect(sanitizeNumeric(0.5, 1)).toBe(0.5);
    });

    it('returns default if invalid', () => {
      expect(sanitizeNumeric(NaN, 10)).toBe(10);
      expect(sanitizeNumeric(Infinity, 5)).toBe(5);
    });

    it('applies validator if provided', () => {
      const validator = (val: number) => clamp(val, 0, 10);
      expect(sanitizeNumeric(5, 0, validator)).toBe(5);
      expect(sanitizeNumeric(15, 0, validator)).toBe(10);
      expect(sanitizeNumeric(-5, 0, validator)).toBe(0);
    });

    it('uses default for invalid values even with validator', () => {
      const validator = (val: number) => clamp(val, 0, 10);
      expect(sanitizeNumeric(NaN, 7, validator)).toBe(7);
    });
  });

  describe('Integration: Pattern Config Validation', () => {
    it('validates typical matrix config', () => {
      const density = validateDensity(0.3);
      const speed = validateSpeed(1.0, 0.1, 5);
      
      expect(density).toBe(0.3);
      expect(speed).toBe(1.0);
    });

    it('validates lightning config with edge cases', () => {
      const boltDensity = validateCount(10, 50);
      const branchProb = validateProbability(0.25);
      const branchAngle = validateAngle(Math.PI / 4);
      const fadeTime = clamp(25, 5, 100);
      const strikeInterval = validateInterval(2000, 100, 10000);
      const maxBranches = validateCount(5, 20);
      const thickness = validateCount(1, 10);
      
      expect(boltDensity).toBe(10);
      expect(branchProb).toBe(0.25);
      expect(branchAngle).toBeCloseTo(Math.PI / 4, 10);
      expect(fadeTime).toBe(25);
      expect(strikeInterval).toBe(2000);
      expect(maxBranches).toBe(5);
      expect(thickness).toBe(1);
    });

    it('corrects invalid particle config', () => {
      const particleCount = validateCount(1000, 500); // Over limit
      const speed = validateSpeed(-1, 0.1, 5); // Negative
      const gravity = clamp(10, -0.5, 0.5); // Way too high
      const mouseForce = clamp(-5, 0, 2); // Negative
      
      expect(particleCount).toBe(500);
      expect(speed).toBe(0.1);
      expect(gravity).toBe(0.5);
      expect(mouseForce).toBe(0);
    });
  });
});
