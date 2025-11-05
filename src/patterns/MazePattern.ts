import { Pattern, Cell, Size, Point, Theme } from '../types/index.js';

interface MazeConfig {
  algorithm: 'dfs' | 'prim' | 'recursive-division' | 'kruskal' | 'eller' | 'wilson';
  cellSize: number;
  generationSpeed: number;
  wallChar: string;
  pathChar: string;
  animateGeneration: boolean;
}

interface MazePreset {
  id: number;
  name: string;
  description: string;
  config: MazeConfig;
}

interface MazeCell {
  x: number;
  y: number;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  visited: boolean;
  inMaze: boolean;
  visitOrder: number;
}

export class MazePattern implements Pattern {
  name = 'maze';
  private config: MazeConfig;
  private theme: Theme;
  private maze: MazeCell[][] = [];
  private generationProgress = 0;
  private generationComplete = false;
  private lastGenerationTime = 0;
  private currentCell?: Point;
  private stack: Point[] = [];
  private frontierCells: Point[] = [];
  private sets: Map<string, number> = new Map();
  private setCounter = 0;
  private wilsonPath: Point[] = [];
  private solutionPath: Point[] = []; // Path from start to end
  private gridWidth = 0;
  private gridHeight = 0;

  // Tier 1 Presets (01-06): Different maze generation algorithms
  private static readonly PRESETS: MazePreset[] = [
    {
      id: 1,
      name: 'DFS Classic',
      description: 'Depth-First Search - Long winding passages',
      config: { 
        algorithm: 'dfs', 
        cellSize: 3, 
        generationSpeed: 10,
        wallChar: '█',
        pathChar: ' ',
        animateGeneration: true
      }
    },
    {
      id: 2,
      name: "Prim's Algorithm",
      description: 'Random maze with shorter paths',
      config: { 
        algorithm: 'prim', 
        cellSize: 3, 
        generationSpeed: 15,
        wallChar: '▓',
        pathChar: '·',
        animateGeneration: true
      }
    },
    {
      id: 3,
      name: 'Recursive Division',
      description: 'Room-based maze with walls dividing space',
      config: { 
        algorithm: 'recursive-division', 
        cellSize: 2, 
        generationSpeed: 5,
        wallChar: '║',
        pathChar: ' ',
        animateGeneration: true
      }
    },
    {
      id: 4,
      name: "Kruskal's Algorithm",
      description: 'Uniform complexity, tree-based generation',
      config: { 
        algorithm: 'kruskal', 
        cellSize: 3, 
        generationSpeed: 12,
        wallChar: '▒',
        pathChar: ' ',
        animateGeneration: true
      }
    },
    {
      id: 5,
      name: "Eller's Algorithm",
      description: 'Row-by-row generation, memory efficient',
      config: { 
        algorithm: 'eller', 
        cellSize: 3, 
        generationSpeed: 8,
        wallChar: '░',
        pathChar: ' ',
        animateGeneration: true
      }
    },
    {
      id: 6,
      name: "Wilson's Algorithm",
      description: 'Loop-erased random walk, uniform spanning tree',
      config: { 
        algorithm: 'wilson', 
        cellSize: 3, 
        generationSpeed: 20,
        wallChar: '█',
        pathChar: '·',
        animateGeneration: true
      }
    }
  ];

  constructor(theme: Theme, config?: Partial<MazeConfig>) {
    this.theme = theme;
    this.config = {
      algorithm: 'dfs',
      cellSize: 3,
      generationSpeed: 10,
      wallChar: '█',
      pathChar: ' ',
      animateGeneration: true,
      ...config
    };
  }

  applyPreset(presetId: number): boolean {
    const preset = MazePattern.PRESETS.find(p => p.id === presetId);
    if (!preset) {
      return false;
    }
    
    this.config = { ...preset.config };
    this.reset();
    return true;
  }

  static getPresets(): MazePreset[] {
    return [...MazePattern.PRESETS];
  }

