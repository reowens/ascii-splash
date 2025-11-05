import { Pattern, Cell, Size, Point, Theme } from '../types/index.js';
import { validateProbability, validateInterval, clamp } from '../utils/validation.js';
import { bresenhamLine } from '../utils/drawing.js';

interface LightningConfig {
  branchProbability: number;
  fadeTime: number;
  strikeInterval: number;
  mainPathJaggedness: number; // 5-15 pixels
  branchSpread: number; // 5-15 pixels
  thickness: number; // 1-3 pixels
  maxBranchDepth: number; // 1-3 (1=single level, 2-3=recursive)
}

interface LightningPreset {
  id: number;
  name: string;
  description: string;
  config: LightningConfig;
}

interface LightningPoint {
  x: number;
  y: number;
  intensity: number; // 0-1 for brightness/fade
  thickness: number; // How thick this point should render
  isBranch: boolean; // Is this part of a branch?
  depth: number; // 0=main bolt, 1=branch, 2=sub-branch, etc.
}

interface LightningBolt {
  points: LightningPoint[];
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
  private currentTime: number = 0;

  private static readonly PRESETS: LightningPreset[] = [
    {
      id: 1,
      name: 'Cloud Strike',
      description: 'Natural cloud-to-ground lightning',
      config: { branchProbability: 0.25, fadeTime: 25, strikeInterval: 2000, mainPathJaggedness: 8, branchSpread: 10, thickness: 3, maxBranchDepth: 2 }
    },
    {
      id: 2,
      name: 'Tesla Coil',
      description: 'Erratic, highly branched arcs',
      config: { branchProbability: 0.45, fadeTime: 20, strikeInterval: 800, mainPathJaggedness: 12, branchSpread: 15, thickness: 2, maxBranchDepth: 3 }
    },
    {
      id: 3,
      name: 'Ball Lightning',
      description: 'Spherical discharge, radial bolts',
      config: { branchProbability: 0.35, fadeTime: 30, strikeInterval: 1500, mainPathJaggedness: 6, branchSpread: 12, thickness: 2, maxBranchDepth: 2 }
    },
    {
      id: 4,
      name: 'Fork Lightning',
      description: 'Multiple distinct branches',
      config: { branchProbability: 0.4, fadeTime: 28, strikeInterval: 2500, mainPathJaggedness: 10, branchSpread: 12, thickness: 3, maxBranchDepth: 3 }
    },
    {
      id: 5,
      name: 'Chain Lightning',
      description: 'Continuous arcs, minimal fade',
      config: { branchProbability: 0.15, fadeTime: 15, strikeInterval: 600, mainPathJaggedness: 5, branchSpread: 8, thickness: 2, maxBranchDepth: 1 }
    },
    {
      id: 6,
      name: 'Spider Lightning',
      description: 'Horizontal spread, many thin branches',
      config: { branchProbability: 0.5, fadeTime: 35, strikeInterval: 3000, mainPathJaggedness: 10, branchSpread: 15, thickness: 1, maxBranchDepth: 2 }
    }
  ];

  constructor(theme: Theme, config?: Partial<LightningConfig>) {
    this.theme = theme;
    const merged = {
      branchProbability: 0.25,
      fadeTime: 25,
      strikeInterval: 2000,
      mainPathJaggedness: 8,
      branchSpread: 10,
      maxBranchDepth: 2,
      ...config
    };
    
    // Validate numeric config values
    this.config = {
      branchProbability: validateProbability(merged.branchProbability),
      fadeTime: clamp(merged.fadeTime, 5, 100),
      strikeInterval: validateInterval(merged.strikeInterval, 100, 10000),
      mainPathJaggedness: clamp(merged.mainPathJaggedness, 3, 20),
      branchSpread: clamp(merged.branchSpread, 5, 20),
      thickness: clamp(merged.thickness ?? 2, 1, 3),
      maxBranchDepth: clamp(merged.maxBranchDepth, 1, 3)
    };
  }

  reset(): void {
    this.bolts = [];
    this.lastStrike = 0;
    this.chargeParticles = [];
    this.currentTime = 0;
  }

