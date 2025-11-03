import { Pattern, Cell, Size, Point, Theme, Color } from '../types';

interface FireworkConfig {
  burstSize: number;
  launchSpeed: number;
  gravity: number;
  fadeRate: number;
  spawnInterval: number;
  trailLength: number;
}

interface FireworkPreset {
  id: number;
  name: string;
  description: string;
  config: FireworkConfig;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  trail: Point[];
  hue: number; // Color variation (0-1) for rainbow effect
}

interface Firework {
  x: number;
  y: number;
  vx: number;
  vy: number;
  state: 'launching' | 'exploded';
  particles: Particle[];
  burstColor: Color;
  targetHeight: number;
}

export class FireworksPattern implements Pattern {
  name = 'fireworks';
  private config: FireworkConfig;
  private theme: Theme;
  private fireworks: Firework[] = [];
  private lastSpawn: number = 0;

  private static readonly PRESETS: FireworkPreset[] = [
    {
      id: 1,
      name: 'Sparklers',
      description: 'Small, frequent bursts with long trails',
      config: { burstSize: 40, launchSpeed: 1.5, gravity: 0.03, fadeRate: 0.015, spawnInterval: 1500, trailLength: 8 }
    },
    {
      id: 2,
      name: 'Grand Finale',
      description: 'Massive explosions, many particles',
      config: { burstSize: 100, launchSpeed: 2.0, gravity: 0.04, fadeRate: 0.02, spawnInterval: 800, trailLength: 6 }
    },
    {
      id: 3,
      name: 'Fountain',
      description: 'Low gravity, cascading particles',
      config: { burstSize: 60, launchSpeed: 1.2, gravity: 0.02, fadeRate: 0.01, spawnInterval: 2000, trailLength: 10 }
    },
    {
      id: 4,
      name: 'Roman Candle',
      description: 'Fast launch, tight bursts',
      config: { burstSize: 30, launchSpeed: 2.5, gravity: 0.05, fadeRate: 0.025, spawnInterval: 1200, trailLength: 5 }
    },
    {
      id: 5,
      name: 'Chrysanthemum',
      description: 'Slow, graceful explosions with heavy trails',
      config: { burstSize: 80, launchSpeed: 1.0, gravity: 0.025, fadeRate: 0.012, spawnInterval: 3000, trailLength: 12 }
    },
    {
      id: 6,
      name: 'Strobe',
      description: 'Rapid-fire small bursts, minimal trails',
      config: { burstSize: 25, launchSpeed: 1.8, gravity: 0.06, fadeRate: 0.03, spawnInterval: 600, trailLength: 3 }
    }
  ];

  constructor(theme: Theme, config?: Partial<FireworkConfig>) {
    this.theme = theme;
    this.config = {
      burstSize: 60,
      launchSpeed: 1.5,
      gravity: 0.04,
      fadeRate: 0.02,
      spawnInterval: 2000,
      trailLength: 6,
      ...config
    };
  }

  // Convert hue (0-1) to RGB color with rainbow gradient
  private hueToColor(hue: number, intensity: number): Color {
    const h = hue * 6;
    const x = (1 - Math.abs(h % 2 - 1)) * intensity;
    const c = intensity;
    
    let r = 0, g = 0, b = 0;
    if (h < 1) { r = c; g = x; }
    else if (h < 2) { r = x; g = c; }
    else if (h < 3) { g = c; b = x; }
    else if (h < 4) { g = x; b = c; }
    else if (h < 5) { r = x; b = c; }
    else { r = c; b = x; }
    
    return {
      r: Math.floor(r * 255),
      g: Math.floor(g * 255),
      b: Math.floor(b * 255)
    };
  }

  reset(): void {
    this.fireworks = [];
    this.lastSpawn = 0;
  }

