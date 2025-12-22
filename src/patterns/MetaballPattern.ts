/**
 * MetaballPattern - Interactive liquid blob playground
 *
 * Features:
 * - Metaballs that merge and split when they touch
 * - Physics-based movement with gravity and bouncing
 * - Mouse interaction: attract or repel blobs
 * - Dynamic blob spawning and removal
 * - Smooth implicit surface rendering
 */

import { Pattern, Cell, Size, Point, Theme, Color } from '../types/index.js';
import { clamp } from '../utils/math.js';

interface MetaballConfig {
  blobCount: number; // Number of blobs (3-15)
  blobMinRadius: number; // Minimum blob radius (2-5)
  blobMaxRadius: number; // Maximum blob radius (5-12)
  threshold: number; // Surface threshold for merging (0.5-2.0)
  gravity: number; // Gravity strength (0-1.0)
  bounce: number; // Bounce coefficient (0.3-0.9)
  viscosity: number; // Movement smoothness (0.1-0.9)
  mouseForce: number; // Mouse attraction/repulsion (0-3.0)
  spawnOnClick: boolean; // Spawn new blobs on click
  colorMode: 'theme' | 'rainbow' | 'gradient';
}

interface Blob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hue: number; // For rainbow mode
  id: number;
}

interface MetaballPreset {
  id: number;
  name: string;
  description: string;
  config: MetaballConfig;
}

export class MetaballPattern implements Pattern {
  public readonly name = 'metaball';

  private config: MetaballConfig;
  private theme: Theme;
  private blobs: Blob[] = [];
  private lastTime = 0;
  private mousePos: Point | null = null;
  private initialized = false;
  private nextBlobId = 0;

  private static readonly DENSITY_CHARS = [' ', '░', '▒', '▓', '█'];

  private static readonly PRESETS: MetaballPreset[] = [
    {
      id: 1,
      name: 'Lava Lamp',
      description: 'Slow, dreamy blob movement',
      config: {
        blobCount: 6,
        blobMinRadius: 4,
        blobMaxRadius: 8,
        threshold: 1.0,
        gravity: 0.3,
        bounce: 0.6,
        viscosity: 0.8,
        mouseForce: 1.5,
        spawnOnClick: true,
        colorMode: 'theme',
      },
    },
    {
      id: 2,
      name: 'Bouncy Balls',
      description: 'Energetic bouncing blobs',
      config: {
        blobCount: 10,
        blobMinRadius: 3,
        blobMaxRadius: 6,
        threshold: 0.8,
        gravity: 0.8,
        bounce: 0.85,
        viscosity: 0.3,
        mouseForce: 2.0,
        spawnOnClick: true,
        colorMode: 'rainbow',
      },
    },
    {
      id: 3,
      name: 'Mercury Drops',
      description: 'Heavy, merging droplets',
      config: {
        blobCount: 8,
        blobMinRadius: 3,
        blobMaxRadius: 10,
        threshold: 1.2,
        gravity: 0.5,
        bounce: 0.4,
        viscosity: 0.6,
        mouseForce: 1.0,
        spawnOnClick: true,
        colorMode: 'gradient',
      },
    },
    {
      id: 4,
      name: 'Bubble Bath',
      description: 'Many small floating bubbles',
      config: {
        blobCount: 15,
        blobMinRadius: 2,
        blobMaxRadius: 4,
        threshold: 0.7,
        gravity: 0.1,
        bounce: 0.7,
        viscosity: 0.5,
        mouseForce: 2.5,
        spawnOnClick: true,
        colorMode: 'theme',
      },
    },
    {
      id: 5,
      name: 'Zero Gravity',
      description: 'Floating in space',
      config: {
        blobCount: 8,
        blobMinRadius: 4,
        blobMaxRadius: 9,
        threshold: 1.0,
        gravity: 0.0,
        bounce: 0.9,
        viscosity: 0.2,
        mouseForce: 3.0,
        spawnOnClick: true,
        colorMode: 'rainbow',
      },
    },
    {
      id: 6,
      name: 'Giant Amoeba',
      description: 'Few large merging blobs',
      config: {
        blobCount: 4,
        blobMinRadius: 6,
        blobMaxRadius: 12,
        threshold: 1.5,
        gravity: 0.2,
        bounce: 0.5,
        viscosity: 0.7,
        mouseForce: 1.0,
        spawnOnClick: false,
        colorMode: 'gradient',
      },
    },
  ];

