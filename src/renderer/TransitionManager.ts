/**
 * TransitionManager - Smooth transitions between patterns
 *
 * Supports crossfade, dissolve, and instant transitions
 */

import type { Cell, Color, Size, Point, Pattern } from '../types/index.js';

export type TransitionType = 'crossfade' | 'dissolve' | 'wipe-left' | 'wipe-right' | 'instant';

export interface TransitionConfig {
  type: TransitionType;
  duration: number; // milliseconds
  easing: EasingFunction;
}

export type EasingFunction = (t: number) => number;

// Built-in easing functions
export const Easing = {
  linear: (t: number): number => t,
  easeInQuad: (t: number): number => t * t,
  easeOutQuad: (t: number): number => t * (2 - t),
  easeInOutQuad: (t: number): number => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t: number): number => t * t * t,
  easeOutCubic: (t: number): number => --t * t * t + 1,
  easeInOutCubic: (t: number): number =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
};

interface ActiveTransition {
  fromPattern: Pattern;
  toPattern: Pattern;
  config: TransitionConfig;
  startTime: number;
  fromBuffer: Cell[][];
  toBuffer: Cell[][];
}

export class TransitionManager {
  private activeTransition: ActiveTransition | null = null;
  private defaultConfig: TransitionConfig = {
    type: 'crossfade',
    duration: 500, // 500ms default
    easing: Easing.easeOutQuad,
  };

  /**
   * Start a transition between two patterns
   */
  start(
    fromPattern: Pattern,
    toPattern: Pattern,
    size: Size,
    config?: Partial<TransitionConfig>
  ): void {
    const finalConfig = { ...this.defaultConfig, ...config };

    // For instant transitions, don't set up a transition at all
    if (finalConfig.type === 'instant' || finalConfig.duration <= 0) {
      this.activeTransition = null;
      return;
    }

    // Create buffers for both patterns
    const fromBuffer = this.createBuffer(size);
    const toBuffer = this.createBuffer(size);

    this.activeTransition = {
      fromPattern,
      toPattern,
      config: finalConfig,
      startTime: Date.now(),
      fromBuffer,
      toBuffer,
    };
  }

  /**
   * Check if a transition is currently active
   */
  isActive(): boolean {
    return this.activeTransition !== null;
  }

  /**
   * Get the current progress (0-1)
   */
  getProgress(): number {
    if (!this.activeTransition) return 1;
    const elapsed = Date.now() - this.activeTransition.startTime;
    return Math.min(1, elapsed / this.activeTransition.config.duration);
  }

  /**
   * Cancel the current transition
   */
  cancel(): void {
    this.activeTransition = null;
  }

  /**
   * Set the default transition configuration
   */
  setDefaultConfig(config: Partial<TransitionConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  /**
   * Render the transition to the buffer
   * Returns true if transition is still active, false if complete
   */
  render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): boolean {
    if (!this.activeTransition) return false;

    const { fromPattern, toPattern, config, startTime, fromBuffer, toBuffer } =
      this.activeTransition;
    const elapsed = time - startTime;
    const rawProgress = Math.min(1, elapsed / config.duration);
    const easedProgress = config.easing(rawProgress);

    // Resize buffers if needed
    if (
      fromBuffer.length !== size.height ||
      (fromBuffer[0] && fromBuffer[0].length !== size.width)
    ) {
      this.activeTransition.fromBuffer = this.createBuffer(size);
      this.activeTransition.toBuffer = this.createBuffer(size);
    }

    // Clear and render both patterns to their buffers
    this.clearBuffer(fromBuffer, size);
    this.clearBuffer(toBuffer, size);
    fromPattern.render(fromBuffer, time, size, mousePos);
    toPattern.render(toBuffer, time, size, mousePos);

    // Blend based on transition type
    this.blend(buffer, fromBuffer, toBuffer, easedProgress, config.type, size);

    // Check if transition is complete
    if (rawProgress >= 1) {
      this.activeTransition = null;
      return false;
    }

    return true;
  }

