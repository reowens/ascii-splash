import { Pattern, Cell, Size, Point, Theme } from '../types';
import { validateDensity, validateSpeed } from '../utils/validation';

interface Column {
  x: number;
  y: number;
  speed: number;
  chars: string[];
  length: number;
  age: number; // Time-based aging for fade effect
}

interface MatrixConfig {
  density: number;
  speed: number;
  charset: 'katakana' | 'numbers' | 'mixed';
}

interface MatrixPreset {
  id: number;
  name: string;
  description: string;
  config: MatrixConfig;
}

export class MatrixPattern implements Pattern {
  name = 'matrix';
  private config: MatrixConfig;
  private theme: Theme;
  private columns: Column[] = [];
  private charSets = {
    katakana: 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ',
    numbers: '0123456789',
    mixed: 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  };
  private distortions: Array<{ x: number; y: number; radius: number }> = [];

  private static readonly PRESETS: MatrixPreset[] = [
    {
      id: 1,
      name: 'Classic Matrix',
      description: 'The iconic falling code effect',
      config: { density: 0.3, speed: 1.0, charset: 'katakana' }
    },
    {
      id: 2,
      name: 'Binary Rain',
      description: 'Falling numbers, digital downpour',
      config: { density: 0.4, speed: 1.2, charset: 'numbers' }
    },
    {
      id: 3,
      name: 'Code Storm',
      description: 'Dense, fast-moving characters',
      config: { density: 0.5, speed: 1.8, charset: 'mixed' }
    },
    {
      id: 4,
      name: 'Sparse Glyphs',
      description: 'Minimal, slow-falling characters',
      config: { density: 0.15, speed: 0.6, charset: 'katakana' }
    },
    {
      id: 5,
      name: 'Firewall',
      description: 'Ultra-dense security screen',
      config: { density: 0.7, speed: 2.0, charset: 'mixed' }
    },
    {
      id: 6,
      name: 'Zen Code',
      description: 'Peaceful, meditative flow',
      config: { density: 0.2, speed: 0.5, charset: 'katakana' }
    }
  ];

  constructor(theme: Theme, config?: Partial<MatrixConfig>) {
    this.theme = theme;
    const merged = {
      density: 0.3,
      speed: 1.0,
      charset: 'katakana' as const,
      ...config
    };
    
    // Validate numeric config values
    this.config = {
      density: validateDensity(merged.density),
      speed: validateSpeed(merged.speed, 0.1, 5),
      charset: merged.charset
    };
  }

  private initColumns(size: Size): void {
    const targetColumns = Math.floor(size.width * this.config.density);
    
    while (this.columns.length < targetColumns) {
      this.columns.push(this.createColumn(size));
    }
    
    // Remove excess columns if terminal shrunk
    this.columns = this.columns.filter(col => col.x < size.width);
  }

  private createColumn(size: Size): Column {
    const charset = this.charSets[this.config.charset];
    const length = Math.floor(Math.random() * 15) + 5;
    const chars: string[] = [];
    
    for (let i = 0; i < length; i++) {
      chars.push(charset[Math.floor(Math.random() * charset.length)]);
    }
    
    return {
      x: Math.floor(Math.random() * size.width),
      y: -length,
      speed: (Math.random() * 0.5 + 0.5) * this.config.speed,
      chars,
      length,
      age: 0
    };
  }

  private getRandomChar(): string {
    const charset = this.charSets[this.config.charset];
    return charset[Math.floor(Math.random() * charset.length)];
  }

