import { describe, expect, jest, test } from '@jest/globals';
import {
  assertInteractiveTTY,
  createIdempotentCleanup,
  createTerminalResource,
  toCliOptions,
} from '../../../src/cli/bootstrap.js';

describe('CLI bootstrap boundaries', () => {
  test('normalizes Commander options without terminal side effects', () => {
    expect(
      toCliOptions({ pattern: 'STARFIELD', quality: 'HIGH', theme: 'FIRE', fps: 60, mouse: false })
    ).toEqual({
      pattern: 'starfield',
      quality: 'high',
      theme: 'fire',
      fps: 60,
      mouse: false,
      photo: undefined,
    });
  });

  test('rejects non-TTY startup with an actionable message', () => {
    expect(() => assertInteractiveTTY(false)).toThrow(/requires an interactive terminal/);
    expect(() => assertInteractiveTTY(undefined)).toThrow(/splash --help/);
    expect(() => assertInteractiveTTY(true)).not.toThrow();
  });

  test('cleanup is idempotent and runs every callback once', () => {
    const first = jest.fn();
    const second = jest.fn();
    const cleanup = createIdempotentCleanup(first, second);
    cleanup();
    cleanup();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  test('cleanup continues after one callback throws', () => {
    const later = jest.fn();
    const cleanup = createIdempotentCleanup(() => {
      throw new Error('first failed');
    }, later);
    expect(cleanup).toThrow('first failed');
    expect(later).toHaveBeenCalledTimes(1);
    expect(() => cleanup()).not.toThrow();
  });

  test('terminal factory registers exactly-once cleanup immediately', () => {
    const resourceCleanup = jest.fn();
    let registered: (() => void) | undefined;
    const resource = createTerminalResource(
      () => ({ cleanup: resourceCleanup, marker: 1 }),
      cleanup => {
        registered = cleanup;
      }
    );
    expect(resource.marker).toBe(1);
    registered?.();
    registered?.();
    expect(resourceCleanup).toHaveBeenCalledTimes(1);
  });
});
