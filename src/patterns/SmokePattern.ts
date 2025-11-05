import { Pattern, Cell, Size, Point, Theme } from '../types/index.js';
import { PerlinNoise } from '../utils/noise.js';
import { clamp } from '../utils/math.js';

interface SmokeConfig {
  plumeCount: number;       // Number of smoke sources (1-8)
  particleCount: number;    // Particles per plume (20-100)
  riseSpeed: number;        // Upward speed (0.1-2.0)
  dissipationRate: number;  // How fast smoke fades (0.01-0.1)
  turbulence: number;       // Noise strength (0-2.0)
  spread: number;           // Horizontal spread (0.1-1.5)
  windStrength: number;     // Horizontal wind (0-1.0)
  mouseBlowForce: number;   // Mouse creates wind (0-5.0)
}

interface SmokePreset {
  id: number;
  name: string;
  description: string;
  config: SmokeConfig;
}

interface SmokeParticle {
  x: number;
  y: number;
  vx: number;      // Horizontal velocity
  vy: number;      // Vertical velocity
  opacity: number; // 0-1, decreases over time
  size: number;    // Visual size (0-3)
  life: number;    // Lifetime counter
  maxLife: number; // When to respawn
  plumeId: number; // Which plume spawned this
  temperature: number; // Heat level (1.0 at spawn, decreases as it rises)
}

interface Plume {
  x: number;       // Source X position
  y: number;       // Source Y position (bottom of screen)
  phase: number;   // For sine wave movement
  active: boolean; // Is this plume emitting?
}

export class SmokePattern implements Pattern {
  name = 'smoke';
  private config: SmokeConfig;
  private theme: Theme;
  private particles: SmokeParticle[] = [];
  private plumes: Plume[] = [];
  private mousePos?: Point;
  private lastTime = 0;
  private noise: PerlinNoise;
  private noiseOffset = 0;
  private windOffset = 0;

  private static readonly PRESETS: SmokePreset[] = [
    {
      id: 1,
      name: 'Gentle Wisp',
      description: 'Light, slow-rising smoke',
      config: { plumeCount: 2, particleCount: 40, riseSpeed: 0.3, dissipationRate: 0.02, turbulence: 0.5, spread: 0.3, windStrength: 0.1, mouseBlowForce: 2.0 }
    },
    {
      id: 2,
      name: 'Campfire',
      description: 'Classic campfire smoke',
      config: { plumeCount: 3, particleCount: 60, riseSpeed: 0.5, dissipationRate: 0.03, turbulence: 0.8, spread: 0.5, windStrength: 0.2, mouseBlowForce: 2.5 }
    },
    {
      id: 3,
      name: 'Industrial',
      description: 'Heavy, dense smoke columns',
      config: { plumeCount: 5, particleCount: 80, riseSpeed: 0.4, dissipationRate: 0.015, turbulence: 0.3, spread: 0.2, windStrength: 0.3, mouseBlowForce: 3.0 }
    },
    {
      id: 4,
      name: 'Incense',
      description: 'Thin, delicate smoke trail',
      config: { plumeCount: 1, particleCount: 30, riseSpeed: 0.25, dissipationRate: 0.04, turbulence: 1.2, spread: 0.4, windStrength: 0.15, mouseBlowForce: 1.5 }
    },
    {
      id: 5,
      name: 'Fog',
      description: 'Low-lying, spreading fog',
      config: { plumeCount: 4, particleCount: 100, riseSpeed: 0.1, dissipationRate: 0.01, turbulence: 0.4, spread: 1.2, windStrength: 0.05, mouseBlowForce: 1.0 }
    },
    {
      id: 6,
      name: 'Steam',
      description: 'Fast-rising, quickly dissipating',
      config: { plumeCount: 6, particleCount: 50, riseSpeed: 1.5, dissipationRate: 0.08, turbulence: 1.5, spread: 0.6, windStrength: 0.4, mouseBlowForce: 4.0 }
    }
  ];