  /**
   * Recursively create branches from a starting point
   * @param start Branch start point
   * @param parentDirection Parent bolt direction for perpendicular branching
   * @param depth Current branch depth (0 = main bolt, 1+ = sub-branches)
   * @param points Array to accumulate points (by reference)
   */
  private createBranchRecursive(
    start: Point,
    parentDirection: { dx: number; dy: number; length: number },
    depth: number,
    points: LightningPoint[]
  ): void {
    // Stop if we've reached max depth or hit point limit
    if (depth > this.config.maxBranchDepth || points.length > 500) {
      return;
    }

    const { dx, dy, length } = parentDirection;
    const perpX = -dy / length;
    const perpY = dx / length;

    // Progressive scaling based on depth
    const lengthScale = Math.pow(0.65, depth); // Each level is 65% of parent
    const intensityBase = 1.0 - depth * 0.15; // Dimmer at deeper levels
    const thicknessForDepth = Math.max(1, this.config.thickness - depth);
    const branchProbForDepth = this.config.branchProbability * Math.pow(0.7, depth);
    const spreadForDepth = this.config.branchSpread * Math.pow(0.7, depth);

    // Create branch path (shorter at deeper levels)
    const branchLength = Math.floor((3 + Math.random() * 4) * lengthScale);
    if (branchLength < 2) return; // Too short to be meaningful

    const branchWaypoints: Point[] = [start];
    const side = Math.random() < 0.5 ? 1 : -1;

    for (let j = 1; j <= branchLength; j++) {
      const branchT = j / branchLength;
      const spread = spreadForDepth * branchT;
      const jag = (Math.random() - 0.5) * 5 * lengthScale;

      branchWaypoints.push({
        x: start.x + perpX * side * spread + (dx / length) * jag,
        y: start.y + perpY * side * spread + (dy / length) * jag
      });
    }

    // Connect branch waypoints with Bresenham lines
    for (let j = 0; j < branchWaypoints.length - 1; j++) {
      const bStart = branchWaypoints[j];
      const bEnd = branchWaypoints[j + 1];

      const branchLinePoints = bresenhamLine(
        Math.floor(bStart.x), Math.floor(bStart.y),
        Math.floor(bEnd.x), Math.floor(bEnd.y)
      );

      // Branch intensity fades along its length
      const segmentT = j / (branchWaypoints.length - 1);
      const branchIntensity = intensityBase - segmentT * 0.3;

      for (const pt of branchLinePoints) {
        points.push({
          x: pt.x,
          y: pt.y,
          intensity: Math.max(0.3, branchIntensity),
          thickness: thicknessForDepth,
          isBranch: depth > 0,
          depth: depth
        });
      }

      // Recursively spawn sub-branches at waypoints (skip first and last)
      if (j > 0 && j < branchWaypoints.length - 2 && Math.random() < branchProbForDepth) {
        // Calculate sub-branch direction (roughly perpendicular to current branch)
        const subDx = bEnd.x - bStart.x;
        const subDy = bEnd.y - bStart.y;
        const subLength = Math.sqrt(subDx * subDx + subDy * subDy);
        
        if (subLength > 0.1) {
          this.createBranchRecursive(
            branchWaypoints[j],
            { dx: subDx, dy: subDy, length: subLength },
            depth + 1,
            points
          );
        }
      }
    }
  }

  private createBolt(start: Point, end: Point): LightningBolt {
    const points: LightningPoint[] = [];
    
    // Calculate main path direction
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length < 1) {
      // Degenerate case: start and end are the same
      return {
        points: [{ x: start.x, y: start.y, intensity: 1.0, thickness: this.config.thickness, isBranch: false, depth: 0 }],
        age: 0,
        maxAge: this.config.fadeTime
      };
    }
    
    const perpX = -dy / length;
    const perpY = dx / length;
    
    // Generate jagged waypoints for the main path (8-12 segments)
    const numSegments = 8 + Math.floor(Math.random() * 5);
    const waypoints: Point[] = [start];
    
    for (let i = 1; i < numSegments; i++) {
      const t = i / numSegments;
      const baseX = start.x + dx * t;
      const baseY = start.y + dy * t;
      
      // Add perpendicular jaggedness
      const offset = (Math.random() - 0.5) * this.config.mainPathJaggedness;
      
      waypoints.push({
        x: baseX + perpX * offset,
        y: baseY + perpY * offset
      });
    }
    waypoints.push(end);
    
