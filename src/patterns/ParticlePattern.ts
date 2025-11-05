import { Pattern, Cell, Size, Point, Theme } from '../types/index.js';
import { validateCount, validateSpeed, clamp, ensureNonNegative } from '../utils/validation.js';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  trail: Point[]; // Trail of previous positions
}

interface ParticleConfig {
  particleCount: number;
  speed: number;
  gravity: number;
  mouseForce: number;
  spawnRate: number;
}

interface ParticlePreset {
  id: number;
  name: string;
  description: string;
  config: ParticleConfig;
}

export class ParticlePattern implements Pattern {
  name = 'particles';
  private config: ParticleConfig;
  private theme: Theme;
  private particles: Particle[] = [];
  private attractMode: boolean = false; // Toggle between attract/repel
  private particleChars = ['●', '◉', '○', '◐', '◑', '◒', '◓', '•', '∘', '·', '.'];

  private static readonly PRESETS: ParticlePreset[] = [
    {
      id: 1,
      name: 'Gentle Float',
      description: 'Slow particles with minimal gravity',
      config: { particleCount: 80, speed: 0.8, gravity: 0.01, mouseForce: 0.3, spawnRate: 2 }
    },
    {
      id: 2,
      name: 'Standard Physics',
      description: 'Balanced particle simulation',
      config: { particleCount: 100, speed: 1.0, gravity: 0.02, mouseForce: 0.5, spawnRate: 2 }
    },
    {
      id: 3,
      name: 'Heavy Rain',
      description: 'Strong gravity, falling particles',
      config: { particleCount: 150, speed: 1.2, gravity: 0.05, mouseForce: 0.4, spawnRate: 3 }
    },
    {
      id: 4,
      name: 'Zero Gravity',
      description: 'Weightless particles in space',
      config: { particleCount: 120, speed: 1.5, gravity: 0, mouseForce: 0.8, spawnRate: 2 }
    },
    {
      id: 5,
      name: 'Particle Storm',
      description: 'High density, fast-moving chaos',
      config: { particleCount: 200, speed: 1.8, gravity: 0.03, mouseForce: 0.6, spawnRate: 4 }
    },
    {
      id: 6,
      name: 'Minimal Drift',
      description: 'Few particles, subtle movement',
      config: { particleCount: 50, speed: 0.5, gravity: 0.005, mouseForce: 0.2, spawnRate: 1 }
    }
  ];
  
  constructor(theme: Theme, config?: Partial<ParticleConfig>) {
    this.theme = theme;
    const merged = {
      particleCount: 100,
      speed: 1.0,
      gravity: 0.02,
      mouseForce: 0.5,
      spawnRate: 2,
      ...config
    };
    
    // Validate numeric config values
    this.config = {
      particleCount: validateCount(merged.particleCount, 500),
      speed: validateSpeed(merged.speed, 0.1, 5),
      gravity: clamp(merged.gravity, -0.5, 0.5),
      mouseForce: clamp(merged.mouseForce, 0, 2),
      spawnRate: ensureNonNegative(merged.spawnRate, 1)
    };
  }

  reset(): void {
    this.particles = [];
    this.attractMode = false;
  }

  private spawnParticle(size: Size): Particle {
    return {
      x: Math.random() * size.width,
      y: Math.random() * size.height,
      vx: (Math.random() - 0.5) * 2 * this.config.speed,
      vy: (Math.random() - 0.5) * 2 * this.config.speed,
      life: 1.0,
      maxLife: 1.0,
      size: Math.random() * 3,
      trail: []
    };
  }

