import { Pattern, Cell, Size, Point, Theme, Color } from '../types/index.js';
import { createNoise2D, NoiseFunction2D } from 'simplex-noise';
import { lerp } from '../utils/math.js';

interface OceanBeachConfig {
  waveSpeed: number;
  waveAmplitude: number;
  cloudSpeed: number;
  cloudCount: number;
  seagullCount: number;
  seagullSpeed: number;
  sparkleIntensity: number;
  footprintDecay: number;
  skyGradientTop: Color;
  skyGradientBottom: Color;
  oceanColor: Color;
  sandColor: Color;
}

interface OceanBeachPreset {
  id: number;
  name: string;
  description: string;
  config: OceanBeachConfig;
}

interface Footprint {
  x: number;
  y: number;
  createdAt: number;
  intensity: number;
}

interface Cloud {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Seagull {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface WaveLayer {
  offset: number;
  speed: number;
  amplitude: number;
  color: Color;
}

/**
 * OceanBeachPattern - RETRO PARALLAX BEACH (Super Mario Bros inspired!)
 *
 * REIMAGINED DESIGN - Vibrant Pixel-Art Beach Scene:
 * - 100% screen coverage with rich block-based graphics
 * - 3-layer parallax scrolling ocean (far/mid/near depths)
 * - Dithered sky gradient with drifting clouds
 * - Animated sun with pulsing rays
 * - Flying seagulls with wing animations
 * - Textured sand with interactive footprints
 * - Water sparkles and foam effects
 *
 * VISUAL STYLE:
 * - Dense block characters (█▓▒░) for solid fills
 * - Saturated retro colors
 * - Smooth parallax scrolling
 * - Animated dithering and textures
 *
 * Performance Target: <5% CPU at 60 FPS
 */
export class OceanBeachPattern implements Pattern {
  name = 'oceanbeach';
  private config: OceanBeachConfig;

  // Noise generation
  private noise2D: NoiseFunction2D;

  // State tracking
  private lastTime = 0;
  private currentTime = 0;
  private initialized = false;

  // Layout boundaries
  private waterLine = 0;
  private beachStart = 0;

  // Parallax wave layers
  private waveLayers: WaveLayer[] = [];

  // Interactive elements
  private footprints: Footprint[] = [];
  private clouds: Cloud[] = [];
  private seagulls: Seagull[] = [];

  // RETRO PIXEL CHARACTER SETS
  private readonly skyDither = ['░', '░', '▒', '░'];
  private readonly cloudChars = ['█', '▓', '▒'];
  private readonly waterDeep = ['█', '█', '▓', '█'];
  private readonly waterMid = ['▓', '█', '▓', '▒'];
  private readonly waterShallow = ['▒', '▓', '░', '▒'];
  private readonly foam = ['█', '▓', '◦', '∘', '·'];
  private readonly sandTexture = ['▓', '▒', '▒', '░', '▒', '░'];
  private readonly sparkle = ['✦', '✧', '⋆', '·'];

