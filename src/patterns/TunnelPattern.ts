import { Pattern, Cell, Size, Point, Theme } from '../types';

interface TunnelConfig {
  shape: 'circle' | 'square' | 'triangle' | 'hexagon' | 'star';
  ringCount: number;
  ringSpacing: number;
  speed: number;
  rotationSpeed: number;
  radius: number;
}

interface TunnelPreset {
  id: number;
  name: string;
  description: string;
  config: TunnelConfig;
}

interface Ring {
  z: number;
  rotation: number;
}

export class TunnelPattern implements Pattern {
  name = 'tunnel';
  private config: TunnelConfig;
  private theme: Theme;
  private rings: Ring[] = [];
  private time: number = 0;
  private vanishingOffset: Point = { x: 0, y: 0 };
  private direction: number = 1; // 1 = forward, -1 = backward
  private speedBoost: number = 1;
  private boostEndTime: number = 0;

  private static readonly PRESETS: TunnelPreset[] = [
    {
      id: 1,
      name: 'Circle Tunnel',
      description: 'Classic circular tunnel, smooth rotation',
      config: { shape: 'circle', ringCount: 40, ringSpacing: 0.6, speed: 1.0, rotationSpeed: 0.5, radius: 0.75 }
    },
    {
      id: 2,
      name: 'Hyperspeed',
      description: 'Fast forward motion, blurred rings',
      config: { shape: 'circle', ringCount: 50, ringSpacing: 0.4, speed: 2.5, rotationSpeed: 1.2, radius: 0.8 }
    },
    {
      id: 3,
      name: 'Square Vortex',
      description: 'Rotating square tunnel',
      config: { shape: 'square', ringCount: 35, ringSpacing: 0.7, speed: 1.0, rotationSpeed: 0.8, radius: 0.7 }
    },
    {
      id: 4,
      name: 'Triangle Warp',
      description: 'Three-sided tunnel, fast spin',
      config: { shape: 'triangle', ringCount: 30, ringSpacing: 0.8, speed: 0.8, rotationSpeed: 1.5, radius: 0.65 }
    },
    {
      id: 5,
      name: 'Hexagon Grid',
      description: 'Six-sided tunnel, geometric precision',
      config: { shape: 'hexagon', ringCount: 45, ringSpacing: 0.5, speed: 1.2, rotationSpeed: 0.6, radius: 0.75 }
    },
    {
      id: 6,
      name: 'Stargate',
      description: 'Five-pointed star tunnel, slow mystical rotation',
      config: { shape: 'star', ringCount: 35, ringSpacing: 0.7, speed: 0.7, rotationSpeed: 0.4, radius: 0.7 }
    }
  ];

  constructor(theme: Theme, config?: Partial<TunnelConfig>) {
    this.theme = theme;
    this.config = {
      shape: 'circle',
      ringCount: 40,           // Doubled from 20 for more visibility
      ringSpacing: 0.5,        // Halved to pack rings closer
      speed: 1.0,
      rotationSpeed: 0.5,
      radius: 0.8,             // Increased from 0.6 for larger rings
      ...config
    };
    this.initializeRings();
  }

  private initializeRings(): void {
    this.rings = [];
    for (let i = 0; i < this.config.ringCount; i++) {
      this.rings.push({
        z: i * this.config.ringSpacing + 0.5,
        rotation: 0
      });
    }
  }

  reset(): void {
    this.initializeRings();
    this.time = 0;
    this.vanishingOffset = { x: 0, y: 0 };
    this.direction = 1;
    this.speedBoost = 1;
    this.boostEndTime = 0;
  }

  private getShapePoints(sides: number, radius: number, rotation: number): Point[] {
    const points: Point[] = [];
    
    if (this.config.shape === 'circle') {
      // For circle, use more points for smoothness
      const circlePoints = Math.max(20, Math.floor(radius * 8));
      for (let i = 0; i < circlePoints; i++) {
        const angle = (Math.PI * 2 * i) / circlePoints + rotation;
        points.push({
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius
        });
      }
    } else if (this.config.shape === 'star') {
      // Five-pointed star
      const numPoints = 5;
      for (let i = 0; i < numPoints * 2; i++) {
        const angle = (Math.PI * 2 * i) / (numPoints * 2) + rotation;
        const r = i % 2 === 0 ? radius : radius * 0.4;
        points.push({
          x: Math.cos(angle) * r,
          y: Math.sin(angle) * r
        });
      }
    } else {
      // Regular polygon (triangle, square, hexagon)
      for (let i = 0; i < sides; i++) {
        const angle = (Math.PI * 2 * i) / sides + rotation;
        points.push({
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius
        });
      }
    }
    
    return points;
  }

