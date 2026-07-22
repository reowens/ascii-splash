import type { CliOptions, QualityPreset } from '../types/index.js';

export type ParsedCli =
  | { mode: 'run'; options: CliOptions }
  | { mode: 'share'; options: CliOptions }
  | { mode: 'play'; options: CliOptions; code: string }
  | { mode: 'watch'; options: CliOptions; watchPath?: string; fixture?: string };

export interface RawCliOptions {
  pattern?: string;
  quality?: string;
  fps?: number;
  theme?: string;
  mouse?: boolean;
  photo?: string;
}

/** Convert Commander output into normalized application CLI state. */
export function toCliOptions(options: RawCliOptions): CliOptions {
  return {
    pattern: options.pattern?.toLowerCase(),
    quality: options.quality?.toLowerCase() as QualityPreset | undefined,
    fps: options.fps,
    theme: options.theme?.toLowerCase(),
    mouse: options.mouse,
    photo: options.photo,
  };
}

/** Fail before terminal construction when stdout is not interactive. */
export function assertInteractiveTTY(isTTY: boolean | undefined): void {
  if (!isTTY) {
    throw new Error(
      'ascii-splash requires an interactive terminal (TTY)\n' +
        'It cannot be run via pipe, redirect, or non-interactive environments.\n\n' +
        'Usage: splash [options]\nTry: splash --help'
    );
  }
}

/** Compose cleanup callbacks into one idempotent best-effort operation. */
export function createIdempotentCleanup(...callbacks: (() => void)[]): () => void {
  let cleaned = false;
  return () => {
    if (cleaned) return;
    cleaned = true;
    let firstError: unknown;
    for (const callback of callbacks) {
      try {
        callback();
      } catch (error) {
        firstError ??= error;
      }
    }
    if (firstError) {
      throw firstError instanceof Error
        ? firstError
        : new Error(typeof firstError === 'string' ? firstError : 'Cleanup failed');
    }
  };
}

export interface TerminalResource {
  cleanup(): void;
}

/** Construct a terminal resource through an injectable factory and register cleanup immediately. */
export function createTerminalResource<T extends TerminalResource>(
  factory: () => T,
  registerCleanup: (cleanup: () => void) => void
): T {
  const resource = factory();
  registerCleanup(
    createIdempotentCleanup(() => {
      resource.cleanup();
    })
  );
  return resource;
}