  private static readonly PRESETS: OceanBeachPreset[] = [
    {
      id: 1,
      name: 'Calm Morning',
      description: 'Gentle waves, light blue sky, few gulls',
      config: {
        waveSpeed: 0.5,
        waveAmplitude: 2,
        cloudSpeed: 0.2,
        cloudCount: 3,
        seagullCount: 2,
        seagullSpeed: 0.8,
        sparkleIntensity: 0.3,
        footprintDecay: 8,
        skyGradientTop: { r: 100, g: 150, b: 200 },
        skyGradientBottom: { r: 180, g: 220, b: 255 },
        oceanColor: { r: 50, g: 100, b: 180 },
        sandColor: { r: 220, g: 200, b: 150 },
      },
    },
    {
      id: 2,
      name: 'Midday Sun',
      description: 'Bright sun, sparkling waves, active beach',
      config: {
        waveSpeed: 1.0,
        waveAmplitude: 3,
        cloudSpeed: 0.4,
        cloudCount: 4,
        seagullCount: 4,
        seagullSpeed: 1.2,
        sparkleIntensity: 0.7,
        footprintDecay: 5,
        skyGradientTop: { r: 60, g: 140, b: 220 },
        skyGradientBottom: { r: 120, g: 200, b: 255 },
        oceanColor: { r: 30, g: 120, b: 200 },
        sandColor: { r: 240, g: 220, b: 160 },
      },
    },
    {
      id: 3,
      name: 'Stormy',
      description: 'Rough seas, dark clouds, dramatic waves',
      config: {
        waveSpeed: 2.0,
        waveAmplitude: 6,
        cloudSpeed: 0.8,
        cloudCount: 8,
        seagullCount: 1,
        seagullSpeed: 2.0,
        sparkleIntensity: 0.1,
        footprintDecay: 3,
        skyGradientTop: { r: 40, g: 50, b: 70 },
        skyGradientBottom: { r: 80, g: 90, b: 110 },
        oceanColor: { r: 30, g: 50, b: 80 },
        sandColor: { r: 160, g: 140, b: 110 },
      },
    },
    {
      id: 4,
      name: 'Sunset',
      description: 'Golden hour, warm colors, peaceful waves',
      config: {
        waveSpeed: 0.7,
        waveAmplitude: 2,
        cloudSpeed: 0.3,
        cloudCount: 5,
        seagullCount: 3,
        seagullSpeed: 0.6,
        sparkleIntensity: 0.5,
        footprintDecay: 10,
        skyGradientTop: { r: 255, g: 140, b: 60 },
        skyGradientBottom: { r: 255, g: 200, b: 100 },
        oceanColor: { r: 80, g: 60, b: 120 },
        sandColor: { r: 200, g: 160, b: 100 },
      },
    },
    {
      id: 5,
      name: 'Night Beach',
      description: 'Moonlit shore, calm waves, starry sky',
      config: {
        waveSpeed: 0.4,
        waveAmplitude: 1,
        cloudSpeed: 0.15,
        cloudCount: 2,
        seagullCount: 0,
        seagullSpeed: 0.5,
        sparkleIntensity: 0.2,
        footprintDecay: 12,
        skyGradientTop: { r: 10, g: 15, b: 40 },
        skyGradientBottom: { r: 20, g: 30, b: 60 },
        oceanColor: { r: 20, g: 30, b: 60 },
        sandColor: { r: 100, g: 90, b: 80 },
      },
    },
    {
      id: 6,
      name: 'Tropical',
      description: 'Vibrant turquoise water, bright sun, lively atmosphere',
      config: {
        waveSpeed: 1.2,
        waveAmplitude: 4,
        cloudSpeed: 0.5,
        cloudCount: 6,
        seagullCount: 5,
        seagullSpeed: 1.5,
        sparkleIntensity: 0.8,
        footprintDecay: 6,
        skyGradientTop: { r: 80, g: 180, b: 255 },
        skyGradientBottom: { r: 150, g: 230, b: 255 },
        oceanColor: { r: 0, g: 180, b: 220 },
        sandColor: { r: 255, g: 240, b: 200 },
      },
    },
  ];

  constructor(_theme: Theme, config?: Partial<OceanBeachConfig>) {
    this.noise2D = createNoise2D();

    this.config = {
      waveSpeed: 1.0,
      waveAmplitude: 3,
      cloudSpeed: 0.3,
      cloudCount: 4,
      seagullCount: 3,
      seagullSpeed: 1.0,
      sparkleIntensity: 0.5,
      footprintDecay: 6,
      skyGradientTop: { r: 100, g: 150, b: 200 },
      skyGradientBottom: { r: 180, g: 220, b: 255 },
      oceanColor: { r: 50, g: 100, b: 180 },
      sandColor: { r: 220, g: 200, b: 150 },
      ...config,
    };
  }

