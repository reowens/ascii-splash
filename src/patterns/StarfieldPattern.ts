import { Pattern, Cell, Size, Point, Theme } from '../types';

interface Star {
  x: number;
  y: number;
  z: number; // Depth (distance from viewer)
  speed: number;
}

interface StarConfig {
  starCount: number;
  speed: number;
  mouseRepelRadius: number;
}

interface StarfieldPreset {
  id: number;
  name: string;
  description: string;
  config: StarConfig;
}

export class StarfieldPattern implements Pattern {
  name = 'starfield';
  private config: StarConfig;
  private theme: Theme;
  private stars: Star[] = [];
  private starChars = ['.', '·', '*', '✦', '✧', '★'];
  private explosions: Array<{ x: number; y: number; time: number; particles: Array<{ dx: number; dy: number }> }> = [];
  private currentTime: number = 0;

  private static readonly PRESETS: StarfieldPreset[] = [
    {
      id: 1,
      name: 'Deep Space',
      description: 'Sparse, slow-moving stars',
      config: { starCount: 50, speed: 0.5, mouseRepelRadius: 8 }
    },
    {
      id: 2,
      name: 'Warp Speed',
      description: 'Hyperspace jump effect',
      config: { starCount: 200, speed: 3.0, mouseRepelRadius: 3 }
    },
    {
      id: 3,
      name: 'Asteroid Field',
      description: 'Dense, medium-speed navigation',
      config: { starCount: 150, speed: 1.5, mouseRepelRadius: 10 }
    },
    {
      id: 4,
      name: 'Milky Way',
      description: 'Balanced cosmic view',
      config: { starCount: 120, speed: 0.8, mouseRepelRadius: 6 }
    },
    {
      id: 5,
      name: 'Nebula Drift',
      description: 'Slow, dense starfield',
      config: { starCount: 180, speed: 0.4, mouseRepelRadius: 12 }
    },
    {
      id: 6,
      name: 'Photon Torpedo',
      description: 'Fast, sparse streaks',
      config: { starCount: 80, speed: 2.5, mouseRepelRadius: 4 }
    }
  ];

  constructor(theme: Theme, config?: Partial<StarConfig>) {
    this.theme = theme;
    this.config = {
      starCount: 100,
      speed: 1.0,
      mouseRepelRadius: 5,
      ...config
    };
  }

  applyPreset(presetId: number): boolean {
    const preset = StarfieldPattern.PRESETS.find(p => p.id === presetId);
    if (!preset) {
      return false;
    }
    
    this.config = { ...preset.config };
    this.stars = []; // Recreate stars with new count
    return true;
  }

  static getPresets(): StarfieldPreset[] {
    return [...StarfieldPattern.PRESETS];
  }

  static getPreset(id: number): StarfieldPreset | undefined {
    return StarfieldPattern.PRESETS.find(p => p.id === id);
  }

  private initStars(size: Size): void {
    if (this.stars.length === 0) {
      for (let i = 0; i < this.config.starCount; i++) {
        this.stars.push(this.createStar(size));
      }
    }
  }

  private createStar(size: Size): Star {
    return {
      x: Math.random() * size.width - size.width / 2,
      y: Math.random() * size.height - size.height / 2,
      z: Math.random() * 10 + 1,
      speed: Math.random() * 0.5 + 0.5
    };
  }

