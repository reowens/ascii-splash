import { Pattern, Cell, Size, Point, Theme } from '../types';

interface Drop {
  x: number;
  y: number;
  speed: number;
  char: string;
}

interface RainConfig {
  density: number;
  speed: number;
  characters: string[];
}

interface RainPreset {
  id: number;
  name: string;
  description: string;
  config: RainConfig;
}

export class RainPattern implements Pattern {
  name = 'rain';
  private config: RainConfig;
  private theme: Theme;
  private drops: Drop[] = [];
  private splashes: Array<{ x: number; y: number; time: number; radius: number }> = [];

  private static readonly PRESETS: RainPreset[] = [
    {
      id: 1,
      name: 'Light Drizzle',
      description: 'Gentle, sparse rainfall',
      config: { density: 0.1, speed: 0.6, characters: ['\'', ',', '.', '`'] }
    },
    {
      id: 2,
      name: 'Steady Rain',
      description: 'Normal rainfall intensity',
      config: { density: 0.2, speed: 1.0, characters: ['\'', ',', '.', '|', '!', '`', '·', '∙'] }
    },
    {
      id: 3,
      name: 'Thunderstorm',
      description: 'Heavy downpour with intense drops',
      config: { density: 0.4, speed: 1.8, characters: ['|', '!', '‖', '║', '┃'] }
    },
    {
      id: 4,
      name: 'Mist',
      description: 'Fine, slow-falling mist',
      config: { density: 0.3, speed: 0.3, characters: ['.', '·', '∙', '˙', '˚'] }
    },
    {
      id: 5,
      name: 'Monsoon',
      description: 'Torrential rain with maximum density',
      config: { density: 0.5, speed: 2.2, characters: ['║', '┃', '|', '!', '‖'] }
    },
    {
      id: 6,
      name: 'Spring Shower',
      description: 'Varied drops, medium intensity',
      config: { density: 0.25, speed: 1.2, characters: ['\'', ',', '.', '|', '!', '`', '·', '∙', '˙'] }
    }
  ];

  constructor(theme: Theme, config?: Partial<RainConfig>) {
    this.theme = theme;
    this.config = {
      density: 0.2,
      speed: 1.0,
      characters: ['\'', ',', '.', '|', '!', '`', '·', '∙'],
      ...config
    };
  }

  private initDrops(size: Size): void {
    const targetDrops = Math.floor(size.width * size.height * this.config.density * 0.01);
    
    while (this.drops.length < targetDrops) {
      this.drops.push(this.createDrop(size));
    }
  }

  private createDrop(size: Size): Drop {
    return {
      x: Math.floor(Math.random() * size.width),
      y: Math.random() * -10,
      speed: (Math.random() * 0.5 + 0.5) * this.config.speed,
      char: this.config.characters[Math.floor(Math.random() * this.config.characters.length)]
    };
  }

