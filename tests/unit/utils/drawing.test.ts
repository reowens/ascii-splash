import { bresenhamLine, applyRadialSymmetry, applyMirrorSymmetry, drawCircle } from '../../../src/utils/drawing.js';
import { Point } from '../../../src/types/index.js';

describe('Drawing Utils', () => {
  describe('bresenhamLine', () => {
    it('draws horizontal line left to right', () => {
      const points = bresenhamLine(0, 0, 5, 0);
      expect(points).toHaveLength(6);
      expect(points).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 0 },
        { x: 4, y: 0 },
        { x: 5, y: 0 }
      ]);
    });

    it('draws horizontal line right to left', () => {
      const points = bresenhamLine(5, 0, 0, 0);
      expect(points).toHaveLength(6);
      expect(points[0]).toEqual({ x: 5, y: 0 });
      expect(points[5]).toEqual({ x: 0, y: 0 });
    });

    it('draws vertical line top to bottom', () => {
      const points = bresenhamLine(0, 0, 0, 5);
      expect(points).toHaveLength(6);
      expect(points).toEqual([
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: 2 },
        { x: 0, y: 3 },
        { x: 0, y: 4 },
        { x: 0, y: 5 }
      ]);
    });

    it('draws vertical line bottom to top', () => {
      const points = bresenhamLine(0, 5, 0, 0);
      expect(points).toHaveLength(6);
      expect(points[0]).toEqual({ x: 0, y: 5 });
      expect(points[5]).toEqual({ x: 0, y: 0 });
    });

    it('draws diagonal line (45 degrees)', () => {
      const points = bresenhamLine(0, 0, 3, 3);
      expect(points).toHaveLength(4);
      expect(points).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 2 },
        { x: 3, y: 3 }
      ]);
    });

    it('draws diagonal line (negative slope)', () => {
      const points = bresenhamLine(0, 3, 3, 0);
      expect(points).toHaveLength(4);
      expect(points[0]).toEqual({ x: 0, y: 3 });
      expect(points[3]).toEqual({ x: 3, y: 0 });
    });

    it('draws line with shallow slope', () => {
      const points = bresenhamLine(0, 0, 5, 2);
      expect(points.length).toBeGreaterThan(0);
      expect(points[0]).toEqual({ x: 0, y: 0 });
      expect(points[points.length - 1]).toEqual({ x: 5, y: 2 });
    });

    it('draws line with steep slope', () => {
      const points = bresenhamLine(0, 0, 2, 5);
      expect(points.length).toBeGreaterThan(0);
      expect(points[0]).toEqual({ x: 0, y: 0 });
      expect(points[points.length - 1]).toEqual({ x: 2, y: 5 });
    });

    it('handles single point (start == end)', () => {
      const points = bresenhamLine(3, 3, 3, 3);
      expect(points).toHaveLength(1);
      expect(points[0]).toEqual({ x: 3, y: 3 });
    });

    it('handles fractional coordinates by flooring', () => {
      const points = bresenhamLine(0.7, 0.3, 5.9, 2.1);
      // Should floor to (0, 0) -> (5, 2)
      expect(points[0]).toEqual({ x: 0, y: 0 });
      expect(points[points.length - 1]).toEqual({ x: 5, y: 2 });
    });

    it('handles negative coordinates', () => {
      const points = bresenhamLine(-2, -2, 2, 2);
      expect(points.length).toBeGreaterThan(0);
      expect(points[0]).toEqual({ x: -2, y: -2 });
      expect(points[points.length - 1]).toEqual({ x: 2, y: 2 });
    });
  });

  describe('applyRadialSymmetry', () => {
    it('creates 4-way symmetry', () => {
      const point: Point = { x: 5, y: 0 };
      const points = applyRadialSymmetry(point, 0, 0, 4);
      
      expect(points).toHaveLength(4);
      // Should create points at 0°, 90°, 180°, 270°
      expect(points[0].x).toBeCloseTo(5, 0);
      expect(points[0].y).toBeCloseTo(0, 0);
    });

    it('creates 6-way symmetry', () => {
      const point: Point = { x: 10, y: 0 };
      const points = applyRadialSymmetry(point, 0, 0, 6);
      
      expect(points).toHaveLength(6);
      // Should create points at 0°, 60°, 120°, 180°, 240°, 300°
    });

    it('creates 8-way symmetry', () => {
      const point: Point = { x: 5, y: 5 };
      const points = applyRadialSymmetry(point, 10, 10, 8);
      
      expect(points).toHaveLength(8);
      // All points should be roughly equidistant from center (allowing for flooring)
      const centerX = 10, centerY = 10;
      const distances = points.map(p => 
        Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2)
      );
      
      // Distance from (10,10) to (5,5) is about 7.07
      // Due to flooring in rotation, allow reasonable variance
      const avgDist = distances.reduce((a, b) => a + b) / distances.length;
      distances.forEach(d => {
        // Allow up to 1.5 units difference due to flooring in rotation
        expect(Math.abs(d - avgDist)).toBeLessThan(1.5);
      });
    });

    it('handles point at center', () => {
      const point: Point = { x: 5, y: 5 };
      const points = applyRadialSymmetry(point, 5, 5, 4);
      
      expect(points).toHaveLength(4);
      // All points should be at or near the center
      points.forEach(p => {
        expect(p.x).toBeCloseTo(5, 0);
        expect(p.y).toBeCloseTo(5, 0);
      });
    });

    it('handles custom center position', () => {
      const point: Point = { x: 15, y: 10 };
      const points = applyRadialSymmetry(point, 10, 10, 4);
      
      expect(points).toHaveLength(4);
      // Should rotate around (10, 10), not origin
    });

    it('floors all output coordinates', () => {
      const point: Point = { x: 5, y: 0 };
      const points = applyRadialSymmetry(point, 0, 0, 3);
      
      points.forEach(p => {
        expect(Number.isInteger(p.x)).toBe(true);
        expect(Number.isInteger(p.y)).toBe(true);
      });
    });

    it('handles 2-way symmetry (mirrors)', () => {
      const point: Point = { x: 5, y: 0 };
      const points = applyRadialSymmetry(point, 0, 0, 2);
      
      expect(points).toHaveLength(2);
      // Should create points at 0° and 180°
    });

    it('handles large symmetry values', () => {
      const point: Point = { x: 10, y: 0 };
      const points = applyRadialSymmetry(point, 0, 0, 16);
      
      expect(points).toHaveLength(16);
    });
  });

  describe('applyMirrorSymmetry', () => {
    describe('horizontal mirror', () => {
      it('creates horizontal mirror of point', () => {
        const point: Point = { x: 5, y: 10 };
        const points = applyMirrorSymmetry(point, 10, 15, 'horizontal');
        
        expect(points).toHaveLength(2);
        expect(points[0]).toEqual(point); // Original point
        expect(points[1]).toEqual({ x: 15, y: 10 }); // Mirrored across x=10
      });

      it('handles point on mirror axis', () => {
        const point: Point = { x: 10, y: 5 };
        const points = applyMirrorSymmetry(point, 10, 15, 'horizontal');
        
        expect(points).toHaveLength(2);
        expect(points[0]).toEqual(point);
        expect(points[1]).toEqual({ x: 10, y: 5 }); // Same as original
      });
    });

    describe('vertical mirror', () => {
      it('creates vertical mirror of point', () => {
        const point: Point = { x: 10, y: 5 };
        const points = applyMirrorSymmetry(point, 15, 10, 'vertical');
        
        expect(points).toHaveLength(2);
        expect(points[0]).toEqual(point); // Original point
        expect(points[1]).toEqual({ x: 10, y: 15 }); // Mirrored across y=10
      });

      it('handles point on mirror axis', () => {
        const point: Point = { x: 5, y: 10 };
        const points = applyMirrorSymmetry(point, 15, 10, 'vertical');
        
        expect(points).toHaveLength(2);
        expect(points[0]).toEqual(point);
        expect(points[1]).toEqual({ x: 5, y: 10 }); // Same as original
      });
    });

    describe('both axes mirror', () => {
      it('creates 4-way mirror symmetry', () => {
        const point: Point = { x: 5, y: 5 };
        const points = applyMirrorSymmetry(point, 10, 10, 'both');
        
        expect(points).toHaveLength(4);
        expect(points[0]).toEqual({ x: 5, y: 5 }); // Original
        expect(points[1]).toEqual({ x: 15, y: 5 }); // Horizontal mirror
        expect(points[2]).toEqual({ x: 5, y: 15 }); // Vertical mirror
        expect(points[3]).toEqual({ x: 15, y: 15 }); // Both mirrors
      });

      it('handles point at center', () => {
        const point: Point = { x: 10, y: 10 };
        const points = applyMirrorSymmetry(point, 10, 10, 'both');
        
        expect(points).toHaveLength(4);
        // All points should be the same (at center)
        points.forEach(p => {
          expect(p).toEqual({ x: 10, y: 10 });
        });
      });

      it('handles negative coordinates', () => {
        const point: Point = { x: -5, y: -5 };
        const points = applyMirrorSymmetry(point, 0, 0, 'both');
        
        expect(points).toHaveLength(4);
        expect(points).toContainEqual({ x: -5, y: -5 });
        expect(points).toContainEqual({ x: 5, y: -5 });
        expect(points).toContainEqual({ x: -5, y: 5 });
        expect(points).toContainEqual({ x: 5, y: 5 });
      });
    });

    it('always includes original point', () => {
      const point: Point = { x: 7, y: 3 };
      
      const horiz = applyMirrorSymmetry(point, 10, 10, 'horizontal');
      expect(horiz[0]).toEqual(point);
      
      const vert = applyMirrorSymmetry(point, 10, 10, 'vertical');
      expect(vert[0]).toEqual(point);
      
      const both = applyMirrorSymmetry(point, 10, 10, 'both');
      expect(both[0]).toEqual(point);
    });
  });

  describe('drawCircle', () => {
    it('draws circle with small radius', () => {
      const points = drawCircle(10, 10, 3);
      
      expect(points.length).toBeGreaterThan(8); // At least 8 points minimum
      
      // Due to flooring, points approximate a circle (within 1.5 units)
      points.forEach(p => {
        const dist = Math.sqrt((p.x - 10) ** 2 + (p.y - 10) ** 2);
        expect(Math.abs(dist - 3)).toBeLessThan(1.5);
      });
    });

    it('draws circle with medium radius', () => {
      const points = drawCircle(20, 20, 10);
      
      // Larger radius = more points (2 * PI * radius)
      const expectedPoints = Math.floor(2 * Math.PI * 10);
      expect(points.length).toBeGreaterThanOrEqual(expectedPoints);
      
      // Verify points approximate a circle (within 1.5 units due to flooring)
      points.forEach(p => {
        const dist = Math.sqrt((p.x - 20) ** 2 + (p.y - 20) ** 2);
        expect(Math.abs(dist - 10)).toBeLessThan(1.5);
      });
    });

    it('draws circle with large radius', () => {
      const points = drawCircle(50, 50, 25);
      
      expect(points.length).toBeGreaterThan(50); // Many points for large circle
      
      // Allow larger tolerance for bigger circles
      points.forEach(p => {
        const dist = Math.sqrt((p.x - 50) ** 2 + (p.y - 50) ** 2);
        expect(Math.abs(dist - 25)).toBeLessThan(1.5);
      });
    });

    it('draws circle at origin', () => {
      const points = drawCircle(0, 0, 5);
      
      expect(points.length).toBeGreaterThan(0);
      
      points.forEach(p => {
        const dist = Math.sqrt(p.x ** 2 + p.y ** 2);
        expect(Math.abs(dist - 5)).toBeLessThan(1.5);
      });
    });

    it('returns integer coordinates', () => {
      const points = drawCircle(15.7, 22.3, 8.9);
      
      points.forEach(p => {
        expect(Number.isInteger(p.x)).toBe(true);
        expect(Number.isInteger(p.y)).toBe(true);
      });
    });

    it('draws circle with radius 1', () => {
      const points = drawCircle(10, 10, 1);
      
      // Minimum of 8 points
      expect(points.length).toBeGreaterThanOrEqual(8);
      
      // For radius 1, flooring means points are at distance 0 or 1
      points.forEach(p => {
        const dist = Math.sqrt((p.x - 10) ** 2 + (p.y - 10) ** 2);
        expect(dist).toBeLessThanOrEqual(1.5);
      });
    });

    it('covers all quadrants', () => {
      const points = drawCircle(0, 0, 10);
      
      // Should have points in all 4 quadrants
      const hasQuadrant = [false, false, false, false];
      
      points.forEach(p => {
        if (p.x >= 0 && p.y >= 0) hasQuadrant[0] = true;
        if (p.x < 0 && p.y >= 0) hasQuadrant[1] = true;
        if (p.x < 0 && p.y < 0) hasQuadrant[2] = true;
        if (p.x >= 0 && p.y < 0) hasQuadrant[3] = true;
      });
      
      expect(hasQuadrant.every(q => q)).toBe(true);
    });

    it('has reasonably distributed points', () => {
      const points = drawCircle(0, 0, 15);
      
      // Calculate angles of all points
      const angles = points.map(p => Math.atan2(p.y, p.x));
      
      // Remove duplicate angles (flooring can cause duplicates)
      const uniqueAngles = [...new Set(angles.map(a => a.toFixed(6)))].map(a => parseFloat(a));
      uniqueAngles.sort((a, b) => a - b);
      
      // Check that we have reasonable angular coverage
      expect(uniqueAngles.length).toBeGreaterThan(10); // At least some angular variety
      
      // Check max gap isn't too large (no huge empty sectors)
      const expectedGap = (2 * Math.PI) / uniqueAngles.length;
      for (let i = 1; i < uniqueAngles.length; i++) {
        const gap = uniqueAngles[i] - uniqueAngles[i - 1];
        // No gap should be more than 3x the expected gap
        expect(gap).toBeLessThan(expectedGap * 3);
      }
    });
  });
});
