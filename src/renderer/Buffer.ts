import { Cell, Size } from '../types/index.js';

export class Buffer {
  private buffer: Cell[][];
  private prevBuffer: Cell[][];
  private size: Size;

  // Overlay system: separate sparse buffer for persistent overlays
  private overlayBuffer: Map<string, Cell>; // key: "x,y"
  private overlayDirtyRows: Set<number>;

  constructor(size: Size) {
    this.size = size;
    this.buffer = this.createEmptyBuffer(size);
    this.prevBuffer = this.createEmptyBuffer(size);
    this.overlayBuffer = new Map();
    this.overlayDirtyRows = new Set();
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
    this.overlayBuffer.clear();
    this.overlayDirtyRows.clear();
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

    // Track which rows need to be checked (animation changes + overlay dirty rows)
    const rowsToCheck = new Set<number>();

    // First pass: detect animation buffer changes
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
          rowsToCheck.add(y);
        }
      }
    }

    // Add overlay dirty rows to rows to check
    this.overlayDirtyRows.forEach(row => rowsToCheck.add(row));

    // Second pass: generate changes with overlay compositing
    for (const y of rowsToCheck) {
      for (let x = 0; x < this.size.width; x++) {
        const animCell = this.buffer[y][x];
        const key = `${x},${y}`;
        const overlayCell = this.overlayBuffer.get(key);

        // If overlay exists at this position, use it; otherwise use animation cell
        const finalCell = overlayCell || animCell;

        // Check if this differs from previous buffer
        const prev = this.prevBuffer[y][x];
        const finalR = finalCell.color?.r ?? 0;
        const finalG = finalCell.color?.g ?? 0;
        const finalB = finalCell.color?.b ?? 0;
        const prevR = prev.color?.r ?? 0;
        const prevG = prev.color?.g ?? 0;
        const prevB = prev.color?.b ?? 0;

        if (finalCell.char !== prev.char ||
            finalR !== prevR ||
            finalG !== prevG ||
            finalB !== prevB) {
          changes.push({ x, y, cell: finalCell });
        }
      }
    }

    // Clear overlay dirty rows after processing
    this.overlayDirtyRows.clear();

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

  // Overlay management methods

  /**
   * Set an overlay cell at the specified position.
   * Overlays persist across frames until explicitly cleared.
   */
  setOverlay(x: number, y: number, cell: Cell): void {
    if (x >= 0 && x < this.size.width && y >= 0 && y < this.size.height) {
      const key = `${x},${y}`;
      this.overlayBuffer.set(key, cell);
      this.overlayDirtyRows.add(y);
    }
  }

  /**
   * Set overlay text at the specified position with optional color.
   */
  setOverlayText(x: number, y: number, text: string, color?: { r: number; g: number; b: number }): void {
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const cell: Cell = { char, color };
      this.setOverlay(x + i, y, cell);
    }
  }

  /**
   * Clear overlay at a specific position.
   */
  clearOverlayCell(x: number, y: number): void {
    const key = `${x},${y}`;
    if (this.overlayBuffer.has(key)) {
      this.overlayBuffer.delete(key);
      this.overlayDirtyRows.add(y);
    }
  }

  /**
   * Clear all overlays in a specific row.
   */
  clearOverlayRow(y: number): void {
    if (y < 0 || y >= this.size.height) return;

    let hasOverlays = false;
    for (let x = 0; x < this.size.width; x++) {
      const key = `${x},${y}`;
      if (this.overlayBuffer.has(key)) {
        this.overlayBuffer.delete(key);
        hasOverlays = true;
      }
    }

    if (hasOverlays) {
      this.overlayDirtyRows.add(y);
    }
  }

  /**
   * Clear all overlays.
   */
  clearAllOverlays(): void {
    // Mark all overlay rows as dirty before clearing
    this.overlayBuffer.forEach((_, key) => {
      const y = parseInt(key.split(',')[1]);
      this.overlayDirtyRows.add(y);
    });
    this.overlayBuffer.clear();
  }
}
