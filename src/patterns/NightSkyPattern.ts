/**
 * NightSkyPattern - Serene night sky with stars, aurora, and shooting stars
 *
 * Features:
 * - Twinkling stars at multiple depth layers
 * - Aurora borealis with flowing Perlin noise animation
 * - Shooting stars that streak across the sky
 * - Optional moon with glow
 * - Mouse interaction: trigger shooting stars on click
 */

import { Pattern, Cell, Size, Point, Theme, Color } from '../types/index.js';
import { PerlinNoise } from '../utils/noise.js';
import { clamp } from '../utils/math.js';

interface NightSkyConfig {
  starDensity: number; // Stars per 100 cells (0.5-5.0)
  twinkleSpeed: number; // Twinkle animation speed (0.5-3.0)
  auroraEnabled: boolean; // Show aurora borealis
  auroraIntensity: number; // Aurora brightness (0.3-1.0)
  auroraSpeed: number; // Aurora flow speed (0.2-2.0)
  auroraHeight: number; // Aurora vertical extent (0.1-0.5 of screen)
  shootingStarFrequency: number; // Shooting stars per minute (0-30)
  moonEnabled: boolean; // Show moon
  moonPhase: number; // Moon phase (0=new, 0.5=full, 1=new)
  starLayers: number; // Depth layers for parallax (1-4)
}

interface NightSkyPreset {
  id: number;
  name: string;
  description: string;
  config: NightSkyConfig;
}

interface Star {
  x: number;
  y: number;
  brightness: number;
  twinklePhase: number;
  twinkleSpeed: number;
  layer: number; // Depth layer (0=closest, higher=farther)
  char: string;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  trailLength: number;
  brightness: number;
}

interface AuroraRibbon {
  baseY: number; // Vertical position (0-1)
  amplitude: number;
  frequency: number;
  phase: number;
  color: Color;
  width: number;
}

export class NightSkyPattern implements Pattern {
  name = 'nightsky';
  private config: NightSkyConfig;
  private theme: Theme;
  private stars: Star[] = [];
  private shootingStars: ShootingStar[] = [];
  private auroraRibbons: AuroraRibbon[] = [];
  private mousePos?: Point;
  private lastTime = 0;
  private noise: PerlinNoise;
  private noiseOffset = 0;
  private shootingStarAccumulator = 0;
  private initialized = false;

  // Star characters by brightness
  private readonly starChars = ['.', '*', '+', '✦', '★'];

  // Aurora colors (green-blue-purple spectrum)
  private readonly auroraColors: Color[] = [
    { r: 50, g: 255, b: 150 }, // Green
    { r: 80, g: 200, b: 255 }, // Cyan
    { r: 100, g: 150, b: 255 }, // Blue
    { r: 180, g: 100, b: 255 }, // Purple
    { r: 255, g: 100, b: 200 }, // Pink
  ];

  private static readonly PRESETS: NightSkyPreset[] = [
    {
      id: 1,
      name: 'Clear Night',
      description: 'Peaceful starry sky',
      config: {
        starDensity: 2.0,
        twinkleSpeed: 1.0,
        auroraEnabled: false,
        auroraIntensity: 0.6,
        auroraSpeed: 0.5,
        auroraHeight: 0.3,
        shootingStarFrequency: 5,
        moonEnabled: true,
        moonPhase: 0.5,
        starLayers: 3,
      },
    },
    {
      id: 2,
      name: 'Aurora Borealis',
      description: 'Northern lights dancing',
      config: {
        starDensity: 1.5,
        twinkleSpeed: 0.8,
        auroraEnabled: true,
        auroraIntensity: 0.8,
        auroraSpeed: 0.6,
        auroraHeight: 0.4,
        shootingStarFrequency: 3,
        moonEnabled: false,
        moonPhase: 0,
        starLayers: 2,
      },
    },
    {
      id: 3,
      name: 'Meteor Shower',
      description: 'Frequent shooting stars',
      config: {
        starDensity: 2.5,
        twinkleSpeed: 1.2,
        auroraEnabled: false,
        auroraIntensity: 0.5,
        auroraSpeed: 0.5,
        auroraHeight: 0.25,
        shootingStarFrequency: 25,
        moonEnabled: false,
        moonPhase: 0,
        starLayers: 3,
      },
    },
    {
      id: 4,
      name: 'Full Moon Night',
      description: 'Bright moon with subtle stars',
      config: {
        starDensity: 1.0,
        twinkleSpeed: 0.6,
        auroraEnabled: false,
        auroraIntensity: 0.4,
        auroraSpeed: 0.3,
        auroraHeight: 0.2,
        shootingStarFrequency: 2,
        moonEnabled: true,
        moonPhase: 0.5,
        starLayers: 2,
      },
    },
    {
      id: 5,
      name: 'Deep Space',
      description: 'Dense starfield, no moon',
      config: {
        starDensity: 4.0,
        twinkleSpeed: 1.5,
        auroraEnabled: false,
        auroraIntensity: 0.5,
        auroraSpeed: 0.5,
        auroraHeight: 0.25,
        shootingStarFrequency: 8,
        moonEnabled: false,
        moonPhase: 0,
        starLayers: 4,
      },
    },
    {
      id: 6,
      name: 'Magical Aurora',
      description: 'Intense, colorful aurora',
      config: {
        starDensity: 1.8,
        twinkleSpeed: 1.0,
        auroraEnabled: true,
        auroraIntensity: 1.0,
        auroraSpeed: 1.0,
        auroraHeight: 0.5,
        shootingStarFrequency: 10,
        moonEnabled: true,
        moonPhase: 0.25,
        starLayers: 3,
      },
    },
  ];