  constructor(theme: Theme, config: Partial<MetaballConfig> = {}) {
    this.theme = theme;
    this.config = {
      blobCount: 8,
      blobMinRadius: 3,
      blobMaxRadius: 8,
      threshold: 1.0,
      gravity: 0.4,
      bounce: 0.6,
      viscosity: 0.5,
      mouseForce: 1.5,
      spawnOnClick: true,
      colorMode: 'theme',
      ...config,
    };
  }

  private initialize(size: Size): void {
    if (this.initialized) return;

    // Create initial blobs
    this.blobs = [];
    for (let i = 0; i < this.config.blobCount; i++) {
      this.spawnBlob(size);
    }

    this.initialized = true;
  }

  private spawnBlob(size: Size, pos?: Point): void {
    const radius =
      this.config.blobMinRadius +
      Math.random() * (this.config.blobMaxRadius - this.config.blobMinRadius);

    const x = pos?.x ?? radius + Math.random() * (size.width - radius * 2);
    const y = pos?.y ?? radius + Math.random() * (size.height - radius * 2);

    // Random initial velocity
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 1.5;

    this.blobs.push({
      id: this.nextBlobId++,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius,
      hue: Math.random() * 360,
    });
  }

  render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void {
    this.initialize(size);

    const dt = this.lastTime === 0 ? 0.016 : (time - this.lastTime) / 1000;
    this.lastTime = time;

    if (mousePos) {
      this.mousePos = mousePos;
    }

    // Update blob physics
    this.updateBlobs(size, dt);

    // Render metaballs
    this.renderMetaballs(buffer, size, time);
  }

  private updateBlobs(size: Size, dt: number): void {
    const actualDt = Math.min(dt, 0.05); // Cap dt to prevent instability

    for (const blob of this.blobs) {
      // Apply gravity
      blob.vy += this.config.gravity * actualDt * 30;

      // Apply mouse force
      if (this.mousePos && this.config.mouseForce > 0) {
        const dx = this.mousePos.x - blob.x;
        const dy = this.mousePos.y - blob.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0 && dist < 30) {
          const force = ((30 - dist) / 30) * this.config.mouseForce * 0.5;
          blob.vx += (dx / dist) * force;
          blob.vy += (dy / dist) * force;
        }
      }

      // Apply viscosity (damping)
      blob.vx *= 1 - this.config.viscosity * actualDt * 5;
      blob.vy *= 1 - this.config.viscosity * actualDt * 5;

      // Update position
      blob.x += blob.vx * actualDt * 30;
      blob.y += blob.vy * actualDt * 30;

      // Bounce off walls
      if (blob.x < blob.radius) {
        blob.x = blob.radius;
        blob.vx = -blob.vx * this.config.bounce;
      }
      if (blob.x > size.width - blob.radius) {
        blob.x = size.width - blob.radius;
        blob.vx = -blob.vx * this.config.bounce;
      }
      if (blob.y < blob.radius) {
        blob.y = blob.radius;
        blob.vy = -blob.vy * this.config.bounce;
      }
      if (blob.y > size.height - blob.radius) {
        blob.y = size.height - blob.radius;
        blob.vy = -blob.vy * this.config.bounce;
      }
    }

