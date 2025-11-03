import { Pattern, Cell, Size, Point, Theme } from '../types';
import { PerlinNoise } from '../utils/noise';

interface SnowConfig {
  particleCount: number;     // Total particles (20-200)
  fallSpeed: number;         // Downward speed (0.1-2.0)
  windStrength: number;      // Horizontal drift (0-2.0)
  turbulence: number;        // Noise strength (0-2.0)
  rotationSpeed: number;     // Spin rate (0-5.0)
  particleType: 'snow' | 'cherry' | 'autumn' | 'confetti' | 'ash';
  mouseWindForce: number;    // Mouse creates wind (0-5.0)
  accumulation: boolean;     // Particles briefly stick at bottom
}

interface SnowPreset {
  id: number;
  name: string;
  description: string;
  config: SnowConfig;
}

interface Particle {
  x: number;
  y: number;
  vx: number;          // Horizontal velocity
  vy: number;          // Vertical velocity
  rotation: number;    // Current rotation angle (0-360)
  rotationSpeed: number; // Degrees per frame
  char: string;        // Display character
  size: number;        // Visual size (0-3)
  opacity: number;     // 0-1
  accumulated: boolean; // Stuck at bottom?
  accumulationTime: number; // How long stuck
  weight: number;      // Affects fall speed (0.5-2.0)
}

export class SnowPattern implements Pattern {
  name = 'snow';
  private config: SnowConfig;
  private theme: Theme;
  private particles: Particle[] = [];
  private mousePos?: Point;
  private lastTime = 0;
  private noise: PerlinNoise;
  private noiseOffset = 0;
  private windOffset = 0;
  private size: Size = { width: 80, height: 24 };

  private static readonly PRESETS: SnowPreset[] = [
    {
      id: 1,
      name: 'Light Flurries',
      description: 'Gentle snowfall with light wind',
      config: { particleCount: 50, fallSpeed: 0.3, windStrength: 0.5, turbulence: 0.6, rotationSpeed: 1.0, particleType: 'snow', mouseWindForce: 2.0, accumulation: true }
    },
    {
      id: 2,
      name: 'Blizzard',
      description: 'Heavy snow with strong wind',
      config: { particleCount: 150, fallSpeed: 1.2, windStrength: 1.8, turbulence: 1.5, rotationSpeed: 3.0, particleType: 'snow', mouseWindForce: 3.5, accumulation: false }
    },
    {
      id: 3,
      name: 'Cherry Blossoms',
      description: 'Delicate pink petals drifting',
      config: { particleCount: 80, fallSpeed: 0.2, windStrength: 0.8, turbulence: 1.0, rotationSpeed: 2.0, particleType: 'cherry', mouseWindForce: 2.5, accumulation: false }
    },
    {
      id: 4,
      name: 'Autumn Leaves',
      description: 'Colorful falling leaves',
      config: { particleCount: 60, fallSpeed: 0.5, windStrength: 1.2, turbulence: 1.2, rotationSpeed: 2.5, particleType: 'autumn', mouseWindForce: 3.0, accumulation: true }
    },
    {
      id: 5,
      name: 'Confetti',
      description: 'Celebration confetti burst',
      config: { particleCount: 120, fallSpeed: 0.8, windStrength: 0.4, turbulence: 0.8, rotationSpeed: 5.0, particleType: 'confetti', mouseWindForce: 4.0, accumulation: false }
    },
    {
      id: 6,
      name: 'Ash',
      description: 'Floating volcanic ash',
      config: { particleCount: 100, fallSpeed: 0.15, windStrength: 1.5, turbulence: 2.0, rotationSpeed: 0.5, particleType: 'ash', mouseWindForce: 1.5, accumulation: false }
    }
  ];

  constructor(theme: Theme, config?: Partial<SnowConfig>) {
    this.theme = theme;
    this.config = {
      particleCount: 50,
      fallSpeed: 0.3,
      windStrength: 0.5,
      turbulence: 0.6,
      rotationSpeed: 1.0,
      particleType: 'snow',
      mouseWindForce: 2.0,
      accumulation: true,
      ...config
    };
    this.noise = new PerlinNoise();
    this.initializeParticles();
  }

  private initializeParticles(): void {
    this.particles = [];
    for (let i = 0; i < this.config.particleCount; i++) {
      this.particles.push(this.createParticle(true));
    }
  }

