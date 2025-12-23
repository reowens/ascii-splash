/**
 * SnowfallParkPattern - Peaceful snowy park scene with falling snow
 *
 * Features:
 * - Gently falling snowflakes with wind drift
 * - Snow accumulation on the ground
 * - Swaying trees silhouettes
 * - Glowing street lamps
 * - Mouse interaction: blow snow with cursor movement
 */

import { Pattern, Cell, Size, Point, Theme, Color } from '../types/index.js';
import { PerlinNoise } from '../utils/noise.js';
import { clamp } from '../utils/math.js';

interface SnowfallParkConfig {
  snowDensity: number; // Snowflakes per 100 cells (0.5-3.0)
  fallSpeed: number; // Fall speed multiplier (0.5-2.0)
  windStrength: number; // Wind drift strength (0-1.0)
  windVariation: number; // How much wind changes (0-1.0)
  treeCount: number; // Number of trees (2-8)
  lampCount: number; // Number of street lamps (1-4)
  accumulationEnabled: boolean; // Show snow on ground
  accumulationHeight: number; // Max snow height in rows (1-5)
  mouseBlowForce: number; // How much cursor blows snow (0-3.0)
}

interface Snowflake {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number; // 0=small, 1=medium, 2=large
  drift: number; // Individual drift phase
}

interface Tree {
  x: number;
  height: number;
  width: number;
  type: 'pine' | 'oak';
  swayPhase: number;
}

interface Lamp {
  x: number;
  glowPhase: number;
}

interface SnowfallParkPreset {
  id: number;
  name: string;
  description: string;
  config: SnowfallParkConfig;
}

export class SnowfallParkPattern implements Pattern {
  public readonly name = 'snowfallpark';

  private config: SnowfallParkConfig;
  private theme: Theme;
  private snowflakes: Snowflake[] = [];
  private trees: Tree[] = [];
  private lamps: Lamp[] = [];
  private accumulation: number[] = []; // Snow depth per column
  private noise: PerlinNoise;
  private lastTime = 0;
  private noiseOffset = 0;
  private mousePos: Point | null = null;
  private initialized = false;

  private static readonly SNOW_CHARS = ['.', '*', '❄'];
  private static readonly PINE_LAYERS = [
    '    *    ',
    '   /|\\   ',
    '  /|||\\  ',
    ' /|||||\\',
    '/|||||||\\',
    '   |||   ',
  ];
  private static readonly OAK_LAYERS = [
    '   @@@@   ',
    ' @@@@@@@@',
    '@@@@@@@@@@ ',
    ' @@@@@@@@ ',
    '    ||    ',
  ];

