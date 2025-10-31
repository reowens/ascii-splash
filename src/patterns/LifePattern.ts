import { Pattern, Cell, Size, Point, Theme } from '../types';

interface LifeConfig {
  cellSize: number;
  updateSpeed: number; // milliseconds between generations
  wrapEdges: boolean;
  aliveChar: string;
  deadChar: string;
  randomDensity: number; // 0-1, for random initialization
  initialPattern?: string; // preset pattern name
}

interface LifePreset {
  id: number;
  name: string;
  description: string;
  config: LifeConfig;
}

export class LifePattern implements Pattern {
  name = 'life';
  private config: LifeConfig;
  private theme: Theme;
  private grid: boolean[][] = []; // true = alive, false = dead
  private nextGrid: boolean[][] = [];
  private lastUpdateTime = 0;
  private generation = 0;
  private gridWidth = 0;
  private gridHeight = 0;
  private population = 0;

  // Tier 1 Presets (01-06): Different starting patterns
  private static readonly PRESETS: LifePreset[] = [
    {
      id: 1,
      name: 'Random Soup',
      description: 'Random initial state, medium density',
      config: {
        cellSize: 2,
        updateSpeed: 100,
        wrapEdges: true,
        aliveChar: '█',
        deadChar: ' ',
        randomDensity: 0.3,
        initialPattern: 'random'
      }
    },
    {
      id: 2,
      name: 'Glider Garden',
      description: 'Multiple gliders moving across the screen',
      config: {
        cellSize: 2,
        updateSpeed: 150,
        wrapEdges: true,
        aliveChar: '●',
        deadChar: '·',
        randomDensity: 0,
        initialPattern: 'gliders'
      }
    },
    {
      id: 3,
      name: 'Oscillator Park',
      description: 'Collection of oscillating patterns',
      config: {
        cellSize: 2,
        updateSpeed: 200,
        wrapEdges: false,
        aliveChar: '▓',
        deadChar: ' ',
        randomDensity: 0,
        initialPattern: 'oscillators'
      }
    },
    {
      id: 4,
      name: 'Primordial Soup',
      description: 'Dense chaos, high initial density',
      config: {
        cellSize: 1,
        updateSpeed: 80,
        wrapEdges: true,
        aliveChar: '█',
        deadChar: ' ',
        randomDensity: 0.5,
        initialPattern: 'random'
      }
    },
    {
      id: 5,
      name: 'Methuselah Patterns',
      description: 'Long-lived patterns that evolve dramatically',
      config: {
        cellSize: 2,
        updateSpeed: 120,
        wrapEdges: false,
        aliveChar: '■',
        deadChar: ' ',
        randomDensity: 0,
        initialPattern: 'methuselah'
      }
    },
    {
      id: 6,
      name: 'Still Life Garden',
      description: 'Static patterns mixed with slight activity',
      config: {
        cellSize: 2,
        updateSpeed: 150,
        wrapEdges: false,
        aliveChar: '◆',
        deadChar: ' ',
        randomDensity: 0.1,
        initialPattern: 'still-life'
      }
    }
  ];

  constructor(theme: Theme, config?: Partial<LifeConfig>) {
    this.theme = theme;
    this.config = {
      cellSize: 2,
      updateSpeed: 100,
      wrapEdges: true,
      aliveChar: '█',
      deadChar: ' ',
      randomDensity: 0.3,
      initialPattern: 'random',
      ...config
    };
  }

  static getPresets(): LifePreset[] {
    return LifePattern.PRESETS;
  }

  static getPreset(id: number): LifePreset | undefined {
    return LifePattern.PRESETS.find(p => p.id === id);
  }

  applyPreset(presetId: number): boolean {
    const preset = LifePattern.getPreset(presetId);
    if (!preset) {
      return false;
    }
    this.config = { ...preset.config };
    this.reset();
    return true;
  }

  reset(): void {
    this.generation = 0;
    this.lastUpdateTime = 0;
    this.grid = [];
    this.nextGrid = [];
    this.population = 0;
  }

  private initializeGrid(width: number, height: number): void {
    this.gridWidth = Math.floor(width / this.config.cellSize);
    this.gridHeight = Math.floor(height / this.config.cellSize);

    // Initialize grids
    this.grid = Array(this.gridHeight).fill(null).map(() => 
      Array(this.gridWidth).fill(false)
    );
    this.nextGrid = Array(this.gridHeight).fill(null).map(() => 
      Array(this.gridWidth).fill(false)
    );

    // Apply initial pattern
    this.applyInitialPattern();
    this.updatePopulation();
  }

