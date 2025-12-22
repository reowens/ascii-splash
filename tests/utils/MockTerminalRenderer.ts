/**
 * MockTerminalRenderer - Test utility for capturing render output
 *
 * Simulates TerminalRenderer without actual terminal I/O, allowing
 * integration tests to verify rendering behavior.
 */

import { Cell, Size, Point } from '../../src/types/index.js';

export interface RenderCapture {
  buffer: Cell[][];
  timestamp: number;
  frameNumber: number;
}

export interface MockTerminalRendererOptions {
  width?: number;
  height?: number;
  captureHistory?: boolean;
  maxHistorySize?: number;
}

export class MockTerminalRenderer {
  private width: number;
  private height: number;
  private buffer: Cell[][];
  private mousePos: Point | null = null;
  private captureHistory: boolean;
  private maxHistorySize: number;
  private history: RenderCapture[] = [];
  private frameCount = 0;
  private renderCallCount = 0;
  private lastRenderTime = 0;

  constructor(options: MockTerminalRendererOptions = {}) {
    this.width = options.width ?? 80;
    this.height = options.height ?? 24;
    this.captureHistory = options.captureHistory ?? false;
    this.maxHistorySize = options.maxHistorySize ?? 100;
    this.buffer = this.createEmptyBuffer();
  }

  private createEmptyBuffer(): Cell[][] {
    const buffer: Cell[][] = [];
    for (let y = 0; y < this.height; y++) {
      buffer[y] = [];
      for (let x = 0; x < this.width; x++) {
        buffer[y][x] = { char: ' ', color: { r: 0, g: 0, b: 0 } };
      }
    }
    return buffer;
  }

  /**
   * Get the current buffer for pattern rendering
   */
  getBuffer(): Cell[][] {
    return this.buffer;
  }

  /**
   * Get the terminal size
   */
  getSize(): Size {
    return { width: this.width, height: this.height };
  }

  /**
   * Get the current mouse position
   */
  getMousePos(): Point | null {
    return this.mousePos;
  }

  /**
   * Simulate mouse movement
   */
  setMousePos(pos: Point | null): void {
    this.mousePos = pos;
  }

  /**
   * Simulate terminal resize
   */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.buffer = this.createEmptyBuffer();
  }

  /**
   * Called after pattern renders to buffer (simulates terminal output)
   */
  render(): void {
    this.renderCallCount++;
    this.frameCount++;
    this.lastRenderTime = Date.now();

    if (this.captureHistory) {
      this.captureFrame();
    }
  }

  /**
   * Capture current frame to history
   */
  private captureFrame(): void {
    // Deep copy the buffer
    const bufferCopy: Cell[][] = this.buffer.map(row =>
      row.map(cell => ({
        char: cell.char,
        color: cell.color ? { ...cell.color } : undefined,
      }))
    );

    this.history.push({
      buffer: bufferCopy,
      timestamp: this.lastRenderTime,
      frameNumber: this.frameCount,
    });

    // Trim history if needed
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Get render call count
   */
  getRenderCallCount(): number {
    return this.renderCallCount;
  }

  /**
   * Get frame count
   */
  getFrameCount(): number {
    return this.frameCount;
  }

  /**
   * Get capture history
   */
  getHistory(): RenderCapture[] {
    return [...this.history];
  }

  /**
   * Get the last captured frame
   */
  getLastCapture(): RenderCapture | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.buffer = this.createEmptyBuffer();
    this.mousePos = null;
    this.history = [];
    this.frameCount = 0;
    this.renderCallCount = 0;
    this.lastRenderTime = 0;
  }

  /**
   * Count non-empty cells in current buffer
   */
  countNonEmptyCells(): number {
    let count = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.buffer[y][x].char !== ' ') {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Count cells with specific character
   */
  countCellsWithChar(char: string): number {
    let count = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.buffer[y][x].char === char) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Check if buffer contains a specific character
   */
  bufferContains(char: string): boolean {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.buffer[y][x].char === char) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if buffer contains any of the specified characters
   */
  bufferContainsAny(chars: string[]): boolean {
    for (const char of chars) {
      if (this.bufferContains(char)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get buffer as string (for debugging/snapshots)
   */
  bufferToString(): string {
    return this.buffer.map(row => row.map(cell => cell.char).join('')).join('\n');
  }

  /**
   * Get buffer with colors as ANSI (for visual debugging)
   */
  bufferToAnsi(): string {
    const lines: string[] = [];
    for (let y = 0; y < this.height; y++) {
      let line = '';
      for (let x = 0; x < this.width; x++) {
        const cell = this.buffer[y][x];
        if (cell.color) {
          line += `\x1b[38;2;${cell.color.r};${cell.color.g};${cell.color.b}m${cell.char}\x1b[0m`;
        } else {
          line += cell.char;
        }
      }
      lines.push(line);
    }
    return lines.join('\n');
  }

  /**
   * Compare two buffers for equality
   */
  static buffersEqual(a: Cell[][], b: Cell[][]): boolean {
    if (a.length !== b.length) return false;
    for (let y = 0; y < a.length; y++) {
      if (a[y].length !== b[y].length) return false;
      for (let x = 0; x < a[y].length; x++) {
        if (a[y][x].char !== b[y][x].char) return false;
        const colorA = a[y][x].color;
        const colorB = b[y][x].color;
        if (colorA && colorB) {
          if (colorA.r !== colorB.r || colorA.g !== colorB.g || colorA.b !== colorB.b) {
            return false;
          }
        } else if (colorA !== colorB) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Calculate difference ratio between two buffers (0 = identical, 1 = completely different)
   */
  static bufferDifference(a: Cell[][], b: Cell[][]): number {
    if (a.length !== b.length) return 1;

    let totalCells = 0;
    let differentCells = 0;

    for (let y = 0; y < a.length; y++) {
      if (a[y].length !== b[y].length) return 1;
      for (let x = 0; x < a[y].length; x++) {
        totalCells++;
        if (a[y][x].char !== b[y][x].char) {
          differentCells++;
        }
      }
    }

    return totalCells > 0 ? differentCells / totalCells : 0;
  }

  /**
   * Simulate terminal cleanup (no-op for mock)
   */
  cleanup(): void {
    // No-op - mock doesn't need cleanup
  }

  /**
   * Simulate terminal initialization (no-op for mock)
   */
  init(): void {
    // No-op - mock doesn't need initialization
  }
}