  private blend(
    output: Cell[][],
    from: Cell[][],
    to: Cell[][],
    progress: number,
    type: TransitionType,
    size: Size
  ): void {
    switch (type) {
      case 'crossfade':
        this.crossfade(output, from, to, progress, size);
        break;
      case 'dissolve':
        this.dissolve(output, from, to, progress, size);
        break;
      case 'wipe-left':
        this.wipeHorizontal(output, from, to, progress, size, 'left');
        break;
      case 'wipe-right':
        this.wipeHorizontal(output, from, to, progress, size, 'right');
        break;
      default:
        // Instant - just copy the target
        this.copyBuffer(output, to, size);
    }
  }

  private crossfade(
    output: Cell[][],
    from: Cell[][],
    to: Cell[][],
    progress: number,
    size: Size
  ): void {
    for (let y = 0; y < size.height && y < output.length; y++) {
      for (let x = 0; x < size.width && x < output[y].length; x++) {
        const fromCell = from[y]?.[x] ?? { char: ' ' };
        const toCell = to[y]?.[x] ?? { char: ' ' };

        // Blend colors
        const blendedColor = this.blendColors(
          fromCell.color ?? { r: 0, g: 0, b: 0 },
          toCell.color ?? { r: 0, g: 0, b: 0 },
          progress
        );

        // Use character from whichever pattern is "winning"
        const char = progress < 0.5 ? fromCell.char : toCell.char;

        output[y][x] = { char, color: blendedColor };
      }
    }
  }

  private dissolve(
    output: Cell[][],
    from: Cell[][],
    to: Cell[][],
    progress: number,
    size: Size
  ): void {
    // Use a pseudo-random pattern based on position
    for (let y = 0; y < size.height && y < output.length; y++) {
      for (let x = 0; x < size.width && x < output[y].length; x++) {
        // Simple hash for pseudo-random
        const hash = ((x * 7919) ^ (y * 6971)) % 1000;
        const threshold = progress * 1000;

        if (hash < threshold) {
          output[y][x] = to[y]?.[x] ?? { char: ' ' };
        } else {
          output[y][x] = from[y]?.[x] ?? { char: ' ' };
        }
      }
    }
  }

  private wipeHorizontal(
    output: Cell[][],
    from: Cell[][],
    to: Cell[][],
    progress: number,
    size: Size,
    direction: 'left' | 'right'
  ): void {
    const wipeX = Math.floor(size.width * progress);

    for (let y = 0; y < size.height && y < output.length; y++) {
      for (let x = 0; x < size.width && x < output[y].length; x++) {
        const showTo = direction === 'left' ? x < wipeX : x >= size.width - wipeX;
        output[y][x] = showTo ? (to[y]?.[x] ?? { char: ' ' }) : (from[y]?.[x] ?? { char: ' ' });
      }
    }
  }

  private blendColors(from: Color, to: Color, progress: number): Color {
    return {
      r: Math.round(from.r * (1 - progress) + to.r * progress),
      g: Math.round(from.g * (1 - progress) + to.g * progress),
      b: Math.round(from.b * (1 - progress) + to.b * progress),
    };
  }

  private createBuffer(size: Size): Cell[][] {
    const buffer: Cell[][] = [];
    for (let y = 0; y < size.height; y++) {
      buffer[y] = [];
      for (let x = 0; x < size.width; x++) {
        buffer[y][x] = { char: ' ' };
      }
    }
    return buffer;
  }

  private clearBuffer(buffer: Cell[][], size: Size): void {
    for (let y = 0; y < size.height && y < buffer.length; y++) {
      for (let x = 0; x < size.width && x < buffer[y].length; x++) {
        buffer[y][x] = { char: ' ' };
      }
    }
  }

  private copyBuffer(output: Cell[][], source: Cell[][], size: Size): void {
    for (let y = 0; y < size.height && y < output.length; y++) {
      for (let x = 0; x < size.width && x < output[y].length; x++) {
        output[y][x] = source[y]?.[x] ?? { char: ' ' };
      }
    }
  }
}

// Singleton instance
let transitionManager: TransitionManager | null = null;

export function getTransitionManager(): TransitionManager {
  if (!transitionManager) {
    transitionManager = new TransitionManager();
  }
  return transitionManager;
}

export function resetTransitionManager(): void {
  transitionManager = null;
}
