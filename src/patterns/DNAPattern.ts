import { Pattern, Cell, Size, Point, Theme } from '../types';
import { Point3D, projectTo2D, inBounds, clamp } from '../utils/math';

interface DNAConfig {
  rotationSpeed: number;      // radians per second
  helixRadius: number;        // width of helix
  basePairDensity: number;    // pairs per screen height
  twistRate: number;          // full rotations per screen height
  showLabels: boolean;        // show A-T, G-C labels
}

interface DNAPreset {
  id: number;
  name: string;
  description: string;
  config: DNAConfig;
}

interface BasePair {
  y: number;
  type: 'AT' | 'GC' | 'TA' | 'CG';
  flash: number; // for mutation effect
}

export class DNAPattern implements Pattern {
  name = 'dna';
  private config: DNAConfig;
  private theme: Theme;
  private basePairs: BasePair[] = [];
  private mutationCenters: Array<{ y: number; time: number; radius: number }> = [];
  private twistOffset = 0;
  private currentTime: number = 0;

  // Character sets for different elements
  private strandChars = ['│', '║', '┃'];
  private pairChars = ['─', '═', '━'];
  private baseChars = { A: 'A', T: 'T', G: 'G', C: 'C' };

  private static readonly PRESETS: DNAPreset[] = [
    {
      id: 1,
      name: 'Slow Helix',
      description: 'Gentle rotation, clearly visible structure',
      config: { rotationSpeed: 0.3, helixRadius: 8, basePairDensity: 0.3, twistRate: 2, showLabels: true }
    },
    {
      id: 2,
      name: 'Fast Spin',
      description: 'Rapid rotation blur effect',
      config: { rotationSpeed: 1.5, helixRadius: 10, basePairDensity: 0.4, twistRate: 3, showLabels: false }
    },
    {
      id: 3,
      name: 'Unwinding',
      description: 'Strands separate and reconnect',
      config: { rotationSpeed: 0.5, helixRadius: 15, basePairDensity: 0.25, twistRate: 1.5, showLabels: false }
    },
    {
      id: 4,
      name: 'Replication',
      description: 'Two helixes side by side',
      config: { rotationSpeed: 0.4, helixRadius: 6, basePairDensity: 0.5, twistRate: 2.5, showLabels: true }
    },
    {
      id: 5,
      name: 'Mutation',
      description: 'Random base pair changes with flash',
      config: { rotationSpeed: 0.6, helixRadius: 9, basePairDensity: 0.35, twistRate: 2, showLabels: true }
    },
    {
      id: 6,
      name: 'Rainbow',
      description: 'Multi-color base pairs cycling',
      config: { rotationSpeed: 0.8, helixRadius: 10, basePairDensity: 0.4, twistRate: 2, showLabels: false }
    }
  ];

  constructor(theme: Theme, config?: Partial<DNAConfig>) {
    this.theme = theme;
    this.config = {
      rotationSpeed: 0.5,
      helixRadius: 10,
      basePairDensity: 0.3,
      twistRate: 2,
      showLabels: true,
      ...config
    };
    this.initializeBasePairs(50); // Start with some base pairs
  }

  private initializeBasePairs(height: number): void {
    this.basePairs = [];
    const pairCount = Math.floor(height * this.config.basePairDensity);
    
    for (let i = 0; i < pairCount; i++) {
      const y = (i / pairCount) * height;
      this.basePairs.push({
        y,
        type: this.randomBasePairType(),
        flash: 0
      });
    }
  }

  private randomBasePairType(): 'AT' | 'GC' | 'TA' | 'CG' {
    const types: ('AT' | 'GC' | 'TA' | 'CG')[] = ['AT', 'GC', 'TA', 'CG'];
    return types[Math.floor(Math.random() * types.length)];
  }