  private applyInitialPattern(): void {
    const pattern = this.config.initialPattern;

    if (pattern === 'random') {
      // Random initialization
      for (let y = 0; y < this.gridHeight; y++) {
        for (let x = 0; x < this.gridWidth; x++) {
          this.grid[y][x] = Math.random() < this.config.randomDensity;
        }
      }
    } else if (pattern === 'gliders') {
      // Place multiple gliders
      this.placeGlider(5, 5);
      this.placeGlider(this.gridWidth - 10, 5);
      this.placeGlider(5, this.gridHeight - 10);
      this.placeGlider(this.gridWidth - 10, this.gridHeight - 10);
      this.placeGlider(Math.floor(this.gridWidth / 2), Math.floor(this.gridHeight / 2));
    } else if (pattern === 'oscillators') {
      // Place various oscillators
      this.placeBlinker(10, 10);
      this.placeToad(20, 10);
      this.placeBeacon(10, 20);
      this.placePulsar(Math.floor(this.gridWidth / 2), Math.floor(this.gridHeight / 2));
    } else if (pattern === 'methuselah') {
      // Place R-pentomino and other long-lived patterns
      this.placeRPentomino(Math.floor(this.gridWidth / 2), Math.floor(this.gridHeight / 2));
      this.placeAcorn(Math.floor(this.gridWidth / 3), Math.floor(this.gridHeight / 3));
    } else if (pattern === 'still-life') {
      // Place blocks, beehives, loaves
      for (let i = 0; i < 10; i++) {
        const x = Math.floor(Math.random() * (this.gridWidth - 10)) + 5;
        const y = Math.floor(Math.random() * (this.gridHeight - 10)) + 5;
        const type = Math.floor(Math.random() * 3);
        if (type === 0) this.placeBlock(x, y);
        else if (type === 1) this.placeBeehive(x, y);
        else this.placeLoaf(x, y);
      }
      // Add some random cells
      for (let y = 0; y < this.gridHeight; y++) {
        for (let x = 0; x < this.gridWidth; x++) {
          if (Math.random() < this.config.randomDensity) {
            this.grid[y][x] = true;
          }
        }
      }
    }
  }

  // Pattern placement methods
  private placePattern(x: number, y: number, pattern: number[][]): void {
    for (let dy = 0; dy < pattern.length; dy++) {
      for (let dx = 0; dx < pattern[dy].length; dx++) {
        const gx = x + dx;
        const gy = y + dy;
        if (gx >= 0 && gx < this.gridWidth && gy >= 0 && gy < this.gridHeight) {
          this.grid[gy][gx] = pattern[dy][dx] === 1;
        }
      }
    }
  }

  private placeGlider(x: number, y: number): void {
    this.placePattern(x, y, [
      [0, 1, 0],
      [0, 0, 1],
      [1, 1, 1]
    ]);
  }

  private placeBlinker(x: number, y: number): void {
    this.placePattern(x, y, [
      [1, 1, 1]
    ]);
  }

  private placeToad(x: number, y: number): void {
    this.placePattern(x, y, [
      [0, 1, 1, 1],
      [1, 1, 1, 0]
    ]);
  }

  private placeBeacon(x: number, y: number): void {
    this.placePattern(x, y, [
      [1, 1, 0, 0],
      [1, 1, 0, 0],
      [0, 0, 1, 1],
      [0, 0, 1, 1]
    ]);
  }

  private placePulsar(x: number, y: number): void {
    this.placePattern(x - 6, y - 6, [
      [0,0,1,1,1,0,0,0,1,1,1,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0],
      [1,0,0,0,0,1,0,1,0,0,0,0,1],
      [1,0,0,0,0,1,0,1,0,0,0,0,1],
      [1,0,0,0,0,1,0,1,0,0,0,0,1],
      [0,0,1,1,1,0,0,0,1,1,1,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,1,1,1,0,0,0,1,1,1,0,0],
      [1,0,0,0,0,1,0,1,0,0,0,0,1],
      [1,0,0,0,0,1,0,1,0,0,0,0,1],
      [1,0,0,0,0,1,0,1,0,0,0,0,1],
      [0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,1,1,1,0,0,0,1,1,1,0,0]
    ]);
  }

  private placeRPentomino(x: number, y: number): void {
    this.placePattern(x, y, [
      [0, 1, 1],
      [1, 1, 0],
      [0, 1, 0]
    ]);
  }

  private placeAcorn(x: number, y: number): void {
    this.placePattern(x, y, [
      [0, 1, 0, 0, 0, 0, 0],
      [0, 0, 0, 1, 0, 0, 0],
      [1, 1, 0, 0, 1, 1, 1]
    ]);
  }

