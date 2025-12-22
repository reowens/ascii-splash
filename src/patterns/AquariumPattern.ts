/**
 * AquariumPattern - Underwater aquarium scene with fish, plants, and bubbles
 *
 * Features:
 * - Schooling fish using boids flocking algorithm
 * - Multiple fish species with different colors
 * - Swaying seaweed and plants
 * - Rising bubbles
 * - Sandy bottom with occasional shells
 * - Mouse interaction: fish avoid cursor, click spawns bubbles
 */

import { Pattern, Cell, Size, Point, Theme, Color } from '../types/index.js';
import {
  Boid,
  BoidConfig,
  updateBoids,
  createFlock,
  isBoidFacingLeft,
  DEFAULT_BOID_CONFIG,
} from '../utils/boids.js';
import { clamp } from '../utils/math.js';

interface AquariumConfig {
  fishCount: number; // Number of fish (5-30)
  schoolingStrength: number; // How tightly fish school (0.5-2.0)
  plantCount: number; // Number of seaweed plants (3-15)
  plantSwaySpeed: number; // Plant sway animation speed (0.5-2.0)
  bubbleEnabled: boolean; // Enable rising bubbles
  bubbleRate: number; // Bubbles per second (0.5-5.0)
  sandEnabled: boolean; // Show sandy bottom
  mouseAvoidance: boolean; // Fish avoid mouse cursor
  fishSpeed: number; // Fish movement speed (1-5)
}

interface Fish extends Boid {
  species: number; // 0-3 for different fish types
  size: number; // 1-3 for small/medium/large
  tailPhase: number; // Animation phase for tail wiggle
}

interface Plant {
  x: number;
  baseY: number; // Bottom anchor point
  height: number;
  segments: number;
  phase: number; // Sway animation phase
  color: Color;
}

interface Bubble {
  x: number;
  y: number;
  size: number; // 0=small, 1=medium, 2=large
  wobblePhase: number;
  speed: number;
}

interface AquariumPreset {
  id: number;
  name: string;
  description: string;
  config: AquariumConfig;
}

export class AquariumPattern implements Pattern {
  public readonly name = 'aquarium';

  private config: AquariumConfig;
  private theme: Theme;
  private fish: Fish[] = [];
  private plants: Plant[] = [];
  private bubbles: Bubble[] = [];
  private boidConfig: BoidConfig;
  private lastTime = 0;
  private initialized = false;
  private mousePos: Point | null = null;
  private bubbleAccumulator = 0;

  // Fish appearance by species
  private static readonly FISH_CHARS = [
    { left: '<><', right: '><>' }, // Basic fish
    { left: '<°)))<', right: '>((((°>' }, // Fancy fish
    { left: '<*>', right: '<*>' }, // Small fish
    { left: '<=<', right: '=>>' }, // Arrow fish
  ];

  private static readonly FISH_COLORS: Color[][] = [
    // Species 0: Orange/Gold
    [
      { r: 255, g: 140, b: 0 },
      { r: 255, g: 180, b: 50 },
    ],
    // Species 1: Blue
    [
      { r: 50, g: 150, b: 255 },
      { r: 100, g: 200, b: 255 },
    ],
    // Species 2: Purple
    [
      { r: 180, g: 100, b: 255 },
      { r: 220, g: 150, b: 255 },
    ],
    // Species 3: Green
    [
      { r: 50, g: 200, b: 100 },
      { r: 100, g: 255, b: 150 },
    ],
  ];

