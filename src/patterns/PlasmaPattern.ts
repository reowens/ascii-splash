import { Pattern, Cell, Size, Point, Theme } from '../types';

interface PlasmaConfig {
  frequency: number;
  speed: number;
  complexity: number;
  colorShift: boolean;      // Enable color cycling
  shiftSpeed: number;       // Speed of color shift (0 to 1)
}

interface PlasmaPreset {
  id: number;
  name: string;
  description: string;
  config: PlasmaConfig;
}

export class PlasmaPattern implements Pattern {
  name = 'plasma';
  private config: PlasmaConfig;
  private theme: Theme;
  private plasmaChars = ['█', '▓', '▒', '░', '▪', '▫', '·', ' '];
  private mouseInfluence: Point | null = null;
  private clickWaves: Array<{ x: number; y: number; time: number; strength: number }> = [];
  private currentTime: number = 0;

  private static readonly PRESETS: PlasmaPreset[] = [
    {
      id: 1,
      name: 'Gentle Waves',
      description: 'Slow, smooth plasma flow',
      config: { frequency: 0.08, speed: 0.6, complexity: 2, colorShift: false, shiftSpeed: 0 }
    },
    {
      id: 2,
      name: 'Standard Plasma',
      description: 'Balanced plasma effect',
      config: { frequency: 0.1, speed: 1.0, complexity: 3, colorShift: false, shiftSpeed: 0 }
    },
    {
      id: 3,
      name: 'Turbulent Energy',
      description: 'Fast, chaotic plasma',
      config: { frequency: 0.15, speed: 1.8, complexity: 4, colorShift: false, shiftSpeed: 0 }
    },
    {
      id: 4,
      name: 'Lava Lamp',
      description: 'Large blobs, slow movement',
      config: { frequency: 0.05, speed: 0.4, complexity: 2, colorShift: false, shiftSpeed: 0 }
    },
    {
      id: 5,
      name: 'Electric Storm',
      description: 'High frequency, intense patterns',
      config: { frequency: 0.2, speed: 1.5, complexity: 5, colorShift: false, shiftSpeed: 0 }
    },
    {
      id: 6,
      name: 'Cosmic Nebula',
      description: 'Minimal complexity, ethereal flow',
      config: { frequency: 0.06, speed: 0.8, complexity: 1, colorShift: false, shiftSpeed: 0 }
    },
    {
      id: 7,
      name: 'Rainbow Flow',
      description: 'Gentle waves with slow color cycling',
      config: { frequency: 0.08, speed: 0.6, complexity: 2, colorShift: true, shiftSpeed: 0.0002 }
    },
    {
      id: 8,
      name: 'Psychedelic Storm',
      description: 'Fast plasma with rapid color shifts',
      config: { frequency: 0.15, speed: 1.5, complexity: 4, colorShift: true, shiftSpeed: 0.0008 }
    },
    {
      id: 9,
      name: 'Aurora Borealis',
      description: 'Medium waves with mesmerizing color dance',
      config: { frequency: 0.1, speed: 1.0, complexity: 3, colorShift: true, shiftSpeed: 0.0005 }
    }
  ];
  
  constructor(theme: Theme, config?: Partial<PlasmaConfig>) {
    this.theme = theme;
    this.config = {
      frequency: 0.1,
      speed: 1.0,
      complexity: 3,
      colorShift: false,
      shiftSpeed: 0,
      ...config
    };
  }

  reset(): void {
    this.mouseInfluence = null;
    this.clickWaves = [];
    this.currentTime = 0;
  }