  private static readonly PRESETS: SnowfallParkPreset[] = [
    {
      id: 1,
      name: 'Gentle Snowfall',
      description: 'Light, peaceful snow',
      config: {
        snowDensity: 1.0,
        fallSpeed: 0.8,
        windStrength: 0.2,
        windVariation: 0.3,
        treeCount: 4,
        lampCount: 2,
        accumulationEnabled: true,
        accumulationHeight: 2,
        mouseBlowForce: 1.0,
      },
    },
    {
      id: 2,
      name: 'Blizzard',
      description: 'Heavy snowstorm',
      config: {
        snowDensity: 3.0,
        fallSpeed: 1.5,
        windStrength: 0.8,
        windVariation: 0.6,
        treeCount: 3,
        lampCount: 2,
        accumulationEnabled: true,
        accumulationHeight: 4,
        mouseBlowForce: 0.5,
      },
    },
    {
      id: 3,
      name: 'Winter Night',
      description: 'Quiet evening snowfall',
      config: {
        snowDensity: 0.8,
        fallSpeed: 0.5,
        windStrength: 0.1,
        windVariation: 0.2,
        treeCount: 5,
        lampCount: 3,
        accumulationEnabled: true,
        accumulationHeight: 3,
        mouseBlowForce: 1.5,
      },
    },
    {
      id: 4,
      name: 'Forest Clearing',
      description: 'Dense trees with snow',
      config: {
        snowDensity: 1.5,
        fallSpeed: 1.0,
        windStrength: 0.3,
        windVariation: 0.4,
        treeCount: 8,
        lampCount: 1,
        accumulationEnabled: true,
        accumulationHeight: 2,
        mouseBlowForce: 1.0,
      },
    },
    {
      id: 5,
      name: 'City Park',
      description: 'Urban park with lamps',
      config: {
        snowDensity: 1.2,
        fallSpeed: 0.7,
        windStrength: 0.4,
        windVariation: 0.3,
        treeCount: 3,
        lampCount: 4,
        accumulationEnabled: true,
        accumulationHeight: 1,
        mouseBlowForce: 2.0,
      },
    },
    {
      id: 6,
      name: 'Windy Flurries',
      description: 'Dancing snowflakes',
      config: {
        snowDensity: 2.0,
        fallSpeed: 1.2,
        windStrength: 0.9,
        windVariation: 0.8,
        treeCount: 4,
        lampCount: 2,
        accumulationEnabled: false,
        accumulationHeight: 0,
        mouseBlowForce: 3.0,
      },
    },
  ];

  constructor(theme: Theme, config: Partial<SnowfallParkConfig> = {}) {
    this.theme = theme;
    this.config = {
      snowDensity: 1.5,
      fallSpeed: 1.0,
      windStrength: 0.3,
      windVariation: 0.4,
      treeCount: 4,
      lampCount: 2,
      accumulationEnabled: true,
      accumulationHeight: 3,
      mouseBlowForce: 1.5,
      ...config,
    };

    this.noise = new PerlinNoise(Math.random() * 10000);
  }

  private initialize(size: Size): void {
    if (this.initialized) return;

    // Create trees
    this.trees = [];
    const treeSpacing = size.width / (this.config.treeCount + 1);
    for (let i = 0; i < this.config.treeCount; i++) {
      const x = treeSpacing * (i + 1) + (Math.random() - 0.5) * treeSpacing * 0.5;
      this.trees.push({
        x: Math.floor(x),
        height: 4 + Math.floor(Math.random() * 3),
        width: 8 + Math.floor(Math.random() * 4),
        type: Math.random() < 0.6 ? 'pine' : 'oak',
        swayPhase: Math.random() * Math.PI * 2,
      });
    }

    // Create lamps
    this.lamps = [];
    const lampSpacing = size.width / (this.config.lampCount + 1);
    for (let i = 0; i < this.config.lampCount; i++) {
      const x = lampSpacing * (i + 1) + (Math.random() - 0.5) * lampSpacing * 0.3;
      this.lamps.push({
        x: Math.floor(x),
        glowPhase: Math.random() * Math.PI * 2,
      });
    }

    // Initialize snowflakes
    this.snowflakes = [];
    const targetCount = Math.floor((size.width * size.height * this.config.snowDensity) / 100);
    for (let i = 0; i < targetCount; i++) {
      this.spawnSnowflake(size, true);
    }

    // Initialize accumulation
    this.accumulation = new Array<number>(size.width).fill(0);

    this.initialized = true;
  }

  private spawnSnowflake(size: Size, randomY = false): void {
    const size_val = Math.floor(Math.random() * 3);
    const baseSpeed = [0.5, 0.8, 1.2][size_val]; // Larger flakes fall faster

    this.snowflakes.push({
      x: Math.random() * size.width,
      y: randomY ? Math.random() * size.height : -1,
      vx: (Math.random() - 0.5) * 0.5,
      vy: baseSpeed * this.config.fallSpeed,
      size: size_val,
      drift: Math.random() * Math.PI * 2,
    });
  }