  private spawnFirework(size: Size, targetX?: number, targetY?: number, instant: boolean = false): Firework {
    const startX = targetX ?? Math.random() * size.width;
    const targetH = targetY ?? size.height * (0.2 + Math.random() * 0.3);
    
    // Pick a random color from theme
    const colorIntensity = 0.5 + Math.random() * 0.5;
    const burstColor = this.theme.getColor(colorIntensity);

    const firework: Firework = {
      x: startX,
      y: instant ? targetH : size.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: instant ? 0 : -this.config.launchSpeed * (8 + Math.random() * 4),
      state: instant ? 'exploded' : 'launching',
      particles: [],
      burstColor,
      targetHeight: targetH
    };

    if (instant) {
      this.explode(firework);
    }

    return firework;
  }

  private explode(firework: Firework): void {
    firework.state = 'exploded';
    
    // Create burst particles in all directions
    for (let i = 0; i < this.config.burstSize; i++) {
      const angle = (Math.PI * 2 * i) / this.config.burstSize + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 3;
      
      firework.particles.push({
        x: firework.x,
        y: firework.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        trail: [],
        hue: i / this.config.burstSize // Rainbow effect across burst
      });
    }
  }

  render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void {
    const { width, height } = size;

    // Auto-spawn fireworks at intervals
    if (time - this.lastSpawn > this.config.spawnInterval) {
      this.fireworks.push(this.spawnFirework(size));
      this.lastSpawn = time;
    }

    // Limit active fireworks
    if (this.fireworks.length > 8) {
      this.fireworks.shift();
    }

    // Update and render fireworks
    for (let i = this.fireworks.length - 1; i >= 0; i--) {
      const fw = this.fireworks[i];

      if (fw.state === 'launching') {
        // Update rocket position
        fw.vy += this.config.gravity;
        fw.x += fw.vx;
        fw.y += fw.vy;

        // Check if reached target height or started falling
        if (fw.y <= fw.targetHeight || fw.vy > 0) {
          this.explode(fw);
        }

        // Render rocket
        const rocketX = Math.floor(fw.x);
        const rocketY = Math.floor(fw.y);
        
        if (rocketX >= 0 && rocketX < width && rocketY >= 0 && rocketY < height) {
          buffer[rocketY][rocketX] = {
            char: '↑',
            color: fw.burstColor
          };
          
          // Trail behind rocket
          for (let j = 1; j <= 3; j++) {
            const trailY = rocketY + j;
            if (trailY < height) {
              const trailChars = ['∙', '·', '.'];
              buffer[trailY][rocketX] = {
                char: trailChars[Math.min(j - 1, 2)],
                color: this.theme.getColor(0.3 - j * 0.1)
              };
            }
          }
        }
      } else {
        // Update and render explosion particles
        let anyAlive = false;

        for (let j = fw.particles.length - 1; j >= 0; j--) {
          const p = fw.particles[j];

          // Apply physics
          p.vy += this.config.gravity;
          p.x += p.vx;
          p.y += p.vy;

          // Apply air resistance
          p.vx *= 0.99;
          p.vy *= 0.99;

          // Fade out
          p.life -= this.config.fadeRate;

          // Add to trail
          p.trail.push({ x: p.x, y: p.y });
          if (p.trail.length > this.config.trailLength) {
            p.trail.shift();
          }

          // Remove dead particles
          if (p.life <= 0 || p.y > height + 5) {
            fw.particles.splice(j, 1);
            continue;
          }

          anyAlive = true;

          // Render particle
          const px = Math.floor(p.x);
          const py = Math.floor(p.y);

          if (px >= 0 && px < width && py >= 0 && py < height) {
            // Choose character based on life
            let char: string;
            if (p.life > 0.7) {
              char = ['●', '◉', '★', '✦'][Math.floor(Math.random() * 4)];
            } else if (p.life > 0.4) {
              char = ['○', '◎', '*', '✧'][Math.floor(Math.random() * 4)];
            } else {
              char = ['·', '∙', '.'][Math.floor(Math.random() * 3)];
            }

            // Blend between burst color and rainbow hue color
            const rainbowColor = this.hueToColor(p.hue, p.life);
            const blendFactor = 0.6; // 60% rainbow, 40% theme color
            
            buffer[py][px] = {
              char,
              color: {
                r: Math.floor(rainbowColor.r * blendFactor + fw.burstColor.r * (1 - blendFactor) * p.life),
                g: Math.floor(rainbowColor.g * blendFactor + fw.burstColor.g * (1 - blendFactor) * p.life),
                b: Math.floor(rainbowColor.b * blendFactor + fw.burstColor.b * (1 - blendFactor) * p.life)
              }
            };
          }

          // Render trail
          for (let k = 0; k < p.trail.length; k++) {
            const trailPoint = p.trail[k];
            const tx = Math.floor(trailPoint.x);
            const ty = Math.floor(trailPoint.y);

            if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
              const trailLife = (k / p.trail.length) * p.life;
              if (trailLife > 0.1) {
                const rainbowColor = this.hueToColor(p.hue, trailLife);
                const blendFactor = 0.6;
                
                buffer[ty][tx] = {
                  char: '·',
                  color: {
                    r: Math.floor(rainbowColor.r * blendFactor + fw.burstColor.r * (1 - blendFactor) * trailLife),
                    g: Math.floor(rainbowColor.g * blendFactor + fw.burstColor.g * (1 - blendFactor) * trailLife),
                    b: Math.floor(rainbowColor.b * blendFactor + fw.burstColor.b * (1 - blendFactor) * trailLife)
                  }
                };
              }
            }
          }
        }

        // Remove firework if all particles dead
        if (!anyAlive) {
          this.fireworks.splice(i, 1);
        }
      }
    }