  render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void {
    const { width, height } = size;

    this.initDrops(size);

    // Clear buffer
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        buffer[y][x] = { char: ' ' };
      }
    }

    // Update and render drops
    for (let i = 0; i < this.drops.length; i++) {
      const drop = this.drops[i];
      
      // Check for mouse interaction (bounce off mouse)
      if (mousePos) {
        const dx = drop.x - mousePos.x;
        const dy = Math.floor(drop.y) - mousePos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 3) {
          // Bounce away from mouse
          drop.x += dx > 0 ? 2 : -2;
          if (drop.x < 0) drop.x = 0;
          if (drop.x >= width) drop.x = width - 1;
        }
      }

      // Move drop down
      drop.y += drop.speed * 0.5;
      
      const y = Math.floor(drop.y);
      
      // Check if hit ground
      if (y >= height) {
        // Create splash
        this.splashes.push({
          x: drop.x,
          y: height - 1,
          time: Date.now(),
          radius: 2
        });
        
        // Reset drop
        this.drops[i] = this.createDrop(size);
        continue;
      }

      // Render drop with theme color based on speed
      if (y >= 0 && y < height && drop.x >= 0 && drop.x < width) {
        // Higher speed = higher intensity (brighter color)
        const intensity = Math.min(1, 0.4 + drop.speed * 0.3);
        
        buffer[y][drop.x] = {
          char: drop.char,
          color: this.theme.getColor(intensity)
        };
      }
    }

    // Render splashes
    const currentTime = Date.now();
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const splash = this.splashes[i];
      const age = currentTime - splash.time;
      const maxAge = 400;
      
      if (age < maxAge) {
        const life = 1 - age / maxAge;
        const currentRadius = Math.floor((age / maxAge) * splash.radius);
        
        // Draw splash with expanding ripples
        for (let dx = -currentRadius; dx <= currentRadius; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const x = splash.x + dx;
            const y = splash.y + dy;
            
            if (x >= 0 && x < width && y >= 0 && y < height) {
              const distFromCenter = Math.abs(dx);
              const rippleIntensity = life * (1 - distFromCenter / (splash.radius + 1));
              
              // Choose character based on intensity
              let char = ' ';
              if (rippleIntensity > 0.7) char = '~';
              else if (rippleIntensity > 0.4) char = '≈';
              else if (rippleIntensity > 0.2) char = '·';
              
              if (char !== ' ') {
                buffer[y][x] = {
                  char,
                  color: this.theme.getColor(rippleIntensity)
                };
              }
            }
          }
        }
      } else {
        // Remove old splash
        this.splashes.splice(i, 1);
      }
    }
  }

  onMouseMove(pos: Point): void {
    // Spawn extra drops near mouse
    if (Math.random() < 0.3) {
      this.drops.push({
        x: pos.x + Math.floor(Math.random() * 6) - 3,
        y: pos.y - 5,
        speed: this.config.speed * (Math.random() * 0.5 + 0.5),
        char: this.config.characters[Math.floor(Math.random() * this.config.characters.length)]
      });
    }
  }

  onMouseClick(pos: Point): void {
    // Create big dramatic splash
    this.splashes.push({
      x: pos.x,
      y: pos.y,
      time: Date.now(),
      radius: 5
    });
    
    // Spawn burst of drops in all directions
    for (let i = 0; i < 15; i++) {
      const angle = (Math.PI * 2 * i) / 15;
      const distance = 3 + Math.random() * 5;
      
      this.drops.push({
        x: Math.floor(pos.x + Math.cos(angle) * distance),
        y: Math.floor(pos.y + Math.sin(angle) * distance - 5),
        speed: this.config.speed * (Math.random() * 0.8 + 0.7),
        char: this.config.characters[Math.floor(Math.random() * this.config.characters.length)]
      });
    }
  }

  reset(): void {
    this.drops = [];
    this.splashes = [];
  }

  getMetrics(): Record<string, number> {
    // Calculate average drop height
    const avgHeight = this.drops.length > 0
      ? this.drops.reduce((sum, drop) => sum + drop.y, 0) / this.drops.length
      : 0;
    
    // Count total splash particles (splash expansion area)
    const splashParticles = this.splashes.reduce((sum, splash) => {
      const currentTime = Date.now();
      const age = currentTime - splash.time;
      const maxAge = 400;
      if (age < maxAge) {
        const currentRadius = Math.floor((age / maxAge) * splash.radius);
        return sum + ((currentRadius * 2 + 1) * 3); // Width * height of splash area
      }
      return sum;
    }, 0);
    
    return {
      drops: this.drops.length,
      splashes: this.splashes.length,
      splashParticles,
      avgHeight: Math.round(avgHeight * 100) / 100,
      density: this.config.density,
      speed: this.config.speed
    };
  }

  applyPreset(presetId: number): boolean {
    const preset = RainPattern.PRESETS.find(p => p.id === presetId);
    if (!preset) return false;
    
    this.config = { ...preset.config };
    this.reset();
    return true;
  }

  static getPresets(): RainPreset[] {
    return [...RainPattern.PRESETS];
  }

  static getPreset(id: number): RainPreset | undefined {
    return RainPattern.PRESETS.find(p => p.id === id);
  }
}