  static getPreset(id: number): MazePreset | undefined {
    return MazePattern.PRESETS.find(p => p.id === id);
  }

  reset(): void {
    this.maze = [];
    this.generationProgress = 0;
    this.generationComplete = false;
    this.lastGenerationTime = 0;
    this.currentCell = undefined;
    this.stack = [];
    this.frontierCells = [];
    this.sets.clear();
    this.setCounter = 0;
    this.wilsonPath = [];
    this.solutionPath = [];
  }

  private initializeMaze(width: number, height: number): void {
    this.gridWidth = Math.floor(width / this.config.cellSize);
    this.gridHeight = Math.floor(height / this.config.cellSize);

    // Initialize grid
    this.maze = [];
    for (let y = 0; y < this.gridHeight; y++) {
      this.maze[y] = [];
      for (let x = 0; x < this.gridWidth; x++) {
        this.maze[y][x] = {
          x,
          y,
          walls: { top: true, right: true, bottom: true, left: true },
          visited: false,
          inMaze: false,
          visitOrder: -1
        };
      }
    }

    // Algorithm-specific initialization
    switch (this.config.algorithm) {
      case 'dfs':
        this.initializeDFS();
        break;
      case 'prim':
        this.initializePrim();
        break;
      case 'recursive-division':
        this.initializeRecursiveDivision();
        break;
      case 'kruskal':
        this.initializeKruskal();
        break;
      case 'eller':
        this.initializeEller();
        break;
      case 'wilson':
        this.initializeWilson();
        break;
    }
  }

  // DFS (Recursive Backtracking)
  private initializeDFS(): void {
    const startX = Math.floor(Math.random() * this.gridWidth);
    const startY = Math.floor(Math.random() * this.gridHeight);
    this.currentCell = { x: startX, y: startY };
    this.maze[startY][startX].visited = true;
    this.stack = [{ x: startX, y: startY }];
  }

  private stepDFS(): boolean {
    if (!this.currentCell || this.stack.length === 0) {
      return false; // Generation complete
    }

    const { x, y } = this.currentCell;
    const neighbors = this.getUnvisitedNeighbors(x, y);

    if (neighbors.length > 0) {
      // Choose random neighbor
      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      
      // Remove wall between current and next
      this.removeWall(x, y, next.x, next.y);
      
      // Mark as visited
      this.maze[next.y][next.x].visited = true;
      this.maze[next.y][next.x].visitOrder = this.generationProgress++;
      
      // Push to stack and move
      this.stack.push(next);
      this.currentCell = next;
    } else {
      // Backtrack
      this.stack.pop();
      this.currentCell = this.stack.length > 0 ? this.stack[this.stack.length - 1] : undefined;
    }

    return this.stack.length > 0;
  }

  // Prim's Algorithm
  private initializePrim(): void {
    const startX = Math.floor(Math.random() * this.gridWidth);
    const startY = Math.floor(Math.random() * this.gridHeight);
    this.maze[startY][startX].inMaze = true;
    
    // Add neighbors to frontier
    this.addNeighborsToFrontier(startX, startY);
  }

  private stepPrim(): boolean {
    if (this.frontierCells.length === 0) {
      return false;
    }

    // Pick random frontier cell
    const randomIndex = Math.floor(Math.random() * this.frontierCells.length);
    const cell = this.frontierCells[randomIndex];
    this.frontierCells.splice(randomIndex, 1);

    // Find neighbors in maze
    const inMazeNeighbors = this.getInMazeNeighbors(cell.x, cell.y);
    
    if (inMazeNeighbors.length > 0) {
      // Pick random neighbor to connect to
      const neighbor = inMazeNeighbors[Math.floor(Math.random() * inMazeNeighbors.length)];
      
      // Remove wall
      this.removeWall(cell.x, cell.y, neighbor.x, neighbor.y);
      
      // Add to maze
      this.maze[cell.y][cell.x].inMaze = true;
      this.maze[cell.y][cell.x].visitOrder = this.generationProgress++;
      
      // Add new frontier cells
      this.addNeighborsToFrontier(cell.x, cell.y);
    }

    return this.frontierCells.length > 0;
  }