  private placeBlock(x: number, y: number): void {
    this.placePattern(x, y, [
      [1, 1],
      [1, 1]
    ]);
  }

  private placeBeehive(x: number, y: number): void {
    this.placePattern(x, y, [
      [0, 1, 1, 0],
      [1, 0, 0, 1],
      [0, 1, 1, 0]
    ]);
  }

  private placeLoaf(x: number, y: number): void {
    this.placePattern(x, y, [
      [0, 1, 1, 0],
      [1, 0, 0, 1],
      [0, 1, 0, 1],
      [0, 0, 1, 0]
    ]);
  }

  private countNeighbors(x: number, y: number): number {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;

        let nx = x + dx;
        let ny = y + dy;

        if (this.config.wrapEdges) {
          nx = (nx + this.gridWidth) % this.gridWidth;
          ny = (ny + this.gridHeight) % this.gridHeight;
        } else {
          if (nx < 0 || nx >= this.gridWidth || ny < 0 || ny >= this.gridHeight) {
            continue;
          }
        }

        if (this.grid[ny][nx]) {
          count++;
        }
      }
    }
    return count;
  }

  private updateGeneration(): void {
    // Conway's Game of Life rules
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const neighbors = this.countNeighbors(x, y);
        const isAlive = this.grid[y][x];

        if (isAlive) {
          // Cell survives if it has 2 or 3 neighbors
          this.nextGrid[y][x] = neighbors === 2 || neighbors === 3;
        } else {
          // Cell becomes alive if it has exactly 3 neighbors
          this.nextGrid[y][x] = neighbors === 3;
        }
      }
    }

    // Swap grids
    [this.grid, this.nextGrid] = [this.nextGrid, this.grid];
    this.generation++;
    this.updatePopulation();
  }

  private updatePopulation(): void {
    this.population = 0;
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        if (this.grid[y][x]) {
          this.population++;
        }
      }
    }
  }

  render(buffer: Cell[][], time: number, size: Size, _mousePos?: Point): void {
    // Initialize grid on first render or size change
    const expectedWidth = Math.floor(size.width / this.config.cellSize);
    const expectedHeight = Math.floor(size.height / this.config.cellSize);
    
    if (this.grid.length === 0 || this.gridWidth !== expectedWidth || this.gridHeight !== expectedHeight) {
      this.initializeGrid(size.width, size.height);
    }

    // Update generation based on speed
    if (time - this.lastUpdateTime >= this.config.updateSpeed) {
      this.updateGeneration();
      this.lastUpdateTime = time;
    }

    // Render grid to buffer
    for (let y = 0; y < size.height; y++) {
      for (let x = 0; x < size.width; x++) {
        const gx = Math.floor(x / this.config.cellSize);
        const gy = Math.floor(y / this.config.cellSize);

        if (gx < this.gridWidth && gy < this.gridHeight) {
          const isAlive = this.grid[gy][gx];
          const char = isAlive ? this.config.aliveChar : this.config.deadChar;
          
          // Color based on cell age/neighbors for visual interest
          let intensity = 0.2;
          if (isAlive) {
            const neighbors = this.countNeighbors(gx, gy);
            intensity = 0.5 + (neighbors / 8) * 0.5; // 0.5 to 1.0 based on neighbors
          }

          buffer[y][x] = {
            char,
            color: this.theme.getColor(intensity)
          };
        }
      }
    }
  }

  onMouseMove(_pos: Point): void {
    // No mouse move interaction for Life
  }

  onMouseClick(pos: Point): void {
    // Toggle cell at click position
    const gx = Math.floor(pos.x / this.config.cellSize);
    const gy = Math.floor(pos.y / this.config.cellSize);

    if (gx >= 0 && gx < this.gridWidth && gy >= 0 && gy < this.gridHeight) {
      this.grid[gy][gx] = !this.grid[gy][gx];
      this.updatePopulation();
    }
  }

  getMetrics(): Record<string, number> {
    const density = this.gridWidth * this.gridHeight > 0 
      ? (this.population / (this.gridWidth * this.gridHeight) * 100)
      : 0;

    return {
      generation: this.generation,
      population: this.population,
      gridWidth: this.gridWidth,
      gridHeight: this.gridHeight,
      cellSize: this.config.cellSize,
      updateSpeed: this.config.updateSpeed,
      wrapEdges: this.config.wrapEdges ? 1 : 0,
      density: Math.round(density * 10) / 10 // Round to 1 decimal
    };
  }
}
