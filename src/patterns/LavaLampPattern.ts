import { Pattern, Cell, Size, Point, Theme } from '../types';
import { metaballField, metaballIntensity, Metaball } from '../utils/metaballs';
import { PerlinNoise } from '../utils/noise';
import { clamp } from '../utils/math';

interface LavaLampConfig {
  blobCount: number;        // Number of metaballs (3-12)
  minRadius: number;        // Minimum blob radius (2-8)
  maxRadius: number;        // Maximum blob radius (5-20)
  riseSpeed: number;        // Upward float speed (0.1-2.0)
  driftSpeed: number;       // Horizontal drift speed (0.05-1.0)
  threshold: number;        // Surface threshold (0.5-2.0)
  mouseForce: number;       // Attract/repel strength (0-5.0, negative = repel)
  turbulence: boolean;      // Enable noise-based drift
  gravity: boolean;         // Enable gravity/buoyancy
}

interface LavaLampPreset {
  id: number;
  name: string;
  description: string;
  config: LavaLampConfig;
}

interface Blob {
  x: number;
  y: number;
  vx: number;      // Horizontal velocity
  vy: number;      // Vertical velocity
  radius: number;
  phase: number;   // For sine-wave motion
  temp: number;    // Temperature (affects buoyancy, 0-1)
}

export class LavaLampPattern implements Pattern {
  name = 'lavalamp';
  private config: LavaLampConfig;
  private theme: Theme;
  private blobs: Blob[] = [];
  private mousePos?: Point;
  private lastTime = 0;
  private noiseOffset = 0;
  private noise: PerlinNoise;

  private static readonly PRESETS: LavaLampPreset[] = [
    {
      id: 1,
      name: 'Classic',
      description: 'Traditional lava lamp feel',
      config: { blobCount: 5, minRadius: 8, maxRadius: 14, riseSpeed: 0.3, driftSpeed: 0.15, threshold: 1.0, mouseForce: 1.5, turbulence: true, gravity: true }
    },
    {
      id: 2,
      name: 'Turbulent',
      description: 'Chaotic, fast-moving blobs',
      config: { blobCount: 7, minRadius: 4, maxRadius: 10, riseSpeed: 1.2, driftSpeed: 0.8, threshold: 0.8, mouseForce: 3.0, turbulence: true, gravity: false }
    },
    {
      id: 3,
      name: 'Gentle',
      description: 'Slow, meditative motion',
      config: { blobCount: 4, minRadius: 10, maxRadius: 18, riseSpeed: 0.15, driftSpeed: 0.1, threshold: 1.2, mouseForce: 1.0, turbulence: false, gravity: true }
    },
    {
      id: 4,
      name: 'Many Blobs',
      description: 'Lots of small blobs',
      config: { blobCount: 12, minRadius: 3, maxRadius: 6, riseSpeed: 0.5, driftSpeed: 0.3, threshold: 0.7, mouseForce: 2.5, turbulence: true, gravity: true }
    },
    {
      id: 5,
      name: 'Giant Blob',
      description: 'Few large, slow-moving blobs',
      config: { blobCount: 2, minRadius: 15, maxRadius: 25, riseSpeed: 0.2, driftSpeed: 0.05, threshold: 1.5, mouseForce: 0.5, turbulence: false, gravity: true }
    },
    {
      id: 6,
      name: 'Strobe',
      description: 'Fast-changing, repelling blobs',
      config: { blobCount: 6, minRadius: 5, maxRadius: 15, riseSpeed: 1.5, driftSpeed: 1.0, threshold: 0.9, mouseForce: -2.0, turbulence: true, gravity: false }
    }
  ];

  constructor(theme: Theme, config?: Partial<LavaLampConfig>) {
    this.theme = theme;
    this.config = {
      blobCount: 5,
      minRadius: 6,
      maxRadius: 12,
      riseSpeed: 0.3,
      driftSpeed: 0.2,
      threshold: 1.0,
      mouseForce: 2.0,
      turbulence: true,
      gravity: true,
      ...config
    };
    this.noise = new PerlinNoise(Math.random() * 10000);
    this.initializeBlobs(80, 24); // Default size
  }