  private createParticle(randomY: boolean = false): Particle {
    const chars = this.getParticleChars();
    const char = chars[Math.floor(Math.random() * chars.length)];
    const weight = 0.5 + Math.random() * 1.5;
    
    return {
      x: Math.random() * this.size.width,
      y: randomY ? Math.random() * this.size.height : -1,
      vx: (Math.random() - 0.5) * this.config.windStrength,
      vy: this.config.fallSpeed * weight,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * this.config.rotationSpeed,
      char,
      size: Math.floor(Math.random() * 3),
      opacity: 0.6 + Math.random() * 0.4,
      accumulated: false,
      accumulationTime: 0,
      weight
    };
  }

  private getParticleChars(): string[] {
    switch (this.config.particleType) {
      case 'snow':
        return ['*', '❄', '·', '○', '•', '⋆'];
      case 'cherry':
        return ['🌸', '✿', '❀', '✾', '✽', '⚘'];
      case 'autumn':
        return ['🍂', '🍁', '🍃', '◆', '◇', '❖'];
      case 'confetti':
        return ['▪', '▫', '◾', '◽', '■', '□', '●', '○', '♦', '♢'];
      case 'ash':
        return ['·', '•', '∙', '⋅', '⋆', '˙'];
      default:
        return ['*', '·', '○'];
    }
  }

  private updateParticle(particle: Particle, deltaTime: number): void {
    // Handle accumulated particles at bottom
    if (particle.accumulated) {
      particle.accumulationTime += deltaTime;
      // After 2-5 seconds, remove accumulation
      if (particle.accumulationTime > 2000 + Math.random() * 3000) {
        particle.accumulated = false;
        particle.y = -1;
        particle.vx = (Math.random() - 0.5) * this.config.windStrength;
        particle.accumulationTime = 0;
      }
      return;
    }

    // Perlin noise for turbulence
    const noiseX = this.noise.noise2D(
      particle.x * 0.01 + this.noiseOffset,
      particle.y * 0.01
    );
    const noiseY = this.noise.noise2D(
      particle.x * 0.01 + this.noiseOffset + 100,
      particle.y * 0.01 + 100
    );

    // Wind turbulence
    particle.vx += noiseX * this.config.turbulence * 0.1;
    particle.vy += noiseY * this.config.turbulence * 0.05;

    // Global wind
    const globalWind = Math.sin(this.windOffset) * this.config.windStrength * 0.3;
    particle.vx += globalWind * 0.1;

    // Mouse wind force
    if (this.mousePos) {
      const dx = particle.x - this.mousePos.x;
      const dy = particle.y - this.mousePos.y;
      const distSq = dx * dx + dy * dy;
      const maxDist = 15;
      
      if (distSq < maxDist * maxDist) {
        const dist = Math.sqrt(distSq);
        const force = (1 - dist / maxDist) * this.config.mouseWindForce;
        particle.vx += (dx / dist) * force * 0.2;
        particle.vy += (dy / dist) * force * 0.1;
      }
    }

    // Apply velocities with damping
    particle.x += particle.vx * deltaTime * 0.06;
    particle.y += particle.vy * deltaTime * 0.06;
    
    // Damping
    particle.vx *= 0.98;
    particle.vy = this.config.fallSpeed * particle.weight; // Reset to terminal velocity

    // Rotation
    particle.rotation += particle.rotationSpeed * deltaTime * 0.1;
    if (particle.rotation > 360) particle.rotation -= 360;
    if (particle.rotation < 0) particle.rotation += 360;

    // Wrap horizontal
    if (particle.x < 0) particle.x += this.size.width;
    if (particle.x >= this.size.width) particle.x -= this.size.width;

    // Handle bottom boundary
    if (particle.y >= this.size.height) {
      if (this.config.accumulation && Math.random() < 0.3) {
        // Accumulate at bottom
        particle.accumulated = true;
        particle.y = this.size.height - 1;
        particle.vx = 0;
        particle.vy = 0;
        particle.accumulationTime = 0;
      } else {
        // Respawn at top
        particle.y = -1;
        particle.x = Math.random() * this.size.width;
        particle.vx = (Math.random() - 0.5) * this.config.windStrength;
      }
    }
  }