  render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void {
    const { width, height } = size;
    const { frequency, speed, complexity } = this.config;
    const t = (time * speed) / 1000;
    
    // Update mouse influence smoothly
    if (mousePos) {
      this.mouseInfluence = mousePos;
    }
    
    // Clean up old click waves
    this.clickWaves = this.clickWaves.filter(wave => time - wave.time < 3000);
    
    // Track current time for click waves
    this.currentTime = time;
    // Generate plasma effect using multiple sine waves
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Normalize coordinates to 0-1 range
        const nx = x / width;
        const ny = y / height;
        
        // Calculate plasma value using combination of sine waves
        let value = 0;
        
        // Wave 1: horizontal sine wave
        value += Math.sin((nx * 10 * frequency + t) * complexity);
        
        // Wave 2: vertical sine wave
        value += Math.sin((ny * 10 * frequency + t * 0.8) * complexity);
        
        // Wave 3: diagonal sine wave
        value += Math.sin(((nx + ny) * 7 * frequency + t * 1.2) * complexity);
        
        // Wave 4: circular sine wave (distance from center)
        const dx = nx - 0.5;
        const dy = ny - 0.5;
        const dist = Math.sqrt(dx * dx + dy * dy);
        value += Math.sin((dist * 15 * frequency - t * 1.5) * complexity);
        
        // Add mouse distortion effect
        if (this.mouseInfluence) {
          const mouseDx = x - this.mouseInfluence.x;
          const mouseDy = y - this.mouseInfluence.y;
          const mouseDist = Math.sqrt(mouseDx * mouseDx + mouseDy * mouseDy);
          const maxInfluence = 20;
          
          if (mouseDist < maxInfluence) {
            // Create warping effect around mouse
            const influence = (1 - mouseDist / maxInfluence);
            const warpAngle = Math.atan2(mouseDy, mouseDx);
            const warp = Math.sin(mouseDist * 0.5 - t * 3) * influence * 2;
            value += warp;
            
            // Add swirling effect
            const swirl = Math.sin(warpAngle * 4 + t * 2) * influence;
            value += swirl;
          }
        }
        
        // Add click wave effects
        for (const wave of this.clickWaves) {
          const waveDx = x - wave.x;
          const waveDy = y - wave.y;
          const waveDist = Math.sqrt(waveDx * waveDx + waveDy * waveDy);
          const age = time - wave.time;
          const waveRadius = (age / 3000) * 50; // Expands over time
          const life = 1 - age / 3000;
          
          // Expanding ring wave
          const distFromRing = Math.abs(waveDist - waveRadius);
          if (distFromRing < 5) {
            const ringIntensity = (1 - distFromRing / 5) * life * wave.strength;
            value += Math.sin(distFromRing * 2) * ringIntensity * 3;
          }
        }
        
        // Normalize value to 0-1 range
        let intensity = (value / 4 + 1) / 2; // value is in range [-4, 4], normalize to [0, 1]
        
        // Apply color shift if enabled
        if (this.config.colorShift) {
          const colorOffset = (time * this.config.shiftSpeed) % 1.0;
          intensity = (intensity + colorOffset) % 1.0;
        }
        
        // Choose character based on intensity
        const charIndex = Math.floor(intensity * (this.plasmaChars.length - 1));
        const char = this.plasmaChars[charIndex];
        
        // Use theme color with intensity
        buffer[y][x] = {
          char,
          color: this.theme.getColor(intensity)
        };
      }
    }
  }

  onMouseMove(pos: Point): void {
    // Mouse position influences plasma distortion in real-time
    this.mouseInfluence = pos;
  }

  onMouseClick(pos: Point): void {
    // Create expanding wave at click position
    this.clickWaves.push({
      x: pos.x,
      y: pos.y,
      time: this.currentTime,
      strength: 1.0 + Math.random() * 0.5
    });
    
    // Limit number of waves for performance
    if (this.clickWaves.length > 5) {
      this.clickWaves.shift();
    }
  }

  getMetrics(): Record<string, number> {
    return {
      waves: 4,
      complexity: this.config.complexity,
      clickWaves: this.clickWaves.length,
      mouseActive: this.mouseInfluence ? 1 : 0
    };
  }

  applyPreset(presetId: number): boolean {
    const preset = PlasmaPattern.PRESETS.find(p => p.id === presetId);
    if (!preset) return false;
    
    this.config = { ...preset.config };
    this.reset();
    return true;
  }

  static getPresets(): PlasmaPreset[] {
    return [...PlasmaPattern.PRESETS];
  }

  static getPreset(id: number): PlasmaPreset | undefined {
    return PlasmaPattern.PRESETS.find(p => p.id === id);
  }
}
