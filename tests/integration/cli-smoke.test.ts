import { describe, expect, test } from '@jest/globals';
import { spawnSync } from 'node:child_process';

function run(args: string[]) {
  return spawnSync(process.execPath, ['dist/main.js', ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

describe('CLI child-process smoke', () => {
  test('--help works without a TTY', () => {
    const result = run(['--help']);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Usage: splash/);
  });

  test('--version works without a TTY', () => {
    const result = run(['--version']);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test('share emits a canonical code without a TTY', () => {
    const result = run(['share']);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toMatch(/^[0-9A-HJKMNP-TV-Z]{12}$/);
  });

  test('malformed play fails before the TTY guard', () => {
    const result = run(['play', 'BAD']);
    expect(result.status).toBe(1);
    expect(result.stderr.trim().split('\n')).toHaveLength(1);
    expect(result.stderr).toMatch(/Share code must be 12 characters/);
    expect(result.stderr).not.toMatch(/interactive terminal/);
  });

  test('malformed watch fixture fails before the TTY guard', () => {
    const result = run(['watch', '--fixture', 'tests/fixtures/does-not-exist.json']);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/failed to load fixture/);
    expect(result.stderr).not.toMatch(/interactive terminal/);
  });

  test('plain non-TTY startup returns the documented diagnostic', () => {
    const result = run([]);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/requires an interactive terminal/);
    expect(result.stderr).toMatch(/splash --help/);
  });
});