  private initialize(size: Size): void {
    if (this.initialized) return;

    // Calculate screen divisions with perspective
    this.waterLine = Math.floor(size.height * 0.35);
    this.beachStart = Math.floor(size.height * 0.7);

    // Initialize 3-layer parallax ocean
    const { oceanColor } = this.config;
    this.waveLayers = [
      {
        offset: 0,
        speed: 0.3,
        amplitude: 1,
        color: {
          r: Math.floor(oceanColor.r * 0.6),
          g: Math.floor(oceanColor.g * 0.6),
          b: Math.floor(oceanColor.b * 0.6),
        },
      },
      {
        offset: 0,
        speed: 0.6,
        amplitude: 2,
        color: {
          r: Math.floor(oceanColor.r * 0.8),
          g: Math.floor(oceanColor.g * 0.8),
          b: Math.floor(oceanColor.b * 0.8),
        },
      },
      {
        offset: 0,
        speed: 1.0,
        amplitude: 3,
        color: oceanColor,
      },
    ];

    // Initialize clouds
    this.clouds = [];
    for (let i = 0; i < this.config.cloudCount; i++) {
      this.clouds.push({
        x: Math.random() * size.width,
        y: Math.random() * (this.waterLine * 0.6),
        width: 8 + Math.floor(Math.random() * 8),
        height: 3 + Math.floor(Math.random() * 3),
      });
    }

    // Initialize seagulls
    this.seagulls = [];
    for (let i = 0; i < this.config.seagullCount; i++) {
      this.seagulls.push({
        x: Math.random() * size.width,
        y: Math.random() * this.waterLine,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 0.5,
      });
    }

    this.initialized = true;
  }

  render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void {
    this.initialize(size);

    const deltaTime = time - this.lastTime;
    this.lastTime = time;
    this.currentTime = time;

    // Update parallax
    this.updateParallax(deltaTime);

    // Render layers (back to front)
    this.renderSky(buffer, size);
    this.renderClouds(buffer, size, deltaTime);
    this.renderSun(buffer, size);
    this.renderParallaxOcean(buffer, size);
    this.renderBeach(buffer, size);
    this.renderForeground(buffer, size);
    this.renderSeagulls(buffer, size, deltaTime, mousePos);

    // Update footprints
    this.updateFootprints(deltaTime);
  }

  private renderSky(buffer: Cell[][], size: Size): void {
    const { skyGradientTop, skyGradientBottom } = this.config;

    for (let y = 0; y < this.waterLine && y < size.height; y++) {
      const t = y / this.waterLine;
      const baseColor: Color = {
        r: Math.floor(lerp(skyGradientTop.r, skyGradientBottom.r, t)),
        g: Math.floor(lerp(skyGradientTop.g, skyGradientBottom.g, t)),
        b: Math.floor(lerp(skyGradientTop.b, skyGradientBottom.b, t)),
      };

      for (let x = 0; x < size.width; x++) {
        const ditherNoise = this.noise2D(x * 0.08 + this.currentTime * 0.0001, y * 0.08);
        const charIndex =
          Math.floor((ditherNoise + 1) * 0.5 * this.skyDither.length) % this.skyDither.length;

        const colorVariation = Math.floor((ditherNoise + 1) * 0.5 * 15);
        const color: Color = {
          r: Math.min(255, baseColor.r + colorVariation),
          g: Math.min(255, baseColor.g + colorVariation),
          b: Math.min(255, baseColor.b + colorVariation),
        };

        buffer[y][x] = { char: this.skyDither[charIndex], color };
      }
    }
  }

