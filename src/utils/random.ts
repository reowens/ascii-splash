/**
 * Deterministic random number generation for reproducible patterns.
 *
 * Replaces direct calls to `Math.random()` so that a pattern seeded with
 * the same u32 produces the same sequence of values — the foundation for
 * v0.5.0's share-code feature (`splash share` / `splash play <code>`).
 */

/**
 * A seedable, deterministic source of pseudo-random values.
 *
 * Two instances seeded with the same u32 produce identical sequences across
 * platforms (state is held in JS-safe u32 arithmetic).
 */
export interface Random {
  /** Returns a float in `[0, 1)`. Drop-in replacement for `Math.random()`. */
  next(): number;

  /** Returns a float in `[min, max)`. */
  range(min: number, max: number): number;

  /** Returns an integer in `[min, max]` inclusive. */
  int(min: number, max: number): number;

  /** Returns a uniformly random element from a non-empty array. */
  choice<T>(arr: readonly T[]): T;

  /** Returns `true` with the given probability (default 0.5). */
  bool(probability?: number): boolean;

  /** Resets internal state to start a new deterministic sequence. */
  reseed(seed: number): void;
}

/**
 * Mulberry32: a tiny (~10 LOC) u32-state PRNG with period 2^32.
 *
 * Statistical quality is sufficient for visual / animation use (passes
 * gjrand and PractRand for the periods we need). For applications needing
 * cryptographic randomness or much longer periods, use a different PRNG.
 *
 * Algorithm: Tommy Ettinger's mulberry32 (public domain).
 */
export class Mulberry32 implements Random {
  private state: number;

  constructor(seed: number) {
    // Coerce to u32. A seed of 0 is valid (mulberry32 escapes the zero
    // fixed point on the first step thanks to the constant addition).
    this.state = seed >>> 0;
  }

  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  choice<T>(arr: readonly T[]): T {
    if (arr.length === 0) {
      throw new Error('Random.choice() called on empty array');
    }
    return arr[this.int(0, arr.length - 1)];
  }

  bool(probability = 0.5): boolean {
    return this.next() < probability;
  }

  reseed(seed: number): void {
    this.state = seed >>> 0;
  }
}

/**
 * Pick a u32 seed from `Math.random()`. Use this when callers want a
 * "fresh" non-deterministic scene (e.g., the initial seed for a session
 * before the user requests a share code).
 */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0x100000000) >>> 0;
}