  private initializeBlobs(width: number, height: number): void {
    this.blobs = [];
    for (let i = 0; i < this.config.blobCount; i++) {
      this.blobs.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * this.config.driftSpeed,
        vy: (Math.random() - 0.5) * this.config.riseSpeed,
        radius: this.config.minRadius + Math.random() * (this.config.maxRadius - this.config.minRadius),
        phase: Math.random() * Math.PI * 2,
        temp: 0.3 + Math.random() * 0.4 // Temperature between 0.3-0.7
      });
    }
  }

  private updatePhysics(deltaTime: number, size: Size): void {
    const dt = Math.min(deltaTime / 1000, 0.1); // Cap at 100ms
    this.noiseOffset += dt * 0.5;

    for (const blob of this.blobs) {
      // Update phase for sine wave motion
      blob.phase += dt * 2;

      // Apply gravity/buoyancy
      if (this.config.gravity) {
        // Hotter blobs rise (positive temp), cooler sink
        const buoyancy = (blob.temp - 0.5) * this.config.riseSpeed * 2;
        blob.vy = blob.vy * 0.95 + buoyancy * dt * 10;
      } else {
        // No gravity: rise speed is constant based on temp
        blob.vy = this.config.riseSpeed * (blob.temp * 2 - 0.5);
      }

      // Apply turbulence (Perlin noise)
      if (this.config.turbulence) {
        const noiseX = this.noise.noise2D(blob.x * 0.02 + this.noiseOffset, blob.y * 0.02);
        const noiseY = this.noise.noise2D(blob.x * 0.02, blob.y * 0.02 + this.noiseOffset);
        blob.vx += noiseX * this.config.driftSpeed * dt * 2;
        blob.vy += noiseY * this.config.riseSpeed * dt;
      }

      // Apply horizontal drift
      blob.vx += (Math.random() - 0.5) * this.config.driftSpeed * dt * 0.5;

      // Apply mouse force
      if (this.mousePos && this.config.mouseForce !== 0) {
        const dx = this.mousePos.x - blob.x;
        const dy = this.mousePos.y - blob.y;
        const distSquared = dx * dx + dy * dy;
        const effectRadius = 20;
        
        if (distSquared < effectRadius * effectRadius && distSquared > 0.1) {
          const dist = Math.sqrt(distSquared);
          const force = this.config.mouseForce / dist;
          blob.vx += (dx / dist) * force * dt * 5;
          blob.vy += (dy / dist) * force * dt * 5;
        }
      }

      // Damping
      blob.vx *= 0.98;
      blob.vy *= 0.98;

      // Update position
      blob.x += blob.vx * dt * 10;
      blob.y += blob.vy * dt * 10;

      // Bounce off horizontal boundaries
      if (blob.x - blob.radius < 0) {
        blob.x = blob.radius;
        blob.vx = Math.abs(blob.vx) * 0.8;
      } else if (blob.x + blob.radius > size.width) {
        blob.x = size.width - blob.radius;
        blob.vx = -Math.abs(blob.vx) * 0.8;
      }

      // Wrap vertical boundaries (lava lamp cycle)
      if (blob.y - blob.radius > size.height) {
        blob.y = -blob.radius;
        blob.temp = 0.3 + Math.random() * 0.4; // Reset temperature
      } else if (blob.y + blob.radius < 0) {
        blob.y = size.height + blob.radius;
        blob.temp = 0.3 + Math.random() * 0.4;
      }

      // Cool down as it rises, heat up as it falls (lava lamp physics)
      if (this.config.gravity) {
        const heightRatio = blob.y / size.height;
        const targetTemp = 1 - heightRatio; // Hot at bottom, cool at top
        blob.temp = blob.temp * 0.99 + targetTemp * 0.01;
      }
    }
  }

  private getCharForIntensity(intensity: number): string {
    if (intensity > 0.8) return '█';
    if (intensity > 0.6) return '▓';
    if (intensity > 0.4) return '▒';
    if (intensity > 0.2) return '░';
    return ' ';
  }

  render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void {
    const { width, height } = size;
    this.mousePos = mousePos;

    // Initialize blobs if needed
    if (this.blobs.length === 0 || this.blobs.length !== this.config.blobCount) {
      this.initializeBlobs(width, height);
    }

    // Update physics
    const deltaTime = this.lastTime === 0 ? 16 : time - this.lastTime;
    this.lastTime = time;
    this.updatePhysics(deltaTime, size);

    // Convert blobs to Metaball format
    const metaballs: Metaball[] = this.blobs.map(blob => ({
      x: blob.x,
      y: blob.y,
      radius: blob.radius
    }));

    // Render metaball field
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const field = metaballField(x, y, metaballs);
        
        if (field >= this.config.threshold) {
          const intensity = metaballIntensity(x, y, metaballs, 5.0);
          
          // Find closest blob to get temperature
          let closestTemp = 0.5;
          let minDistSq = Infinity;
          for (const blob of this.blobs) {
            const dx = x - blob.x;
            const dy = y - blob.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < minDistSq) {
              minDistSq = distSq;
              closestTemp = blob.temp;
            }
          }
          
          // Modulate intensity by temperature: hot = brighter, cool = dimmer
          const tempModulation = 0.85 + closestTemp * 0.3; // 0.85-1.15 range
          const finalIntensity = clamp(intensity * tempModulation, 0, 1);
          
          const char = this.getCharForIntensity(finalIntensity);
          const color = this.theme.getColor(finalIntensity);
          buffer[y][x] = { char, color };
        }
      }
    }
  }

  onMouseMove(pos: Point): void {
    this.mousePos = pos;
  }

  onMouseClick(pos: Point): void {
    // Spawn a new blob at click position
    if (this.blobs.length < 20) { // Cap at 20 blobs
      this.blobs.push({
        x: pos.x,
        y: pos.y,
        vx: (Math.random() - 0.5) * this.config.driftSpeed * 2,
        vy: (Math.random() - 0.5) * this.config.riseSpeed * 2,
        radius: this.config.minRadius + Math.random() * (this.config.maxRadius - this.config.minRadius),
        phase: Math.random() * Math.PI * 2,
        temp: 0.5 + Math.random() * 0.3
      });
    }
  }

  reset(): void {
    this.blobs = [];
    this.mousePos = undefined;
    this.lastTime = 0;
    this.noiseOffset = 0;
    this.noise = new PerlinNoise(Math.random() * 10000);
  }

  applyPreset(presetId: number): boolean {
    const preset = LavaLampPattern.PRESETS.find(p => p.id === presetId);
    if (!preset) return false;

    this.config = { ...preset.config };
    this.reset();
    return true;
  }

  static getPresets(): LavaLampPreset[] {
    return [...LavaLampPattern.PRESETS];
  }

  static getPreset(id: number): LavaLampPreset | undefined {
    return LavaLampPattern.PRESETS.find(p => p.id === id);
  }

  getMetrics(): Record<string, number> {
    const avgRadius = this.blobs.length > 0
      ? this.blobs.reduce((sum, b) => sum + b.radius, 0) / this.blobs.length
      : 0;
    
    return {
      blobs: this.blobs.length,
      avgRadius: Math.round(avgRadius * 10) / 10
    };
  }
}