  private renderClouds(buffer: Cell[][], size: Size, deltaTime: number): void {
    const { cloudSpeed } = this.config;

    this.clouds.forEach(cloud => {
      cloud.x += cloudSpeed * deltaTime * 0.02;
      if (cloud.x > size.width) cloud.x = -cloud.width;

      for (let dy = 0; dy < cloud.height; dy++) {
        for (let dx = 0; dx < cloud.width; dx++) {
          const x = Math.floor(cloud.x + dx);
          const y = Math.floor(cloud.y + dy);

          if (x >= 0 && x < size.width && y >= 0 && y < this.waterLine) {
            const edgeDist = Math.min(dx, cloud.width - dx, dy, cloud.height - dy);
            const opacity = Math.min(1, edgeDist / 2);

            if (Math.random() < opacity) {
              const charIdx = Math.floor(Math.random() * this.cloudChars.length);
              buffer[y][x] = {
                char: this.cloudChars[charIdx],
                color: { r: 255, g: 255, b: 255 },
              };
            }
          }
        }
      }
    });
  }

  private renderSun(buffer: Cell[][], size: Size): void {
    const sunX = size.width - 15;
    const sunY = 5;
    const sunWidth = 5;
    const sunHeight = 3;

    if (sunX < 0 || sunY < 0 || sunY + sunHeight > this.waterLine) return;

    // Sun body
    for (let dy = 0; dy < sunHeight; dy++) {
      for (let dx = 0; dx < sunWidth; dx++) {
        const x = sunX + dx;
        const y = sunY + dy;

        if (x >= 0 && x < size.width && y >= 0 && y < this.waterLine) {
          const distFromCenter = Math.abs(dx - sunWidth / 2) + Math.abs(dy - sunHeight / 2);
          const brightness = 1.0 - (distFromCenter / (sunWidth + sunHeight)) * 0.5;

          buffer[y][x] = {
            char: '█',
            color: {
              r: 255,
              g: Math.floor(255 * brightness),
              b: Math.floor(100 * brightness),
            },
          };
        }
      }
    }

    // Pulsing sun rays
    const rays = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 1, dy: 1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: -1, dy: -1 },
    ];

    const centerX = sunX + Math.floor(sunWidth / 2);
    const centerY = sunY + Math.floor(sunHeight / 2);
    const pulse = 0.5 + 0.5 * Math.sin(this.currentTime * 0.003);
    const rayLength = Math.floor(3 * pulse);

    rays.forEach(dir => {
      for (let i = 1; i <= rayLength; i++) {
        const x = centerX + dir.dx * (i + 2);
        const y = centerY + dir.dy * (i + 2);

        if (x >= 0 && x < size.width && y >= 0 && y < this.waterLine) {
          const brightness = 1.0 - (i / rayLength) * 0.7;
          buffer[y][x] = {
            char: i === 1 ? '▓' : '▒',
            color: {
              r: 255,
              g: Math.floor(220 * brightness),
              b: Math.floor(100 * brightness),
            },
          };
        }
      }
    });
  }

  private renderParallaxOcean(buffer: Cell[][], size: Size): void {
    const { waveAmplitude } = this.config;
    const oceanHeight = this.beachStart - this.waterLine;

    for (let layerIdx = 0; layerIdx < this.waveLayers.length; layerIdx++) {
      const layer = this.waveLayers[layerIdx];
      const layerStartY = this.waterLine + Math.floor((layerIdx * oceanHeight) / 3);
      const layerEndY = Math.min(
        this.waterLine + Math.floor(((layerIdx + 1) * oceanHeight) / 3),
        this.beachStart
      );

      let charSet: string[];
      if (layerIdx === 0) {
        charSet = this.waterDeep;
      } else if (layerIdx === 1) {
        charSet = this.waterMid;
      } else {
        charSet = this.waterShallow;
      }

      for (let x = 0; x < size.width; x++) {
        const waveX = x + layer.offset;
        const wave1 = this.noise2D(waveX * 0.03, layerIdx * 10) * layer.amplitude * waveAmplitude;
        const wave2 =
          this.noise2D(waveX * 0.08, layerIdx * 10 + 100) * layer.amplitude * waveAmplitude * 0.5;
        const totalWave = wave1 + wave2;
        const waveHeight = Math.floor(layerStartY + totalWave);

        const shouldFoam = layerIdx === 2 && totalWave > layer.amplitude * waveAmplitude * 0.7;

        for (let y = Math.max(layerStartY, waveHeight); y < layerEndY && y < size.height; y++) {
          const depthInLayer = (y - waveHeight) / Math.max(1, layerEndY - waveHeight);
          const noiseVal = this.noise2D(x * 0.2 + layer.offset * 0.1, y * 0.2);
          const charIndex =
            Math.floor(((noiseVal + 1) * 0.5 + depthInLayer) * charSet.length) % charSet.length;

          let char: string;
          let color: Color;

          if (shouldFoam && y === waveHeight && Math.random() < 0.4) {
            char = this.foam[Math.floor(Math.random() * this.foam.length)];
            color = { r: 255, g: 255, b: 255 };
          } else {
            char = charSet[charIndex];
            const brightness = 1.0 - depthInLayer * 0.4;
            color = {
              r: Math.floor(layer.color.r * brightness),
              g: Math.floor(layer.color.g * brightness),
              b: Math.floor(layer.color.b * brightness),
            };
          }

          buffer[y][x] = { char, color };
        }
      }
    }
  }