  private static readonly PRESETS: AquariumPreset[] = [
    {
      id: 1,
      name: 'Peaceful Tank',
      description: 'Calm aquarium with gentle fish',
      config: {
        fishCount: 12,
        schoolingStrength: 1.0,
        plantCount: 6,
        plantSwaySpeed: 0.8,
        bubbleEnabled: true,
        bubbleRate: 1.0,
        sandEnabled: true,
        mouseAvoidance: true,
        fishSpeed: 2,
      },
    },
    {
      id: 2,
      name: 'Busy Reef',
      description: 'Active tank with many fish',
      config: {
        fishCount: 25,
        schoolingStrength: 1.2,
        plantCount: 10,
        plantSwaySpeed: 1.2,
        bubbleEnabled: true,
        bubbleRate: 2.5,
        sandEnabled: true,
        mouseAvoidance: true,
        fishSpeed: 3,
      },
    },
    {
      id: 3,
      name: 'Sparse Pond',
      description: 'Minimalist tank with few fish',
      config: {
        fishCount: 5,
        schoolingStrength: 0.5,
        plantCount: 3,
        plantSwaySpeed: 0.5,
        bubbleEnabled: false,
        bubbleRate: 0.5,
        sandEnabled: true,
        mouseAvoidance: false,
        fishSpeed: 1.5,
      },
    },
    {
      id: 4,
      name: 'Fast School',
      description: 'Quick, tightly schooling fish',
      config: {
        fishCount: 20,
        schoolingStrength: 2.0,
        plantCount: 4,
        plantSwaySpeed: 1.5,
        bubbleEnabled: true,
        bubbleRate: 1.5,
        sandEnabled: true,
        mouseAvoidance: true,
        fishSpeed: 4,
      },
    },
    {
      id: 5,
      name: 'Bubble Bath',
      description: 'Lots of bubbles!',
      config: {
        fishCount: 10,
        schoolingStrength: 1.0,
        plantCount: 8,
        plantSwaySpeed: 1.0,
        bubbleEnabled: true,
        bubbleRate: 5.0,
        sandEnabled: true,
        mouseAvoidance: true,
        fishSpeed: 2,
      },
    },
    {
      id: 6,
      name: 'Kelp Forest',
      description: 'Dense plant life with shy fish',
      config: {
        fishCount: 8,
        schoolingStrength: 1.5,
        plantCount: 15,
        plantSwaySpeed: 0.6,
        bubbleEnabled: true,
        bubbleRate: 0.8,
        sandEnabled: true,
        mouseAvoidance: true,
        fishSpeed: 1.5,
      },
    },
  ];

  constructor(theme: Theme, config: Partial<AquariumConfig> = {}) {
    this.theme = theme;
    this.config = {
      fishCount: 12,
      schoolingStrength: 1.0,
      plantCount: 6,
      plantSwaySpeed: 1.0,
      bubbleEnabled: true,
      bubbleRate: 1.5,
      sandEnabled: true,
      mouseAvoidance: true,
      fishSpeed: 2.5,
      ...config,
    };

    // Configure boids with fish-appropriate settings
    this.boidConfig = {
      ...DEFAULT_BOID_CONFIG,
      maxSpeed: this.config.fishSpeed,
      separationWeight: 1.5 * this.config.schoolingStrength,
      alignmentWeight: 1.2 * this.config.schoolingStrength,
      cohesionWeight: 1.0 * this.config.schoolingStrength,
      perceptionRadius: 40,
      separationRadius: 15,
      edgeMargin: 10,
      edgeForce: 0.5,
    };
  }

  private initialize(size: Size): void {
    if (this.initialized) return;

    // Create fish as boids
    const baseBoids = createFlock(
      this.config.fishCount,
      size.width,
      size.height - 4,
      this.boidConfig
    );

    this.fish = baseBoids.map((boid, i) => ({
      ...boid,
      y: boid.y * 0.85, // Keep fish in upper 85% (above plants)
      species: i % 4,
      size: 1 + Math.floor(Math.random() * 3),
      tailPhase: Math.random() * Math.PI * 2,
    }));

    // Create plants along the bottom
    this.plants = [];
    const plantSpacing = size.width / (this.config.plantCount + 1);
    for (let i = 0; i < this.config.plantCount; i++) {
      const x = plantSpacing * (i + 1) + (Math.random() - 0.5) * plantSpacing * 0.5;
      this.plants.push({
        x: Math.floor(x),
        baseY: size.height - 2,
        height: 4 + Math.floor(Math.random() * 6),
        segments: 3 + Math.floor(Math.random() * 4),
        phase: Math.random() * Math.PI * 2,
        color: {
          r: 30 + Math.floor(Math.random() * 40),
          g: 120 + Math.floor(Math.random() * 80),
          b: 50 + Math.floor(Math.random() * 40),
        },
      });
    }

    this.bubbles = [];
    this.initialized = true;
  }

  render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void {
    this.initialize(size);

    const dt = this.lastTime === 0 ? 0.016 : (time - this.lastTime) / 1000;
    this.lastTime = time;

    if (mousePos) {
      this.mousePos = mousePos;
    }

    // Clear buffer with water color gradient
    this.renderWaterBackground(buffer, size);

    // Update and render components
    this.updateFish(size, dt);
    this.updatePlants(time);
    this.updateBubbles(size, dt);

    // Render order: background -> plants -> bubbles -> fish -> sand
    this.renderPlants(buffer, size, time);
    this.renderBubbles(buffer, size);
    this.renderFish(buffer, size, time);

    if (this.config.sandEnabled) {
      this.renderSand(buffer, size);
    }
  }

