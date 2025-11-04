import { Pattern, Cell, Size, Point, Theme, Color } from '../types';

interface FireworkConfig {
  burstSize: number;
  launchSpeed: number;
  gravity: number;
  fadeRate: number;
  spawnInterval: number;
  trailLength: number;
  maxBurstDepth: number;        // 1-3: recursive explosion depth
  secondaryBurstSize: number;   // 4-20: particles per secondary burst
  sparkleChance: number;        // 0-0.3: probability of sparkle spawn
  burstShape: 'circle' | 'ring' | 'heart' | 'star' | 'random';  // Explosion shape
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
  hue: number;          // Color variation (0-1) for rainbow effect
  depth: number;        // 0=primary, 1=secondary, 2=tertiary
  canExplode: boolean;  // Can spawn secondary burst
  burstTimer: number;   // Time until explosion (ms), -1 if exploded/won't explode
  type: 'normal' | 'sparkle';  // Particle behavior type
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
      config: { burstSize: 40, launchSpeed: 1.5, gravity: 0.03, fadeRate: 0.015, spawnInterval: 1500, trailLength: 8, maxBurstDepth: 2, secondaryBurstSize: 10, sparkleChance: 0.2, burstShape: 'circle' }
    },
    {
      id: 2,
      name: 'Grand Finale',
      description: 'Massive explosions, many particles',
      config: { burstSize: 100, launchSpeed: 2.0, gravity: 0.04, fadeRate: 0.02, spawnInterval: 800, trailLength: 6, maxBurstDepth: 3, secondaryBurstSize: 20, sparkleChance: 0.3, burstShape: 'random' }
    },
    {
      id: 3,
      name: 'Fountain',
      description: 'Low gravity, cascading particles',
      config: { burstSize: 60, launchSpeed: 1.2, gravity: 0.02, fadeRate: 0.01, spawnInterval: 2000, trailLength: 10, maxBurstDepth: 2, secondaryBurstSize: 12, sparkleChance: 0.15, burstShape: 'ring' }
    },
    {
      id: 4,
      name: 'Roman Candle',
      description: 'Fast launch, tight bursts',
      config: { burstSize: 30, launchSpeed: 2.5, gravity: 0.05, fadeRate: 0.025, spawnInterval: 1200, trailLength: 5, maxBurstDepth: 1, secondaryBurstSize: 8, sparkleChance: 0.1, burstShape: 'circle' }
    },
    {
      id: 5,
      name: 'Chrysanthemum',
      description: 'Slow, graceful explosions with heavy trails',
      config: { burstSize: 80, launchSpeed: 1.0, gravity: 0.025, fadeRate: 0.012, spawnInterval: 3000, trailLength: 12, maxBurstDepth: 3, secondaryBurstSize: 15, sparkleChance: 0.25, burstShape: 'star' }
    },
    {
      id: 6,
      name: 'Strobe',
      description: 'Rapid-fire small bursts, minimal trails',
      config: { burstSize: 25, launchSpeed: 1.8, gravity: 0.06, fadeRate: 0.03, spawnInterval: 600, trailLength: 3, maxBurstDepth: 1, secondaryBurstSize: 6, sparkleChance: 0.05, burstShape: 'circle' }
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
      maxBurstDepth: 2,
      secondaryBurstSize: 12,
      sparkleChance: 0.15,
      burstShape: 'circle',
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

  // Get angle and speed multiplier for shaped bursts
  private getShapedBurstParams(index: number, total: number, shape: 'circle' | 'ring' | 'heart' | 'star' | 'random'): { angle: number; speedMult: number } {
    const t = index / total;
    
    switch (shape) {
      case 'circle':
        // Traditional radial burst
        return {
          angle: (Math.PI * 2 * index) / total + (Math.random() - 0.5) * 0.5,
          speedMult: 1.0
        };
        
      case 'ring':
        // Hollow ring (skip center, concentrate at edge)
        return {
          angle: (Math.PI * 2 * index) / total + (Math.random() - 0.5) * 0.3,
          speedMult: 0.8 + Math.random() * 0.4  // 0.8-1.2x speed (more uniform)
        };
        
      case 'heart':
        // Parametric heart shape: x = 16sin³(t), y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
        const heartT = t * Math.PI * 2;
        const heartX = 16 * Math.pow(Math.sin(heartT), 3);
        const heartY = 13 * Math.cos(heartT) - 5 * Math.cos(2 * heartT) - 2 * Math.cos(3 * heartT) - Math.cos(4 * heartT);
        return {
          angle: Math.atan2(-heartY, heartX),  // Negative Y to flip upright
          speedMult: 0.7 + Math.random() * 0.4  // Slightly slower for shape clarity
        };
        
      case 'star':
        // 5-pointed star (concentrate particles at points)
        const starPoint = Math.floor(t * 5);  // Which point (0-4)
        const starOffset = (t * 5) - starPoint;  // Position within point (0-1)
        const pointAngle = (starPoint * Math.PI * 2 / 5) - Math.PI / 2;  // -90° offset to point up
        const spread = (starOffset - 0.5) * 0.6;  // Spread around point
        return {
          angle: pointAngle + spread,
          speedMult: 0.9 + starOffset * 0.3  // Faster at point tips
        };
        
      case 'random':
        // Should never reach here (handled in explode)
        return {
          angle: Math.random() * Math.PI * 2,
          speedMult: 1.0
        };
    }
  }

  private explode(firework: Firework, depth: number = 0): void {
    firework.state = 'exploded';
    
    // Determine burst size based on depth (primary full size, secondary scaled down)
    const burstSize = depth === 0 ? this.config.burstSize : this.config.secondaryBurstSize;
    
    // Scaling factors by depth
    const speedScale = Math.pow(0.6, depth);    // Each level: 0.6x speed
    const lifeScale = Math.pow(0.7, depth);     // Each level: 0.7x lifespan
    
    // Determine shape (resolve 'random' to actual shape)
    let shape = this.config.burstShape;
    if (shape === 'random') {
      const shapes: ('circle' | 'ring' | 'heart' | 'star')[] = ['circle', 'ring', 'heart', 'star'];
      shape = shapes[Math.floor(Math.random() * shapes.length)];
    }
    
    // Create burst particles in shaped pattern
    for (let i = 0; i < burstSize; i++) {
      const { angle, speedMult } = this.getShapedBurstParams(i, burstSize, shape);
      const baseSpeed = 2 + Math.random() * 3;
      const speed = baseSpeed * speedScale * speedMult;
      
      // Determine if this particle can explode (only if under depth limit)
      const canExplode = depth < this.config.maxBurstDepth && Math.random() < 0.3;
      const burstTimer = canExplode ? 200 + Math.random() * 300 : -1; // 200-500ms delay
      
      firework.particles.push({
        x: firework.x,
        y: firework.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0 * lifeScale,
        trail: [],
        hue: i / burstSize, // Rainbow effect across burst
        depth,
        canExplode,
        burstTimer,
        type: 'normal'
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

        // Count total particles across all fireworks for initial reference
        // NOTE: This is recalculated before each spawn operation to prevent race conditions
        const totalParticles = this.fireworks.reduce((sum, f) => sum + f.particles.length, 0);
        
        for (let j = fw.particles.length - 1; j >= 0; j--) {
          const p = fw.particles[j];

          // Check for secondary burst trigger
          if (p.canExplode && p.burstTimer > 0) {
            p.burstTimer -= 16; // Approximate frame time (16ms at 60fps)
            
            // Time to explode! Create secondary burst (with buffer before hard cap)
            if (p.burstTimer <= 0) {
              // Recalculate total particles immediately before spawning to prevent race conditions
              const currentTotal = this.fireworks.reduce((sum, f) => sum + f.particles.length, 0);
              if (currentTotal < 400) {
                p.burstTimer = -1; // Mark as exploded
                p.canExplode = false;
                
                // Create temporary firework object for secondary burst
                const secondaryFirework: Firework = {
                  x: p.x,
                  y: p.y,
                  vx: 0,
                  vy: 0,
                  state: 'exploded',
                  particles: [],
                  burstColor: fw.burstColor,
                  targetHeight: 0
                };
                
                // Spawn secondary burst at next depth level
                this.explode(secondaryFirework, p.depth + 1);
                
                // Add secondary particles to current firework
                fw.particles.push(...secondaryFirework.particles);
              }
            }
          }

          // Apply physics
          p.vy += this.config.gravity;
          p.x += p.vx;
          p.y += p.vy;

          // Apply air resistance
          p.vx *= 0.99;
          p.vy *= 0.99;

          // Spawn sparkle particles (only from normal particles with sufficient life)
          if (p.type === 'normal' && p.life > 0.5 && Math.random() < this.config.sparkleChance) {
            // Recalculate total particles immediately before spawning sparkles to prevent race conditions
            const currentTotal = this.fireworks.reduce((sum, f) => sum + f.particles.length, 0);
            if (currentTotal < 450) {
              const sparkleCount = Math.floor(Math.random() * 3) + 1;  // 1-3 sparkles
              for (let s = 0; s < sparkleCount; s++) {
                const sparkleAngle = Math.random() * Math.PI * 2;
                const sparkleSpeed = 3 + Math.random() * 4;  // 3-7 units/frame (faster than parent)
                
                fw.particles.push({
                  x: p.x,
                  y: p.y,
                  vx: Math.cos(sparkleAngle) * sparkleSpeed,
                  vy: Math.sin(sparkleAngle) * sparkleSpeed,
                  life: 0.15 + Math.random() * 0.15,  // Very short life (0.15-0.3)
                  trail: [],  // No trails for sparkles
                  hue: 0,  // Not used (sparkles are white/yellow)
                  depth: p.depth + 1,  // One level deeper
                  canExplode: false,  // Sparkles never explode
                  burstTimer: -1,
                  type: 'sparkle'
                });
              }
            }
          }

          // Fade out (scaled by depth for faster fade on secondary bursts)
          const fadeScale = Math.pow(1.3, p.depth); // Deeper particles fade faster
          p.life -= this.config.fadeRate * fadeScale;

          // Add to trail (scaled by depth - deeper particles have shorter trails, sparkles have no trails)
          if (p.type === 'normal') {
            const trailLength = Math.max(2, Math.floor(this.config.trailLength * Math.pow(0.5, p.depth)));
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > trailLength) {
              p.trail.shift();
            }
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
            let char: string;
            let color: Color;
            
            if (p.type === 'sparkle') {
              // Sparkle particles - bright, white/yellow, small characters
              char = ['✧', '✦', '*', '·'][Math.floor(Math.random() * 4)];
              const brightness = Math.floor(p.life * 255);
              color = {
                r: 255,
                g: 255,
                b: Math.floor(brightness * 0.8)  // Slight yellow tint
              };
            } else {
              // Normal particles - choose character based on life and depth
              if (p.depth === 0) {
                // Primary burst - full character set
                if (p.life > 0.7) {
                  char = ['●', '◉', '★', '✦'][Math.floor(Math.random() * 4)];
                } else if (p.life > 0.4) {
                  char = ['○', '◎', '*', '✧'][Math.floor(Math.random() * 4)];
                } else {
                  char = ['·', '∙', '.'][Math.floor(Math.random() * 3)];
                }
              } else if (p.depth === 1) {
                // Secondary burst - smaller character set
                if (p.life > 0.7) {
                  char = ['○', '◎', '*'][Math.floor(Math.random() * 3)];
                } else if (p.life > 0.4) {
                  char = ['∙', '·'][Math.floor(Math.random() * 2)];
                } else {
                  char = '.';
                }
              } else {
                // Tertiary and deeper - minimal characters
                char = ['·', '∙', '.'][Math.floor(Math.random() * 3)];
              }

              // Blend between burst color and rainbow hue color
              // Reduce intensity for deeper bursts
              const intensityScale = 1.0 - (p.depth * 0.15);
              const rainbowColor = this.hueToColor(p.hue, p.life * intensityScale);
              const blendFactor = 0.6; // 60% rainbow, 40% theme color
              
              color = {
                r: Math.floor(rainbowColor.r * blendFactor + fw.burstColor.r * (1 - blendFactor) * p.life * intensityScale),
                g: Math.floor(rainbowColor.g * blendFactor + fw.burstColor.g * (1 - blendFactor) * p.life * intensityScale),
                b: Math.floor(rainbowColor.b * blendFactor + fw.burstColor.b * (1 - blendFactor) * p.life * intensityScale)
              };
            }
            
            buffer[py][px] = { char, color };
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
    
    // Count particles by depth and type
    let depth0 = 0, depth1 = 0, depth2 = 0, depth3 = 0;
    let normalParticles = 0, sparkleParticles = 0;
    for (const fw of this.fireworks) {
      for (const p of fw.particles) {
        if (p.depth === 0) depth0++;
        else if (p.depth === 1) depth1++;
        else if (p.depth === 2) depth2++;
        else depth3++;
        
        if (p.type === 'sparkle') sparkleParticles++;
        else normalParticles++;
      }
    }
    
    return {
      activeFireworks: this.fireworks.length,
      launching,
      exploded: this.fireworks.length - launching,
      totalParticles,
      normalParticles,
      sparkleParticles,
      depth0,
      depth1,
      depth2,
      depth3
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