  constructor(theme: Theme, config?: Partial<SmokeConfig>) {
    this.theme = theme;
    this.config = {
      plumeCount: 3,
      particleCount: 60,
      riseSpeed: 0.5,
      dissipationRate: 0.03,
      turbulence: 0.8,
      spread: 0.5,
      windStrength: 0.2,
      mouseBlowForce: 2.5,
      ...config
    };
    this.noise = new PerlinNoise(Math.random() * 10000);
    this.initializePlumes(80, 24); // Default size
  }

  private initializePlumes(width: number, height: number): void {
    this.plumes = [];
    for (let i = 0; i < this.config.plumeCount; i++) {
      const spacing = width / (this.config.plumeCount + 1);
      this.plumes.push({
        x: spacing * (i + 1),
        y: height - 1,
        phase: Math.random() * Math.PI * 2,
        active: true
      });
    }
  }

  private spawnParticle(plume: Plume, plumeId: number): SmokeParticle {
    const spreadAngle = (Math.random() - 0.5) * Math.PI * this.config.spread;
    const speed = this.config.riseSpeed * (0.8 + Math.random() * 0.4);
    
    return {
      x: plume.x + (Math.random() - 0.5) * 2,
      y: plume.y,
      vx: Math.sin(spreadAngle) * speed * 0.3,
      vy: -Math.cos(spreadAngle) * speed,
      opacity: 0.9 + Math.random() * 0.1,
      size: Math.random() * 3,
      life: 0,
      maxLife: 50 + Math.random() * 50,
      plumeId,
      temperature: 1.0
    };
  }

  reset(): void {
    this.particles = [];
    this.plumes = [];
    this.mousePos = undefined;
    this.noiseOffset = 0;
    this.windOffset = 0;
    this.lastTime = 0;
    this.noise = new PerlinNoise(Math.random() * 10000);
  }