  private renderBeach(buffer: Cell[][], size: Size): void {
    const { sandColor } = this.config;

    for (let y = this.beachStart; y < size.height; y++) {
      const depthRatio = (y - this.beachStart) / (size.height - this.beachStart);

      for (let x = 0; x < size.width; x++) {
        const noise1 = this.noise2D(x * 0.15, y * 0.15);
        const noise2 = this.noise2D(x * 0.4, y * 0.4);
        const combinedNoise = noise1 * 0.7 + noise2 * 0.3;

        const charIndex =
          Math.floor((combinedNoise + 1) * 0.5 * this.sandTexture.length) % this.sandTexture.length;

        const brightness = 0.85 + depthRatio * 0.15;
        const color: Color = {
          r: Math.min(255, Math.floor(sandColor.r * brightness)),
          g: Math.min(255, Math.floor(sandColor.g * brightness)),
          b: Math.min(255, Math.floor(sandColor.b * brightness)),
        };

        buffer[y][x] = { char: this.sandTexture[charIndex], color };
      }
    }
  }

  private renderForeground(buffer: Cell[][], size: Size): void {
    const { sandColor, sparkleIntensity } = this.config;

    // Footprints
    this.footprints.forEach(footprint => {
      const x = Math.floor(footprint.x);
      const y = Math.floor(footprint.y);

      if (x >= 0 && x < size.width && y >= this.beachStart && y < size.height) {
        const fadedColor: Color = {
          r: Math.floor(lerp(sandColor.r, 60, footprint.intensity)),
          g: Math.floor(lerp(sandColor.g, 50, footprint.intensity)),
          b: Math.floor(lerp(sandColor.b, 40, footprint.intensity)),
        };

        const char = footprint.intensity > 0.6 ? '▓' : '▒';
        buffer[y][x] = { char, color: fadedColor };
      }
    });

    // Water sparkles
    if (sparkleIntensity > 0) {
      const sparkleCount = Math.floor(size.width * sparkleIntensity * 0.1);
      for (let i = 0; i < sparkleCount; i++) {
        const x = Math.floor(Math.random() * size.width);
        const y = Math.floor(
          this.waterLine + Math.random() * (this.beachStart - this.waterLine) * 0.5
        );

        if (y >= 0 && y < size.height && Math.random() < 0.3) {
          const char = this.sparkle[Math.floor(Math.random() * this.sparkle.length)];
          const brightness = 200 + Math.floor(Math.random() * 55);
          buffer[y][x] = {
            char,
            color: { r: brightness, g: brightness, b: 255 },
          };
        }
      }
    }
  }

