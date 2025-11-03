import { Cell, Size } from '../types';

export class Buffer {
  private buffer: Cell[][];
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
    if (x >= 0 && x < this.size.width && y >= 0 && y < this.size.height) {
      this.buffer[y][x] = cell;
    }
  }

  getCell(x: number, y: number): Cell | undefined {
    if (x >= 0 && x < this.size.width && y >= 0 && y < this.size.height) {
      return this.buffer[y][x];
    }
    return undefined;
  }

  getBuffer(): Cell[][] {
    return this.buffer;
  }

  getChanges(): { x: number; y: number; cell: Cell }[] {
    const changes: { x: number; y: number; cell: Cell }[] = [];
    
    for (let y = 0; y < this.size.height; y++) {
      for (let x = 0; x < this.size.width; x++) {
        const curr = this.buffer[y][x];
        const prev = this.prevBuffer[y][x];

        const currR = curr.color?.r ?? 0;
        const currG = curr.color?.g ?? 0;
        const currB = curr.color?.b ?? 0;
        const prevR = prev.color?.r ?? 0;
        const prevG = prev.color?.g ?? 0;
        const prevB = prev.color?.b ?? 0;
        
        if (curr.char !== prev.char || 
            currR !== prevR ||
            currG !== prevG ||
            currB !== prevB) {
          changes.push({ x, y, cell: curr });
        }
      }
    }
    
    return changes;
  }

  swap(): void {
    // Copy current buffer to previous buffer
    for (let y = 0; y < this.size.height; y++) {
      for (let x = 0; x < this.size.width; x++) {
        this.prevBuffer[y][x] = { ...this.buffer[y][x] };
      }
    }
  }

  getSize(): Size {
    return this.size;
  }
}
