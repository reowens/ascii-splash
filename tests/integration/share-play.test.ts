import { describe, expect, it } from '@jest/globals';
import { spawnSync } from 'node:child_process';
import {
  encodeShareCode,
  SHARE_CODE_ALPHABET,
  SHARE_CODE_LENGTH,
  SHARE_CODE_VERSION,
  type ShareState,
} from '../../src/utils/shareCode.js';

const BASE_STATE: ShareState = {
  patternId: 0,
  presetId: 1,
  themeId: 0,
  seed: 1,
  configHash: 0,
};

function encodeStructuralState(state: ShareState): string {
  let payload = 0n;
  payload = (payload << 4n) | BigInt(SHARE_CODE_VERSION);
  payload = (payload << 5n) | BigInt(state.patternId);
  payload = (payload << 3n) | BigInt(state.presetId - 1);
  payload = (payload << 3n) | BigInt(state.themeId);
  payload = (payload << 32n) | BigInt(state.seed >>> 0);
  payload = (payload << 13n) | BigInt(state.configHash);
  const chars = new Array<string>(SHARE_CODE_LENGTH);
  for (let i = SHARE_CODE_LENGTH - 1; i >= 0; i--) {
    chars[i] = SHARE_CODE_ALPHABET[Number(payload & 0x1fn)];
    payload >>= 5n;
  }
  return chars.join('');
}

function play(code: string) {
  return spawnSync(process.execPath, ['dist/main.js', 'play', code], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

describe('splash play registry validation', () => {
  it.each([
    ['preset', encodeStructuralState({ ...BASE_STATE, presetId: 7 }), /unsupported preset 7/i],
    ['theme', encodeShareCode({ ...BASE_STATE, themeId: 5 }), /unsupported theme ID 5/i],
    ['pattern', encodeShareCode({ ...BASE_STATE, patternId: 23 }), /unsupported pattern ID 23/i],
  ])('rejects an unsupported %s before TTY setup', (_kind, code, diagnostic) => {
    const result = play(code as string);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(diagnostic as RegExp);
    expect(result.stderr).not.toMatch(/requires an interactive terminal/i);
    expect(result.stderr.trim().split('\n')).toHaveLength(1);
  });
});