  render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void {
    this.size = size;
    this.mousePos = mousePos;

    // Calculate delta time
    const deltaTime = this.lastTime === 0 ? 16 : time - this.lastTime;
    this.lastTime = time;

    // Update noise offsets
    this.noiseOffset += deltaTime * 0.0001;
    this.windOffset += deltaTime * 0.001;

    // Update all particles
    for (const particle of this.particles) {
      this.updateParticle(particle, deltaTime);
    }

    // Clear buffer
    for (let y = 0; y < size.height; y++) {
      for (let x = 0; x < size.width; x++) {
        buffer[y][x] = { char: ' ', color: { r: 0, g: 0, b: 0 } };
      }
    }

    // Render particles
    for (const particle of this.particles) {
      const x = Math.floor(particle.x);
      const y = Math.floor(particle.y);

      if (x >= 0 && x < size.width && y >= 0 && y < size.height) {
        // Color based on particle type and theme
        const color = this.getParticleColor(particle);
        
        buffer[y][x] = {
          char: particle.char,
          color
        };
      }
    }
  }

  private getParticleColor(particle: Particle): { r: number; g: number; b: number } {
    const intensity = particle.opacity;
    
    switch (this.config.particleType) {
      case 'snow':
        // White/blue tint
        return {
          r: Math.floor(200 + 55 * intensity),
          g: Math.floor(220 + 35 * intensity),
          b: Math.floor(240 + 15 * intensity)
        };
      case 'cherry':
        // Pink
        return {
          r: Math.floor(255 * intensity),
          g: Math.floor(150 * intensity),
          b: Math.floor(200 * intensity)
        };
      case 'autumn':
        // Orange/red/yellow mix
        const hue = Math.random();
        if (hue < 0.33) {
          return { r: Math.floor(255 * intensity), g: Math.floor(100 * intensity), b: 0 }; // Orange
        } else if (hue < 0.66) {
          return { r: Math.floor(200 * intensity), g: Math.floor(50 * intensity), b: 0 }; // Red
        } else {
          return { r: Math.floor(255 * intensity), g: Math.floor(200 * intensity), b: 0 }; // Yellow
        }
      case 'confetti':
        // Random rainbow colors
        const colors = [
          { r: 255, g: 0, b: 0 },     // Red
          { r: 255, g: 127, b: 0 },   // Orange
          { r: 255, g: 255, b: 0 },   // Yellow
          { r: 0, g: 255, b: 0 },     // Green
          { r: 0, g: 0, b: 255 },     // Blue
          { r: 139, g: 0, b: 255 }    // Purple
        ];
        const color = colors[Math.floor(particle.x * 7) % colors.length];
        return {
          r: Math.floor(color.r * intensity),
          g: Math.floor(color.g * intensity),
          b: Math.floor(color.b * intensity)
        };
      case 'ash':
        // Gray with theme tint
        const baseColor = this.theme.getColor(0.3);
        return {
          r: Math.floor((baseColor.r * 0.3 + 100) * intensity),
          g: Math.floor((baseColor.g * 0.3 + 100) * intensity),
          b: Math.floor((baseColor.b * 0.3 + 100) * intensity)
        };
      default:
        return this.theme.getColor(intensity);
    }
  }

  onMouseMove(pos: Point): void {
    this.mousePos = pos;
  }

  onMouseClick(pos: Point): void {
    // Spawn burst of 20 particles at click position
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const speed = 2 + Math.random() * 2;
      const particle = this.createParticle();
      particle.x = pos.x;
      particle.y = pos.y;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed * 0.5; // Less vertical spread
      this.particles.push(particle);
    }

    // Remove oldest particles if too many
    if (this.particles.length > this.config.particleCount * 2) {
      this.particles.splice(0, 20);
    }
  }

  reset(): void {
    this.particles = [];
    this.mousePos = undefined;
    this.lastTime = 0;
    this.noiseOffset = 0;
    this.windOffset = 0;
    this.noise = new PerlinNoise();
    this.initializeParticles();
  }

  applyPreset(presetId: number): boolean {
    const preset = SnowPattern.PRESETS.find(p => p.id === presetId);
    if (!preset) return false;

    this.config = { ...preset.config };
    this.reset();
    return true;
  }

  static getPresets(): SnowPreset[] {
    return [...SnowPattern.PRESETS];
  }

  static getPreset(id: number): SnowPreset | undefined {
    return SnowPattern.PRESETS.find(p => p.id === id);
  }

  getMetrics(): Record<string, number> {
    const activeParticles = this.particles.filter(p => !p.accumulated).length;
    const accumulatedParticles = this.particles.filter(p => p.accumulated).length;
    const avgVelocity = this.particles.reduce((sum, p) => 
      sum + Math.sqrt(p.vx * p.vx + p.vy * p.vy), 0) / this.particles.length;

    return {
      'Active Particles': activeParticles,
      'Accumulated': accumulatedParticles,
      'Avg Velocity': Math.round(avgVelocity * 100) / 100
    };
  }
}