  render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void {
    this.initialize(size);

    const dt = this.lastTime === 0 ? 0.016 : (time - this.lastTime) / 1000;
    this.lastTime = time;
    this.noiseOffset = time * 0.0001;

    if (mousePos) {
      this.mousePos = mousePos;
    }

    // Clear buffer with night sky gradient
    this.renderBackground(buffer, size);

    // Update snow
    this.updateSnowflakes(size, dt, time);

    // Render order: background -> trees -> lamps -> snow -> accumulation
    this.renderTrees(buffer, size, time);
    this.renderLamps(buffer, size, time);
    this.renderSnowflakes(buffer, size);

    if (this.config.accumulationEnabled) {
      this.renderAccumulation(buffer, size);
    }

    // Render ground
    this.renderGround(buffer, size);
  }

  private renderBackground(buffer: Cell[][], size: Size): void {
    const { width, height } = size;

    for (let y = 0; y < height; y++) {
      const skyRatio = y / height;
      // Dark blue night sky gradient
      const bgColor: Color = {
        r: Math.round(5 + skyRatio * 10),
        g: Math.round(10 + skyRatio * 15),
        b: Math.round(30 + skyRatio * 20),
      };

      for (let x = 0; x < width; x++) {
        const cell = buffer[y]?.[x];
        if (cell) {
          cell.char = ' ';
          cell.color = bgColor;
        }
      }
    }
  }

  private updateSnowflakes(size: Size, dt: number, time: number): void {
    // Calculate wind from noise
    const windBase = this.noise.noise2D(this.noiseOffset, 0) * this.config.windStrength;
    const windVar = Math.sin(time * 0.001) * this.config.windVariation * 0.5;
    const wind = windBase + windVar;

    for (let i = this.snowflakes.length - 1; i >= 0; i--) {
      const flake = this.snowflakes[i];

      // Apply wind and drift
      const driftX = Math.sin(time * 0.002 + flake.drift) * 0.3 * this.config.windVariation;
      flake.vx = wind + driftX;

      // Apply mouse blow force
      if (this.config.mouseBlowForce > 0 && this.mousePos) {
        const dx = flake.x - this.mousePos.x;
        const dy = flake.y - this.mousePos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 10 && dist > 0) {
          const force = ((10 - dist) / 10) * this.config.mouseBlowForce * 0.3;
          flake.vx += (dx / dist) * force;
          flake.vy += (dy / dist) * force * 0.5;
        }
      }

      // Update position
      flake.x += flake.vx * dt * 30;
      flake.y += flake.vy * dt * 30;

      // Check if snowflake has landed or gone off screen
      const groundY = size.height - 2;
      const accumulationY = this.config.accumulationEnabled
        ? groundY - this.accumulation[Math.floor(flake.x)] || 0
        : groundY;

      if (flake.y >= accumulationY) {
        // Add to accumulation
        if (this.config.accumulationEnabled) {
          const col = Math.floor(flake.x);
          if (col >= 0 && col < size.width) {
            this.accumulation[col] = Math.min(
              this.accumulation[col] + 0.1,
              this.config.accumulationHeight
            );
          }
        }
        this.snowflakes.splice(i, 1);
        continue;
      }

      // Wrap horizontally
      if (flake.x < -2) flake.x = size.width + 2;
      if (flake.x > size.width + 2) flake.x = -2;

      // Remove if off screen vertically
      if (flake.y < -5) {
        this.snowflakes.splice(i, 1);
      }
    }

