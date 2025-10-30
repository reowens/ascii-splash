import { Pattern, Cell, Size, Point, Theme } from '../types';

interface QuicksilverConfig {
  speed: number;
  flowIntensity: number;
  noiseScale: number;
}

interface QuicksilverPreset {
  id: number;
  name: string;
  description: string;
  config: QuicksilverConfig;
}

interface Droplet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  time: number;
  radius: number;
}

export class QuicksilverPattern implements Pattern {
  name = 'quicksilver';
  private config: QuicksilverConfig;
  private theme: Theme;
  private droplets: Droplet[] = [];
  private ripples: Array<{ x: number; y: number; time: number; radius: number }> = [];
  private noiseOffset: number = 0;
  
  // Characters for metallic liquid effect
  private liquidChars = ['█', '▓', '▒', '░', '●', '◉', '○', '◐', '◑', '◒', '◓', '•', '∘', '·'];

  private static readonly PRESETS: QuicksilverPreset[] = [
    {
      id: 1,
      name: 'Liquid Mercury',
      description: 'Classic metallic flow',
      config: { speed: 1.0, flowIntensity: 0.5, noiseScale: 0.05 }
    },
    {
      id: 2,
      name: 'Molten Silver',
      description: 'Slower, thicker flow',
      config: { speed: 0.6, flowIntensity: 0.7, noiseScale: 0.08 }
    },
    {
      id: 3,
      name: 'Quicksilver Rush',
      description: 'Fast-flowing liquid metal',
      config: { speed: 1.8, flowIntensity: 0.4, noiseScale: 0.03 }
    },
    {
      id: 4,
      name: 'Chrome Puddle',
      description: 'Minimal flow, high detail',
      config: { speed: 0.3, flowIntensity: 0.8, noiseScale: 0.1 }
    },
    {
      id: 5,
      name: 'Turbulent Metal',
      description: 'Chaotic, intense flow',
      config: { speed: 1.5, flowIntensity: 0.9, noiseScale: 0.06 }
    },
    {
      id: 6,
      name: 'Gentle Shimmer',
      description: 'Subtle, peaceful flow',
      config: { speed: 0.5, flowIntensity: 0.3, noiseScale: 0.04 }
    }
  ];
  
  constructor(theme: Theme, config?: Partial<QuicksilverConfig>) {
    this.theme = theme;
    this.config = {
      speed: 1.0,
      flowIntensity: 0.5,
      noiseScale: 0.05,
      ...config
    };
  }

  // Simple noise function (Perlin-like)
  private noise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    
    // Smooth interpolation
    const u = this.fade(xf);
    const v = this.fade(yf);
    
    // Hash coordinates
    const a = this.hash(X) + Y;
    const b = this.hash(X + 1) + Y;
    