  render(buffer: Cell[][], _time: number, size: Size, mousePos?: Point): void {
    const { width, height } = size;
    const { particleCount, speed, gravity, mouseForce } = this.config;

    // Spawn new particles if below count
    while (this.particles.length < particleCount) {
      this.particles.push(this.spawnParticle(size));
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      // Apply gravity
      p.vy += gravity * speed;
      
      // Mouse interaction
      if (mousePos) {
        const dx = mousePos.x - p.x;
        const dy = mousePos.y - p.y;
        const distSq = dx * dx + dy * dy;
        const minDist = 100; // Influence radius squared
        
        if (distSq < minDist) {
          const dist = Math.sqrt(distSq);
          const force = (1 - dist / Math.sqrt(minDist)) * mouseForce;
          const angle = Math.atan2(dy, dx);
          
          if (this.attractMode) {
            // Attract to mouse
            p.vx += Math.cos(angle) * force;
            p.vy += Math.sin(angle) * force;
          } else {
            // Repel from mouse
            p.vx -= Math.cos(angle) * force;
            p.vy -= Math.sin(angle) * force;
          }
        }
      }
      
      // Update trail (store previous position before moving)
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 8) {
        p.trail.shift(); // Keep trail length at max 8 positions
      }
      
      // Apply velocity
      p.x += p.vx;
      p.y += p.vy;
      
      // Apply friction
      p.vx *= 0.99;
      p.vy *= 0.99;
      
      // Age particle
      p.life -= 0.002;
      
      // Bounce off walls
      if (p.x < 0) {
        p.x = 0;
        p.vx = Math.abs(p.vx) * 0.8;
      }
      if (p.x >= width) {
        p.x = width - 1;
        p.vx = -Math.abs(p.vx) * 0.8;
      }
      if (p.y < 0) {
        p.y = 0;
        p.vy = Math.abs(p.vy) * 0.8;
      }
      if (p.y >= height) {
        p.y = height - 1;
        p.vy = -Math.abs(p.vy) * 0.8;
      }
      
      // Remove dead particles
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Render particle trails first (so particles draw on top)
    for (const p of this.particles) {
      for (let i = 0; i < p.trail.length; i++) {
        const trailPos = p.trail[i];
        const x = Math.floor(trailPos.x);
        const y = Math.floor(trailPos.y);
        
        if (x >= 0 && x < width && y >= 0 && y < height) {
          // Fade trail based on age (older = dimmer)
          const age = i / p.trail.length; // 0 = oldest, 1 = newest
          const trailIntensity = age * p.life * 0.5; // Trail is dimmer than particle
          const trailChar = '·'; // Small dot for trail
          
          buffer[y][x] = {
            char: trailChar,
            color: this.theme.getColor(trailIntensity)
          };
        }
      }
    }
    
    // Render particles
    for (const p of this.particles) {
      const x = Math.floor(p.x);
      const y = Math.floor(p.y);
      
      if (x >= 0 && x < width && y >= 0 && y < height) {
        // Choose character based on size
        const charIndex = Math.min(
          this.particleChars.length - 1,
          Math.floor(p.size)
        );
        const char = this.particleChars[charIndex];
        
        // Color based on velocity and life
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        const intensity = Math.min(1, (speed / 5) * p.life);
        
        buffer[y][x] = {
          char,
          color: this.theme.getColor(intensity)
        };
      }
    }
  }

  onMouseMove(_pos: Point): void {
    // Mouse position is passed directly to render method
  }

  onMouseClick(pos: Point): void {
    // Toggle between attract and repel mode
    this.attractMode = !this.attractMode;
    
    // Spawn burst of particles at click location
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const speed = 2 + Math.random() * 2;
      this.particles.push({
        x: pos.x,
        y: pos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        maxLife: 1.0,
        size: Math.random() * 3,
        trail: []
      });
    }
  }

  getMetrics(): Record<string, number> {
    return {
      particles: this.particles.length,
      mode: this.attractMode ? 1 : 0 // 1 = attract, 0 = repel
    };
  }

  applyPreset(presetId: number): boolean {
    const preset = ParticlePattern.PRESETS.find(p => p.id === presetId);
    if (!preset) return false;
    
    this.config = { ...preset.config };
    this.reset();
    return true;
  }

  static getPresets(): ParticlePreset[] {
    return [...ParticlePattern.PRESETS];
  }

  static getPreset(id: number): ParticlePreset | undefined {
    return ParticlePattern.PRESETS.find(p => p.id === id);
  }
}
