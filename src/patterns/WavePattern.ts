import { Pattern, Cell, Size, Point, Theme } from '../types';

interface WaveConfig {
  speed: number;
  amplitude: number;
  frequency: number;
  layers: number;
}

export class WavePattern implements Pattern {
  name = 'waves';
  private config: WaveConfig;
  private theme: Theme;
  private ripples: Array<{ x: number; y: number; time: number; radius: number }> = [];
  private waveChars = ['~', '≈', '∼', '-', '.', ' '];

  constructor(theme: Theme, config?: Partial<WaveConfig>) {
    this.theme = theme;
    this.config = {
      speed: 1.0,
      amplitude: 5,
      frequency: 0.1,
      layers: 3,
      ...config
    };
  }

  render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void {
    const { width, height } = size;
    const { speed, amplitude, frequency, layers } = this.config;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let totalWave = 0;

        // Multiple wave layers with smoother transitions
        for (let layer = 0; layer < layers; layer++) {
          const layerFreq = frequency * (layer + 1) * 0.5;
          const layerAmp = amplitude / (layer + 1);
          const layerSpeed = speed * (layer + 1) * 0.3;
          
          // Add multiple wave components for smoother effect
          const wave1 = Math.sin((x * layerFreq) + (time * layerSpeed * 0.001)) * layerAmp;
          const wave2 = Math.sin((x * layerFreq * 1.3) + (time * layerSpeed * 0.0008)) * (layerAmp * 0.5);
          totalWave += wave1 + wave2;
        }

        // Add ripple effects from mouse (optimized with early rejection)
        for (const ripple of this.ripples) {
          const dx = x - ripple.x;
          const dy = y - ripple.y;
          
          // Quick rejection test using squared distance (avoids sqrt)
          const distSquared = dx * dx + dy * dy;
          const radiusSquared = ripple.radius * ripple.radius;
          
          if (distSquared < radiusSquared) {
            // Only calculate sqrt when we know the point is inside
            const dist = Math.sqrt(distSquared);
            const age = time - ripple.time;
            const rippleEffect = Math.sin(dist * 0.5 - age * 0.01) * (1 - dist / ripple.radius) * 3;
            totalWave += rippleEffect;
          }
        }

        const waveHeight = height / 2 + totalWave;
        const intensity = Math.abs(y - waveHeight);
        
        // Map intensity to character and theme color
        let char = ' ';
        let colorIntensity = 0;
        
        if (intensity < 0.5) {
          char = this.waveChars[0];
          colorIntensity = 1.0; // Brightest (crest)
        } else if (intensity < 1.5) {
          char = this.waveChars[1];
          colorIntensity = 1.0 - (intensity - 0.5) / 1.0 * 0.2; // 1.0 → 0.8
        } else if (intensity < 2.5) {
          char = this.waveChars[2];
          colorIntensity = 0.8 - (intensity - 1.5) / 1.0 * 0.2; // 0.8 → 0.6
        } else if (intensity < 4) {
          char = this.waveChars[3];
          colorIntensity = 0.6 - (intensity - 2.5) / 1.5 * 0.2; // 0.6 → 0.4
        } else if (intensity < 6) {
          char = this.waveChars[4];
          colorIntensity = 0.4 - (intensity - 4) / 2.0 * 0.2; // 0.4 → 0.2
        }
        
        const color = this.theme.getColor(colorIntensity);

        buffer[y][x] = { char, color };
      }
    }

    // Clean up old ripples
    this.ripples = this.ripples.filter(r => time - r.time < 2000);
  }

  onMouseMove(pos: Point): void {
    // Mouse movement creates subtle ripples
    this.ripples.push({
      x: pos.x,
      y: pos.y,
      time: Date.now(),
      radius: 20
    });
    
    // Limit number of ripples for performance
    if (this.ripples.length > 8) {
      this.ripples.shift();
    }
  }

  onMouseClick(pos: Point): void {
    // Click creates a bigger, more dramatic ripple
    this.ripples.push({
      x: pos.x,
      y: pos.y,
      time: Date.now(),
      radius: 35
    });
  }

  reset(): void {
    this.ripples = [];
  }

  getMetrics(): Record<string, number> {
    return {
      activeRipples: this.ripples.length,
      waveLayers: this.config.layers
    };
  }
}