    // Interpolate
    return this.lerp(v,
      this.lerp(u, this.grad(this.hash(a), xf, yf), this.grad(this.hash(b), xf - 1, yf)),
      this.lerp(u, this.grad(this.hash(a + 1), xf, yf - 1), this.grad(this.hash(b + 1), xf - 1, yf - 1))
    );
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private hash(x: number): number {
    x = ((x >> 16) ^ x) * 0x45d9f3b;
    x = ((x >> 16) ^ x) * 0x45d9f3b;
    x = (x >> 16) ^ x;
    return Math.abs(x) % 256;
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2.0 * v : 2.0 * v);
  }

  render(buffer: Cell[][], time: number, size: Size): void {
    const { width, height } = size;
    const { speed, flowIntensity, noiseScale } = this.config;
    
    this.noiseOffset += speed * 0.01;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Generate flowing liquid metal using noise
        const noiseX = x * noiseScale + this.noiseOffset;
        const noiseY = y * noiseScale;
        const noise1 = this.noise(noiseX, noiseY);
        const noise2 = this.noise(noiseX * 2 + 100, noiseY * 2);
        const noise3 = this.noise(noiseX * 0.5, noiseY * 0.5 + time * 0.0001);
        
        let flow = (noise1 + noise2 * 0.5 + noise3 * 0.3) * flowIntensity;

        // Add ripple effects
        for (const ripple of this.ripples) {
          const dx = x - ripple.x;
          const dy = y - ripple.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const age = time - ripple.time;
          
          if (dist < ripple.radius && age < 1500) {
            const rippleEffect = Math.sin(dist * 0.3 - age * 0.005) * (1 - dist / ripple.radius) * 2;
            flow += rippleEffect;
          }
        }

        // Add droplet effects
        for (const droplet of this.droplets) {
          const dx = x - droplet.x;
          const dy = y - droplet.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < droplet.radius) {
            const dropletEffect = (1 - dist / droplet.radius) * 1.5;
            flow += dropletEffect;
          }
        }

        // Map flow to intensity for both character and color
        const rawIntensity = (flow + 1) * 0.5; // Normalize to 0-1
        
        // Add shimmer/highlight effect using secondary noise
        const shimmer = (noise2 + 1) * 0.5;
        const intensity = Math.min(1, Math.max(0, rawIntensity * 0.7 + shimmer * 0.3));
        
        // Choose character based on intensity
        const charIndex = Math.floor(intensity * (this.liquidChars.length - 1));
        const char = this.liquidChars[charIndex];

        // Use theme color with metallic boost
        // For metallic effect, we boost brighter areas even more
        const metallicIntensity = intensity > 0.6 ? 
          0.6 + (intensity - 0.6) * 1.5 :  // Boost highlights
          intensity * 0.8;                  // Darken shadows
        
        const themeColor = this.theme.getColor(Math.min(1, metallicIntensity));
        
        // Add slight metallic shine by boosting one color channel
        const shineBoost = Math.floor(shimmer * 40);
        const color = {
          r: Math.min(255, themeColor.r + shineBoost),
          g: Math.min(255, themeColor.g + shineBoost),
          b: Math.min(255, themeColor.b + shineBoost)
        };

        buffer[y][x] = { char, color };
      }
    }

    // Update droplets
    this.droplets = this.droplets.filter(d => {
      const age = time - d.time;
      if (age > 2000) return false;
      
      d.x += d.vx;
      d.y += d.vy;
      d.vy += 0.2; // Gravity
      d.radius = Math.max(1, d.radius - 0.05);
      
      return d.y < height && d.radius > 0;
    });

    // Clean up old ripples
    this.ripples = this.ripples.filter(r => time - r.time < 1500);
  }

  onMouseMove(pos: Point): void {
    // Mouse creates subtle ripples in the liquid metal
    this.ripples.push({
      x: pos.x,
      y: pos.y,
      time: Date.now(),
      radius: 15
    });
    
    // Limit ripples for performance
    if (this.ripples.length > 10) {
      this.ripples.shift();
    }
  }

  onMouseClick(pos: Point): void {
    // Click creates mercury droplets that splash and fall
    const numDroplets = 12;
    const time = Date.now();
    
    for (let i = 0; i < numDroplets; i++) {
      const angle = (Math.PI * 2 * i) / numDroplets;
      const speed = 2 + Math.random() * 3;
      
      this.droplets.push({
        x: pos.x,
        y: pos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        time: time,
        radius: 3 + Math.random() * 2
      });
    }
    
    // Also create a large ripple
    this.ripples.push({
      x: pos.x,
      y: pos.y,
      time: time,
      radius: 30
    });
  }

  reset(): void {
    this.droplets = [];
    this.ripples = [];
    this.noiseOffset = 0;
  }

  getMetrics(): Record<string, number> {
    return {
      droplets: this.droplets.length,
      ripples: this.ripples.length,
      flowIntensity: this.config.flowIntensity
    };
  }

  applyPreset(presetId: number): boolean {
    const preset = QuicksilverPattern.PRESETS.find(p => p.id === presetId);
    if (!preset) return false;
    
    this.config = { ...preset.config };
    this.reset();
    return true;
  }

  static getPresets(): QuicksilverPreset[] {
    return [...QuicksilverPattern.PRESETS];
  }

  static getPreset(id: number): QuicksilverPreset | undefined {
    return QuicksilverPattern.PRESETS.find(p => p.id === id);
  }
}
