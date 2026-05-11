import { Mulberry32, Random, randomSeed } from '../../../src/utils/random.js';

describe('Mulberry32', () => {
  describe('next()', () => {
    it('returns values in [0, 1)', () => {
      const rng = new Mulberry32(42);
      for (let i = 0; i < 10_000; i++) {
        const v = rng.next();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    });

    it('produces identical sequences from the same seed', () => {
      const a = new Mulberry32(12345);
      const b = new Mulberry32(12345);
      for (let i = 0; i < 100; i++) {
        expect(a.next()).toBe(b.next());
      }
    });

    it('produces different sequences from different seeds', () => {
      const a = new Mulberry32(1);
      const b = new Mulberry32(2);
      let firstDiff = -1;
      for (let i = 0; i < 10; i++) {
        if (a.next() !== b.next()) {
          firstDiff = i;
          break;
        }
      }
      expect(firstDiff).toBeGreaterThanOrEqual(0);
    });

    it('does not get stuck at zero for a seed of 0', () => {
      const rng = new Mulberry32(0);
      const first = rng.next();
      const second = rng.next();
      expect(first).not.toBe(0);
      expect(second).not.toBe(0);
      expect(first).not.toBe(second);
    });

    it('coerces non-u32 seeds via `>>> 0`', () => {
      const fromNegative = new Mulberry32(-1);
      const fromMax = new Mulberry32(0xffffffff);
      // Both seeds resolve to the same u32 state, so sequences match.
      expect(fromNegative.next()).toBe(fromMax.next());
    });

    it('passes a basic uniformity sanity check (mean ≈ 0.5)', () => {
      const rng = new Mulberry32(99);
      let sum = 0;
      const N = 100_000;
      for (let i = 0; i < N; i++) sum += rng.next();
      const mean = sum / N;
      // Loose bound — this is a smoke test, not a statistical test.
      expect(mean).toBeGreaterThan(0.48);
      expect(mean).toBeLessThan(0.52);
    });
  });

  describe('range(min, max)', () => {
    it('returns values in [min, max)', () => {
      const rng = new Mulberry32(7);
      for (let i = 0; i < 1000; i++) {
        const v = rng.range(10, 20);
        expect(v).toBeGreaterThanOrEqual(10);
        expect(v).toBeLessThan(20);
      }
    });

    it('handles negative ranges', () => {
      const rng = new Mulberry32(7);
      for (let i = 0; i < 1000; i++) {
        const v = rng.range(-5, 5);
        expect(v).toBeGreaterThanOrEqual(-5);
        expect(v).toBeLessThan(5);
      }
    });
  });

  describe('int(min, max)', () => {
    it('returns integers in [min, max] inclusive', () => {
      const rng = new Mulberry32(7);
      const counts = new Map<number, number>();
      for (let i = 0; i < 10_000; i++) {
        const v = rng.int(1, 6);
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(6);
        counts.set(v, (counts.get(v) ?? 0) + 1);
      }
      // All six faces should be hit at least once.
      for (let face = 1; face <= 6; face++) {
        expect(counts.get(face)).toBeGreaterThan(0);
      }
    });

    it('handles a single-value range', () => {
      const rng = new Mulberry32(7);
      for (let i = 0; i < 100; i++) {
        expect(rng.int(5, 5)).toBe(5);
      }
    });
  });

  describe('choice(arr)', () => {
    it('returns elements from the array', () => {
      const rng = new Mulberry32(7);
      const arr = ['a', 'b', 'c', 'd'] as const;
      const seen = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        const v = rng.choice(arr);
        expect(arr).toContain(v);
        seen.add(v);
      }
      // All four should be reachable.
      expect(seen.size).toBe(4);
    });

    it('throws on an empty array', () => {
      const rng = new Mulberry32(7);
      expect(() => rng.choice([])).toThrow();
    });
  });

  describe('bool(probability)', () => {
    it('returns roughly 50/50 by default', () => {
      const rng = new Mulberry32(7);
      let trues = 0;
      const N = 10_000;
      for (let i = 0; i < N; i++) {
        if (rng.bool()) trues++;
      }
      const ratio = trues / N;
      expect(ratio).toBeGreaterThan(0.47);
      expect(ratio).toBeLessThan(0.53);
    });

    it('respects the probability argument', () => {
      const rng = new Mulberry32(7);
      let trues = 0;
      const N = 10_000;
      for (let i = 0; i < N; i++) {
        if (rng.bool(0.1)) trues++;
      }
      const ratio = trues / N;
      expect(ratio).toBeGreaterThan(0.08);
      expect(ratio).toBeLessThan(0.12);
    });

    it('always returns false for probability 0', () => {
      const rng = new Mulberry32(7);
      for (let i = 0; i < 100; i++) {
        expect(rng.bool(0)).toBe(false);
      }
    });
  });

  describe('reseed(seed)', () => {
    it('restarts the sequence from a known state', () => {
      const a = new Mulberry32(7);
      const firstSequence = [a.next(), a.next(), a.next()];

      a.reseed(7);
      const secondSequence = [a.next(), a.next(), a.next()];

      expect(secondSequence).toEqual(firstSequence);
    });

    it('switches to a new sequence', () => {
      const a = new Mulberry32(7);
      const seq1 = [a.next(), a.next()];
      a.reseed(8);
      const seq2 = [a.next(), a.next()];
      expect(seq2).not.toEqual(seq1);
    });
  });

  /**
   * Cross-platform determinism: these are the first four mulberry32 values
   * for seed=1. If this test fails, the implementation has diverged from
   * the canonical algorithm and existing share codes would break.
   */
  describe('canonical reference vectors (seed=1)', () => {
    it('produces the documented mulberry32 sequence', () => {
      const rng = new Mulberry32(1);
      const v1 = rng.next();
      const v2 = rng.next();
      const v3 = rng.next();
      const v4 = rng.next();
      // Snapshot of the implementation under test — locks in the byte-for-byte
      // sequence so future "optimizations" can't silently change it.
      expect(v1).toBeCloseTo(0.6270739405881613, 12);
      expect(v2).toBeCloseTo(0.002735721180215478, 12);
      expect(v3).toBeCloseTo(0.5274470399599522, 12);
      expect(v4).toBeCloseTo(0.9810509674716741, 12);
    });
  });

  describe('Random interface compliance', () => {
    it('Mulberry32 is assignable to Random', () => {
      const rng: Random = new Mulberry32(7);
      expect(typeof rng.next).toBe('function');
      expect(typeof rng.range).toBe('function');
      expect(typeof rng.int).toBe('function');
      expect(typeof rng.choice).toBe('function');
      expect(typeof rng.bool).toBe('function');
      expect(typeof rng.reseed).toBe('function');
    });
  });
});

describe('randomSeed()', () => {
  it('returns a u32 (integer in [0, 2^32))', () => {
    for (let i = 0; i < 100; i++) {
      const seed = randomSeed();
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThan(0x100000000);
    }
  });

  it('produces a different value on repeated calls (sanity check)', () => {
    const seeds = new Set<number>();
    for (let i = 0; i < 100; i++) seeds.add(randomSeed());
    // Math.random collisions would be astronomically unlikely; if they
    // happen, something is seriously wrong.
    expect(seeds.size).toBeGreaterThan(95);
  });
});
