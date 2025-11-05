import {
  complexAdd,
  complexMult,
  complexMagnitudeSquared,
  projectTo2D,
  rotateY,
  rotateZ,
  inBounds,
  selectChar,
  clamp,
  lerp,
  distanceSquared,
  distance,
  Complex,
  Point3D
} from '../../../src/utils/math.js';

describe('Math Utils', () => {
  describe('Complex number operations', () => {
    describe('complexAdd', () => {
      it('adds two complex numbers', () => {
        const a: Complex = { real: 3, imag: 4 };
        const b: Complex = { real: 1, imag: 2 };
        const result = complexAdd(a, b);
        
        expect(result.real).toBe(4);
        expect(result.imag).toBe(6);
      });

      it('handles negative numbers', () => {
        const a: Complex = { real: 5, imag: -3 };
        const b: Complex = { real: -2, imag: 7 };
        const result = complexAdd(a, b);
        
        expect(result.real).toBe(3);
        expect(result.imag).toBe(4);
      });

      it('handles zero', () => {
        const a: Complex = { real: 5, imag: 3 };
        const b: Complex = { real: 0, imag: 0 };
        const result = complexAdd(a, b);
        
        expect(result.real).toBe(5);
        expect(result.imag).toBe(3);
      });
    });

    describe('complexMult', () => {
      it('multiplies two complex numbers', () => {
        const a: Complex = { real: 2, imag: 3 };
        const b: Complex = { real: 4, imag: 5 };
        // (2+3i)(4+5i) = 8+10i+12i+15i² = 8+22i-15 = -7+22i
        const result = complexMult(a, b);
        
        expect(result.real).toBe(-7);
        expect(result.imag).toBe(22);
      });

      it('handles multiplication by i', () => {
        const a: Complex = { real: 3, imag: 0 };
        const b: Complex = { real: 0, imag: 1 };
        // 3 * i = 3i
        const result = complexMult(a, b);
        
        expect(result.real).toBe(0);
        expect(result.imag).toBe(3);
      });

      it('handles negative numbers', () => {
        const a: Complex = { real: -2, imag: 1 };
        const b: Complex = { real: 3, imag: -4 };
        // (-2+i)(3-4i) = -6+8i+3i-4i² = -6+11i+4 = -2+11i
        const result = complexMult(a, b);
        
        expect(result.real).toBe(-2);
        expect(result.imag).toBe(11);
      });

      it('handles zero', () => {
        const a: Complex = { real: 5, imag: 3 };
        const b: Complex = { real: 0, imag: 0 };
        const result = complexMult(a, b);
        
        expect(result.real).toBe(0);
        expect(result.imag).toBe(0);
      });
    });

    describe('complexMagnitudeSquared', () => {
      it('calculates magnitude squared', () => {
        const c: Complex = { real: 3, imag: 4 };
        const result = complexMagnitudeSquared(c);
        
        expect(result).toBe(25); // 3² + 4² = 9 + 16 = 25
      });

      it('handles zero', () => {
        const c: Complex = { real: 0, imag: 0 };
        const result = complexMagnitudeSquared(c);
        
        expect(result).toBe(0);
      });

      it('handles negative components', () => {
        const c: Complex = { real: -5, imag: -12 };
        const result = complexMagnitudeSquared(c);
        
        expect(result).toBe(169); // 25 + 144 = 169
      });

      it('handles purely real number', () => {
        const c: Complex = { real: 7, imag: 0 };
        const result = complexMagnitudeSquared(c);
        
        expect(result).toBe(49);
      });

      it('handles purely imaginary number', () => {
        const c: Complex = { real: 0, imag: 8 };
        const result = complexMagnitudeSquared(c);
        
        expect(result).toBe(64);
      });
    });
  });

  describe('3D point operations', () => {
    describe('projectTo2D', () => {
      it('projects 3D point with default FOV', () => {
        const point: Point3D = { x: 10, y: 20, z: 0 };
        const result = projectTo2D(point);
        
        // At z=0, scale = 500/(500+0) = 1
        expect(result.x).toBe(10);
        expect(result.y).toBe(20);
      });

      it('scales down points further from camera', () => {
        const point: Point3D = { x: 100, y: 100, z: 500 };
        const result = projectTo2D(point);
        
        // At z=500, scale = 500/(500+500) = 0.5
        expect(result.x).toBe(50);
        expect(result.y).toBe(50);
      });

      it('scales up points closer to camera', () => {
        const point: Point3D = { x: 100, y: 100, z: -250 };
        const result = projectTo2D(point);
        
        // At z=-250, scale = 500/(500-250) = 2
        expect(result.x).toBe(200);
        expect(result.y).toBe(200);
      });

      it('handles custom FOV', () => {
        const point: Point3D = { x: 100, y: 100, z: 0 };
        const result = projectTo2D(point, 1000);
        
        // At z=0, scale = 1000/(1000+0) = 1
        expect(result.x).toBe(100);
        expect(result.y).toBe(100);
      });

      it('handles negative coordinates', () => {
        const point: Point3D = { x: -50, y: -30, z: 100 };
        const result = projectTo2D(point);
        
        // Scale = 500/600 = 0.833...
        expect(result.x).toBeCloseTo(-41.67, 1);
        expect(result.y).toBeCloseTo(-25, 1);
      });
    });

    describe('rotateY', () => {
      it('rotates point around Y axis by 90 degrees', () => {
        const point: Point3D = { x: 1, y: 0, z: 0 };
        const result = rotateY(point, Math.PI / 2);
        
        expect(result.x).toBeCloseTo(0, 10);
        expect(result.y).toBe(0);
        expect(result.z).toBeCloseTo(-1, 10);
      });

      it('rotates point around Y axis by 180 degrees', () => {
        const point: Point3D = { x: 1, y: 2, z: 3 };
        const result = rotateY(point, Math.PI);
        
        expect(result.x).toBeCloseTo(-1, 10);
        expect(result.y).toBe(2); // Y unchanged
        expect(result.z).toBeCloseTo(-3, 10);
      });

      it('handles zero rotation', () => {
        const point: Point3D = { x: 5, y: 10, z: 15 };
        const result = rotateY(point, 0);
        
        expect(result.x).toBeCloseTo(5, 10);
        expect(result.y).toBe(10);
        expect(result.z).toBeCloseTo(15, 10);
      });

      it('handles negative angles', () => {
        const point: Point3D = { x: 1, y: 0, z: 0 };
        const result = rotateY(point, -Math.PI / 2);
        
        expect(result.x).toBeCloseTo(0, 10);
        expect(result.y).toBe(0);
        expect(result.z).toBeCloseTo(1, 10);
      });
    });

    describe('rotateZ', () => {
      it('rotates point around Z axis by 90 degrees', () => {
        const point: Point3D = { x: 1, y: 0, z: 0 };
        const result = rotateZ(point, Math.PI / 2);
        
        expect(result.x).toBeCloseTo(0, 10);
        expect(result.y).toBeCloseTo(1, 10);
        expect(result.z).toBe(0);
      });

      it('rotates point around Z axis by 180 degrees', () => {
        const point: Point3D = { x: 3, y: 4, z: 5 };
        const result = rotateZ(point, Math.PI);
        
        expect(result.x).toBeCloseTo(-3, 10);
        expect(result.y).toBeCloseTo(-4, 10);
        expect(result.z).toBe(5); // Z unchanged
      });

      it('handles zero rotation', () => {
        const point: Point3D = { x: 5, y: 10, z: 15 };
        const result = rotateZ(point, 0);
        
        expect(result.x).toBeCloseTo(5, 10);
        expect(result.y).toBeCloseTo(10, 10);
        expect(result.z).toBe(15);
      });

      it('handles negative angles', () => {
        const point: Point3D = { x: 1, y: 0, z: 0 };
        const result = rotateZ(point, -Math.PI / 2);
        
        expect(result.x).toBeCloseTo(0, 10);
        expect(result.y).toBeCloseTo(-1, 10);
        expect(result.z).toBe(0);
      });
    });
  });

  describe('Utility functions', () => {
    describe('inBounds', () => {
      it('returns true for point inside bounds', () => {
        expect(inBounds(5, 5, 10, 10)).toBe(true);
      });

      it('returns true for point at origin', () => {
        expect(inBounds(0, 0, 10, 10)).toBe(true);
      });

      it('returns true for point at edge (but not at max)', () => {
        expect(inBounds(9, 9, 10, 10)).toBe(true);
      });

      it('returns false for point at max bounds', () => {
        expect(inBounds(10, 10, 10, 10)).toBe(false);
      });

      it('returns false for negative x', () => {
        expect(inBounds(-1, 5, 10, 10)).toBe(false);
      });

      it('returns false for negative y', () => {
        expect(inBounds(5, -1, 10, 10)).toBe(false);
      });

      it('returns false for x >= width', () => {
        expect(inBounds(10, 5, 10, 10)).toBe(false);
        expect(inBounds(15, 5, 10, 10)).toBe(false);
      });

      it('returns false for y >= height', () => {
        expect(inBounds(5, 10, 10, 10)).toBe(false);
        expect(inBounds(5, 15, 10, 10)).toBe(false);
      });
    });

    describe('selectChar', () => {
      const charSet = [' ', '.', ':', '*', '#'];

      it('selects first char for intensity 0', () => {
        expect(selectChar(0, charSet)).toBe(' ');
      });

      it('selects last char for intensity 1', () => {
        expect(selectChar(1, charSet)).toBe('#');
      });

      it('selects middle char for intensity 0.5', () => {
        const result = selectChar(0.5, charSet);
        expect(result).toBe(':'); // index 2 of 5 chars
      });

      it('handles intensity between values', () => {
        const result = selectChar(0.25, charSet);
        expect(charSet).toContain(result);
      });

      it('clamps intensity below 0', () => {
        const result = selectChar(-0.5, charSet);
        expect(result).toBe(' '); // Should clamp to first char
      });

      it('clamps intensity above 1', () => {
        const result = selectChar(1.5, charSet);
        expect(result).toBe('#'); // Should clamp to last char
      });

      it('handles single character set', () => {
        expect(selectChar(0, ['X'])).toBe('X');
        expect(selectChar(0.5, ['X'])).toBe('X');
        expect(selectChar(1, ['X'])).toBe('X');
      });
    });

    describe('clamp', () => {
      it('returns value when within range', () => {
        expect(clamp(5, 0, 10)).toBe(5);
      });

      it('returns min when value is below min', () => {
        expect(clamp(-5, 0, 10)).toBe(0);
      });

      it('returns max when value is above max', () => {
        expect(clamp(15, 0, 10)).toBe(10);
      });

      it('returns min when value equals min', () => {
        expect(clamp(0, 0, 10)).toBe(0);
      });

      it('returns max when value equals max', () => {
        expect(clamp(10, 0, 10)).toBe(10);
      });

      it('handles negative ranges', () => {
        expect(clamp(-5, -10, -1)).toBe(-5);
        expect(clamp(-15, -10, -1)).toBe(-10);
        expect(clamp(0, -10, -1)).toBe(-1);
      });

      it('handles fractional values', () => {
        expect(clamp(0.5, 0, 1)).toBe(0.5);
        expect(clamp(1.5, 0, 1)).toBe(1);
      });
    });

    describe('lerp', () => {
      it('returns a when t is 0', () => {
        expect(lerp(10, 20, 0)).toBe(10);
      });

      it('returns b when t is 1', () => {
        expect(lerp(10, 20, 1)).toBe(20);
      });

      it('returns midpoint when t is 0.5', () => {
        expect(lerp(10, 20, 0.5)).toBe(15);
      });

      it('interpolates at quarter point', () => {
        expect(lerp(0, 100, 0.25)).toBe(25);
      });

      it('handles negative values', () => {
        expect(lerp(-10, 10, 0.5)).toBe(0);
      });

      it('handles reverse interpolation (t > 1)', () => {
        expect(lerp(0, 10, 2)).toBe(20);
      });

      it('handles negative t', () => {
        expect(lerp(10, 20, -0.5)).toBe(5);
      });
    });

    describe('distanceSquared', () => {
      it('calculates squared distance between two points', () => {
        expect(distanceSquared(0, 0, 3, 4)).toBe(25);
      });

      it('returns 0 for same point', () => {
        expect(distanceSquared(5, 5, 5, 5)).toBe(0);
      });

      it('handles horizontal distance', () => {
        expect(distanceSquared(0, 0, 5, 0)).toBe(25);
      });

      it('handles vertical distance', () => {
        expect(distanceSquared(0, 0, 0, 5)).toBe(25);
      });

      it('handles negative coordinates', () => {
        expect(distanceSquared(-3, -4, 0, 0)).toBe(25);
      });

      it('is always non-negative', () => {
        expect(distanceSquared(-10, -10, 5, 5)).toBeGreaterThanOrEqual(0);
      });
    });

    describe('distance', () => {
      it('calculates distance between two points', () => {
        expect(distance(0, 0, 3, 4)).toBe(5);
      });

      it('returns 0 for same point', () => {
        expect(distance(5, 5, 5, 5)).toBe(0);
      });

      it('handles horizontal distance', () => {
        expect(distance(0, 0, 5, 0)).toBe(5);
      });

      it('handles vertical distance', () => {
        expect(distance(0, 0, 0, 5)).toBe(5);
      });

      it('handles negative coordinates', () => {
        expect(distance(-3, -4, 0, 0)).toBe(5);
      });

      it('matches square root of distanceSquared', () => {
        const x1 = 10, y1 = 20, x2 = 30, y2 = 50;
        const dist = distance(x1, y1, x2, y2);
        const distSq = distanceSquared(x1, y1, x2, y2);
        
        expect(dist).toBeCloseTo(Math.sqrt(distSq), 10);
      });
    });
  });
});
