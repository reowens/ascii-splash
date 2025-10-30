import { Pattern, Cell, Size, Point, Theme } from '../types';

interface SpiralConfig {
  spiralCount: number;
  rotationSpeed: number;
  armLength: number;
  density: number;
  expandSpeed: number;
}

interface SpiralPreset {
  id: number;
  name: string;
  description: string;
  config: SpiralConfig;
}

interface InteractiveSpiral {
  x: number;
  y: number;
  rotation: number;
  age: number;
  size: number;
}

export class SpiralPattern implements Pattern {
  name = 'spiral';
  private config: SpiralConfig;
  private theme: Theme;
  private spiralChars = ['█', '▓', '▒', '░', '●', '◉', '○', '◐', '·'];
  private mouseSpirals: InteractiveSpiral[] = [];
  private breathePhase: number = 0;

  private static readonly PRESETS: SpiralPreset[] = [
    {
      id: 1,
      name: 'Twin Vortex',
      description: 'Two rotating arms, classic spiral',
      config: { spiralCount: 2, rotationSpeed: 0.6, armLength: 8, density: 25, expandSpeed: 0.35 }
    },
    {
      id: 2,
      name: 'Galaxy Arms',
      description: 'Five-armed galactic spiral',
      config: { spiralCount: 5, rotationSpeed: 0.8, armLength: 6, density: 30, expandSpeed: 0.4 }
    },
    {
      id: 3,
      name: 'Fibonacci Bloom',
      description: 'Eight arms, flower-like pattern',
      config: { spiralCount: 8, rotationSpeed: 0.4, armLength: 5, density: 35, expandSpeed: 0.3 }
    },
    {
      id: 4,
      name: 'Hypnotic Spin',
      description: 'Fast rotating, tight spiral',
      config: { spiralCount: 3, rotationSpeed: 1.5, armLength: 4, density: 40, expandSpeed: 0.25 }
    },
    {
      id: 5,
      name: 'Slow Mandala',
      description: 'Gentle, meditative rotation',
      config: { spiralCount: 6, rotationSpeed: 0.3, armLength: 7, density: 20, expandSpeed: 0.45 }
    },
    {
      id: 6,
      name: 'Nautilus Shell',
      description: 'Single arm, natural logarithmic spiral',
      config: { spiralCount: 1, rotationSpeed: 0.5, armLength: 10, density: 50, expandSpeed: 0.5 }
    }
  ];
  
  constructor(theme: Theme, config?: Partial<SpiralConfig>) {
    this.theme = theme;
    this.config = {
      spiralCount: 5,          // Increased from 3
      rotationSpeed: 0.8,      // Increased from 0.5
      armLength: 6,            // Reduced from 8 for tighter spirals
      density: 30,             // Doubled from 15
      expandSpeed: 0.4,        // Increased from 0.3
      ...config
    };
  }

  reset(): void {
    this.mouseSpirals = [];
    this.breathePhase = 0;
  }

  render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void {
    const { width, height } = size;
    const centerX = width / 2;
    const centerY = height / 2;
    const { spiralCount, rotationSpeed, armLength, density, expandSpeed } = this.config;
    
    // Calculate rotation based on time
    const rotation = (time * rotationSpeed) / 1000;
    
    // Add breathing effect for visual interest
    this.breathePhase = (time * 0.002) % (Math.PI * 2);
    const breathe = Math.sin(this.breathePhase) * 0.2 + 1.0; // 0.8 to 1.2
    
    // Draw main spiral arms
    for (let arm = 0; arm < spiralCount; arm++) {
      const armAngleOffset = (Math.PI * 2 * arm) / spiralCount;
      
      // Draw points along this spiral arm
      for (let i = 0; i < density * 10; i++) {
        const t = i / density;
        
        // Logarithmic spiral formula: r = a * e^(b*theta)
        const theta = t * Math.PI * armLength + rotation + armAngleOffset;
        const r = expandSpeed * Math.exp(0.2 * theta) * breathe;
        
        // Convert polar to cartesian
        const x = Math.floor(centerX + r * Math.cos(theta));
        const y = Math.floor(centerY + r * Math.sin(theta));
        
        // Check bounds
        if (x >= 0 && x < width && y >= 0 && y < height) {
          // Calculate intensity based on distance from center and position along arm
          const distFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
          const maxDist = Math.sqrt(width ** 2 + height ** 2) / 2;
          const distIntensity = 1 - Math.min(1, distFromCenter / maxDist);
          
          // Add pulsing based on arm position
          const pulseIntensity = Math.sin(t * Math.PI * 2 + rotation * 2) * 0.3 + 0.7;
          const intensity = distIntensity * pulseIntensity;
          
          // Choose character based on intensity
          const charIndex = Math.floor(intensity * (this.spiralChars.length - 1));
          const char = this.spiralChars[charIndex];
          
          // Use theme color with intensity
          buffer[y][x] = {
            char,
            color: this.theme.getColor(intensity)
          };
        }
      }
    }
    
    // Update and render mouse-spawned spirals
    for (let i = this.mouseSpirals.length - 1; i >= 0; i--) {
      const spiral = this.mouseSpirals[i];
      spiral.age += 0.02;
      spiral.rotation += 0.05;
      
      // Remove old spirals
      if (spiral.age > 1) {
        this.mouseSpirals.splice(i, 1);
        continue;
      }
      
      // Draw this interactive spiral
      const life = 1 - spiral.age;
      const arms = 3;
      
      for (let arm = 0; arm < arms; arm++) {
        const armAngleOffset = (Math.PI * 2 * arm) / arms;
        
        for (let j = 0; j < 50; j++) {
          const t = j / 10;
          const theta = t * Math.PI * 2 + spiral.rotation + armAngleOffset;
          const r = spiral.size * Math.exp(0.3 * theta) * life;
          
          const x = Math.floor(spiral.x + r * Math.cos(theta));
          const y = Math.floor(spiral.y + r * Math.sin(theta));
          
          if (x >= 0 && x < width && y >= 0 && y < height) {
            const intensity = life * (1 - t / 5);
            const charIndex = Math.floor(intensity * (this.spiralChars.length - 1));
            
            buffer[y][x] = {
              char: this.spiralChars[charIndex],
              color: this.theme.getColor(intensity)
            };
          }
        }
      }
    }
  }

  onMouseMove(pos: Point): void {
    // Optional: Could add subtle spiral following mouse
    // For now, keeping it simple - click is the main interaction
  }

  onMouseClick(pos: Point): void {
    // Spawn a new interactive spiral at click position
    this.mouseSpirals.push({
      x: pos.x,
      y: pos.y,
      rotation: Math.random() * Math.PI * 2,
      age: 0,
      size: 0.3 + Math.random() * 0.2
    });
    
    // Limit to 10 interactive spirals for performance
    if (this.mouseSpirals.length > 10) {
      this.mouseSpirals.shift();
    }
  }

  getMetrics(): Record<string, number> {
    return {
      arms: this.config.spiralCount,
      points: this.config.density * 10 * this.config.spiralCount,
      interactiveSpirals: this.mouseSpirals.length
    };
  }

  applyPreset(presetId: number): boolean {
    const preset = SpiralPattern.PRESETS.find(p => p.id === presetId);
    if (!preset) return false;
    
    this.config = { ...preset.config };
    this.reset();
    return true;
  }

  static getPresets(): SpiralPreset[] {
    return [...SpiralPattern.PRESETS];
  }

  static getPreset(id: number): SpiralPreset | undefined {
    return SpiralPattern.PRESETS.find(p => p.id === id);
  }
}
