import { describe, it, expect, beforeEach } from '@jest/globals';
import { ParticleSystem } from '../../../src/engine/ParticleSystem.js';
import { ParticleEmitter, Cell, Size } from '../../../src/types/index.js';

describe('ParticleSystem', () => {
  let particleSystem: ParticleSystem;
  let mockSize: Size;
  let mockBuffer: Cell[][];

  beforeEach(() => {
    particleSystem = new ParticleSystem(1000);
    mockSize = { width: 80, height: 24 };
    mockBuffer = Array(24).fill(null).map(() =>
      Array(80).fill(null).map(() => ({ char: ' ', color: { r: 0, g: 0, b: 0 } }))
    );
  });

  describe('constructor', () => {
    it('should create an empty particle system with default max particles', () => {
      const ps = new ParticleSystem();
      expect(ps.getParticleCount()).toBe(0);
      expect(ps.getEmitterCount()).toBe(0);
    });

    it('should create particle system with custom max particles', () => {
      const ps = new ParticleSystem(500);
      const metrics = ps.getMetrics();
      expect(metrics.maxParticles).toBe(500);
    });
  });

  describe('addEmitter', () => {
    it('should add a continuous emitter', () => {
      const emitter = ParticleSystem.createEmitter(10, 10, 10, 1.0);
      particleSystem.addEmitter(emitter);

      expect(particleSystem.getEmitterCount()).toBe(1);
    });

    it('should add multiple emitters', () => {
      const emitter1 = ParticleSystem.createEmitter(10, 10, 10, 1.0);
      const emitter2 = ParticleSystem.createEmitter(20, 20, 20, 2.0);

      particleSystem.addEmitter(emitter1);
      particleSystem.addEmitter(emitter2);

      expect(particleSystem.getEmitterCount()).toBe(2);
    });

    it('should add a burst emitter', () => {
      const emitter = ParticleSystem.createBurstEmitter(10, 10, 50, 1.0);
      particleSystem.addEmitter(emitter);

      expect(particleSystem.getEmitterCount()).toBe(1);
    });
  });

  describe('removeEmitter', () => {
    it('should remove an emitter', () => {
      const emitter = ParticleSystem.createEmitter(10, 10, 10, 1.0);
      particleSystem.addEmitter(emitter);

      const result = particleSystem.removeEmitter(emitter);
      expect(result).toBe(true);
      expect(particleSystem.getEmitterCount()).toBe(0);
    });

    it('should return false when removing non-existent emitter', () => {
      const emitter = ParticleSystem.createEmitter(10, 10, 10, 1.0);
      const result = particleSystem.removeEmitter(emitter);
      expect(result).toBe(false);
    });

    it('should only remove the specified emitter', () => {
      const emitter1 = ParticleSystem.createEmitter(10, 10, 10, 1.0);
      const emitter2 = ParticleSystem.createEmitter(20, 20, 20, 2.0);

      particleSystem.addEmitter(emitter1);
      particleSystem.addEmitter(emitter2);

      particleSystem.removeEmitter(emitter1);
      expect(particleSystem.getEmitterCount()).toBe(1);
    });
  });

  describe('clearEmitters', () => {
    it('should remove all emitters', () => {
      particleSystem.addEmitter(ParticleSystem.createEmitter(10, 10, 10, 1.0));
      particleSystem.addEmitter(ParticleSystem.createEmitter(20, 20, 20, 2.0));

      particleSystem.clearEmitters();
      expect(particleSystem.getEmitterCount()).toBe(0);
    });
  });

  describe('clearParticles', () => {
    it('should remove all particles', () => {
      const emitter = ParticleSystem.createEmitter(10, 10, 100, 1.0);
      particleSystem.addEmitter(emitter);

      // Emit some particles
      particleSystem.update(0.1);
      expect(particleSystem.getParticleCount()).toBeGreaterThan(0);

      particleSystem.clearParticles();
      expect(particleSystem.getParticleCount()).toBe(0);
      expect(particleSystem.getEmitterCount()).toBe(1); // Emitter still exists
    });
  });

  describe('clear', () => {
    it('should remove all emitters and particles', () => {
      const emitter = ParticleSystem.createEmitter(10, 10, 100, 1.0);
      particleSystem.addEmitter(emitter);
      particleSystem.update(0.1);

      particleSystem.clear();
      expect(particleSystem.getEmitterCount()).toBe(0);
      expect(particleSystem.getParticleCount()).toBe(0);
    });
  });

  describe('update - continuous emission', () => {
    it('should emit particles based on emission rate', () => {
      const emitter = ParticleSystem.createEmitter(10, 10, 10, 1.0); // 10 particles/sec
      particleSystem.addEmitter(emitter);

      // Update for 1 second
      particleSystem.update(1.0);

      // Should have emitted ~10 particles
      expect(particleSystem.getParticleCount()).toBe(10);
    });

    it('should emit particles over multiple updates', () => {
      const emitter = ParticleSystem.createEmitter(10, 10, 60, 1.0); // 60 particles/sec
      particleSystem.addEmitter(emitter);

      // Update for 0.1 seconds (should emit 6 particles)
      particleSystem.update(0.1);
      expect(particleSystem.getParticleCount()).toBe(6);

      // Update again (should emit 6 more)
      particleSystem.update(0.1);
      expect(particleSystem.getParticleCount()).toBe(12);
    });

    it('should respect max particle limit', () => {
      const smallSystem = new ParticleSystem(50); // Max 50 particles
      const emitter = ParticleSystem.createEmitter(10, 10, 100, 1.0); // 100 particles/sec
      smallSystem.addEmitter(emitter);

      // Try to emit way more than max
      smallSystem.update(1.0);

      // Should cap at max
      expect(smallSystem.getParticleCount()).toBe(50);
    });

    it('should not emit particles if emission rate is 0', () => {
      const emitter = ParticleSystem.createEmitter(10, 10, 0, 1.0);
      particleSystem.addEmitter(emitter);

      particleSystem.update(1.0);
      expect(particleSystem.getParticleCount()).toBe(0);
    });
  });

  describe('update - burst emission', () => {
    it('should emit all particles at once in burst mode', () => {
      const emitter = ParticleSystem.createBurstEmitter(10, 10, 30, 1.0);
      particleSystem.addEmitter(emitter);

      particleSystem.update(0.016); // Single frame

      // Should emit all 30 particles
      expect(particleSystem.getParticleCount()).toBe(30);
    });

    it('should remove emitter after burst', () => {
      const emitter = ParticleSystem.createBurstEmitter(10, 10, 30, 1.0);
      particleSystem.addEmitter(emitter);

      expect(particleSystem.getEmitterCount()).toBe(1);
      particleSystem.update(0.016);

      // Emitter should be removed after burst
      expect(particleSystem.getEmitterCount()).toBe(0);
      expect(particleSystem.getParticleCount()).toBe(30);
    });

    it('should respect max particle limit in burst mode', () => {
      const smallSystem = new ParticleSystem(20);
      const emitter = ParticleSystem.createBurstEmitter(10, 10, 50, 1.0); // Try to emit 50
      smallSystem.addEmitter(emitter);

      smallSystem.update(0.016);

      // Should cap at max
      expect(smallSystem.getParticleCount()).toBe(20);
    });
  });

  describe('update - particle physics', () => {
    it('should update particle position based on velocity', () => {
      const emitter: ParticleEmitter = {
        position: { x: 10, y: 10 },
        emissionRate: 1,
        particleLife: 10,
        initialVelocity: {
          min: { x: 10, y: 5 },
          max: { x: 10, y: 5 }
        },
        acceleration: { x: 0, y: 0 },
        colorRange: {
          start: { r: 255, g: 255, b: 255 },
          end: { r: 255, g: 255, b: 255 }
        },
        characters: ['*'],
        burstMode: true,
        burstCount: 1
      };

      particleSystem.addEmitter(emitter);
      particleSystem.update(0.016); // Emit particle

      const particles = particleSystem.getParticles();
      expect(particles.length).toBe(1);

      const initialX = particles[0].position.x;
      const initialY = particles[0].position.y;

      // Update for 1 second
      particleSystem.update(1.0);

      // Position should have moved by velocity * deltaTime
      expect(particles[0].position.x).toBeCloseTo(initialX + 10, 0);
      expect(particles[0].position.y).toBeCloseTo(initialY + 5, 0);
    });

    it('should apply acceleration to velocity', () => {
      const emitter: ParticleEmitter = {
        position: { x: 10, y: 10 },
        emissionRate: 1,
        particleLife: 10,
        initialVelocity: {
          min: { x: 0, y: 0 },
          max: { x: 0, y: 0 }
        },
        acceleration: { x: 0, y: 10 }, // Gravity
        colorRange: {
          start: { r: 255, g: 255, b: 255 },
          end: { r: 255, g: 255, b: 255 }
        },
        characters: ['*'],
        burstMode: true,
        burstCount: 1
      };

      particleSystem.addEmitter(emitter);
      particleSystem.update(0.016);

      const particles = particleSystem.getParticles();
      const initialVelocityY = particles[0].velocity.y;

      // Update for 1 second
      particleSystem.update(1.0);

      // Velocity should have increased by acceleration * deltaTime
      expect(particles[0].velocity.y).toBeCloseTo(initialVelocityY + 10, 0);
    });

    it('should update particle lifetime', () => {
      const emitter = ParticleSystem.createBurstEmitter(10, 10, 1, 2.0); // 2 second lifetime
      particleSystem.addEmitter(emitter);
      particleSystem.update(0.016);

      const particles = particleSystem.getParticles();
      expect(particles[0].life).toBeCloseTo(2.0, 1);

      // Update for 1 second
      particleSystem.update(1.0);
      expect(particles[0].life).toBeCloseTo(1.0, 1);
    });

    it('should deactivate particles when lifetime expires', () => {
      const emitter = ParticleSystem.createBurstEmitter(10, 10, 1, 0.5); // 0.5 second lifetime
      particleSystem.addEmitter(emitter);
      particleSystem.update(0.016);

      expect(particleSystem.getParticleCount()).toBe(1);

      // Update past lifetime
      particleSystem.update(1.0);

      // Particle should be removed
      expect(particleSystem.getParticleCount()).toBe(0);
    });

    it('should remove dead particles from array', () => {
      const emitter = ParticleSystem.createBurstEmitter(10, 10, 3, 0.1);
      particleSystem.addEmitter(emitter);
      particleSystem.update(0.016);

      const particles = particleSystem.getParticles();
      expect(particles.length).toBe(3);

      // Update past lifetime
      particleSystem.update(0.2);

      // All particles should be removed
      expect(particleSystem.getParticles().length).toBe(0);
    });
  });

  describe('render', () => {
    it('should render particles to buffer', () => {
      const emitter: ParticleEmitter = {
        position: { x: 10, y: 10 },
        emissionRate: 1,
        particleLife: 10,
        initialVelocity: {
          min: { x: 0, y: 0 },
          max: { x: 0, y: 0 }
        },
        acceleration: { x: 0, y: 0 },
        colorRange: {
          start: { r: 255, g: 100, b: 50 },
          end: { r: 255, g: 100, b: 50 }
        },
        characters: ['*'],
        burstMode: true,
        burstCount: 1
      };

      particleSystem.addEmitter(emitter);
      particleSystem.update(0.016);
      particleSystem.render(mockBuffer, mockSize);

      const cell = mockBuffer[10][10];
      expect(cell).toBeDefined();
      expect(cell.char).toBe('*');
      expect(cell.color).toBeDefined();
      expect(cell.color!.r).toBeGreaterThan(0);
    });

    it('should render multiple particles', () => {
      const emitter1: ParticleEmitter = {
        position: { x: 5, y: 5 },
        emissionRate: 1,
        particleLife: 10,
        initialVelocity: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
        acceleration: { x: 0, y: 0 },
        colorRange: {
          start: { r: 255, g: 0, b: 0 },
          end: { r: 255, g: 0, b: 0 }
        },
        characters: ['A'],
        burstMode: true,
        burstCount: 1
      };

      const emitter2: ParticleEmitter = {
        position: { x: 15, y: 15 },
        emissionRate: 1,
        particleLife: 10,
        initialVelocity: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
        acceleration: { x: 0, y: 0 },
        colorRange: {
          start: { r: 0, g: 255, b: 0 },
          end: { r: 0, g: 255, b: 0 }
        },
        characters: ['B'],
        burstMode: true,
        burstCount: 1
      };

      particleSystem.addEmitter(emitter1);
      particleSystem.addEmitter(emitter2);
      particleSystem.update(0.016);
      particleSystem.render(mockBuffer, mockSize);

      expect(mockBuffer[5][5].char).toBe('A');
      expect(mockBuffer[15][15].char).toBe('B');
    });

    it('should apply color fade based on remaining lifetime', () => {
      const emitter: ParticleEmitter = {
        position: { x: 10, y: 10 },
        emissionRate: 1,
        particleLife: 1.0,
        initialVelocity: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
        acceleration: { x: 0, y: 0 },
        colorRange: {
          start: { r: 255, g: 255, b: 255 },
          end: { r: 255, g: 255, b: 255 }
        },
        characters: ['*'],
        burstMode: true,
        burstCount: 1
      };

      particleSystem.addEmitter(emitter);
      particleSystem.update(0.016);

      // Render at full life
      particleSystem.render(mockBuffer, mockSize);
      const fullLifeCell = mockBuffer[10][10];
      expect(fullLifeCell).toBeDefined();
      expect(fullLifeCell.color).toBeDefined();
      const fullLifeColor = fullLifeCell.color!.r;

      // Update to half life
      particleSystem.update(0.5);
      particleSystem.render(mockBuffer, mockSize);
      const halfLifeCell = mockBuffer[10][10];
      expect(halfLifeCell).toBeDefined();
      expect(halfLifeCell.color).toBeDefined();
      const halfLifeColor = halfLifeCell.color!.r;

      // Color should fade
      expect(halfLifeColor).toBeLessThan(fullLifeColor);
    });

    it('should skip inactive particles', () => {
      const emitter = ParticleSystem.createBurstEmitter(10, 10, 1, 0.1);
      particleSystem.addEmitter(emitter);
      particleSystem.update(0.016);

      // Particle exists
      particleSystem.render(mockBuffer, mockSize);
      expect(mockBuffer[10][10].char).not.toBe(' ');

      // Kill particle
      particleSystem.update(0.2);

      // Reset buffer
      mockBuffer = Array(24).fill(null).map(() =>
        Array(80).fill(null).map(() => ({ char: ' ', color: { r: 0, g: 0, b: 0 } }))
      );

      // Should not render
      particleSystem.render(mockBuffer, mockSize);
      expect(mockBuffer[10][10].char).toBe(' ');
    });

    it('should clip particles outside buffer bounds', () => {
      const emitter1: ParticleEmitter = {
        position: { x: -10, y: -10 }, // Off top-left
        emissionRate: 1,
        particleLife: 10,
        initialVelocity: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
        acceleration: { x: 0, y: 0 },
        colorRange: {
          start: { r: 255, g: 255, b: 255 },
          end: { r: 255, g: 255, b: 255 }
        },
        characters: ['*'],
        burstMode: true,
        burstCount: 1
      };

      const emitter2: ParticleEmitter = {
        position: { x: 100, y: 100 }, // Off bottom-right
        emissionRate: 1,
        particleLife: 10,
        initialVelocity: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
        acceleration: { x: 0, y: 0 },
        colorRange: {
          start: { r: 255, g: 255, b: 255 },
          end: { r: 255, g: 255, b: 255 }
        },
        characters: ['*'],
        burstMode: true,
        burstCount: 1
      };

      particleSystem.addEmitter(emitter1);
      particleSystem.addEmitter(emitter2);
      particleSystem.update(0.016);

      // Should not crash
      expect(() => particleSystem.render(mockBuffer, mockSize)).not.toThrow();
    });

    it('should handle fractional positions (floor to integer)', () => {
      const emitter: ParticleEmitter = {
        position: { x: 10.7, y: 10.3 },
        emissionRate: 1,
        particleLife: 10,
        initialVelocity: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
        acceleration: { x: 0, y: 0 },
        colorRange: {
          start: { r: 255, g: 255, b: 255 },
          end: { r: 255, g: 255, b: 255 }
        },
        characters: ['*'],
        burstMode: true,
        burstCount: 1
      };

      particleSystem.addEmitter(emitter);
      particleSystem.update(0.016);
      particleSystem.render(mockBuffer, mockSize);

      // Should floor to (10, 10)
      expect(mockBuffer[10][10].char).toBe('*');
    });
  });

  describe('particle creation', () => {
    it('should create particles with random velocity within range', () => {
      const emitter: ParticleEmitter = {
        position: { x: 10, y: 10 },
        emissionRate: 1,
        particleLife: 10,
        initialVelocity: {
          min: { x: -10, y: -10 },
          max: { x: 10, y: 10 }
        },
        acceleration: { x: 0, y: 0 },
        colorRange: {
          start: { r: 255, g: 255, b: 255 },
          end: { r: 255, g: 255, b: 255 }
        },
        characters: ['*'],
        burstMode: true,
        burstCount: 10
      };

      particleSystem.addEmitter(emitter);
      particleSystem.update(0.016);

      const particles = particleSystem.getParticles();
      for (const particle of particles) {
        expect(particle.velocity.x).toBeGreaterThanOrEqual(-10);
        expect(particle.velocity.x).toBeLessThanOrEqual(10);
        expect(particle.velocity.y).toBeGreaterThanOrEqual(-10);
        expect(particle.velocity.y).toBeLessThanOrEqual(10);
      }
    });

    it('should create particles with random character from set', () => {
      const emitter: ParticleEmitter = {
        position: { x: 10, y: 10 },
        emissionRate: 1,
        particleLife: 10,
        initialVelocity: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
        acceleration: { x: 0, y: 0 },
        colorRange: {
          start: { r: 255, g: 255, b: 255 },
          end: { r: 255, g: 255, b: 255 }
        },
        characters: ['A', 'B', 'C'],
        burstMode: true,
        burstCount: 20
      };

      particleSystem.addEmitter(emitter);
      particleSystem.update(0.016);

      const particles = particleSystem.getParticles();
      const chars = new Set(particles.map(p => p.char));
      
      // Should have used characters from the set
      for (const char of chars) {
        expect(['A', 'B', 'C']).toContain(char);
      }
    });

    it('should interpolate color within range', () => {
      const emitter: ParticleEmitter = {
        position: { x: 10, y: 10 },
        emissionRate: 1,
        particleLife: 10,
        initialVelocity: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
        acceleration: { x: 0, y: 0 },
        colorRange: {
          start: { r: 100, g: 100, b: 100 },
          end: { r: 200, g: 200, b: 200 }
        },
        characters: ['*'],
        burstMode: true,
        burstCount: 10
      };

      particleSystem.addEmitter(emitter);
      particleSystem.update(0.016);

      const particles = particleSystem.getParticles();
      for (const particle of particles) {
        expect(particle.color.r).toBeGreaterThanOrEqual(100);
        expect(particle.color.r).toBeLessThanOrEqual(200);
        expect(particle.color.g).toBeGreaterThanOrEqual(100);
        expect(particle.color.g).toBeLessThanOrEqual(200);
        expect(particle.color.b).toBeGreaterThanOrEqual(100);
        expect(particle.color.b).toBeLessThanOrEqual(200);
      }
    });

    it('should set particle lifetime from emitter', () => {
      const emitter = ParticleSystem.createBurstEmitter(10, 10, 5, 3.5);
      particleSystem.addEmitter(emitter);
      particleSystem.update(0.016);

      const particles = particleSystem.getParticles();
      for (const particle of particles) {
        expect(particle.life).toBeCloseTo(3.5, 1);
        expect(particle.maxLife).toBe(3.5);
      }
    });

    it('should set all particles as active initially', () => {
      const emitter = ParticleSystem.createBurstEmitter(10, 10, 10, 1.0);
      particleSystem.addEmitter(emitter);
      particleSystem.update(0.016);

      const particles = particleSystem.getParticles();
      for (const particle of particles) {
        expect(particle.active).toBe(true);
      }
    });
  });

  describe('getMetrics', () => {
    it('should return correct metrics', () => {
      const emitter = ParticleSystem.createEmitter(10, 10, 50, 1.0);
      particleSystem.addEmitter(emitter);
      particleSystem.update(0.5); // Emit ~25 particles

      const metrics = particleSystem.getMetrics();
      expect(metrics.emitterCount).toBe(1);
      expect(metrics.activeParticles).toBe(25);
      expect(metrics.totalParticles).toBe(25);
      expect(metrics.maxParticles).toBe(1000);
      expect(metrics.utilizationPercent).toBeCloseTo(2.5, 1);
    });

    it('should return zero metrics for empty system', () => {
      const metrics = particleSystem.getMetrics();
      expect(metrics.emitterCount).toBe(0);
      expect(metrics.activeParticles).toBe(0);
      expect(metrics.totalParticles).toBe(0);
      expect(metrics.utilizationPercent).toBe(0);
    });

    it('should show 100% utilization when at max', () => {
      const smallSystem = new ParticleSystem(50);
      const emitter = ParticleSystem.createEmitter(10, 10, 100, 1.0);
      smallSystem.addEmitter(emitter);
      smallSystem.update(1.0);

      const metrics = smallSystem.getMetrics();
      expect(metrics.activeParticles).toBe(50);
      expect(metrics.utilizationPercent).toBe(100);
    });
  });

  describe('createEmitter helper', () => {
    it('should create continuous emitter with default values', () => {
      const emitter = ParticleSystem.createEmitter(15, 25, 30, 2.5);

      expect(emitter.position).toEqual({ x: 15, y: 25 });
      expect(emitter.emissionRate).toBe(30);
      expect(emitter.particleLife).toBe(2.5);
      expect(emitter.burstMode).toBe(false);
      expect(emitter.characters).toEqual(['*', '·', '°']);
      expect(emitter.colorRange.start).toEqual({ r: 255, g: 255, b: 255 });
    });
  });

  describe('createBurstEmitter helper', () => {
    it('should create burst emitter with default values', () => {
      const emitter = ParticleSystem.createBurstEmitter(20, 30, 40, 1.5);

      expect(emitter.position).toEqual({ x: 20, y: 30 });
      expect(emitter.burstCount).toBe(40);
      expect(emitter.particleLife).toBe(1.5);
      expect(emitter.burstMode).toBe(true);
      expect(emitter.acceleration).toEqual({ x: 0, y: 10 }); // Default gravity
      expect(emitter.characters).toEqual(['*', '·', '°']);
    });
  });

  describe('integration', () => {
    it('should handle complete lifecycle', () => {
      // Add continuous emitter
      const continuous = ParticleSystem.createEmitter(10, 10, 50, 2.0);
      particleSystem.addEmitter(continuous);

      // Update - should emit particles
      particleSystem.update(0.2); // ~10 particles
      expect(particleSystem.getParticleCount()).toBeGreaterThan(5);

      // Add burst emitter
      const burst = ParticleSystem.createBurstEmitter(20, 20, 20, 1.0);
      particleSystem.addEmitter(burst);

      expect(particleSystem.getEmitterCount()).toBe(2);

      // Update - burst should emit and remove itself
      particleSystem.update(0.016);
      expect(particleSystem.getEmitterCount()).toBe(1); // Burst removed
      expect(particleSystem.getParticleCount()).toBeGreaterThan(20);

      // Render
      particleSystem.render(mockBuffer, mockSize);
      
      // Check that some particles rendered
      let renderedCount = 0;
      for (let y = 0; y < mockSize.height; y++) {
        for (let x = 0; x < mockSize.width; x++) {
          if (mockBuffer[y][x].char !== ' ') {
            renderedCount++;
          }
        }
      }
      expect(renderedCount).toBeGreaterThan(0);

      // Remove continuous emitter so it stops creating particles
      particleSystem.removeEmitter(continuous);
      
      // Update past lifetime (all existing particles should die)
      particleSystem.update(3.0);
      expect(particleSystem.getParticleCount()).toBe(0);

      // Clear everything
      particleSystem.clear();
      expect(particleSystem.getEmitterCount()).toBe(0);
      expect(particleSystem.getParticleCount()).toBe(0);
    });

    it('should simulate gravity with acceleration', () => {
      const emitter: ParticleEmitter = {
        position: { x: 10, y: 0 },
        emissionRate: 1,
        particleLife: 10,
        initialVelocity: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
        acceleration: { x: 0, y: 50 }, // Strong gravity
        colorRange: {
          start: { r: 255, g: 255, b: 255 },
          end: { r: 255, g: 255, b: 255 }
        },
        characters: ['*'],
        burstMode: true,
        burstCount: 1
      };

      particleSystem.addEmitter(emitter);
      particleSystem.update(0.016);

      const particles = particleSystem.getParticles();
      expect(particles.length).toBe(1);
      const initialY = particles[0].position.y;

      // Update for multiple frames
      for (let i = 0; i < 5; i++) {
        particleSystem.update(0.1);
      }

      const finalY = particles[0].position.y;

      // Should fall down (Y increases)
      expect(finalY).toBeGreaterThan(initialY);
    });

    it('should handle multiple emitters with different settings', () => {
      // Fast emitter
      const fast = ParticleSystem.createEmitter(10, 10, 100, 0.5);
      // Slow emitter
      const slow = ParticleSystem.createEmitter(20, 20, 10, 5.0);

      particleSystem.addEmitter(fast);
      particleSystem.addEmitter(slow);

      particleSystem.update(0.5);

      // Fast emitter should emit more
      const metrics = particleSystem.getMetrics();
      expect(metrics.activeParticles).toBeGreaterThan(50);
    });
  });
});