    // Spawn new snowflakes
    const targetCount = Math.floor((size.width * size.height * this.config.snowDensity) / 100);
    while (this.snowflakes.length < targetCount) {
      this.spawnSnowflake(size);
    }
  }

  private renderSnowflakes(buffer: Cell[][], size: Size): void {
    for (const flake of this.snowflakes) {
      const x = Math.floor(flake.x);
      const y = Math.floor(flake.y);

      if (y >= 0 && y < size.height && x >= 0 && x < size.width) {
        // Snowflake brightness varies slightly
        const brightness = 0.8 + Math.random() * 0.2;
        const snowColor: Color = {
          r: Math.round(240 * brightness),
          g: Math.round(245 * brightness),
          b: Math.round(255 * brightness),
        };

        const cell = buffer[y]?.[x];
        if (cell) {
          cell.char = SnowfallParkPattern.SNOW_CHARS[flake.size];
          cell.color = snowColor;
        }
      }
    }
  }

  private renderTrees(buffer: Cell[][], size: Size, time: number): void {
    for (const tree of this.trees) {
      const sway = Math.sin(time * 0.001 + tree.swayPhase) * this.config.windStrength * 0.5;

      if (tree.type === 'pine') {
        this.renderPineTree(buffer, size, tree, sway);
      } else {
        this.renderOakTree(buffer, size, tree, sway);
      }
    }
  }

  private renderPineTree(buffer: Cell[][], size: Size, tree: Tree, sway: number): void {
    const groundY = size.height - 2;
    const layers = SnowfallParkPattern.PINE_LAYERS;
    const baseY = groundY - layers.length;

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const y = baseY + i;
      const swayOffset = sway * (1 - i / layers.length);
      const startX = Math.floor(tree.x - layer.length / 2 + swayOffset);

      for (let j = 0; j < layer.length; j++) {
        const x = startX + j;
        if (y >= 0 && y < size.height && x >= 0 && x < size.width && layer[j] !== ' ') {
          // Green color for pine
          const treeColor: Color = {
            r: 20 + Math.floor(Math.random() * 20),
            g: 60 + Math.floor(Math.random() * 30),
            b: 30 + Math.floor(Math.random() * 20),
          };

          const cell = buffer[y]?.[x];
          if (cell?.char === ' ') {
            cell.char = layer[j];
            cell.color = treeColor;
          }
        }
      }
    }
  }

  private renderOakTree(buffer: Cell[][], size: Size, tree: Tree, sway: number): void {
    const groundY = size.height - 2;
    const layers = SnowfallParkPattern.OAK_LAYERS;
    const baseY = groundY - layers.length;

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const y = baseY + i;
      const swayOffset = sway * (1 - i / layers.length);
      const startX = Math.floor(tree.x - layer.length / 2 + swayOffset);

      for (let j = 0; j < layer.length; j++) {
        const x = startX + j;
        if (y >= 0 && y < size.height && x >= 0 && x < size.width && layer[j] !== ' ') {
          // Brown/dark color for bare oak
          const treeColor: Color =
            layer[j] === '|'
              ? { r: 80, g: 50, b: 30 }
              : { r: 40 + Math.floor(Math.random() * 20), g: 30, b: 20 };

          const cell = buffer[y]?.[x];
          if (cell?.char === ' ') {
            cell.char = layer[j];
            cell.color = treeColor;
          }
        }
      }
    }
  }

  private renderLamps(buffer: Cell[][], size: Size, time: number): void {
    for (const lamp of this.lamps) {
      const groundY = size.height - 2;
      const lampHeight = 5;
      const lampTop = groundY - lampHeight;

      // Lamp post
      for (let y = lampTop + 1; y <= groundY; y++) {
        const cell = buffer[y]?.[lamp.x];
        if (cell) {
          cell.char = '|';
          cell.color = { r: 60, g: 60, b: 60 };
        }
      }

      // Lamp head
      const headCell = buffer[lampTop]?.[lamp.x];
      if (headCell) {
        headCell.char = '◉';
        // Warm glow that flickers slightly
        const flicker = 0.9 + Math.sin(time * 0.003 + lamp.glowPhase) * 0.1;
        headCell.color = {
          r: Math.round(255 * flicker),
          g: Math.round(200 * flicker),
          b: Math.round(100 * flicker),
        };
      }

      // Glow effect around lamp
      this.renderLampGlow(buffer, size, lamp.x, lampTop, time, lamp.glowPhase);
    }
  }

  private renderLampGlow(
    buffer: Cell[][],
    size: Size,
    lampX: number,
    lampY: number,
    time: number,
    phase: number
  ): void {
    const glowRadius = 4;
    const flicker = 0.8 + Math.sin(time * 0.003 + phase) * 0.2;

    for (let dy = -glowRadius; dy <= glowRadius; dy++) {
      for (let dx = -glowRadius; dx <= glowRadius; dx++) {
        const x = lampX + dx;
        const y = lampY + dy;

        if (y >= 0 && y < size.height && x >= 0 && x < size.width) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= glowRadius && dist > 0) {
            const intensity = (1 - dist / glowRadius) * 0.3 * flicker;

            const cell = buffer[y]?.[x];
            if (cell?.char === ' ') {
              // Add warm glow to background
              cell.color = {
                r: clamp(Math.round((cell.color?.r ?? 0) + 100 * intensity), 0, 255),
                g: clamp(Math.round((cell.color?.g ?? 0) + 70 * intensity), 0, 255),
                b: clamp(Math.round((cell.color?.b ?? 0) + 20 * intensity), 0, 255),
              };
            }
          }
        }
      }
    }
  }

  private renderAccumulation(buffer: Cell[][], size: Size): void {
    const groundY = size.height - 2;

    for (let x = 0; x < size.width; x++) {
      const snowHeight = Math.floor(this.accumulation[x] || 0);

      for (let h = 0; h < snowHeight; h++) {
        const y = groundY - h;
        if (y >= 0 && y < size.height) {
          const cell = buffer[y]?.[x];
          if (cell) {
            cell.char = h === snowHeight - 1 ? '~' : '▒';
            cell.color = { r: 240, g: 245, b: 255 };
          }
        }
      }
    }
  }

  private renderGround(buffer: Cell[][], size: Size): void {
    const groundY = size.height - 1;

    for (let x = 0; x < size.width; x++) {
      const cell = buffer[groundY]?.[x];
      if (cell) {
        cell.char = '▓';
        cell.color = { r: 200, g: 210, b: 220 };
      }
    }
  }

  onMouseMove(pos: Point): void {
    this.mousePos = pos;
  }

  onMouseClick(pos: Point): void {
    // Blow away snow in a burst
    for (const flake of this.snowflakes) {
      const dx = flake.x - pos.x;
      const dy = flake.y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 15 && dist > 0) {
        const force = ((15 - dist) / 15) * 2;
        flake.vx += (dx / dist) * force;
        flake.vy += (dy / dist) * force * 0.5;
      }
    }
  }

  reset(): void {
    this.snowflakes = [];
    this.trees = [];
    this.lamps = [];
    this.accumulation = [];
    this.lastTime = 0;
    this.noiseOffset = 0;
    this.initialized = false;
    this.mousePos = null;
    this.noise = new PerlinNoise(Math.random() * 10000);
  }

  applyPreset(presetId: number): boolean {
    const preset = SnowfallParkPattern.PRESETS.find(p => p.id === presetId);
    if (!preset) return false;

    this.config = { ...preset.config };
    this.reset();
    return true;
  }

  static getPresets(): SnowfallParkPreset[] {
    return [...SnowfallParkPattern.PRESETS];
  }

  static getPreset(id: number): SnowfallParkPreset | undefined {
    return SnowfallParkPattern.PRESETS.find(p => p.id === id);
  }

  getMetrics(): Record<string, number> {
    const avgAccumulation =
      this.accumulation.length > 0
        ? this.accumulation.reduce((a, b) => a + b, 0) / this.accumulation.length
        : 0;

    return {
      snowflakes: this.snowflakes.length,
      trees: this.trees.length,
      lamps: this.lamps.length,
      avgSnowDepth: Math.round(avgAccumulation * 10) / 10,
    };
  }
}
