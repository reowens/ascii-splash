import { Pattern, Cell, Size, Point, Theme } from '../types';
import { bresenhamLine } from '../utils/drawing';

interface LightningConfig {
  boltDensity: number;
  branchProbability: number;
  branchAngle: number;
  fadeTime: number;
  strikeInterval: number;
  maxBranches: number;
  thickness: number;
}

interface LightningPreset {
  id: number;
  name: string;
  description: string;
  config: LightningConfig;
}

interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  depth: number;
}

interface LightningBolt {
  segments: Segment[];
  age: number;
  maxAge: number;
}

export class LightningPattern implements Pattern {
  name = 'lightning';
  private config: LightningConfig;
  private theme: Theme;
  private bolts: LightningBolt[] = [];
  private lastStrike: number = 0;
  private chargeParticles: Point[] = [];

  private static readonly PRESETS: LightningPreset[] = [
    {
      id: 1,
      name: 'Cloud Strike',
      description: 'Natural cloud-to-ground lightning',
      config: { boltDensity: 10, branchProbability: 0.25, branchAngle: Math.PI/4, fadeTime: 25, strikeInterval: 2000, maxBranches: 5, thickness: 1 }
    },
    {
      id: 2,
      name: 'Tesla Coil',
      description: 'Erratic, highly branched arcs',
      config: { boltDensity: 15, branchProbability: 0.45, branchAngle: Math.PI/3, fadeTime: 20, strikeInterval: 800, maxBranches: 6, thickness: 2 }
    },
    {
      id: 3,
      name: 'Ball Lightning',
      description: 'Spherical discharge, radial bolts',
      config: { boltDensity: 8, branchProbability: 0.35, branchAngle: Math.PI/2, fadeTime: 30, strikeInterval: 1500, maxBranches: 4, thickness: 1 }
    },
    {
      id: 4,
      name: 'Fork Lightning',
      description: 'Multiple distinct branches',
      config: { boltDensity: 12, branchProbability: 0.4, branchAngle: Math.PI/5, fadeTime: 28, strikeInterval: 2500, maxBranches: 7, thickness: 1 }
    },
    {
      id: 5,
      name: 'Chain Lightning',
      description: 'Continuous arcs, minimal fade',
      config: { boltDensity: 6, branchProbability: 0.15, branchAngle: Math.PI/6, fadeTime: 15, strikeInterval: 600, maxBranches: 3, thickness: 3 }
    },
    {
      id: 6,
      name: 'Spider Lightning',
      description: 'Horizontal spread, many thin branches',
      config: { boltDensity: 14, branchProbability: 0.5, branchAngle: Math.PI/3, fadeTime: 35, strikeInterval: 3000, maxBranches: 6, thickness: 1 }
    }
  ];

  constructor(theme: Theme, config?: Partial<LightningConfig>) {
    this.theme = theme;
    this.config = {
      boltDensity: 10,
      branchProbability: 0.25,
      branchAngle: Math.PI / 4,
      fadeTime: 25,
      strikeInterval: 2000,
      maxBranches: 5,
      thickness: 1,
      ...config
    };
  }

  reset(): void {
    this.bolts = [];
    this.lastStrike = 0;
    this.chargeParticles = [];
  }

  private generateBolt(
    start: Point,
    end: Point,
    depth: number,
    maxDepth: number,
    segments: Segment[]
  ): void {
    if (depth > maxDepth || segments.length > 400) {
      return;
    }

    // Add main segment
    segments.push({
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      depth
    });

    // Calculate segment length
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    // If segment too short, don't subdivide
    if (length < 2) {
      return;
    }

    // Number of subdivisions based on density
    const subdivisions = Math.max(1, Math.floor(length / this.config.boltDensity));

    for (let i = 1; i < subdivisions; i++) {
      const t = i / subdivisions;
      const midX = start.x + dx * t;
      const midY = start.y + dy * t;

      // Add jaggedness perpendicular to segment
      const perpX = -dy / length;
      const perpY = dx / length;
      const offset = (Math.random() - 0.5) * length * 0.3;

      const jaggedMid = {
        x: midX + perpX * offset,
        y: midY + perpY * offset
      };

      // Random chance to spawn branch
      if (Math.random() < this.config.branchProbability && depth < maxDepth) {
        const branchAngle = this.config.branchAngle * (Math.random() < 0.5 ? 1 : -1);
        const branchLength = length * (0.3 + Math.random() * 0.4);
        
        // Calculate branch direction
        const mainAngle = Math.atan2(dy, dx);
        const newAngle = mainAngle + branchAngle;
        
        const branchEnd = {
          x: jaggedMid.x + Math.cos(newAngle) * branchLength,
          y: jaggedMid.y + Math.sin(newAngle) * branchLength
        };

        this.generateBolt(jaggedMid, branchEnd, depth + 1, maxDepth - 1, segments);
      }
    }
  }