  // Recursive Division
  private initializeRecursiveDivision(): void {
    // Start with no walls
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        this.maze[y][x].walls = { top: false, right: false, bottom: false, left: false };
        this.maze[y][x].inMaze = true;
      }
    }
    
    // Add border walls
    for (let x = 0; x < this.gridWidth; x++) {
      this.maze[0][x].walls.top = true;
      this.maze[this.gridHeight - 1][x].walls.bottom = true;
    }
    for (let y = 0; y < this.gridHeight; y++) {
      this.maze[y][0].walls.left = true;
      this.maze[y][this.gridWidth - 1].walls.right = true;
    }
    
    this.generationComplete = true; // Instant generation for simplicity
  }

  // Kruskal's Algorithm (Union-Find)
  private initializeKruskal(): void {
    // Each cell starts in its own set
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const key = `${x},${y}`;
        this.sets.set(key, this.setCounter++);
      }
    }
  }

  private stepKruskal(): boolean {
    // Try to merge random adjacent cells
    const x = Math.floor(Math.random() * this.gridWidth);
    const y = Math.floor(Math.random() * this.gridHeight);
    
    const directions = [
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 }
    ];
    
    const dir = directions[Math.floor(Math.random() * directions.length)];
    const nx = x + dir.dx;
    const ny = y + dir.dy;
    
    if (nx < this.gridWidth && ny < this.gridHeight) {
      const set1 = this.sets.get(`${x},${y}`);
      const set2 = this.sets.get(`${nx},${ny}`);
      
      if (set1 !== set2) {
        // Merge sets
        this.removeWall(x, y, nx, ny);
        this.maze[y][x].visitOrder = this.generationProgress++;
        
        // Union operation
        for (const [key, value] of this.sets.entries()) {
          if (value === set2) {
            this.sets.set(key, set1!);
          }
        }
      }
    }
    
    // Check if all cells are in one set
    const uniqueSets = new Set(this.sets.values());
    return uniqueSets.size > 1;
  }

  // Eller's Algorithm
  private initializeEller(): void {
    // Start with first row in separate sets
    for (let x = 0; x < this.gridWidth; x++) {
      this.sets.set(`${x},0`, x);
    }
  }

  private stepEller(): boolean {
    // Simplified Eller's - process row by row
    const y = Math.floor(this.generationProgress / this.gridWidth);
    
    if (y >= this.gridHeight - 1) {
      return false;
    }
    
    const x = this.generationProgress % this.gridWidth;
    
    // Randomly connect horizontal cells in same row
    if (x < this.gridWidth - 1 && Math.random() > 0.5) {
      const set1 = this.sets.get(`${x},${y}`);
      const set2 = this.sets.get(`${x + 1},${y}`);
      
      if (set1 !== set2) {
        this.removeWall(x, y, x + 1, y);
        
        // Merge sets
        for (const [key, value] of this.sets.entries()) {
          if (value === set2) {
            this.sets.set(key, set1!);
          }
        }
      }
    }
    
    this.generationProgress++;
    return true;
  }

  // Wilson's Algorithm
  private initializeWilson(): void {
    // Pick random starting cell
    const startX = Math.floor(Math.random() * this.gridWidth);
    const startY = Math.floor(Math.random() * this.gridHeight);
    this.maze[startY][startX].inMaze = true;
  }

  private stepWilson(): boolean {
    if (this.wilsonPath.length === 0) {
      // Start new random walk from unvisited cell
      const unvisited = this.getUnvisitedCellsForWilson();
      if (unvisited.length === 0) {
        return false; // All cells visited
      }
      
      const start = unvisited[Math.floor(Math.random() * unvisited.length)];
      this.wilsonPath = [start];
    }
    
    // Continue random walk
    const current = this.wilsonPath[this.wilsonPath.length - 1];
    const neighbors = this.getAllNeighbors(current.x, current.y);
    
    if (neighbors.length === 0) {
      this.wilsonPath = [];
      return true;
    }
    
    const next = neighbors[Math.floor(Math.random() * neighbors.length)];
    
    // Check if we hit the maze
    if (this.maze[next.y][next.x].inMaze) {
      // Carve path
      for (let i = 0; i < this.wilsonPath.length; i++) {
        const cell = this.wilsonPath[i];
        this.maze[cell.y][cell.x].inMaze = true;
        this.maze[cell.y][cell.x].visitOrder = this.generationProgress++;
        
        if (i < this.wilsonPath.length - 1) {
          const nextCell = this.wilsonPath[i + 1];
          this.removeWall(cell.x, cell.y, nextCell.x, nextCell.y);
        }
      }
      
      // Connect last segment
      this.removeWall(current.x, current.y, next.x, next.y);
      
      this.wilsonPath = [];
    } else {
      // Check for loop erasure
      const loopIndex = this.wilsonPath.findIndex(p => p.x === next.x && p.y === next.y);
      if (loopIndex !== -1) {
        // Erase loop
        this.wilsonPath = this.wilsonPath.slice(0, loopIndex + 1);
      } else {
        this.wilsonPath.push(next);
      }
    }
    
    return true;
  }

  // Helper methods
  private getUnvisitedNeighbors(x: number, y: number): Point[] {
    const neighbors: Point[] = [];
    const directions = [
      { dx: 0, dy: -1 }, // top
      { dx: 1, dy: 0 },  // right
      { dx: 0, dy: 1 },  // bottom
      { dx: -1, dy: 0 }  // left
    ];

    for (const dir of directions) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      
      if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight) {
        if (!this.maze[ny][nx].visited) {
          neighbors.push({ x: nx, y: ny });
        }
      }
    }

    return neighbors;
  }

  private getAllNeighbors(x: number, y: number): Point[] {
    const neighbors: Point[] = [];
    const directions = [
      { dx: 0, dy: -1 }, // top
      { dx: 1, dy: 0 },  // right
      { dx: 0, dy: 1 },  // bottom
      { dx: -1, dy: 0 }  // left
    ];

    for (const dir of directions) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      
      if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight) {
        neighbors.push({ x: nx, y: ny });
      }
    }

    return neighbors;
  }

  private getInMazeNeighbors(x: number, y: number): Point[] {
    const neighbors: Point[] = [];
    const directions = [
      { dx: 0, dy: -1 }, // top
      { dx: 1, dy: 0 },  // right
      { dx: 0, dy: 1 },  // bottom
      { dx: -1, dy: 0 }  // left
    ];

    for (const dir of directions) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      
      if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight) {
        if (this.maze[ny][nx].inMaze) {
          neighbors.push({ x: nx, y: ny });
        }
      }
    }

    return neighbors;
  }

  private addNeighborsToFrontier(x: number, y: number): void {
    const directions = [
      { dx: 0, dy: -1 }, // top
      { dx: 1, dy: 0 },  // right
      { dx: 0, dy: 1 },  // bottom
      { dx: -1, dy: 0 }  // left
    ];

    for (const dir of directions) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      
      if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight) {
        if (!this.maze[ny][nx].inMaze) {
          const exists = this.frontierCells.some(p => p.x === nx && p.y === ny);
          if (!exists) {
            this.frontierCells.push({ x: nx, y: ny });
          }
        }
      }
    }
  }

  private getUnvisitedCellsForWilson(): Point[] {
    const unvisited: Point[] = [];
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        if (!this.maze[y][x].inMaze) {
          unvisited.push({ x, y });
        }
      }
    }
    return unvisited;
  }

  private removeWall(x1: number, y1: number, x2: number, y2: number): void {
    const dx = x2 - x1;
    const dy = y2 - y1;

    if (dx === 1) {
      this.maze[y1][x1].walls.right = false;
      this.maze[y2][x2].walls.left = false;
    } else if (dx === -1) {
      this.maze[y1][x1].walls.left = false;
      this.maze[y2][x2].walls.right = false;
    } else if (dy === 1) {
      this.maze[y1][x1].walls.bottom = false;
      this.maze[y2][x2].walls.top = false;
    } else if (dy === -1) {
      this.maze[y1][x1].walls.top = false;
      this.maze[y2][x2].walls.bottom = false;
    }
  }
  
  private findSolutionPath(): void {
    // BFS to find path from top-left to bottom-right
    const start = { x: 0, y: 0 };
    const end = { x: this.gridWidth - 1, y: this.gridHeight - 1 };
    
    const queue: Point[] = [start];
    const visited = new Set<string>();
    const parent = new Map<string, Point>();
    visited.add(`${start.x},${start.y}`);
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (current.x === end.x && current.y === end.y) {
        // Reconstruct path
        this.solutionPath = [];
        let cell: Point | undefined = end;
        
        while (cell) {
          this.solutionPath.unshift(cell);
          const key = `${cell.x},${cell.y}`;
          cell = parent.get(key);
        }
        return;
      }
      
      // Check all valid neighbors (no wall between)
      const cell = this.maze[current.y][current.x];
      const neighbors: Point[] = [];
      
      if (!cell.walls.top && current.y > 0) {
        neighbors.push({ x: current.x, y: current.y - 1 });
      }
      if (!cell.walls.right && current.x < this.gridWidth - 1) {
        neighbors.push({ x: current.x + 1, y: current.y });
      }
      if (!cell.walls.bottom && current.y < this.gridHeight - 1) {
        neighbors.push({ x: current.x, y: current.y + 1 });
      }
      if (!cell.walls.left && current.x > 0) {
        neighbors.push({ x: current.x - 1, y: current.y });
      }
      
      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(key)) {
          visited.add(key);
          parent.set(key, current);
          queue.push(neighbor);
        }
      }
    }
    
    // No path found
    this.solutionPath = [];
  }

  render(buffer: Cell[][], time: number, size: Size): void {
    // Initialize maze if needed
    if (this.maze.length === 0) {
      this.initializeMaze(size.width, size.height);
      this.lastGenerationTime = time;
    }

    // Regenerate maze if size changed significantly
    const expectedWidth = Math.floor(size.width / this.config.cellSize);
    const expectedHeight = Math.floor(size.height / this.config.cellSize);
    if (expectedWidth !== this.gridWidth || expectedHeight !== this.gridHeight) {
      this.reset();
      this.initializeMaze(size.width, size.height);
      this.lastGenerationTime = time;
    }

    // Step generation if animated
    if (this.config.animateGeneration && !this.generationComplete) {
      const elapsed = time - this.lastGenerationTime;
      const steps = Math.floor(elapsed / (1000 / this.config.generationSpeed));
      
      for (let i = 0; i < steps && !this.generationComplete; i++) {
        let continueGeneration = false;
        
        switch (this.config.algorithm) {
          case 'dfs':
            continueGeneration = this.stepDFS();
            break;
          case 'prim':
            continueGeneration = this.stepPrim();
            break;
          case 'kruskal':
            continueGeneration = this.stepKruskal();
            break;
          case 'eller':
            continueGeneration = this.stepEller();
            break;
          case 'wilson':
            continueGeneration = this.stepWilson();
            break;
        }
        
        if (!continueGeneration) {
          this.generationComplete = true;
          this.findSolutionPath(); // Find solution when generation completes
        }
      }
      
      this.lastGenerationTime = time;
    }

    // Render maze
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const cell = this.maze[y][x];
        const baseX = x * this.config.cellSize;
        const baseY = y * this.config.cellSize;

        // Determine color based on visit order
        let intensity = 0.5;
        if (cell.visitOrder >= 0) {
          const progress = cell.visitOrder / this.generationProgress;
          intensity = 0.3 + progress * 0.5;
        }
        const color = this.theme.getColor(intensity);

        // Draw cell walls
        for (let cy = 0; cy < this.config.cellSize; cy++) {
          for (let cx = 0; cx < this.config.cellSize; cx++) {
            const screenX = baseX + cx;
            const screenY = baseY + cy;

            if (screenX >= size.width || screenY >= size.height) continue;

            let isWall = false;

            // Check if this position is a wall
            if (cy === 0 && cell.walls.top) isWall = true;
            if (cx === this.config.cellSize - 1 && cell.walls.right) isWall = true;
            if (cy === this.config.cellSize - 1 && cell.walls.bottom) isWall = true;
            if (cx === 0 && cell.walls.left) isWall = true;

            buffer[screenY][screenX] = {
              char: isWall ? this.config.wallChar : this.config.pathChar,
              color: isWall ? color : undefined
            };
          }
        }

        // Highlight current cell being processed
        if (this.currentCell && this.currentCell.x === x && this.currentCell.y === y) {
          const centerX = baseX + Math.floor(this.config.cellSize / 2);
          const centerY = baseY + Math.floor(this.config.cellSize / 2);
          
          if (centerX < size.width && centerY < size.height) {
            buffer[centerY][centerX] = {
              char: '●',
              color: this.theme.getColor(1.0)
            };
          }
        }

        // Highlight Wilson's path
        for (const pathCell of this.wilsonPath) {
          if (pathCell.x === x && pathCell.y === y) {
            const centerX = baseX + Math.floor(this.config.cellSize / 2);
            const centerY = baseY + Math.floor(this.config.cellSize / 2);
            
            if (centerX < size.width && centerY < size.height) {
              buffer[centerY][centerX] = {
                char: '○',
                color: this.theme.getColor(0.8)
              };
            }
          }
        }
        
        // Highlight solution path (only when generation complete)
        if (this.generationComplete) {
          for (const pathCell of this.solutionPath) {
            if (pathCell.x === x && pathCell.y === y) {
              const centerX = baseX + Math.floor(this.config.cellSize / 2);
              const centerY = baseY + Math.floor(this.config.cellSize / 2);
              
              if (centerX < size.width && centerY < size.height) {
                buffer[centerY][centerX] = {
                  char: '·',
                  color: this.theme.getColor(0.9) // Bright highlight for solution
                };
              }
            }
          }
        }
      }
    }
  }

  onMouseMove(): void {
    // Mouse move could show preview of generating from that point
  }

  onMouseClick(pos: Point): void {
    // Regenerate maze from clicked position
    const cellX = Math.floor(pos.x / this.config.cellSize);
    const cellY = Math.floor(pos.y / this.config.cellSize);

    if (cellX >= 0 && cellX < this.gridWidth && cellY >= 0 && cellY < this.gridHeight) {
      this.reset();
      this.initializeMaze(this.gridWidth * this.config.cellSize, this.gridHeight * this.config.cellSize);
      
      // Start generation from clicked cell
      if (this.config.algorithm === 'dfs') {
        this.currentCell = { x: cellX, y: cellY };
        this.maze[cellY][cellX].visited = true;
        this.stack = [{ x: cellX, y: cellY }];
      } else if (this.config.algorithm === 'prim') {
        this.maze[cellY][cellX].inMaze = true;
        this.addNeighborsToFrontier(cellX, cellY);
      } else if (this.config.algorithm === 'wilson') {
        this.maze[cellY][cellX].inMaze = true;
      }
    }
  }

  getMetrics(): Record<string, number> {
    return {
      gridWidth: this.gridWidth,
      gridHeight: this.gridHeight,
      totalCells: this.gridWidth * this.gridHeight,
      generationProgress: this.generationProgress,
      generationComplete: this.generationComplete ? 1 : 0,
      stackSize: this.stack.length,
      frontierSize: this.frontierCells.length
    };
  }
}