  constructor(theme: Theme, config?: Partial<NightSkyConfig>) {
    this.theme = theme;
    this.config = {
      starDensity: 2.0,
      twinkleSpeed: 1.0,
      auroraEnabled: true,
      auroraIntensity: 0.7,
      auroraSpeed: 0.5,
      auroraHeight: 0.35,
      shootingStarFrequency: 5,
      moonEnabled: true,
      moonPhase: 0.5,
      starLayers: 3,
      ...config,
    };
    this.noise = new PerlinNoise(Math.random() * 10000);
  }

  private initializeStars(size: Size): void {
    this.stars = [];
    const totalCells = size.width * size.height;
    const starCount = Math.floor((totalCells * this.config.starDensity) / 100);

    for (let i = 0; i < starCount; i++) {
      const layer = Math.floor(Math.random() * this.config.starLayers);
      const baseBrightness = 0.3 + (1 - layer / this.config.starLayers) * 0.7;

      this.stars.push({
        x: Math.random() * size.width,
        y: Math.random() * size.height,
        brightness: baseBrightness,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.5 + Math.random() * 1.5,
        layer,
        char: this.starChars[Math.floor(Math.random() * this.starChars.length)],
      });
    }
  }

  private initializeAurora(): void {
    this.auroraRibbons = [];
    if (!this.config.auroraEnabled) return;

    // Create 3-5 aurora ribbons
    const ribbonCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < ribbonCount; i++) {
      const colorIndex = i % this.auroraColors.length;
      this.auroraRibbons.push({
        baseY: 0.1 + (i / ribbonCount) * this.config.auroraHeight,
        amplitude: 0.02 + Math.random() * 0.05,
        frequency: 0.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
        color: this.auroraColors[colorIndex],
        width: 2 + Math.random() * 3,
      });
    }
  }

  private spawnShootingStar(size: Size, fromClick?: Point): void {
    // Start from top-left quadrant, travel toward bottom-right
    const startX = fromClick?.x ?? Math.random() * size.width * 0.7;
    const startY = fromClick?.y ?? Math.random() * size.height * 0.4;

    const angle = Math.PI / 6 + (Math.random() * Math.PI) / 6; // 30-60 degrees
    const speed = 15 + Math.random() * 20;

    this.shootingStars.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.8 + Math.random() * 0.6,
      maxLife: 0.8 + Math.random() * 0.6,
      trailLength: 5 + Math.floor(Math.random() * 8),
      brightness: 0.8 + Math.random() * 0.2,
    });
  }

  private updateShootingStars(deltaTime: number, size: Size): void {
    const dt = Math.min(deltaTime / 1000, 0.1);

    // Spawn new shooting stars
    this.shootingStarAccumulator += dt * (this.config.shootingStarFrequency / 60);
    while (this.shootingStarAccumulator >= 1 && this.shootingStars.length < 5) {
      this.spawnShootingStar(size);
      this.shootingStarAccumulator -= 1;
    }

    // Update existing shooting stars
    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const star = this.shootingStars[i];
      star.life -= dt;

      if (star.life <= 0 || star.x > size.width || star.y > size.height) {
        this.shootingStars.splice(i, 1);
        continue;
      }

      star.x += star.vx * dt;
      star.y += star.vy * dt;
    }
  }

  private getAuroraIntensity(
    x: number,
    y: number,
    size: Size,
    time: number
  ): { intensity: number; color: Color } {
    if (!this.config.auroraEnabled || this.auroraRibbons.length === 0) {
      return { intensity: 0, color: { r: 0, g: 0, b: 0 } };
    }

    let totalIntensity = 0;
    let blendedColor: Color = { r: 0, g: 0, b: 0 };

    const normalizedY = y / size.height;
    const normalizedX = x / size.width;

    for (const ribbon of this.auroraRibbons) {
      // Calculate ribbon position with flowing noise
      const noiseVal = this.noise.noise2D(
        normalizedX * ribbon.frequency + this.noiseOffset * this.config.auroraSpeed,
        ribbon.phase + time * 0.0003
      );

      const ribbonY = ribbon.baseY + noiseVal * ribbon.amplitude;
      const distFromRibbon = Math.abs(normalizedY - ribbonY);

      if (distFromRibbon < ribbon.width / size.height) {
        // Calculate intensity based on distance from ribbon center
        const ribbonIntensity = 1 - distFromRibbon / (ribbon.width / size.height);
        const finalIntensity = ribbonIntensity * this.config.auroraIntensity;

        // Add vertical fade (stronger at top)
        const verticalFade = 1 - normalizedY * 0.5;

        // Add horizontal variation with noise
        const horizNoise = this.noise.noise2D(
          normalizedX * 3 + this.noiseOffset * 0.5,
          normalizedY * 2
        );
        const horizVariation = 0.7 + horizNoise * 0.3;

        const combinedIntensity = finalIntensity * verticalFade * horizVariation;

        if (combinedIntensity > totalIntensity) {
          totalIntensity = combinedIntensity;
          blendedColor = ribbon.color;
        }
      }
    }

    return { intensity: clamp(totalIntensity, 0, 1), color: blendedColor };
  }

  private renderMoon(buffer: Cell[][], size: Size): void {
    if (!this.config.moonEnabled) return;

    // Moon position (upper right area)
    const moonX = Math.floor(size.width * 0.8);
    const moonY = Math.floor(size.height * 0.15);
    const moonRadius = Math.min(4, Math.floor(size.height * 0.12));

    // Moon phase affects which part is lit
    const phase = this.config.moonPhase;

    for (let dy = -moonRadius; dy <= moonRadius; dy++) {
      for (let dx = -moonRadius; dx <= moonRadius; dx++) {
        const px = moonX + dx;
        const py = moonY + dy;

        if (px < 0 || px >= size.width || py < 0 || py >= size.height) continue;

        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > moonRadius) continue;

        // Calculate if this part is in shadow based on phase
        const normalizedDx = dx / moonRadius;
        const shadowThreshold = (phase - 0.5) * 2; // -1 to 1

        let brightness = 1;
        if (normalizedDx < shadowThreshold) {
          brightness = 0.2; // Shadow side
        }

        // Moon glow falloff
        const glow = 1 - (dist / moonRadius) * 0.3;
        brightness *= glow;

        const moonColor: Color = {
          r: Math.round(255 * brightness),
          g: Math.round(250 * brightness),
          b: Math.round(220 * brightness),
        };

        const char = brightness > 0.7 ? '●' : brightness > 0.4 ? '◐' : '○';
        buffer[py][px] = { char, color: moonColor };
      }
    }

    // Moon glow halo
    const glowRadius = moonRadius + 2;
    for (let dy = -glowRadius; dy <= glowRadius; dy++) {
      for (let dx = -glowRadius; dx <= glowRadius; dx++) {
        const px = moonX + dx;
        const py = moonY + dy;

        if (px < 0 || px >= size.width || py < 0 || py >= size.height) continue;

        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= moonRadius || dist > glowRadius) continue;

        const glowIntensity = 1 - (dist - moonRadius) / (glowRadius - moonRadius);
        const currentCell = buffer[py][px];

        // Only add glow if cell is dark
        if (currentCell.char === ' ' || currentCell.char === '.') {
          const glowColor: Color = {
            r: Math.round(80 * glowIntensity),
            g: Math.round(80 * glowIntensity),
            b: Math.round(60 * glowIntensity),
          };
          buffer[py][px] = { char: '.', color: glowColor };
        }
      }
    }
  }

  render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void {
    const { width, height } = size;
    this.mousePos = mousePos;

    // Initialize on first render or size change
    if (!this.initialized || this.stars.length === 0) {
      this.initializeStars(size);
      this.initializeAurora();
      this.initialized = true;
    }

    // Calculate delta time
    const deltaTime = this.lastTime === 0 ? 16 : time - this.lastTime;
    this.lastTime = time;
    this.noiseOffset += deltaTime * 0.001;

    // Update shooting stars
    this.updateShootingStars(deltaTime, size);

    // Clear buffer with dark sky gradient
    for (let y = 0; y < height; y++) {
      const gradient = y / height;
      const skyColor: Color = {
        r: Math.round(5 + gradient * 10),
        g: Math.round(5 + gradient * 15),
        b: Math.round(15 + gradient * 20),
      };
      for (let x = 0; x < width; x++) {
        buffer[y][x] = { char: ' ', color: skyColor };
      }
    }

    // Render aurora (behind stars)
    if (this.config.auroraEnabled) {
      for (let y = 0; y < height * 0.6; y++) {
        for (let x = 0; x < width; x++) {
          const { intensity, color } = this.getAuroraIntensity(x, y, size, time);
          if (intensity > 0.1) {
            const auroraChar = intensity > 0.6 ? '░' : intensity > 0.3 ? '·' : ' ';
            const auroraColor: Color = {
              r: Math.round(color.r * intensity * 0.7),
              g: Math.round(color.g * intensity * 0.7),
              b: Math.round(color.b * intensity * 0.7),
            };
            buffer[y][x] = { char: auroraChar, color: auroraColor };
          }
        }
      }
    }

    // Render stars
    for (const star of this.stars) {
      const sx = Math.floor(star.x);
      const sy = Math.floor(star.y);

      if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue;

      // Calculate twinkle
      const twinkle = Math.sin(
        star.twinklePhase + time * 0.002 * star.twinkleSpeed * this.config.twinkleSpeed
      );
      const brightness = star.brightness * (0.6 + twinkle * 0.4);

      if (brightness < 0.2) continue; // Skip very dim moments

      // Star color (slight blue/white variation)
      const starColor: Color = {
        r: Math.round(200 + brightness * 55),
        g: Math.round(200 + brightness * 55),
        b: Math.round(220 + brightness * 35),
      };

      buffer[sy][sx] = { char: star.char, color: starColor };
    }

    // Render moon
    this.renderMoon(buffer, size);

    // Render shooting stars (on top)
    for (const star of this.shootingStars) {
      const lifeRatio = star.life / star.maxLife;

      // Draw trail
      for (let t = 0; t < star.trailLength; t++) {
        const trailX = Math.floor(star.x - star.vx * t * 0.02);
        const trailY = Math.floor(star.y - star.vy * t * 0.02);

        if (trailX < 0 || trailX >= width || trailY < 0 || trailY >= height) continue;

        const trailBrightness = star.brightness * lifeRatio * (1 - t / star.trailLength);
        const trailColor: Color = {
          r: Math.round(255 * trailBrightness),
          g: Math.round(255 * trailBrightness),
          b: Math.round(200 * trailBrightness),
        };

        const trailChar = t === 0 ? '★' : t < 3 ? '*' : '-';
        buffer[trailY][trailX] = { char: trailChar, color: trailColor };
      }
    }
  }

  onMouseMove(pos: Point): void {
    this.mousePos = pos;
  }

  onMouseClick(pos: Point): void {
    // Spawn shooting star from click position
    if (this.shootingStars.length < 8) {
      this.spawnShootingStar({ width: 200, height: 50 }, pos);
    }
  }

  reset(): void {
    this.stars = [];
    this.shootingStars = [];
    this.auroraRibbons = [];
    this.mousePos = undefined;
    this.lastTime = 0;
    this.noiseOffset = 0;
    this.shootingStarAccumulator = 0;
    this.initialized = false;
    this.noise = new PerlinNoise(Math.random() * 10000);
  }

  applyPreset(presetId: number): boolean {
    const preset = NightSkyPattern.PRESETS.find(p => p.id === presetId);
    if (!preset) return false;

    this.config = { ...preset.config };
    this.reset();
    return true;
  }

  static getPresets(): NightSkyPreset[] {
    return [...NightSkyPattern.PRESETS];
  }

  static getPreset(id: number): NightSkyPreset | undefined {
    return NightSkyPattern.PRESETS.find(p => p.id === id);
  }

  getMetrics(): Record<string, number> {
    return {
      stars: this.stars.length,
      shootingStars: this.shootingStars.length,
      auroraRibbons: this.auroraRibbons.length,
    };
  }
}
