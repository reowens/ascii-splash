/**
 * CampfirePattern - Cozy animated campfire scene
 *
 * Features:
 * - Flickering layered flames with realistic animation
 * - Rising sparks that float upward
 * - Wispy smoke plumes
 * - Radial glow effect
 * - Wood/log base
 * - Mouse interaction: blow on fire, add sparks on click
 */

import { Pattern, Cell, Size, Point, Theme, Color } from '../types/index.js';
import { PerlinNoise } from '../utils/noise.js';
import { clamp, lerp } from '../utils/math.js';

interface CampfireConfig {
  flameHeight: number; // Height of flames (0.2-0.6 of screen)
  flameWidth: number; // Width of flame base (0.1-0.4 of screen)
  intensity: number; // Overall brightness (0.5-2.0)
  sparkCount: number; // Number of sparks (5-50)
  sparkFrequency: number; // Sparks per second (0.5-5.0)
  smokeEnabled: boolean; // Show smoke plumes
  smokeOpacity: number; // Smoke visibility (0.1-0.5)
  glowRadius: number; // Glow spread (0.2-0.8 of screen)
  flickerSpeed: number; // Flame animation speed (0.5-3.0)
  windStrength: number; // Horizontal wind effect (0-1.0)
}

interface CampfirePreset {
  id: number;
  name: string;
  description: string;
  config: CampfireConfig;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  brightness: number;
}

interface SmokeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export class CampfirePattern implements Pattern {
  name = 'campfire';
  private config: CampfireConfig;
  private theme: Theme;
  private sparks: Spark[] = [];
  private smokeParticles: SmokeParticle[] = [];
  private mousePos?: Point;
  private lastTime = 0;
  private noise: PerlinNoise;
  private noiseOffset = 0;
  private sparkAccumulator = 0;
  private fireBaseY = 0;
  private fireCenterX = 0;

  // Fire colors (override theme for realistic campfire)
  private readonly fireColors: Color[] = [
    { r: 255, g: 255, b: 200 }, // White-yellow core
    { r: 255, g: 220, b: 100 }, // Bright yellow
    { r: 255, g: 160, b: 50 }, // Orange
    { r: 255, g: 80, b: 20 }, // Red-orange
    { r: 200, g: 40, b: 10 }, // Dark red
    { r: 100, g: 20, b: 5 }, // Deep red/brown (ember)
  ];

  private static readonly PRESETS: CampfirePreset[] = [
    {
      id: 1,
      name: 'Cozy Campfire',
      description: 'Warm, gentle fire for relaxation',
      config: {
        flameHeight: 0.35,
        flameWidth: 0.2,
        intensity: 1.0,
        sparkCount: 15,
        sparkFrequency: 2.0,
        smokeEnabled: true,
        smokeOpacity: 0.3,
        glowRadius: 0.5,
        flickerSpeed: 1.0,
        windStrength: 0.1,
      },
    },
    {
      id: 2,
      name: 'Roaring Bonfire',
      description: 'Large, intense flames',
      config: {
        flameHeight: 0.5,
        flameWidth: 0.35,
        intensity: 1.5,
        sparkCount: 40,
        sparkFrequency: 4.0,
        smokeEnabled: true,
        smokeOpacity: 0.4,
        glowRadius: 0.7,
        flickerSpeed: 1.5,
        windStrength: 0.2,
      },
    },
    {
      id: 3,
      name: 'Dying Embers',
      description: 'Low, smoldering fire',
      config: {
        flameHeight: 0.15,
        flameWidth: 0.25,
        intensity: 0.6,
        sparkCount: 8,
        sparkFrequency: 0.5,
        smokeEnabled: true,
        smokeOpacity: 0.5,
        glowRadius: 0.3,
        flickerSpeed: 0.5,
        windStrength: 0.05,
      },
    },
    {
      id: 4,
      name: 'Windy Night',
      description: 'Fire dancing in the wind',
      config: {
        flameHeight: 0.4,
        flameWidth: 0.2,
        intensity: 1.2,
        sparkCount: 30,
        sparkFrequency: 3.0,
        smokeEnabled: true,
        smokeOpacity: 0.25,
        glowRadius: 0.4,
        flickerSpeed: 2.0,
        windStrength: 0.6,
      },
    },
    {
      id: 5,
      name: 'No Smoke',
      description: 'Clean burning fire',
      config: {
        flameHeight: 0.35,
        flameWidth: 0.2,
        intensity: 1.1,
        sparkCount: 20,
        sparkFrequency: 2.5,
        smokeEnabled: false,
        smokeOpacity: 0,
        glowRadius: 0.5,
        flickerSpeed: 1.2,
        windStrength: 0.15,
      },
    },
    {
      id: 6,
      name: 'Spark Storm',
      description: 'Lots of floating sparks',
      config: {
        flameHeight: 0.3,
        flameWidth: 0.18,
        intensity: 1.0,
        sparkCount: 50,
        sparkFrequency: 5.0,
        smokeEnabled: false,
        smokeOpacity: 0,
        glowRadius: 0.45,
        flickerSpeed: 1.0,
        windStrength: 0.3,
      },
    },
  ];