  private createBolt(start: Point, end: Point): LightningBolt {
    const segments: Segment[] = [];
    this.generateBolt(start, end, 0, this.config.maxBranches, segments);

    return {
      segments,
      age: 0,
      maxAge: this.config.fadeTime
    };
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
    const points = bresenhamLine(x1, y1, x2, y2);
    const color = this.theme.getColor(intensity);
    const thickness = this.config.thickness;

    // Apply each point with thickness
    for (const point of points) {
      // Early rejection if point is far out of bounds
      if (point.x + thickness < 0 || point.x - thickness >= size.width ||
          point.y + thickness < 0 || point.y - thickness >= size.height) {
        continue;
      }

      // Apply thickness
      for (let tx = -thickness + 1; tx < thickness; tx++) {
        for (let ty = -thickness + 1; ty < thickness; ty++) {
          const nx = point.x + tx;
          const ny = point.y + ty;
          if (nx >= 0 && nx < size.width && ny >= 0 && ny < size.height) {
            buffer[ny][nx] = { char, color };
          }
        }
      }
    }
  }

  private getLineChar(dx: number, dy: number): string {
    const angle = Math.atan2(dy, dx);
    const absAngle = Math.abs(angle);

    // Choose character based on angle
    if (absAngle < Math.PI / 8 || absAngle > 7 * Math.PI / 8) {
      return '─'; // Horizontal
    } else if (absAngle > 3 * Math.PI / 8 && absAngle < 5 * Math.PI / 8) {
      return '│'; // Vertical
    } else if (angle > 0) {
      return '\\'; // Diagonal down-right
    } else {
      return '/'; // Diagonal up-right
    }
  }

  render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void {
    const { width, height } = size;

    // Auto-strike at intervals
    if (time - this.lastStrike > this.config.strikeInterval) {
      const startX = Math.random() * width;
      const endX = startX + (Math.random() - 0.5) * width * 0.5;
      const endY = height - Math.random() * height * 0.3;

      this.bolts.push(this.createBolt(
        { x: startX, y: 0 },
        { x: endX, y: endY }
      ));

      this.lastStrike = time;

      // Limit active bolts
      if (this.bolts.length > 5) {
        this.bolts.shift();
      }
    }

    // Update and render bolts
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const bolt = this.bolts[i];
      bolt.age++;

      // Remove old bolts
      if (bolt.age > bolt.maxAge) {
        this.bolts.splice(i, 1);
        continue;
      }

      // Calculate flash intensity
      let flashIntensity: number;
      if (bolt.age < 3) {
        flashIntensity = 1.0; // Full brightness for first few frames
      } else {
        flashIntensity = 1.0 - (bolt.age - 3) / (bolt.maxAge - 3);
      }

      // Render segments
      for (const seg of bolt.segments) {
        const depthFade = 1.0 - (seg.depth / this.config.maxBranches);
        const intensity = flashIntensity * depthFade;

        const x1 = Math.floor(seg.x1);
        const y1 = Math.floor(seg.y1);
        const x2 = Math.floor(seg.x2);
        const y2 = Math.floor(seg.y2);

        const char = this.getLineChar(x2 - x1, y2 - y1);
        this.drawLine(buffer, x1, y1, x2, y2, char, intensity, size);
      }
    }

    // Update charge particles around mouse
    if (mousePos) {
      // Add new charge particles
      if (Math.random() < 0.3) {
        this.chargeParticles.push({
          x: mousePos.x + (Math.random() - 0.5) * 6,
          y: mousePos.y + (Math.random() - 0.5) * 6
        });
      }

      // Limit charge particles
      if (this.chargeParticles.length > 15) {
        this.chargeParticles.shift();
      }

      // Render charge particles
      for (const particle of this.chargeParticles) {
        const x = Math.floor(particle.x);
        const y = Math.floor(particle.y);
        if (x >= 0 && x < width && y >= 0 && y < height) {
          buffer[y][x] = {
            char: '·',
            color: this.theme.getColor(0.6)
          };
        }
      }

      // Age out charge particles
      this.chargeParticles = this.chargeParticles.map(p => ({
        x: p.x + (Math.random() - 0.5) * 0.5,
        y: p.y + (Math.random() - 0.5) * 0.5
      }));
    } else {
      this.chargeParticles = [];
    }
  }

  onMouseMove(_pos: Point): void {
    // Charge particles are rendered in render() method
  }

  onMouseClick(pos: Point): void {
    // Spawn 3-4 bolts in area around click
    const numBolts = 3 + Math.floor(Math.random() * 2);
    
    for (let i = 0; i < numBolts; i++) {
      const startX = pos.x + (Math.random() - 0.5) * 20;
      const startY = Math.random() * 5;
      const endX = pos.x + (Math.random() - 0.5) * 15;
      const endY = pos.y + (Math.random() - 0.5) * 10;

      this.bolts.push(this.createBolt(
        { x: startX, y: startY },
        { x: endX, y: endY }
      ));
    }

    // Limit total bolts
    while (this.bolts.length > 8) {
      this.bolts.shift();
    }

    this.lastStrike = Date.now(); // Reset auto-strike timer
  }

  getMetrics(): Record<string, number> {
    return {
      activeBolts: this.bolts.length,
      totalSegments: this.bolts.reduce((sum, bolt) => sum + bolt.segments.length, 0),
      chargeParticles: this.chargeParticles.length
    };
  }

  applyPreset(presetId: number): boolean {
    const preset = LightningPattern.PRESETS.find(p => p.id === presetId);
    if (!preset) return false;

    this.config = { ...preset.config };
    this.reset();
    return true;
  }

  static getPresets(): LightningPreset[] {
    return [...LightningPattern.PRESETS];
  }

  static getPreset(id: number): LightningPreset | undefined {
    return LightningPattern.PRESETS.find(p => p.id === id);
  }
}
