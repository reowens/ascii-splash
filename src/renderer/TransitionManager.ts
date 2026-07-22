/** Snapshot-based transitions between already-rendered pattern frames. */

import type { Cell, Color, Size } from '../types/index.js';

export type TransitionType = 'crossfade' | 'dissolve' | 'wipe-left' | 'wipe-right' | 'instant';

export interface TransitionConfig {
  type: TransitionType;
  duration: number;
  easing: EasingFunction;
}

export type EasingFunction = (t: number) => number;

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
  source: Cell[][];
  size: Size;
  config: TransitionConfig;
  startTime: number;
}

function cloneCell(cell: Cell | undefined): Cell {
  if (!cell) return { char: ' ' };
  const clone: Cell = { char: cell.char };
  if (cell.color !== undefined) clone.color = { ...cell.color };
  if (cell.bg !== undefined) clone.bg = { ...cell.bg };
  return clone;
}

function cloneFrame(frame: readonly (readonly Cell[])[]): Cell[][] {
  return frame.map(row => row.map(cell => cloneCell(cell)));
}

function frameSize(frame: readonly (readonly Cell[])[]): Size {
  return { width: frame[0]?.length ?? 0, height: frame.length };
}

export class TransitionManager {
  private activeTransition: ActiveTransition | null = null;
  private defaultConfig: TransitionConfig = {
    type: 'crossfade',
    duration: 500,
    easing: Easing.easeOutQuad,
  };

  /** Start from an immutable copy of the last raw pattern frame. */
  start(sourceFrame: readonly (readonly Cell[])[], config?: Partial<TransitionConfig>): void {
    const finalConfig = { ...this.defaultConfig, ...config };
    const size = frameSize(sourceFrame);
    if (
      finalConfig.type === 'instant' ||
      finalConfig.duration <= 0 ||
      size.width === 0 ||
      size.height === 0
    ) {
      this.activeTransition = null;
      return;
    }

    this.activeTransition = {
      source: cloneFrame(sourceFrame),
      size,
      config: finalConfig,
      startTime: Date.now(),
    };
  }

  isActive(): boolean {
    return this.activeTransition !== null;
  }

  getProgress(): number {
    if (!this.activeTransition) return 1;
    const elapsed = Date.now() - this.activeTransition.startTime;
    return Math.min(1, Math.max(0, elapsed / this.activeTransition.config.duration));
  }

  cancel(): void {
    this.activeTransition = null;
  }

  setDefaultConfig(config: Partial<TransitionConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  /**
   * Blend the source snapshot over the already-rendered target frame in place.
   * A size change cancels the short transition and leaves the target untouched.
   */
  render(target: Cell[][], time: number, size: Size): boolean {
    const active = this.activeTransition;
    if (!active) return false;

    if (
      size.width !== active.size.width ||
      size.height !== active.size.height ||
      target.length < size.height ||
      (size.height > 0 && target[0]?.length < size.width)
    ) {
      this.activeTransition = null;
      return false;
    }

    const elapsed = time - active.startTime;
    const rawProgress = Math.min(1, Math.max(0, elapsed / active.config.duration));
    if (rawProgress >= 1) {
      this.activeTransition = null;
      return false;
    }

    const progress = active.config.easing(rawProgress);
    switch (active.config.type) {
      case 'crossfade':
        this.crossfade(target, active.source, progress, size);
        break;
      case 'dissolve':
        this.dissolve(target, active.source, progress, size);
        break;
      case 'wipe-left':
        this.wipeHorizontal(target, active.source, progress, size, 'left');
        break;
      case 'wipe-right':
        this.wipeHorizontal(target, active.source, progress, size, 'right');
        break;
      default:
        this.activeTransition = null;
        return false;
    }
    return true;
  }

  private crossfade(target: Cell[][], source: Cell[][], progress: number, size: Size): void {
    for (let y = 0; y < size.height; y++) {
      for (let x = 0; x < size.width; x++) {
        const fromCell = source[y][x];
        const toCell = target[y][x];
        const result: Cell = {
          char: progress < 0.5 ? fromCell.char : toCell.char,
        };
        const color = this.transitionColor(fromCell.color, toCell.color, progress);
        const bg = this.transitionColor(fromCell.bg, toCell.bg, progress);
        if (color !== undefined) result.color = color;
        if (bg !== undefined) result.bg = bg;
        target[y][x] = result;
      }
    }
  }

  private dissolve(target: Cell[][], source: Cell[][], progress: number, size: Size): void {
    const threshold = progress * 1000;
    for (let y = 0; y < size.height; y++) {
      for (let x = 0; x < size.width; x++) {
        const hash = ((x * 7919) ^ (y * 6971)) % 1000;
        target[y][x] = cloneCell(hash < threshold ? target[y][x] : source[y][x]);
      }
    }
  }

  private wipeHorizontal(
    target: Cell[][],
    source: Cell[][],
    progress: number,
    size: Size,
    direction: 'left' | 'right'
  ): void {
    const wipeX = Math.floor(size.width * progress);
    for (let y = 0; y < size.height; y++) {
      for (let x = 0; x < size.width; x++) {
        const showTarget = direction === 'left' ? x < wipeX : x >= size.width - wipeX;
        target[y][x] = cloneCell(showTarget ? target[y][x] : source[y][x]);
      }
    }
  }

  private transitionColor(
    source: Color | undefined,
    target: Color | undefined,
    progress: number
  ): Color | undefined {
    if (source !== undefined && target !== undefined) {
      return {
        r: Math.round(source.r * (1 - progress) + target.r * progress),
        g: Math.round(source.g * (1 - progress) + target.g * progress),
        b: Math.round(source.b * (1 - progress) + target.b * progress),
      };
    }
    return cloneColor(progress < 0.5 ? source : target);
  }
}

function cloneColor(color: Color | undefined): Color | undefined {
  return color === undefined ? undefined : { ...color };
}

let transitionManager: TransitionManager | null = null;

export function getTransitionManager(): TransitionManager {
  if (!transitionManager) transitionManager = new TransitionManager();
  return transitionManager;
}

export function resetTransitionManager(): void {
  transitionManager = null;
}