  constructor(theme: Theme, config?: Partial<CampfireConfig>) {
    this.theme = theme;
    this.config = {
      flameHeight: 0.35,
      flameWidth: 0.2,
      intensity: 1.0,
      sparkCount: 15,
      sparkFrequency: 2.0,
      smokeEnabled: true,
      smokeOpacity: 0.3,
      glowRadius: 0.5,
      flickerSpeed: 1.0,
      windStrength: 0.1,
      ...config,
    };
    this.noise = new PerlinNoise(Math.random() * 10000);
  }

  private getFireColor(intensity: number): Color {
    // Map intensity 0-1 to color gradient
    const colorCount = this.fireColors.length - 1;
    const scaledIntensity = clamp(intensity, 0, 1) * colorCount;
    const colorIndex = Math.floor(scaledIntensity);
    const t = scaledIntensity - colorIndex;

    const c1 = this.fireColors[Math.min(colorIndex, colorCount)];
    const c2 = this.fireColors[Math.min(colorIndex + 1, colorCount)];

    return {
      r: Math.round(lerp(c1.r, c2.r, t)),
      g: Math.round(lerp(c1.g, c2.g, t)),
      b: Math.round(lerp(c1.b, c2.b, t)),
    };
  }

  private spawnSpark(): void {
    const spread = this.config.flameWidth * 0.3;
    this.sparks.push({
      x: this.fireCenterX + (Math.random() - 0.5) * spread * 20,
      y: this.fireBaseY - Math.random() * 3,
      vx: (Math.random() - 0.5) * 2 + this.config.windStrength * 3,
      vy: -1 - Math.random() * 2,
      life: 1.5 + Math.random() * 1.5,
      maxLife: 1.5 + Math.random() * 1.5,
      brightness: 0.7 + Math.random() * 0.3,
    });
  }

  private spawnSmoke(): void {
    const spread = this.config.flameWidth * 0.2;
    this.smokeParticles.push({
      x: this.fireCenterX + (Math.random() - 0.5) * spread * 15,
      y: this.fireBaseY - this.config.flameHeight * 20 - Math.random() * 2,
      vx: (Math.random() - 0.5) * 0.5 + this.config.windStrength * 2,
      vy: -0.3 - Math.random() * 0.3,
      life: 3 + Math.random() * 2,
      maxLife: 3 + Math.random() * 2,
      size: 1 + Math.random() * 2,
    });
  }

  private updateParticles(deltaTime: number, _size: Size): void {
    const dt = Math.min(deltaTime / 1000, 0.1);

    // Update sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const spark = this.sparks[i];
      spark.life -= dt;

      if (spark.life <= 0) {
        this.sparks.splice(i, 1);
        continue;
      }

      // Apply wind and turbulence
      const turbulence = this.noise.noise2D(spark.x * 0.1, spark.y * 0.1 + this.noiseOffset);
      spark.vx += turbulence * 0.5 * dt;
      spark.vx += this.config.windStrength * dt * 2;

      // Decelerate upward movement
      spark.vy *= 0.98;

      // Update position
      spark.x += spark.vx * dt * 10;
      spark.y += spark.vy * dt * 10;

      // Dim as life decreases
      spark.brightness = (spark.life / spark.maxLife) * (0.7 + Math.random() * 0.3);
    }

    // Update smoke
    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const smoke = this.smokeParticles[i];
      smoke.life -= dt;

      if (smoke.life <= 0) {
        this.smokeParticles.splice(i, 1);
        continue;
      }

      // Wind and drift
      const turbulence = this.noise.noise2D(
        smoke.x * 0.05,
        smoke.y * 0.05 + this.noiseOffset * 0.5
      );
      smoke.vx += turbulence * 0.3 * dt;
      smoke.vx += this.config.windStrength * dt;

