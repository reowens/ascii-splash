import { Pattern, Cell, Size, Point } from '../types';

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

export class RainPattern implements Pattern {
  name = 'rain';
  private config: RainConfig;
  private drops: Drop[] = [];
  private splashes: Array<{ x: number; y: number; time: number }> = [];

  constructor(config?: Partial<RainConfig>) {
    this.config = {
      density: 0.2,
      speed: 1.0,
      characters: ['\'', ',', '.', '|', '!', '`'],
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
          time: Date.now()
        });
        
        // Reset drop
        this.drops[i] = this.createDrop(size);
        continue;
      }

      // Render drop
      if (y >= 0 && y < height && drop.x >= 0 && drop.x < width) {
        // Color based on speed (faster = brighter)
        const brightness = Math.floor(100 + drop.speed * 50);
        buffer[y][drop.x] = {
          char: drop.char,
          color: { r: brightness, g: brightness + 50, b: brightness + 100 }
        };
      }
    }

    // Render splashes
    const currentTime = Date.now();
    for (const splash of this.splashes) {
      const age = currentTime - splash.time;
      const maxAge = 300;
      
      if (age < maxAge) {
        const radius = Math.floor((age / maxAge) * 3);
        const brightness = Math.floor(200 * (1 - age / maxAge));
        
        for (let dx = -radius; dx <= radius; dx++) {
          const x = splash.x + dx;
          const y = splash.y;
          
          if (x >= 0 && x < width && y >= 0 && y < height) {
            buffer[y][x] = {
              char: '~',
              color: { r: brightness, g: brightness + 30, b: brightness + 60 }
            };
          }
        }
      }
    }

    // Clean up old splashes
    this.splashes = this.splashes.filter(s => currentTime - s.time < 300);
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
    // Create big splash
    this.splashes.push({
      x: pos.x,
      y: pos.y,
      time: Date.now()
    });
    
    // Spawn burst of drops
    for (let i = 0; i < 10; i++) {
      this.drops.push({
        x: pos.x + Math.floor(Math.random() * 10) - 5,
        y: pos.y - 10,
        speed: this.config.speed * (Math.random() + 0.5),
        char: this.config.characters[Math.floor(Math.random() * this.config.characters.length)]
      });
    }
  }

  reset(): void {
    this.drops = [];
    this.splashes = [];
  }

  getMetrics(): Record<string, number> {
    return {
      drops: this.drops.length,
      splashes: this.splashes.length
    };
  }
}
