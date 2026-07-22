import { Cell, Color, Size } from '../types/index.js';

export interface CellChange {
  x: number;
  y: number;
  cell: Cell;
}

function colorsEqual(a: Color | undefined, b: Color | undefined): boolean {
  if (a === undefined || b === undefined) return a === b;
  return a.r === b.r && a.g === b.g && a.b === b.b;
}

/** Exact terminal-cell equality, including defined/default color identity. */
export function cellsEqual(a: Cell, b: Cell): boolean {
  return a.char === b.char && colorsEqual(a.color, b.color) && colorsEqual(a.bg, b.bg);
}

function cloneCell(cell: Cell): Cell {
  const clone: Cell = { char: cell.char };
  if (cell.color !== undefined) clone.color = { ...cell.color };
  if (cell.bg !== undefined) clone.bg = { ...cell.bg };
  return clone;
}

export class Buffer {
  private buffer: Cell[][];
  /** Last frame sent to the terminal. */
  private prevBuffer: Cell[][];
  private size: Size;

  constructor(size: Size) {
    this.size = size;
    this.buffer = this.createEmptyBuffer(size);
    this.prevBuffer = this.createEmptyBuffer(size);
  }

  private createEmptyBuffer(size: Size): Cell[][] {
    const buffer: Cell[][] = [];
    for (let y = 0; y < size.height; y++) {
      buffer[y] = [];
      for (let x = 0; x < size.width; x++) {
        buffer[y][x] = { char: ' ' };
      }
    }
    return buffer;
  }

  resize(size: Size): void {
    this.size = size;
    this.buffer = this.createEmptyBuffer(size);
    this.prevBuffer = this.createEmptyBuffer(size);
  }

  clear(): void {
    for (let y = 0; y < this.size.height; y++) {
      for (let x = 0; x < this.size.width; x++) {
        this.buffer[y][x] = { char: ' ' };
      }
    }
  }

  setCell(x: number, y: number, cell: Cell): void {
    if (this.inBounds(x, y)) this.buffer[y][x] = cloneCell(cell);
  }

  getCell(x: number, y: number): Cell | undefined {
    return this.inBounds(x, y) ? cloneCell(this.buffer[y][x]) : undefined;
  }

  /** Mutable base-frame canvas used by Pattern and UI renderers. */
  getBuffer(): Cell[][] {
    return this.buffer;
  }

  /** Compare the current frame against the last terminal frame. */
  getChanges(): CellChange[] {
    const changes: CellChange[] = [];
    for (let y = 0; y < this.size.height; y++) {
      for (let x = 0; x < this.size.width; x++) {
        const cell = this.buffer[y][x];
        if (!cellsEqual(cell, this.prevBuffer[y][x])) {
          changes.push({ x, y, cell: cloneCell(cell) });
        }
      }
    }
    return changes;
  }

  /** Snapshot the current frame as the terminal comparison baseline. */
  swap(): void {
    for (let y = 0; y < this.size.height; y++) {
      for (let x = 0; x < this.size.width; x++) {
        this.prevBuffer[y][x] = cloneCell(this.buffer[y][x]);
      }
    }
  }

  getSize(): Size {
    return this.size;
  }

  private inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.size.width && y >= 0 && y < this.size.height;
  }
}