  render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void {
    const { width, height } = size;
    this.mousePos = mousePos;

    // Resize plumes if needed
    if (this.plumes.length !== this.config.plumeCount) {
      this.initializePlumes(width, height);
    }

    // Update plume positions (bottom of screen)
    this.plumes.forEach(plume => {
      plume.y = height - 1;
    });

    // Time-based animation
    const deltaTime = this.lastTime === 0 ? 16 : Math.min(time - this.lastTime, 100);
    this.lastTime = time;
    this.noiseOffset += 0.01;
    this.windOffset += 0.005;

    // Spawn new particles from each active plume
    for (let i = 0; i < this.plumes.length; i++) {
      const plume = this.plumes[i];
      if (!plume.active) continue;

      // Add phase-based horizontal sway to plume source
      plume.phase += 0.02;
      const sway = Math.sin(plume.phase) * 2;
      plume.x = (width / (this.config.plumeCount + 1)) * (i + 1) + sway;
      plume.x = clamp(plume.x, 2, width - 2);

      // Spawn particles
      const targetCount = Math.floor(this.config.particleCount / this.config.plumeCount);
      const currentCount = this.particles.filter(p => p.plumeId === i).length;
      
      if (currentCount < targetCount) {
        for (let j = 0; j < Math.min(3, targetCount - currentCount); j++) {
          this.particles.push(this.spawnParticle(plume, i));
        }
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      // Age particle
      p.life++;
      p.opacity -= this.config.dissipationRate;
      
      // Cool down as it rises
      p.temperature -= 0.01;

      // Remove dead particles
      if (p.opacity <= 0 || p.life > p.maxLife || p.y < -5) {
        this.particles.splice(i, 1);
        continue;
      }

      // Apply turbulence (Perlin noise)
      if (this.config.turbulence > 0) {
        const noiseX = this.noise.noise2D(p.x * 0.05 + this.noiseOffset, p.y * 0.05);
        const noiseY = this.noise.noise2D(p.x * 0.05 + this.noiseOffset + 100, p.y * 0.05);
        p.vx += noiseX * this.config.turbulence * 0.02;
        p.vy += noiseY * this.config.turbulence * 0.01;
      }

      // Apply wind (global horizontal drift)
      const windNoise = Math.sin(this.windOffset + p.y * 0.1) * this.config.windStrength;
      p.vx += windNoise * 0.05;

      // Mouse interaction - blow smoke away
      if (this.mousePos) {
        const dx = p.x - this.mousePos.x;
        const dy = p.y - this.mousePos.y;
        const distSq = dx * dx + dy * dy;
        const minDist = 100;

        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          const force = (1 - dist / minDist) * this.config.mouseBlowForce;
          const angle = Math.atan2(dy, dx);
          p.vx += Math.cos(angle) * force * 0.1;
          p.vy += Math.sin(angle) * force * 0.1;
        }
      }

      // Apply velocity with damping
      p.x += p.vx * (deltaTime / 16);
      p.y += p.vy * (deltaTime / 16);
      
      // Velocity damping (smoke slows down as it rises)
      p.vx *= 0.98;
      p.vy *= 0.99;

      // Wrap horizontally
      if (p.x < 0) p.x = width - 1;
      if (p.x >= width) p.x = 0;
    }

    // Render particles
    for (const p of this.particles) {
      const x = Math.floor(p.x);
      const y = Math.floor(p.y);

      if (x >= 0 && x < width && y >= 0 && y < height) {
        // Opacity-based character selection
        const opacity = clamp(p.opacity, 0, 1);
        let char: string;
        
        if (opacity > 0.7) char = '▓';
        else if (opacity > 0.5) char = '▒';
        else if (opacity > 0.3) char = '░';
        else if (opacity > 0.15) char = '·';
        else char = ' ';

        // Color based on temperature and height
        // Hot smoke (near source) is brighter, cool smoke (risen) is dimmer
        const heightRatio = clamp(p.y / height, 0, 1);
        const tempFactor = clamp(p.temperature, 0, 1);
        
        // Combine height and temperature: hot = bright, cool + high = dim
        const heightIntensity = 1 - heightRatio * 0.4; // 0.6-1.0 based on height
        const tempIntensity = 0.7 + tempFactor * 0.3; // 0.7-1.0 based on temperature
        const intensity = clamp(opacity * heightIntensity * tempIntensity, 0, 1);
        const color = this.theme.getColor(intensity);

        if (char !== ' ') {
          buffer[y][x] = { char, color };
        }
      }
    }
  }

  onMouseMove(pos: Point): void {
    this.mousePos = pos;
  }

  onMouseClick(pos: Point): void {
    // Click spawns a burst of smoke at that location
    const burstCount = 15;
    for (let i = 0; i < burstCount; i++) {
      const angle = (Math.random() - 0.5) * Math.PI;
      const speed = 0.5 + Math.random() * 1.0;
      
      this.particles.push({
        x: pos.x + (Math.random() - 0.5) * 3,
        y: pos.y + (Math.random() - 0.5) * 3,
        vx: Math.sin(angle) * speed,
        vy: -Math.abs(Math.cos(angle)) * speed,
        opacity: 0.8,
        size: Math.random() * 3,
        life: 0,
        maxLife: 40 + Math.random() * 30,
        plumeId: -1, // Special ID for clicked particles
        temperature: 1.0
      });
    }
  }

  applyPreset(presetId: number): boolean {
    const preset = SmokePattern.PRESETS.find(p => p.id === presetId);
    if (!preset) return false;

    this.config = { ...preset.config };
    this.reset();
    this.initializePlumes(80, 24); // Reset with default size
    return true;
  }

  static getPresets(): SmokePreset[] {
    return [...SmokePattern.PRESETS];
  }

  static getPreset(id: number): SmokePreset | undefined {
    return SmokePattern.PRESETS.find(p => p.id === id);
  }

  getMetrics(): Record<string, number> {
    const activePlumes = this.plumes.filter(p => p.active).length;
    return {
      particles: this.particles.length,
      plumes: activePlumes,
      avgOpacity: this.particles.length > 0 
        ? this.particles.reduce((sum, p) => sum + p.opacity, 0) / this.particles.length 
        : 0
    };
  }
}