  render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void {
    const { width, height } = size;
    const centerX = width / 2;
    const { rotationSpeed, helixRadius, twistRate, showLabels } = this.config;

    // Update rotation
    this.twistOffset = (time * rotationSpeed * 0.001) % (Math.PI * 2);

    // Ensure we have base pairs for current height
    if (this.basePairs.length === 0 || Math.abs(this.basePairs[this.basePairs.length - 1].y - height) > 10) {
      this.initializeBasePairs(height);
    // Track current time for mutations
    this.currentTime = time;
    }

    // Apply mouse twist effect
    let mouseTwistInfluence = 0;
    if (mousePos) {
      mouseTwistInfluence = (mousePos.x - centerX) * 0.02;
    }

    // Draw base pairs and strands
    for (const pair of this.basePairs) {
      if (pair.y < 0 || pair.y >= height) continue;

      const y = Math.floor(pair.y);
      
      // Calculate twist angle for this height
      const heightRatio = pair.y / height;
      const twistAngle = this.twistOffset + heightRatio * twistRate * Math.PI * 2 + mouseTwistInfluence;

      // Calculate 3D positions for both strands
      const strand1: Point3D = {
        x: Math.cos(twistAngle) * helixRadius,
        y: pair.y - height / 2,
        z: Math.sin(twistAngle) * helixRadius
      };

      const strand2: Point3D = {
        x: Math.cos(twistAngle + Math.PI) * helixRadius,
        y: pair.y - height / 2,
        z: Math.sin(twistAngle + Math.PI) * helixRadius
      };

      // Project to 2D
      const p1 = projectTo2D(strand1, 200);
      const p2 = projectTo2D(strand2, 200);

      const x1 = Math.floor(centerX + p1.x);
      const x2 = Math.floor(centerX + p2.x);

      // Determine depth for coloring (z-buffer simulation)
      const depth1 = (strand1.z + helixRadius) / (helixRadius * 2); // 0 to 1
      const depth2 = (strand2.z + helixRadius) / (helixRadius * 2);

      // Check for mutations nearby
      let mutationIntensity = 0;
      for (const mut of this.mutationCenters) {
        const dist = Math.abs(pair.y - mut.y);
        if (dist < mut.radius) {
          const age = time - mut.time;
          const fadeOut = Math.max(0, 1 - age / 1000);
          mutationIntensity = Math.max(mutationIntensity, (1 - dist / mut.radius) * fadeOut);
        }
      }

      // Draw base pair connecting line
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      
      for (let x = minX; x <= maxX; x++) {
        if (inBounds(x, y, width, height)) {
          const progress = (x - minX) / (maxX - minX || 1);
          const intensity = clamp(0.4 + mutationIntensity * 0.6 + pair.flash, 0, 1);
          
          let char = this.pairChars[1];
          if (x === minX || x === maxX) {
            char = progress < 0.5 ? this.strandChars[1] : this.strandChars[1];
          }

          buffer[y][x] = {
            char,
            color: this.theme.getColor(intensity)
          };
        }
      }

      // Draw base labels
      if (showLabels && y % 2 === 0) {
        const [base1, base2] = pair.type.split('') as ['A' | 'T' | 'G' | 'C', 'A' | 'T' | 'G' | 'C'];
        
        if (inBounds(x1, y, width, height) && depth1 > 0.3) {
          buffer[y][x1] = {
            char: this.baseChars[base1],
            color: this.theme.getColor(clamp(depth1 + mutationIntensity, 0, 1))
          };
        }
        
        if (inBounds(x2, y, width, height) && depth2 > 0.3) {
          buffer[y][x2] = {
            char: this.baseChars[base2],
            color: this.theme.getColor(clamp(depth2 + mutationIntensity, 0, 1))
          };
        }
      }

      // Decay flash
      if (pair.flash > 0) {
        pair.flash *= 0.9;
        if (pair.flash < 0.01) pair.flash = 0;
      }
    }

    // Clean up old mutations
    this.mutationCenters = this.mutationCenters.filter(m => time - m.time < 1000);
  }

  onMouseMove(_pos: Point): void {
    // Mouse movement creates local twist - handled in render
  }

  onMouseClick(pos: Point): void {
    // Click spawns mutation burst
    this.mutationCenters.push({
      y: pos.y,
      time: this.currentTime,
      radius: 15
    });

    // Mutate nearby base pairs
    for (const pair of this.basePairs) {
      const dist = Math.abs(pair.y - pos.y);
      if (dist < 15) {
        pair.type = this.randomBasePairType();
        pair.flash = 1.0;
      }
    }
  }

  reset(): void {
    this.basePairs = [];
    this.mutationCenters = [];
    this.twistOffset = 0;
    this.currentTime = 0;
  }

  getMetrics(): Record<string, number> {
    return {
      basePairs: this.basePairs.length,
      mutations: this.mutationCenters.length
    };
  }

  applyPreset(presetId: number): boolean {
    const preset = DNAPattern.PRESETS.find(p => p.id === presetId);
    if (!preset) return false;
    
    this.config = { ...preset.config };
    this.reset();
    return true;
  }

  static getPresets(): DNAPreset[] {
    return [...DNAPattern.PRESETS];
  }

  static getPreset(id: number): DNAPreset | undefined {
    return DNAPattern.PRESETS.find(p => p.id === id);
  }
}
