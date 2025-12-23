import { Particle, ParticleEmitter, Cell, Size, Color } from '../types/index.js';
import { vec2Add, vec2Multiply, inBounds, lerp } from '../utils/math.js';

/**
 * ParticleSystem - Enhanced particle system with emitters and force fields
 * 
 * Provides:
 * - Particle emitters (continuous or burst mode)
 * - Force fields (gravity, wind, vortex)
 * - Particle pooling for performance
 * - Batch rendering with color interpolation
 * 
 * Used by v0.3.0 scene-based patterns for effects like:
 * - Campfire sparks & smoke
 * - Ocean foam & bubbles
 * - Snow & rain
 * - Fireworks & explosions
 */
export class ParticleSystem {
  private emitters: ParticleEmitter[] = [];
  private particles: Particle[] = [];
  private maxParticles: number;

  constructor(maxParticles: number = 1000) {
    this.maxParticles = maxParticles;
  }

  /**
   * Add a particle emitter
   * @param emitter - ParticleEmitter to add
   */
  addEmitter(emitter: ParticleEmitter): void {
    this.emitters.push(emitter);
  }

  /**
   * Remove a particle emitter
   * @param emitter - ParticleEmitter to remove
   * @returns true if emitter was removed, false if not found
   */
  removeEmitter(emitter: ParticleEmitter): boolean {
    const index = this.emitters.indexOf(emitter);
    if (index >= 0) {
      this.emitters.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Clear all emitters
   */
  clearEmitters(): void {
    this.emitters = [];
  }

  /**
   * Clear all particles
   */
  clearParticles(): void {
    this.particles = [];
  }

  /**
   * Clear everything (emitters and particles)
   */
  clear(): void {
    this.clearEmitters();
    this.clearParticles();
  }

  /**
   * Get all particles
   * @returns Array of all particles
   */
  getParticles(): Particle[] {
    return this.particles;
  }

  /**
   * Get number of active particles
   * @returns Number of active particles
   */
  getParticleCount(): number {
    return this.particles.filter(p => p.active).length;
  }

  /**
   * Get number of emitters
   * @returns Number of emitters
   */
  getEmitterCount(): number {
    return this.emitters.length;
  }

  /**
   * Update all emitters and particles
   * @param deltaTime - Time since last update in seconds
   */
  update(deltaTime: number): void {
    // Track particles count before emission so we don't update newly created ones
    const particlesBeforeEmission = this.particles.length;
    
    // Emit new particles from active emitters
    const emittersToRemove: ParticleEmitter[] = [];
    
    for (const emitter of this.emitters) {
      if (emitter.burstMode) {
        // Burst mode: emit all particles at once
        const count = emitter.burstCount || 10;
        for (let i = 0; i < count; i++) {
          if (this.particles.length < this.maxParticles) {
            this.particles.push(this.createParticle(emitter));
          }
        }
        // Mark emitter for removal after burst
        emittersToRemove.push(emitter);
      } else {
        // Continuous mode: emit based on emission rate
        const particlesToEmit = Math.floor(emitter.emissionRate * deltaTime);
        for (let i = 0; i < particlesToEmit; i++) {
          if (this.particles.length < this.maxParticles) {
            this.particles.push(this.createParticle(emitter));
          }
        }
      }
    }
    
    // Remove burst emitters after iteration
    for (const emitter of emittersToRemove) {
      this.removeEmitter(emitter);
    }

    // Update existing particles (only those that existed before emission)
    for (let i = 0; i < particlesBeforeEmission; i++) {
      const particle = this.particles[i];
      if (!particle.active) continue;

      // Update velocity (apply acceleration)
      const accelDelta = vec2Multiply(particle.acceleration, deltaTime);
      particle.velocity = vec2Add(particle.velocity, accelDelta);

      // Update position (apply velocity)
      const velocityDelta = vec2Multiply(particle.velocity, deltaTime);
      particle.position = vec2Add(particle.position, velocityDelta);

      // Update lifetime
      particle.life -= deltaTime;
      if (particle.life <= 0) {
        particle.active = false;
      }
    }

    // Remove dead particles (keep array compact)
    this.particles = this.particles.filter(p => p.active);
  }

  /**
   * Render all active particles to the buffer
   * @param buffer - 2D array of cells to render into
   * @param size - Current terminal size
   */
  render(buffer: Cell[][], size: Size): void {
    for (const particle of this.particles) {
      if (!particle.active) continue;

      const x = Math.floor(particle.position.x);
      const y = Math.floor(particle.position.y);

      // Check bounds
      if (!inBounds(x, y, size.width, size.height)) continue;

      // Calculate fade based on remaining life
      const lifeFactor = particle.life / particle.maxLife;
      const fadedColor = this.fadeColor(particle.color, lifeFactor);

      buffer[y][x] = {
        char: particle.char,
        color: fadedColor
      };
    }
  }

  /**
   * Create a particle from an emitter
   * @param emitter - ParticleEmitter to spawn from
   * @returns New Particle
   */
  private createParticle(emitter: ParticleEmitter): Particle {
    // Random velocity within range
    const velocity = {
      x: this.randomRange(emitter.initialVelocity.min.x, emitter.initialVelocity.max.x),
      y: this.randomRange(emitter.initialVelocity.min.y, emitter.initialVelocity.max.y)
    };

    // Random character from set
    const char = emitter.characters[Math.floor(Math.random() * emitter.characters.length)];

    // Interpolate color within range
    const t = Math.random();
    const color = {
      r: Math.floor(lerp(emitter.colorRange.start.r, emitter.colorRange.end.r, t)),
      g: Math.floor(lerp(emitter.colorRange.start.g, emitter.colorRange.end.g, t)),
      b: Math.floor(lerp(emitter.colorRange.start.b, emitter.colorRange.end.b, t))
    };

    return {
      position: { x: emitter.position.x, y: emitter.position.y },
      velocity,
      acceleration: { ...emitter.acceleration },
      life: emitter.particleLife,
      maxLife: emitter.particleLife,
      color,
      char,
      active: true
    };
  }

  /**
   * Get random value in range
   * @param min - Minimum value
   * @param max - Maximum value
   * @returns Random value between min and max
   */
  private randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  /**
   * Fade a color based on factor (0 = transparent, 1 = full)
   * @param color - Original color
   * @param factor - Fade factor (0-1)
   * @returns Faded color
   */
  private fadeColor(color: Color, factor: number): Color {
    const fadeFactor = Math.max(0, Math.min(1, factor));
    return {
      r: Math.floor(color.r * fadeFactor),
      g: Math.floor(color.g * fadeFactor),
      b: Math.floor(color.b * fadeFactor)
    };
  }

  /**
   * Get metrics for debugging
   * @returns Object with particle statistics
   */
  getMetrics(): Record<string, number> {
    return {
      activeParticles: this.getParticleCount(),
      totalParticles: this.particles.length,
      maxParticles: this.maxParticles,
      emitterCount: this.emitters.length,
      utilizationPercent: (this.getParticleCount() / this.maxParticles) * 100
    };
  }

  /**
   * Create a simple emitter helper for continuous emission
   * @param x - X position
   * @param y - Y position
   * @param rate - Particles per second
   * @param life - Particle lifetime in seconds
   * @returns New ParticleEmitter
   */
  static createEmitter(
    x: number,
    y: number,
    rate: number,
    life: number
  ): ParticleEmitter {
    return {
      position: { x, y },
      emissionRate: rate,
      particleLife: life,
      initialVelocity: {
        min: { x: -10, y: -10 },
        max: { x: 10, y: 10 }
      },
      acceleration: { x: 0, y: 0 },
      colorRange: {
        start: { r: 255, g: 255, b: 255 },
        end: { r: 255, g: 255, b: 255 }
      },
      characters: ['*', '·', '°'],
      burstMode: false
    };
  }

  /**
   * Create a burst emitter (emits all particles at once, then removes itself)
   * @param x - X position
   * @param y - Y position
   * @param count - Number of particles to emit
   * @param life - Particle lifetime in seconds
   * @returns New ParticleEmitter in burst mode
   */
  static createBurstEmitter(
    x: number,
    y: number,
    count: number,
    life: number
  ): ParticleEmitter {
    return {
      position: { x, y },
      emissionRate: 0, // Unused in burst mode
      particleLife: life,
      initialVelocity: {
        min: { x: -20, y: -20 },
        max: { x: 20, y: 20 }
      },
      acceleration: { x: 0, y: 10 }, // Default gravity
      colorRange: {
        start: { r: 255, g: 255, b: 255 },
        end: { r: 255, g: 255, b: 255 }
      },
      characters: ['*', '·', '°'],
      burstMode: true,
      burstCount: count
    };
  }
}