  private renderWaterBackground(buffer: Cell[][], size: Size): void {
    const { width, height } = size;

    for (let y = 0; y < height; y++) {
      const depthRatio = y / height;
      // Darker blue as we go deeper
      const waterColor: Color = {
        r: Math.round(10 + depthRatio * 5),
        g: Math.round(30 + depthRatio * 20),
        b: Math.round(80 - depthRatio * 30),
      };

      for (let x = 0; x < width; x++) {
        const cell = buffer[y]?.[x];
        if (cell) {
          cell.char = ' ';
          cell.color = waterColor;
        }
      }
    }
  }

  private updateFish(size: Size, dt: number): void {
    // Apply mouse avoidance if enabled
    if (this.config.mouseAvoidance && this.mousePos) {
      for (const fish of this.fish) {
        const dx = fish.x - this.mousePos.x;
        const dy = fish.y - this.mousePos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 15 && dist > 0) {
          // Push fish away from cursor
          const force = ((15 - dist) / 15) * 0.5;
          fish.vx += (dx / dist) * force;
          fish.vy += (dy / dist) * force;
        }
      }
    }

    // Update boid positions
    updateBoids(this.fish, size.width, size.height - 4, this.boidConfig, dt);

    // Keep fish above sand
    for (const fish of this.fish) {
      if (fish.y > size.height - 5) {
        fish.y = size.height - 5;
        fish.vy = -Math.abs(fish.vy) * 0.5;
      }
      if (fish.y < 1) {
        fish.y = 1;
        fish.vy = Math.abs(fish.vy) * 0.5;
      }
    }
  }

  private updatePlants(_time: number): void {
    // Plants update in render based on time
  }

  private updateBubbles(size: Size, dt: number): void {
    if (!this.config.bubbleEnabled) return;

    // Spawn bubbles
    this.bubbleAccumulator += dt * this.config.bubbleRate;
    while (this.bubbleAccumulator >= 1) {
      this.bubbleAccumulator -= 1;
      this.spawnBubble(size);
    }

    // Update existing bubbles
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const bubble = this.bubbles[i];
      bubble.y -= bubble.speed * dt * 10;
      bubble.wobblePhase += dt * 5;

      // Remove bubbles that reach the top
      if (bubble.y < 0) {
        this.bubbles.splice(i, 1);
      }
    }
  }

  private spawnBubble(size: Size, pos?: Point): void {
    const x = pos?.x ?? Math.random() * size.width;
    const y = pos?.y ?? size.height - 3;

    this.bubbles.push({
      x,
      y,
      size: Math.floor(Math.random() * 3),
      wobblePhase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 1.5,
    });
  }

  private renderPlants(buffer: Cell[][], size: Size, time: number): void {
    for (const plant of this.plants) {
      const swayTime = time * 0.001 * this.config.plantSwaySpeed;

      for (let seg = 0; seg < plant.segments; seg++) {
        const segmentY = plant.baseY - Math.floor((seg / plant.segments) * plant.height);
        const swayOffset = Math.sin(swayTime + plant.phase + seg * 0.5) * (seg * 0.3);
        const segmentX = Math.floor(plant.x + swayOffset);

        if (segmentY >= 0 && segmentY < size.height && segmentX >= 0 && segmentX < size.width) {
          // Different characters for plant segments
          const chars = ['|', '/', '\\', ')', '('];
          const charIndex = Math.floor(swayOffset + 2.5);
          const plantChar = chars[clamp(charIndex, 0, chars.length - 1)];

          // Lighter color toward top
          const heightRatio = seg / plant.segments;
          const color: Color = {
            r: Math.round(plant.color.r + heightRatio * 30),
            g: Math.round(plant.color.g + heightRatio * 40),
            b: Math.round(plant.color.b + heightRatio * 20),
          };

          const cell = buffer[segmentY]?.[segmentX];
          if (cell) {
            cell.char = plantChar;
            cell.color = color;
          }
        }
      }
    }
  }

  private renderBubbles(buffer: Cell[][], size: Size): void {
    const bubbleChars = ['·', 'o', 'O'];

    for (const bubble of this.bubbles) {
      const wobbleX = Math.sin(bubble.wobblePhase) * 0.5;
      const x = Math.floor(bubble.x + wobbleX);
      const y = Math.floor(bubble.y);

      if (y >= 0 && y < size.height && x >= 0 && x < size.width) {
        const bubbleColor: Color = {
          r: 180 + Math.floor(Math.random() * 30),
          g: 220 + Math.floor(Math.random() * 30),
          b: 255,
        };

        const cell = buffer[y]?.[x];
        if (cell) {
          cell.char = bubbleChars[bubble.size];
          cell.color = bubbleColor;
        }
      }
    }
  }

  private renderFish(buffer: Cell[][], size: Size, time: number): void {
    for (const fish of this.fish) {
      const facingLeft = isBoidFacingLeft(fish);
      const speciesChars = AquariumPattern.FISH_CHARS[fish.species];
      const fishStr = facingLeft ? speciesChars.left : speciesChars.right;
      const colors = AquariumPattern.FISH_COLORS[fish.species];

      // Tail wiggle animation
      const wiggle = Math.sin(time * 0.01 + fish.tailPhase);

      const x = Math.floor(fish.x);
      const y = Math.floor(fish.y + wiggle * 0.3);

      // Render fish string
      const startX = facingLeft ? x : x - fishStr.length + 1;

      for (let i = 0; i < fishStr.length; i++) {
        const charX = startX + i;
        const charY = y;

        if (charY >= 0 && charY < size.height && charX >= 0 && charX < size.width) {
          // Color gradient along fish body
          const colorRatio = i / fishStr.length;
          const color: Color = {
            r: Math.round(colors[0].r + (colors[1].r - colors[0].r) * colorRatio),
            g: Math.round(colors[0].g + (colors[1].g - colors[0].g) * colorRatio),
            b: Math.round(colors[0].b + (colors[1].b - colors[0].b) * colorRatio),
          };

          const cell = buffer[charY]?.[charX];
          if (cell) {
            cell.char = fishStr[i];
            cell.color = color;
          }
        }
      }
    }
  }

  private renderSand(buffer: Cell[][], size: Size): void {
    const sandY = size.height - 1;

    if (sandY >= 0 && sandY < size.height) {
      for (let x = 0; x < size.width; x++) {
        // Sandy color with variation
        const sandColor: Color = {
          r: 180 + Math.floor(Math.random() * 20),
          g: 150 + Math.floor(Math.random() * 20),
          b: 100 + Math.floor(Math.random() * 20),
        };

        // Occasional shells or pebbles
        let sandChar = '~';
        if (Math.random() < 0.03) {
          sandChar = ['@', '*', '.'][Math.floor(Math.random() * 3)];
        }

        const cell = buffer[sandY]?.[x];
        if (cell) {
          cell.char = sandChar;
          cell.color = sandColor;
        }
      }
    }
  }

  onMouseMove(pos: Point): void {
    this.mousePos = pos;
  }

  onMouseClick(pos: Point): void {
    // Spawn burst of bubbles at click location
    for (let i = 0; i < 5; i++) {
      this.spawnBubble(
        { width: 100, height: 30 },
        {
          x: pos.x + (Math.random() - 0.5) * 3,
          y: pos.y,
        }
      );
    }
  }

  reset(): void {
    this.fish = [];
    this.plants = [];
    this.bubbles = [];
    this.lastTime = 0;
    this.bubbleAccumulator = 0;
    this.initialized = false;
    this.mousePos = null;
  }

  applyPreset(presetId: number): boolean {
    const preset = AquariumPattern.PRESETS.find(p => p.id === presetId);
    if (!preset) return false;

    this.config = { ...preset.config };
    this.boidConfig = {
      ...DEFAULT_BOID_CONFIG,
      maxSpeed: this.config.fishSpeed,
      separationWeight: 1.5 * this.config.schoolingStrength,
      alignmentWeight: 1.2 * this.config.schoolingStrength,
      cohesionWeight: 1.0 * this.config.schoolingStrength,
    };
    this.reset();
    return true;
  }

  static getPresets(): AquariumPreset[] {
    return [...AquariumPattern.PRESETS];
  }

  static getPreset(id: number): AquariumPreset | undefined {
    return AquariumPattern.PRESETS.find(p => p.id === id);
  }

  getMetrics(): Record<string, number> {
    return {
      fish: this.fish.length,
      plants: this.plants.length,
      bubbles: this.bubbles.length,
    };
  }
}