  render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void {
    const { width, height } = size;

    this.initColumns(size);

    // Clear buffer with slight fade effect
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        buffer[y][x] = { char: ' ' };
      }
    }

    // Update distortions
    if (mousePos) {
      this.distortions = [{ x: mousePos.x, y: mousePos.y, radius: 5 }];
    }

    // Update and render columns
    for (let i = 0; i < this.columns.length; i++) {
      const col = this.columns[i];
      
      // Move column down
      col.y += col.speed * 0.3;
      col.age += 1; // Increment age for fade effect
      
      // Reset if off screen
      if (col.y > height + col.length) {
        this.columns[i] = this.createColumn(size);
        continue;
      }

      // Render each character in the column
      for (let j = 0; j < col.length; j++) {
        const y = Math.floor(col.y - j);
        
        if (y >= 0 && y < height && col.x >= 0 && col.x < width) {
          // Check for distortion
          let char = col.chars[j];
          let isDistorted = false;
          
          for (const distortion of this.distortions) {
            const dx = col.x - distortion.x;
            const dy = y - distortion.y;
            const distSquared = dx * dx + dy * dy;
            const radiusSquared = distortion.radius * distortion.radius;
            
            if (distSquared < radiusSquared) {
              isDistorted = true;
              char = this.getRandomChar();
              break;
            }
          }

          // Calculate time-based fade factor (gradually dim over time)
          const ageFade = Math.max(0, 1 - (col.age / 500)); // Fade over ~500 frames

          // Head of column is bright white
          if (j === 0) {
            const whiteBrightness = Math.floor(255 * ageFade);
            buffer[y][col.x] = {
              char,
              color: { r: whiteBrightness, g: whiteBrightness, b: whiteBrightness }
            };
          }
          // Next few characters are bright green
          else if (j < 3) {
            const greenBrightness = Math.floor(255 * ageFade);
            buffer[y][col.x] = {
              char,
              color: { r: 0, g: greenBrightness, b: Math.floor(70 * ageFade) }
            };
          }
          // Fade to darker green (combine position and age fade)
          else {
            const positionFade = 1 - (j / col.length);
            const combinedFade = positionFade * ageFade;
            const brightness = Math.floor(combinedFade * 200);
            buffer[y][col.x] = {
              char,
              color: { r: 0, g: brightness, b: Math.floor(brightness * 0.3) }
            };
          }

          // Occasionally change a character
          if (Math.random() < 0.05) {
            col.chars[j] = this.getRandomChar();
          }
        }
      }
    }
  }

  onMouseMove(pos: Point): void {
    // Distortion handled in render
  }

  onMouseClick(pos: Point): void {
    // Spawn new columns around click
    const size = { width: 100, height: 100 }; // Will be overridden in render
    for (let i = 0; i < 3; i++) {
      const newCol = this.createColumn(size);
      newCol.x = pos.x + Math.floor(Math.random() * 6) - 3;
      newCol.y = pos.y - newCol.length;
      this.columns.push(newCol);
    }
  }

  reset(): void {
    this.columns = [];
    this.distortions = [];
  }

  getMetrics(): Record<string, number> {
    // Calculate total characters across all columns
    const totalChars = this.columns.reduce((sum, col) => sum + col.length, 0);
    
    // Calculate average speed across all columns
    const avgSpeed = this.columns.length > 0
      ? this.columns.reduce((sum, col) => sum + col.speed, 0) / this.columns.length
      : 0;
    
    // Calculate average age across all columns
    const avgAge = this.columns.length > 0
      ? this.columns.reduce((sum, col) => sum + col.age, 0) / this.columns.length
      : 0;
    
    return {
      columns: this.columns.length,
      totalChars,
      avgSpeed: Math.round(avgSpeed * 100) / 100,
      avgAge: Math.round(avgAge),
      distortions: this.distortions.length,
      density: this.config.density,
      speed: this.config.speed,
      charset: this.config.charset === 'katakana' ? 1 : this.config.charset === 'numbers' ? 2 : 3
    };
  }

  applyPreset(presetId: number): boolean {
    const preset = MatrixPattern.PRESETS.find(p => p.id === presetId);
    if (!preset) return false;
    
    this.config = { ...preset.config };
    this.reset();
    return true;
  }

  static getPresets(): MatrixPreset[] {
    return [...MatrixPattern.PRESETS];
  }

  static getPreset(id: number): MatrixPreset | undefined {
    return MatrixPattern.PRESETS.find(p => p.id === id);
  }
}
