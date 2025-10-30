import { Pattern, Cell, Size, Point, Theme } from '../types';

interface Column {
  x: number;
  y: number;
  speed: number;
  chars: string[];
  length: number;
}

interface MatrixConfig {
  density: number;
  speed: number;
  charset: 'katakana' | 'numbers' | 'mixed';
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

  constructor(theme: Theme, config?: Partial<MatrixConfig>) {
    this.theme = theme;
    this.config = {
      density: 0.3,
      speed: 1.0,
      charset: 'katakana',
      ...config
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
      length
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
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < distortion.radius) {
              isDistorted = true;
              char = this.getRandomChar();
              break;
            }
          }

          // Head of column is bright white
          if (j === 0) {
            buffer[y][col.x] = {
              char,
              color: { r: 255, g: 255, b: 255 }
            };
          }
          // Next few characters are bright green
          else if (j < 3) {
            buffer[y][col.x] = {
              char,
              color: { r: 0, g: 255, b: 70 }
            };
          }
          // Fade to darker green
          else {
            const fade = 1 - (j / col.length);
            const brightness = Math.floor(fade * 200);
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
    return {
      columns: this.columns.length,
      density: this.config.density
    };
  }
}