  render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void {
    const { width, height } = size;
    const { speed, mouseRepelRadius } = this.config;
    // Track current time for explosions
    this.currentTime = time;

    this.initStars(size);

    // Clear buffer
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        buffer[y][x] = { char: ' ' };
      }
    }

    // Update and render stars
    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      
      // Move star toward viewer
      star.z -= speed * star.speed * 0.02;
      
      // Reset star if it's too close
      if (star.z <= 0.1) {
        this.stars[i] = this.createStar(size);
        continue;
      }

      // Project 3D position to 2D screen
      const scale = 10 / star.z;
      let screenX = Math.floor((star.x * scale) + width / 2);
      let screenY = Math.floor((star.y * scale) + height / 2);

      // Apply mouse repulsion
      if (mousePos) {
        const dx = screenX - mousePos.x;
        const dy = screenY - mousePos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < mouseRepelRadius && dist > 0) {
          const force = (mouseRepelRadius - dist) / mouseRepelRadius;
          screenX += Math.floor((dx / dist) * force * 3);
          screenY += Math.floor((dy / dist) * force * 3);
        }
      }

      // Check if star is on screen
      if (screenX >= 0 && screenX < width && screenY >= 0 && screenY < height) {
        // Determine star size based on depth
        const depth = 1 / star.z;
        let charIndex = 0;
        let colorIntensity = 0;
        
        if (depth > 0.9) {
          charIndex = 5; // Closest - biggest
          colorIntensity = 1.0;
        } else if (depth > 0.7) {
          charIndex = 4;
          colorIntensity = 0.85;
        } else if (depth > 0.5) {
          charIndex = 3;
          colorIntensity = 0.65;
        } else if (depth > 0.3) {
          charIndex = 2;
          colorIntensity = 0.45;
        } else if (depth > 0.15) {
          charIndex = 1;
          colorIntensity = 0.25;
        }

        buffer[screenY][screenX] = {
          char: this.starChars[charIndex],
          color: this.theme.getColor(colorIntensity)
        };
      }
    }

    // Render explosions
    const currentTime = this.currentTime;
    for (const explosion of this.explosions) {
      const age = currentTime - explosion.time;
      const maxAge = 1000;
      
      if (age < maxAge) {
        const progress = age / maxAge;
        const radius = progress * 10;
        
        for (const particle of explosion.particles) {
          const px = Math.floor(explosion.x + particle.dx * radius);
          const py = Math.floor(explosion.y + particle.dy * radius);
          
          if (px >= 0 && px < width && py >= 0 && py < height) {
            const brightness = Math.floor(255 * (1 - progress));
            buffer[py][px] = {
              char: '*',
              color: { r: brightness, g: brightness, b: brightness }
            };
          }
        }
      }
    }

    // Clean up old explosions
    this.explosions = this.explosions.filter(e => currentTime - e.time < 1000);
  }

  onMouseMove(pos: Point): void {
    // Mouse movement handled in render via repulsion
  }

  onMouseClick(pos: Point): void {
    // Create explosion burst
    const particles: Array<{ dx: number; dy: number }> = [];
    const particleCount = 12;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      particles.push({
        dx: Math.cos(angle),
        dy: Math.sin(angle)
      });
    }

    this.explosions.push({
      x: pos.x,
      y: pos.y,
      time: this.currentTime || Date.now(), // Use currentTime if available, otherwise Date.now()
      particles
    });
  }

  reset(): void {
    this.stars = [];
    this.explosions = [];
  }

  getMetrics(): Record<string, number> {
    // Calculate depth statistics
    const avgDepth = this.stars.length > 0
      ? this.stars.reduce((sum, star) => sum + star.z, 0) / this.stars.length
      : 0;
    const minDepth = this.stars.length > 0
      ? Math.min(...this.stars.map(star => star.z))
      : 0;
    const maxDepth = this.stars.length > 0
      ? Math.max(...this.stars.map(star => star.z))
      : 0;
    
    // Count total explosion particles
    const explosionParticles = this.explosions.reduce((sum, exp) => sum + exp.particles.length, 0);
    
    return {
      stars: this.stars.length,
      explosions: this.explosions.length,
      explosionParticles,
      avgDepth: Math.round(avgDepth * 100) / 100,
      minDepth: Math.round(minDepth * 100) / 100,
      maxDepth: Math.round(maxDepth * 100) / 100,
      speed: this.config.speed,
      repelRadius: this.config.mouseRepelRadius
    };
  }
}
