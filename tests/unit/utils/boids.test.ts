/**
 * Boids Flocking Algorithm Tests
 *
 * Tests for the boids utility used by aquarium and other patterns
 */

import { describe, test, expect } from '@jest/globals';
import {
  Boid,
  BoidConfig,
  DEFAULT_BOID_CONFIG,
  updateBoids,
  createFlock,
  getBoidDirection,
  isBoidFacingLeft,
} from '../../../src/utils/boids.js';

describe('Boids Utility', () => {
  describe('createFlock', () => {
    test('should create specified number of boids', () => {
      const boids = createFlock(10, 100, 50);
      expect(boids).toHaveLength(10);
    });

    test('should create boids with unique IDs', () => {
      const boids = createFlock(10, 100, 50);
      const ids = boids.map(b => b.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds).toHaveLength(10);
    });

    test('should create boids within bounds', () => {
      const width = 100;
      const height = 50;
      const boids = createFlock(20, width, height);

      for (const boid of boids) {
        expect(boid.x).toBeGreaterThanOrEqual(0);
        expect(boid.x).toBeLessThanOrEqual(width);
        expect(boid.y).toBeGreaterThanOrEqual(0);
        expect(boid.y).toBeLessThanOrEqual(height);
      }
    });

    test('should create boids with velocities', () => {
      const boids = createFlock(10, 100, 50);

      for (const boid of boids) {
        // Each boid should have non-zero velocity (usually)
        expect(typeof boid.vx).toBe('number');
        expect(typeof boid.vy).toBe('number');
      }
    });

    test('should respect maxSpeed in config', () => {
      const config: BoidConfig = {
        ...DEFAULT_BOID_CONFIG,
        maxSpeed: 2,
      };
      const boids = createFlock(20, 100, 50, config);

      for (const boid of boids) {
        const speed = Math.sqrt(boid.vx * boid.vx + boid.vy * boid.vy);
        expect(speed).toBeLessThanOrEqual(config.maxSpeed + 0.001); // Small tolerance
      }
    });
  });

  describe('updateBoids', () => {
    test('should update boid positions', () => {
      const boids = createFlock(5, 100, 50);
      const initialPositions = boids.map(b => ({ x: b.x, y: b.y }));

      updateBoids(boids, 100, 50);

      let anyMoved = false;
      for (let i = 0; i < boids.length; i++) {
        if (boids[i].x !== initialPositions[i].x || boids[i].y !== initialPositions[i].y) {
          anyMoved = true;
          break;
        }
      }
      expect(anyMoved).toBe(true);
    });

    test('should not throw with empty flock', () => {
      expect(() => {
        updateBoids([], 100, 50);
      }).not.toThrow();
    });

    test('should not throw with single boid', () => {
      const boids: Boid[] = [{ id: 0, x: 50, y: 25, vx: 1, vy: 1 }];

      expect(() => {
        updateBoids(boids, 100, 50);
      }).not.toThrow();
    });

    test('should keep boids within bounds (with soft wrap)', () => {
      const width = 100;
      const height = 50;
      const boids = createFlock(20, width, height);

      // Run many updates
      for (let i = 0; i < 100; i++) {
        updateBoids(boids, width, height);
      }

      // Boids should wrap around edges (within tolerance)
      for (const boid of boids) {
        expect(boid.x).toBeGreaterThanOrEqual(-6);
        expect(boid.x).toBeLessThanOrEqual(width + 6);
        expect(boid.y).toBeGreaterThanOrEqual(-6);
        expect(boid.y).toBeLessThanOrEqual(height + 6);
      }
    });

    test('should respect maxSpeed limit', () => {
      const config: BoidConfig = {
        ...DEFAULT_BOID_CONFIG,
        maxSpeed: 3,
      };
      const boids = createFlock(10, 100, 50, config);

      // Run many updates
      for (let i = 0; i < 50; i++) {
        updateBoids(boids, 100, 50, config);
      }

      // All boids should be under max speed
      for (const boid of boids) {
        const speed = Math.sqrt(boid.vx * boid.vx + boid.vy * boid.vy);
        expect(speed).toBeLessThanOrEqual(config.maxSpeed + 0.01);
      }
    });

    test('should apply delta time correctly', () => {
      const boids1 = createFlock(5, 100, 50);
      const boids2 = boids1.map(b => ({ ...b })); // Clone

      updateBoids(boids1, 100, 50, DEFAULT_BOID_CONFIG, 1);
      updateBoids(boids2, 100, 50, DEFAULT_BOID_CONFIG, 0.5);

      // With different dt, positions should differ
      let anyDifferent = false;
      for (let i = 0; i < boids1.length; i++) {
        if (boids1[i].x !== boids2[i].x || boids1[i].y !== boids2[i].y) {
          anyDifferent = true;
          break;
        }
      }
      expect(anyDifferent).toBe(true);
    });
  });

  describe('Flocking Behaviors', () => {
    test('boids should tend to group together (cohesion)', () => {
      // Create boids spread out
      const boids: Boid[] = [
        { id: 0, x: 10, y: 25, vx: 0, vy: 0 },
        { id: 1, x: 90, y: 25, vx: 0, vy: 0 },
        { id: 2, x: 50, y: 10, vx: 0, vy: 0 },
        { id: 3, x: 50, y: 40, vx: 0, vy: 0 },
      ];

      const config: BoidConfig = {
        ...DEFAULT_BOID_CONFIG,
        cohesionWeight: 2.0,
        separationWeight: 0.1,
        alignmentWeight: 0.1,
        perceptionRadius: 100, // Large radius to see all boids
      };

      // Calculate initial spread
      const getSpread = (boids: Boid[]) => {
        const avgX = boids.reduce((s, b) => s + b.x, 0) / boids.length;
        const avgY = boids.reduce((s, b) => s + b.y, 0) / boids.length;
        return boids.reduce((s, b) => {
          const dx = b.x - avgX;
          const dy = b.y - avgY;
          return s + Math.sqrt(dx * dx + dy * dy);
        }, 0);
      };

      const initialSpread = getSpread(boids);

      // Run many updates
      for (let i = 0; i < 100; i++) {
        updateBoids(boids, 100, 50, config);
      }

      // Boids should be closer together
      const finalSpread = getSpread(boids);
      expect(finalSpread).toBeLessThan(initialSpread);
    });

    test('boids should avoid crowding (separation)', () => {
      // Create boids very close together
      const boids: Boid[] = [
        { id: 0, x: 50, y: 25, vx: 0, vy: 0 },
        { id: 1, x: 51, y: 25, vx: 0, vy: 0 },
        { id: 2, x: 50, y: 26, vx: 0, vy: 0 },
        { id: 3, x: 51, y: 26, vx: 0, vy: 0 },
      ];

      const config: BoidConfig = {
        ...DEFAULT_BOID_CONFIG,
        separationWeight: 5.0,
        cohesionWeight: 0.01,
        alignmentWeight: 0.01,
        separationRadius: 10,
      };

      // Calculate initial average distance
      const getAvgDist = (boids: Boid[]) => {
        let totalDist = 0;
        let count = 0;
        for (let i = 0; i < boids.length; i++) {
          for (let j = i + 1; j < boids.length; j++) {
            const dx = boids[i].x - boids[j].x;
            const dy = boids[i].y - boids[j].y;
            totalDist += Math.sqrt(dx * dx + dy * dy);
            count++;
          }
        }
        return totalDist / count;
      };

      const initialDist = getAvgDist(boids);

      // Run updates
      for (let i = 0; i < 50; i++) {
        updateBoids(boids, 100, 50, config);
      }

      // Boids should be more spread out
      const finalDist = getAvgDist(boids);
      expect(finalDist).toBeGreaterThan(initialDist);
    });
  });

  describe('getBoidDirection', () => {
    test('should return correct angle for right-moving boid', () => {
      const boid: Boid = { id: 0, x: 0, y: 0, vx: 1, vy: 0 };
      const direction = getBoidDirection(boid);
      expect(direction).toBeCloseTo(0);
    });

    test('should return correct angle for down-moving boid', () => {
      const boid: Boid = { id: 0, x: 0, y: 0, vx: 0, vy: 1 };
      const direction = getBoidDirection(boid);
      expect(direction).toBeCloseTo(Math.PI / 2);
    });

    test('should return correct angle for left-moving boid', () => {
      const boid: Boid = { id: 0, x: 0, y: 0, vx: -1, vy: 0 };
      const direction = getBoidDirection(boid);
      expect(Math.abs(direction)).toBeCloseTo(Math.PI);
    });

    test('should return correct angle for up-moving boid', () => {
      const boid: Boid = { id: 0, x: 0, y: 0, vx: 0, vy: -1 };
      const direction = getBoidDirection(boid);
      expect(direction).toBeCloseTo(-Math.PI / 2);
    });
  });

  describe('isBoidFacingLeft', () => {
    test('should return true for left-moving boid', () => {
      const boid: Boid = { id: 0, x: 0, y: 0, vx: -1, vy: 0 };
      expect(isBoidFacingLeft(boid)).toBe(true);
    });

    test('should return false for right-moving boid', () => {
      const boid: Boid = { id: 0, x: 0, y: 0, vx: 1, vy: 0 };
      expect(isBoidFacingLeft(boid)).toBe(false);
    });

    test('should return false for stationary boid', () => {
      const boid: Boid = { id: 0, x: 0, y: 0, vx: 0, vy: 0 };
      expect(isBoidFacingLeft(boid)).toBe(false);
    });

    test('should handle diagonal movement', () => {
      const boidUpLeft: Boid = { id: 0, x: 0, y: 0, vx: -1, vy: -1 };
      const boidDownRight: Boid = { id: 1, x: 0, y: 0, vx: 1, vy: 1 };

      expect(isBoidFacingLeft(boidUpLeft)).toBe(true);
      expect(isBoidFacingLeft(boidDownRight)).toBe(false);
    });
  });

  describe('DEFAULT_BOID_CONFIG', () => {
    test('should have valid default values', () => {
      expect(DEFAULT_BOID_CONFIG.separationWeight).toBeGreaterThan(0);
      expect(DEFAULT_BOID_CONFIG.alignmentWeight).toBeGreaterThan(0);
      expect(DEFAULT_BOID_CONFIG.cohesionWeight).toBeGreaterThan(0);
      expect(DEFAULT_BOID_CONFIG.perceptionRadius).toBeGreaterThan(0);
      expect(DEFAULT_BOID_CONFIG.separationRadius).toBeGreaterThan(0);
      expect(DEFAULT_BOID_CONFIG.maxSpeed).toBeGreaterThan(0);
      expect(DEFAULT_BOID_CONFIG.maxForce).toBeGreaterThan(0);
      expect(DEFAULT_BOID_CONFIG.edgeMargin).toBeGreaterThan(0);
      expect(DEFAULT_BOID_CONFIG.edgeForce).toBeGreaterThan(0);
    });

    test('separation radius should be less than perception radius', () => {
      expect(DEFAULT_BOID_CONFIG.separationRadius).toBeLessThan(
        DEFAULT_BOID_CONFIG.perceptionRadius
      );
    });
  });
});