    // Connect waypoints with Bresenham lines to create solid bolt
    for (let i = 0; i < waypoints.length - 1; i++) {
      const segmentStart = waypoints[i];
      const segmentEnd = waypoints[i + 1];
      
      const linePoints = bresenhamLine(
        Math.floor(segmentStart.x), Math.floor(segmentStart.y),
        Math.floor(segmentEnd.x), Math.floor(segmentEnd.y)
      );
      
      // Add each point with thickness and main path intensity
      for (const pt of linePoints) {
        points.push({
          x: pt.x,
          y: pt.y,
          intensity: 1.0,
          thickness: this.config.thickness,
          isBranch: false,
          depth: 0
        });
      }
      
      // Spawn branches recursively at some waypoints
      if (i > 0 && i < waypoints.length - 2 && Math.random() < this.config.branchProbability) {
        this.createBranchRecursive(
          waypoints[i],
          { dx, dy, length },
          1, // Start at depth 1 (branches of main bolt)
          points
        );
      }
    }
    
    // Cap total points at 500 to maintain performance (Phase 2 allows more complexity)
    if (points.length > 500) {
      points.length = 500;
    }
    
    return {
      points,
      age: 0,
      maxAge: this.config.fadeTime
    };
  }

  render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void {
    const { width, height } = size;

    // Auto-strike at intervals
    this.currentTime = time;
    if (time - this.lastStrike > this.config.strikeInterval) {
      const startX = Math.random() * width;
      const endX = startX + (Math.random() - 0.5) * width * 0.5;
      const endY = height - Math.random() * height * 0.3;

      this.bolts.push(this.createBolt(
        { x: startX, y: 0 },
        { x: endX, y: endY }
      ));

      this.lastStrike = time;

      // Limit active bolts to 3
      if (this.bolts.length > 3) {
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

      // Calculate flash intensity with age-based fade
      let flashIntensity: number;
      if (bolt.age < 3) {
        flashIntensity = 1.0; // Full brightness for first few frames
      } else {
        flashIntensity = 1.0 - (bolt.age - 3) / (bolt.maxAge - 3);
      }

      // Render points with thickness support
      for (const point of bolt.points) {
        const x = Math.floor(point.x);
        const y = Math.floor(point.y);
        
        // Bounds check
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const finalIntensity = point.intensity * flashIntensity;
          
          // Choose character based on type and intensity
          let char: string;
          if (point.isBranch) {
            // Branches use angled characters
            if (finalIntensity > 0.6) {
              char = Math.random() < 0.5 ? '╱' : '╲';
            } else {
              char = Math.random() < 0.5 ? '/' : '\\';
            }
          } else {
            // Main bolt uses vertical characters
            if (finalIntensity > 0.8) {
              char = '║'; // Thick vertical
            } else if (finalIntensity > 0.5) {
              char = '|'; // Standard vertical
            } else {
              char = '⚡'; // Stylized lightning
            }
          }
          
          // Render main point
          buffer[y][x] = {
            char,
            color: this.theme.getColor(finalIntensity)
          };
          
          // Add thickness pixels if thickness > 1
          if (point.thickness > 1) {
            // Add horizontal neighbors for thickness
            for (let tx = 1; tx < point.thickness; tx++) {
              const offsetX = Math.floor(tx / 2) * (tx % 2 === 0 ? 1 : -1);
              const thickX = x + offsetX;
              
              if (thickX >= 0 && thickX < width && thickX !== x) {
                const thickIntensity = finalIntensity * 0.8; // Slightly dimmer
                buffer[y][thickX] = {
                  char,
                  color: this.theme.getColor(thickIntensity)
                };
              }
            }
          }
        }
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
    // Spawn single bolt at click position
    const startX = pos.x + (Math.random() - 0.5) * 10;
    const startY = Math.random() * 5;
    const endX = pos.x + (Math.random() - 0.5) * 15;
    const endY = pos.y + (Math.random() - 0.5) * 10;

    this.bolts.push(this.createBolt(
      { x: startX, y: startY },
      { x: endX, y: endY }
    ));

    // Limit total bolts to 3
    while (this.bolts.length > 3) {
      this.bolts.shift();
    }

    this.lastStrike = this.currentTime; // Reset auto-strike timer
  }

  getMetrics(): Record<string, number> {
    return {
      activeBolts: this.bolts.length,
      totalPoints: this.bolts.reduce((sum, bolt) => sum + bolt.points.length, 0),
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