      // Expand smoke
      smoke.size += dt * 0.5;

      // Update position
      smoke.x += smoke.vx * dt * 5;
      smoke.y += smoke.vy * dt * 5;
    }

    // Spawn new particles
    this.sparkAccumulator += dt * this.config.sparkFrequency;
    while (this.sparkAccumulator >= 1 && this.sparks.length < this.config.sparkCount) {
      this.spawnSpark();
      this.sparkAccumulator -= 1;
    }

    if (this.config.smokeEnabled && this.smokeParticles.length < 30) {
      if (Math.random() < dt * 2) {
        this.spawnSmoke();
      }
    }

    // Mouse interaction: blowing on fire
    if (this.mousePos) {
      const blowRadius = 15;
      for (const spark of this.sparks) {
        const dx = spark.x - this.mousePos.x;
        const dy = spark.y - this.mousePos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < blowRadius && dist > 0) {
          const force = (1 - dist / blowRadius) * 2;
          spark.vx += (dx / dist) * force * dt * 20;
          spark.vy += (dy / dist) * force * dt * 20;
        }
      }
    }
  }

  private getFlameIntensity(x: number, y: number, time: number, size: Size): number {
    const flameBaseY = this.fireBaseY;
    const flameHeight = this.config.flameHeight * size.height;
    const flameWidth = this.config.flameWidth * size.width;

    // Distance from fire center horizontally
    const dx = x - this.fireCenterX;
    const distFromCenter = Math.abs(dx) / (flameWidth / 2);

    // Distance from base vertically (0 at base, 1 at top of flame)
    const dy = flameBaseY - y;
    if (dy < 0 || dy > flameHeight) return 0;
    const heightRatio = dy / flameHeight;

    // Flame shape: narrower at top
    const widthAtHeight = 1 - heightRatio * 0.7;
    if (distFromCenter > widthAtHeight) return 0;

    // Base intensity based on position
    let intensity = 1 - distFromCenter / widthAtHeight;
    intensity *= 1 - heightRatio * 0.5; // Dimmer at top

    // Perlin noise for flickering
    const noiseScale = 0.15;
    const timeScale = this.config.flickerSpeed * 3;
    const flicker = this.noise.noise2D(
      x * noiseScale + this.noiseOffset * timeScale,
      y * noiseScale + time * 0.001 * timeScale
    );
    intensity *= 0.7 + flicker * 0.4;

    // Additional turbulence at edges
    const edgeNoise = this.noise.noise2D(x * 0.2 + time * 0.002, y * 0.3 + this.noiseOffset);
    if (distFromCenter > 0.5) {
      intensity *= 0.8 + edgeNoise * 0.4;
    }

    // Wind effect
    const windOffset = this.config.windStrength * Math.sin(time * 0.003 + y * 0.1) * 3;
    const windAdjustedX = x - windOffset;
    const windDx = windAdjustedX - this.fireCenterX;
    if (Math.abs(windDx) < Math.abs(dx)) {
      intensity *= 1.1;
    }

    return clamp(intensity * this.config.intensity, 0, 1);
  }

  private getGlowIntensity(x: number, y: number, size: Size): number {
    const glowRadius = this.config.glowRadius * Math.min(size.width, size.height);
    const dx = x - this.fireCenterX;
    const dy = y - this.fireBaseY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > glowRadius) return 0;

    const intensity = 1 - dist / glowRadius;
    return intensity * intensity * 0.3 * this.config.intensity;
  }

  private getFlameChar(intensity: number): string {
    if (intensity > 0.9) return '*';
    if (intensity > 0.75) return '#';
    if (intensity > 0.6) return '@';
    if (intensity > 0.45) return '&';
    if (intensity > 0.3) return '%';
    if (intensity > 0.15) return '+';
    if (intensity > 0.05) return '.';
    return ' ';
  }

  render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void {
    const { width, height } = size;
    this.mousePos = mousePos;

    // Set fire position (center bottom)
    this.fireCenterX = width / 2;
    this.fireBaseY = height - 3;

    // Calculate delta time
    const deltaTime = this.lastTime === 0 ? 16 : time - this.lastTime;
    this.lastTime = time;
    this.noiseOffset += deltaTime * 0.001;

    // Update particles
    this.updateParticles(deltaTime, size);

    // Clear buffer with dark background
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        buffer[y][x] = { char: ' ', color: { r: 10, g: 10, b: 15 } };
      }
    }

    // Render glow (background layer)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const glowIntensity = this.getGlowIntensity(x, y, size);
        if (glowIntensity > 0.02) {
          const color = this.getFireColor(1 - glowIntensity * 2);
          // Dim the glow color
          buffer[y][x] = {
            char: ' ',
            color: {
              r: Math.round(color.r * glowIntensity * 0.5),
              g: Math.round(color.g * glowIntensity * 0.3),
              b: Math.round(color.b * glowIntensity * 0.1),
            },
          };
        }
      }
    }

    // Render smoke (behind flames)
    if (this.config.smokeEnabled) {
      for (const smoke of this.smokeParticles) {
        const sx = Math.round(smoke.x);
        const sy = Math.round(smoke.y);
        const alpha = (smoke.life / smoke.maxLife) * this.config.smokeOpacity;

        for (let dy = -Math.floor(smoke.size); dy <= Math.ceil(smoke.size); dy++) {
          for (let dx = -Math.floor(smoke.size); dx <= Math.ceil(smoke.size); dx++) {
            const px = sx + dx;
            const py = sy + dy;
            if (px >= 0 && px < width && py >= 0 && py < height) {
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist <= smoke.size) {
                const smokeAlpha = alpha * (1 - dist / smoke.size);
                const gray = Math.round(80 + smokeAlpha * 40);
                buffer[py][px] = {
                  char: dist < smoke.size * 0.5 ? '~' : '.',
                  color: { r: gray, g: gray, b: gray + 10 },
                };
              }
            }
          }
        }
      }
    }

    // Render flames
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const intensity = this.getFlameIntensity(x, y, time, size);
        if (intensity > 0.05) {
          const char = this.getFlameChar(intensity);
          const color = this.getFireColor(intensity);
          buffer[y][x] = { char, color };
        }
      }
    }

    // Render sparks (on top)
    for (const spark of this.sparks) {
      const sx = Math.round(spark.x);
      const sy = Math.round(spark.y);
      if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
        const sparkChar = spark.brightness > 0.5 ? '*' : '.';
        const color = this.getFireColor(spark.brightness);
        buffer[sy][sx] = { char: sparkChar, color };
      }
    }

    // Render wood logs at base
    const logY = this.fireBaseY + 1;
    if (logY < height) {
      const logWidth = Math.round(this.config.flameWidth * width * 1.2);
      const logStartX = Math.round(this.fireCenterX - logWidth / 2);
      const woodColor: Color = { r: 80, g: 50, b: 30 };
      const emberColor: Color = { r: 150, g: 60, b: 20 };

      for (let x = logStartX; x < logStartX + logWidth && x < width; x++) {
        if (x >= 0) {
          // Alternate wood and ember
          const isEmber = Math.sin(x * 0.5 + time * 0.002) > 0.3;
          buffer[logY][x] = {
            char: '=',
            color: isEmber ? emberColor : woodColor,
          };
        }
      }
    }
  }

  onMouseMove(pos: Point): void {
    this.mousePos = pos;
  }

  onMouseClick(pos: Point): void {
    // Add burst of sparks at click position
    for (let i = 0; i < 5; i++) {
      this.sparks.push({
        x: pos.x + (Math.random() - 0.5) * 4,
        y: pos.y + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 4,
        vy: -2 - Math.random() * 3,
        life: 1 + Math.random() * 1,
        maxLife: 1 + Math.random() * 1,
        brightness: 0.8 + Math.random() * 0.2,
      });
    }
  }

  reset(): void {
    this.sparks = [];
    this.smokeParticles = [];
    this.mousePos = undefined;
    this.lastTime = 0;
    this.noiseOffset = 0;
    this.sparkAccumulator = 0;
    this.noise = new PerlinNoise(Math.random() * 10000);
  }

  applyPreset(presetId: number): boolean {
    const preset = CampfirePattern.PRESETS.find(p => p.id === presetId);
    if (!preset) return false;

    this.config = { ...preset.config };
    this.reset();
    return true;
  }

  static getPresets(): CampfirePreset[] {
    return [...CampfirePattern.PRESETS];
  }

  static getPreset(id: number): CampfirePreset | undefined {
    return CampfirePattern.PRESETS.find(p => p.id === id);
  }

  getMetrics(): Record<string, number> {
    return {
      sparks: this.sparks.length,
      smoke: this.smokeParticles.length,
      intensity: Math.round(this.config.intensity * 100) / 100,
    };
  }
}