    // Show crosshair at mouse position
    if (mousePos) {
      const mx = Math.floor(mousePos.x);
      const my = Math.floor(mousePos.y);

      // Draw crosshair
      for (let dx = -2; dx <= 2; dx++) {
        const x = mx + dx;
        if (x >= 0 && x < width && my >= 0 && my < height) {
          buffer[my][x] = {
            char: dx === 0 ? '+' : '─',
            color: this.theme.getColor(0.5)
          };
        }
      }
      for (let dy = -2; dy <= 2; dy++) {
        const y = my + dy;
        if (y >= 0 && y < height && mx >= 0 && mx < width && dy !== 0) {
          buffer[y][mx] = {
            char: '│',
            color: this.theme.getColor(0.5)
          };
        }
      }
    }
  }

  onMouseMove(_pos: Point): void {
    // Crosshair rendered in render() method
  }

  onMouseClick(pos: Point): void {
    // Instant explosion at click (no launch phase)
    const burstSizeMultiplier = 1.5;
    const originalBurstSize = this.config.burstSize;
    
    this.config.burstSize = Math.floor(originalBurstSize * burstSizeMultiplier);
    this.fireworks.push(this.spawnFirework({ width: 100, height: 100 }, pos.x, pos.y, true));
    this.config.burstSize = originalBurstSize;

    // Limit fireworks
    while (this.fireworks.length > 10) {
      this.fireworks.shift();
    }
  }

  getMetrics(): Record<string, number> {
    const totalParticles = this.fireworks.reduce((sum, fw) => sum + fw.particles.length, 0);
    const launching = this.fireworks.filter(fw => fw.state === 'launching').length;
    
    return {
      activeFireworks: this.fireworks.length,
      launching,
      exploded: this.fireworks.length - launching,
      totalParticles
    };
  }

  applyPreset(presetId: number): boolean {
    const preset = FireworksPattern.PRESETS.find(p => p.id === presetId);
    if (!preset) return false;

    this.config = { ...preset.config };
    this.reset();
    return true;
  }

  static getPresets(): FireworkPreset[] {
    return [...FireworksPattern.PRESETS];
  }

  static getPreset(id: number): FireworkPreset | undefined {
    return FireworksPattern.PRESETS.find(p => p.id === id);
  }
}
