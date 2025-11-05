/**
 * Mock utilities for testing ascii-splash components
 */

import { Cell, Color, Size, Theme, Point, CliOptions } from '../../src/types/index.js';

/**
 * Creates a mock buffer (2D array of cells)
 */
export function createMockBuffer(width: number, height: number): Cell[][] {
  const buffer: Cell[][] = [];
  for (let y = 0; y < height; y++) {
    buffer[y] = [];
    for (let x = 0; x < width; x++) {
      buffer[y][x] = { char: ' ' };
    }
  }
  return buffer;
}

/**
 * Creates a mock theme for testing
 */
export function createMockTheme(name: string = 'test'): Theme {
  const colors: Color[] = [
    { r: 0, g: 0, b: 0 },
    { r: 255, g: 255, b: 255 }
  ];
  
  return {
    name,
    displayName: name.charAt(0).toUpperCase() + name.slice(1),
    colors,
    getColor: (intensity: number): Color => {
      // Simple linear interpolation
      const clamped = Math.max(0, Math.min(1, intensity));
      return {
        r: Math.round(colors[0].r + (colors[1].r - colors[0].r) * clamped),
        g: Math.round(colors[0].g + (colors[1].g - colors[0].g) * clamped),
        b: Math.round(colors[0].b + (colors[1].b - colors[0].b) * clamped)
      };
    }
  };
}

/**
 * Creates a mock size object
 */
export function createMockSize(width: number = 80, height: number = 24): Size {
  return { width, height };
}

/**
 * Creates a mock point object
 */
export function createMockPoint(x: number = 0, y: number = 0): Point {
  return { x, y };
}

/**
 * Creates a mock color object
 */
export function createMockColor(r: number = 255, g: number = 255, b: number = 255): Color {
  return { r, g, b };
}

/**
 * Creates mock CLI options
 */
export function createMockCliOptions(overrides?: Partial<CliOptions>): CliOptions {
  return {
    pattern: undefined,
    quality: undefined,
    fps: undefined,
    theme: undefined,
    mouse: undefined,
    ...overrides
  };
}

/**
 * Checks if two colors are equal
 */
export function colorsEqual(c1: Color, c2: Color): boolean {
  return c1.r === c2.r && c1.g === c2.g && c1.b === c2.b;
}

/**
 * Counts non-empty cells in a buffer
 */
export function countNonEmptyCells(buffer: Cell[][]): number {
  let count = 0;
  for (let y = 0; y < buffer.length; y++) {
    for (let x = 0; x < buffer[y].length; x++) {
      if (buffer[y][x].char !== ' ') {
        count++;
      }
    }
  }
  return count;
}

/**
 * Mock Conf (config file library) for testing ConfigLoader
 */
export class MockConf {
  private store: Record<string, any> = {};

  get(key: string, defaultValue?: any): any {
    return this.store[key] !== undefined ? this.store[key] : defaultValue;
  }

  set(key: string, value: any): void {
    this.store[key] = value;
  }

  delete(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }

  get path(): string {
    return '/mock/config/path/.splashrc.json';
  }

  get size(): number {
    return Object.keys(this.store).length;
  }

  // For testing - access internal store
  _getStore(): Record<string, any> {
    return { ...this.store };
  }
}