    // Blob-blob interaction (soft collision)
    for (let i = 0; i < this.blobs.length; i++) {
      for (let j = i + 1; j < this.blobs.length; j++) {
        const b1 = this.blobs[i];
        const b2 = this.blobs[j];

        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = (b1.radius + b2.radius) * 0.5;

        if (dist < minDist && dist > 0) {
          // Soft repulsion
          const force = ((minDist - dist) / minDist) * 0.3;
          const nx = dx / dist;
          const ny = dy / dist;

          b1.vx -= nx * force;
          b1.vy -= ny * force;
          b2.vx += nx * force;
          b2.vy += ny * force;
        }
      }
    }
  }

  private renderMetaballs(buffer: Cell[][], size: Size, time: number): void {
    const { width, height } = size;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Calculate total metaball field value at this point
        let totalField = 0;
        let closestBlob: Blob | null = null;
        let closestDist = Infinity;

        for (const blob of this.blobs) {
          const dx = x - blob.x;
          const dy = y - blob.y;
          const distSq = dx * dx + dy * dy;

          // Metaball field equation: r^2 / (dist^2)
          const field = (blob.radius * blob.radius) / (distSq + 1);
          totalField += field;

          // Track closest blob for coloring
          const dist = Math.sqrt(distSq);
          if (dist < closestDist) {
            closestDist = dist;
            closestBlob = blob;
          }
        }

        const cell = buffer[y]?.[x];
        if (!cell) continue;

        // Apply threshold to create metaball surface
        if (totalField >= this.config.threshold) {
          // Determine character based on field strength
          const normalizedField = clamp(
            (totalField - this.config.threshold) / this.config.threshold,
            0,
            1
          );
          const charIndex = Math.min(
            Math.floor(normalizedField * MetaballPattern.DENSITY_CHARS.length),
            MetaballPattern.DENSITY_CHARS.length - 1
          );

          cell.char = MetaballPattern.DENSITY_CHARS[charIndex];
          cell.color = this.getBlobColor(closestBlob, normalizedField, time);
        } else {
          // Background
          cell.char = ' ';
          cell.color = { r: 10, g: 15, b: 25 };
        }
      }
    }
  }

  private getBlobColor(blob: Blob | null, intensity: number, time: number): Color {
    if (!blob) {
      return this.theme.getColor(intensity);
    }

    switch (this.config.colorMode) {
      case 'rainbow': {
        // Animated rainbow based on blob hue
        const hue = (blob.hue + time * 0.02) % 360;
        return this.hslToRgb(hue, 0.8, 0.4 + intensity * 0.3);
      }

      case 'gradient': {
        // Gradient based on blob position and intensity
        const r = Math.round(100 + intensity * 155);
        const g = Math.round(50 + intensity * 100);
        const b = Math.round(150 + intensity * 105);
        return { r, g, b };
      }

      case 'theme':
      default: {
        // Use theme colors
        const color = this.theme.getColor(intensity);
        return {
          r: Math.round(color.r * (0.6 + intensity * 0.4)),
          g: Math.round(color.g * (0.6 + intensity * 0.4)),
          b: Math.round(color.b * (0.6 + intensity * 0.4)),
        };
      }
    }
  }

  private hslToRgb(h: number, s: number, l: number): Color {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;

    let r = 0,
      g = 0,
      b = 0;

    if (h < 60) {
      r = c;
      g = x;
    } else if (h < 120) {
      r = x;
      g = c;
    } else if (h < 180) {
      g = c;
      b = x;
    } else if (h < 240) {
      g = x;
      b = c;
    } else if (h < 300) {
      r = x;
      b = c;
    } else {
      r = c;
      b = x;
    }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
    };
  }

  onMouseMove(pos: Point): void {
    this.mousePos = pos;
  }

  onMouseClick(pos: Point): void {
    if (this.config.spawnOnClick) {
      // Spawn a new blob at click position
      this.spawnBlob(
        { width: 80, height: 24 }, // Default size, will be constrained
        pos
      );

      // Remove oldest blob if we have too many
      if (this.blobs.length > this.config.blobCount + 5) {
        this.blobs.shift();
      }
    } else {
      // Repel nearby blobs
      for (const blob of this.blobs) {
        const dx = blob.x - pos.x;
        const dy = blob.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 20 && dist > 0) {
          const force = ((20 - dist) / 20) * 3;
          blob.vx += (dx / dist) * force;
          blob.vy += (dy / dist) * force;
        }
      }
    }
  }

  reset(): void {
    this.blobs = [];
    this.lastTime = 0;
    this.initialized = false;
    this.mousePos = null;
    this.nextBlobId = 0;
  }

  applyPreset(presetId: number): boolean {
    const preset = MetaballPattern.PRESETS.find(p => p.id === presetId);
    if (!preset) return false;

    this.config = { ...preset.config };
    this.reset();
    return true;
  }

  static getPresets(): MetaballPreset[] {
    return [...MetaballPattern.PRESETS];
  }

  static getPreset(id: number): MetaballPreset | undefined {
    return MetaballPattern.PRESETS.find(p => p.id === id);
  }

  getMetrics(): Record<string, number> {
    // Calculate total "mass" from blob radii
    const totalMass = this.blobs.reduce((sum, b) => sum + b.radius * b.radius, 0);

    return {
      blobs: this.blobs.length,
      totalMass: Math.round(totalMass),
      avgRadius:
        this.blobs.length > 0
          ? Math.round(
              (this.blobs.reduce((sum, b) => sum + b.radius, 0) / this.blobs.length) * 10
            ) / 10
          : 0,
    };
  }
}