  private renderSeagulls(buffer: Cell[][], size: Size, deltaTime: number, mousePos?: Point): void {
    const { seagullSpeed } = this.config;

    this.seagulls.forEach(gull => {
      // Mouse attraction
      if (mousePos && mousePos.y < this.waterLine) {
        const dx = mousePos.x - gull.x;
        const dy = mousePos.y - gull.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 30 && dist > 0) {
          gull.vx += (dx / dist) * 0.1;
          gull.vy += (dy / dist) * 0.1;
        }
      }

      gull.x += gull.vx * seagullSpeed * deltaTime * 0.05;
      gull.y += gull.vy * seagullSpeed * deltaTime * 0.05;

      gull.vx *= 0.98;
      gull.vy *= 0.98;

      if (gull.y < 0) gull.y = 0;
      if (gull.y > this.waterLine - 5) gull.y = this.waterLine - 5;

      if (gull.x < -10) gull.x = size.width + 10;
      if (gull.x > size.width + 10) gull.x = -10;

      if (Math.random() < 0.01) {
        gull.vx += (Math.random() - 0.5) * 2;
        gull.vy += (Math.random() - 0.5) * 0.5;
      }

      // Render
      const x = Math.floor(gull.x);
      const y = Math.floor(gull.y);

      if (x >= 1 && x < size.width - 1 && y >= 0 && y < this.waterLine) {
        const flapState = Math.floor(this.currentTime * 0.01) % 3;
        const color: Color = { r: 200, g: 200, b: 200 };

        if (flapState === 0) {
          buffer[y][x] = { char: 'v', color };
          buffer[y][x - 1] = { char: '<', color };
          buffer[y][x + 1] = { char: '>', color };
        } else if (flapState === 1) {
          buffer[y][x] = { char: '^', color };
        } else {
          buffer[y][x] = { char: '~', color };
        }
      }
    });
  }

  private updateParallax(deltaTime: number): void {
    const { waveSpeed } = this.config;

    this.waveLayers.forEach(layer => {
      layer.offset += layer.speed * waveSpeed * deltaTime * 0.05;
      if (layer.offset > 1000) layer.offset -= 1000;
    });
  }

  private updateFootprints(deltaTime: number): void {
    const { footprintDecay } = this.config;
    const decayPerMs = 1.0 / (footprintDecay * 1000);

    this.footprints.forEach(footprint => {
      footprint.intensity -= decayPerMs * deltaTime;
    });

    this.footprints = this.footprints.filter(f => f.intensity > 0);
  }

  onMouseMove(_pos: Point): void {
    // Mouse move is handled in renderSeagulls for seagull attraction
  }

  onMouseClick(pos: Point): void {
    if (pos.y >= this.beachStart) {
      this.footprints.push({
        x: pos.x,
        y: pos.y,
        createdAt: this.currentTime,
        intensity: 1.0,
      });
    }
  }

  reset(): void {
    this.initialized = false;
    this.lastTime = 0;
    this.currentTime = 0;
    this.footprints = [];
    this.clouds = [];
    this.seagulls = [];
    this.waveLayers = [];
    this.noise2D = createNoise2D();
  }

  static getPresets(): OceanBeachPreset[] {
    return OceanBeachPattern.PRESETS;
  }

  getPresetsInstance(): OceanBeachPreset[] {
    return OceanBeachPattern.PRESETS;
  }

  applyPreset(presetId: number): boolean {
    const preset = OceanBeachPattern.PRESETS.find(p => p.id === presetId);
    if (!preset) return false;

    this.config = { ...preset.config };
    this.initialized = false;
    return true;
  }

  getMetrics(): Record<string, number> {
    // Map new metrics to legacy names for test compatibility
    return {
      // New pattern structure
      clouds: this.clouds.length,
      seagulls: this.seagulls.length,
      footprints: this.footprints.length,
      waveLayers: this.waveLayers.length,
      waterLine: this.waterLine,
      // Legacy names (for backward compatibility with tests)
      layers: this.waveLayers.length,
      sprites: this.clouds.length + this.seagulls.length,
      particles: 0, // No particle system in new design
      emitters: 0, // No emitters in new design
    };
  }
}