  private drawLine(
    buffer: Cell[][],
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    char: string,
    intensity: number,
    size: Size
  ): void {
    // Bresenham's line algorithm
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;

    let x = x1;
    let y = y1;

    while (true) {
      if (x >= 0 && x < size.width && y >= 0 && y < size.height) {
        buffer[y][x] = {
          char,
          color: this.theme.getColor(intensity)
        };
      }

      if (x === x2 && y === y2) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  render(buffer: Cell[][], time: number, size: Size, _mousePos?: Point): void {
    this.time = time;
    const { width, height } = size;
    const centerX = width / 2 + this.vanishingOffset.x;
    const centerY = height / 2 + this.vanishingOffset.y;

    // Check speed boost timeout
    if (this.boostEndTime > 0 && time > this.boostEndTime) {
      this.speedBoost = 1;
      this.boostEndTime = 0;
    }

    const effectiveSpeed = this.config.speed * this.direction * this.speedBoost;
    const deltaTime = 0.016; // Approximate frame time

    // Update rings - move them forward
    for (const ring of this.rings) {
      ring.z -= effectiveSpeed * deltaTime * 10;
      ring.rotation += this.config.rotationSpeed * deltaTime;

      // Wrap around when too close
      if (ring.z < 0.1) {
        ring.z += this.config.ringCount * this.config.ringSpacing;
      }
      // Wrap around when too far (backward motion)
      if (ring.z > this.config.ringCount * this.config.ringSpacing + 5) {
        ring.z -= this.config.ringCount * this.config.ringSpacing;
      }
    }

    // Sort rings by depth (far to near for proper rendering)
    const sortedRings = [...this.rings].sort((a, b) => b.z - a.z);

    // Determine number of sides for polygon shapes
    const sides = this.config.shape === 'triangle' ? 3 :
                  this.config.shape === 'square' ? 4 :
                  this.config.shape === 'hexagon' ? 6 : 0;

    // Render each ring
    for (const ring of sortedRings) {
      const scale = 1 / ring.z; // Perspective scaling
      if (scale <= 0 || scale > 10) continue; // Skip rings too close or too far

      // Calculate intensity based on depth
      const maxDepth = this.config.ringCount * this.config.ringSpacing;
      const intensity = Math.max(0, Math.min(1, 1 - ring.z / maxDepth));

      // Get shape points
      const baseRadius = Math.min(width, height) * this.config.radius;
      const scaledRadius = baseRadius * scale;
      const points = this.getShapePoints(sides, scaledRadius, ring.rotation);

      // Choose character based on intensity
      const chars = ['.', '·', '∘', '○', '◎', '◉', '●'];
      const charIndex = Math.min(chars.length - 1, Math.floor(intensity * chars.length));
      const char = chars[charIndex];

      // Draw lines between consecutive points
      for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];

        const x1 = Math.floor(centerX + p1.x);
        const y1 = Math.floor(centerY + p1.y);
        const x2 = Math.floor(centerX + p2.x);
        const y2 = Math.floor(centerY + p2.y);

        this.drawLine(buffer, x1, y1, x2, y2, char, intensity, size);
      }
    }

    // Draw vanishing point indicator (subtle)
    const vpX = Math.floor(centerX);
    const vpY = Math.floor(centerY);
    if (vpX >= 0 && vpX < width && vpY >= 0 && vpY < height) {
      buffer[vpY][vpX] = {
        char: '+',
        color: this.theme.getColor(0.3)
      };
    }
  }

  onMouseMove(pos: Point): void {
    // Parallax effect - shift vanishing point toward mouse
    // Keep it subtle (max ±10% of screen)
    const maxOffset = 5;
    this.vanishingOffset = {
      x: Math.max(-maxOffset, Math.min(maxOffset, (pos.x - 40) * 0.05)),
      y: Math.max(-maxOffset, Math.min(maxOffset, (pos.y - 12) * 0.05))
    };
  }

  onMouseClick(_pos: Point): void {
    // Reverse direction
    this.direction *= -1;

    // Apply speed boost for 1 second
    this.speedBoost = 2;
    this.boostEndTime = this.time + 1000;
  }

  getMetrics(): Record<string, number> {
    return {
      rings: this.rings.length,
      direction: this.direction,
      speedBoost: this.speedBoost
    };
  }

  applyPreset(presetId: number): boolean {
    const preset = TunnelPattern.PRESETS.find(p => p.id === presetId);
    if (!preset) return false;

    this.config = { ...preset.config };
    this.reset();
    return true;
  }

  static getPresets(): TunnelPreset[] {
    return [...TunnelPattern.PRESETS];
  }

  static getPreset(id: number): TunnelPreset | undefined {
    return TunnelPattern.PRESETS.find(p => p.id === id);
  }
}
