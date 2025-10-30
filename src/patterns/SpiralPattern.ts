import { Pattern, Cell, Size, Point, Theme } from '../types';

interface SpiralConfig {
  spiralCount: number;
  rotationSpeed: number;
  armLength: number;
  density: number;
  expandSpeed: number;
}

export class SpiralPattern implements Pattern {
  name = 'spiral';
  private config: SpiralConfig;
  private theme: Theme;
  private spiralChars = ['✦', '✧', '★', '☆', '*', '·', '.'];
  
  constructor(theme: Theme, config?: Partial<SpiralConfig>) {
    this.theme = theme;
    this.config = {
      spiralCount: 3,
      rotationSpeed: 0.5,
      armLength: 8,
      density: 15,
      expandSpeed: 0.3,
      ...config
    };
  }

  reset(): void {
    // Stateless pattern - no reset needed
  }

  render(buffer: Cell[][], time: number, size: Size, _mousePos?: Point): void {
    const { width, height } = size;
    const centerX = width / 2;
    const centerY = height / 2;
    const { spiralCount, rotationSpeed, armLength, density, expandSpeed } = this.config;
    
    // Calculate rotation based on time
    const rotation = (time * rotationSpeed) / 1000;
    
    // Draw multiple spiral arms
    for (let arm = 0; arm < spiralCount; arm++) {
      const armAngleOffset = (Math.PI * 2 * arm) / spiralCount;
      
      // Draw points along this spiral arm
      for (let i = 0; i < density * 10; i++) {
        const t = i / density;
        
        // Logarithmic spiral formula: r = a * e^(b*theta)
        const theta = t * Math.PI * armLength + rotation + armAngleOffset;
        const r = expandSpeed * Math.exp(0.15 * theta);
        
        // Convert polar to cartesian
        const x = Math.floor(centerX + r * Math.cos(theta));
        const y = Math.floor(centerY + r * Math.sin(theta));
        
        // Check bounds
        if (x >= 0 && x < width && y >= 0 && y < height) {
          // Calculate intensity based on distance from center
          const distFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
          const maxDist = Math.sqrt(width ** 2 + height ** 2) / 2;
          const intensity = 1 - Math.min(1, distFromCenter / maxDist);
          
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
  }

  onMouseMove(_pos: Point): void {
    // No mouse interaction for spiral pattern
  }

  onMouseClick(_pos: Point): void {
    // No mouse interaction for spiral pattern
  }

  getMetrics(): Record<string, number> {
    return {
      arms: this.config.spiralCount,
      points: this.config.density * 10 * this.config.spiralCount
    };
  }
}
