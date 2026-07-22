import { afterEach, describe, expect, test } from '@jest/globals';
import Conf from 'conf';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigLoader } from '../../src/config/ConfigLoader.js';
import { createDefaultConfig } from '../../src/config/defaults.js';
import type { ConfigSchema } from '../../src/types/index.js';

describe('ConfigLoader with real Conf storage', () => {
  const directories: string[] = [];

  afterEach(() => {
    for (const directory of directories.splice(0))
      rmSync(directory, { recursive: true, force: true });
  });

  test('preserves path, defaults, save, and favorites behavior', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'ascii-splash-conf-'));
    directories.push(cwd);
    const store = new Conf<ConfigSchema>({
      projectName: 'ascii-splash-test',
      configName: '.splashrc',
      cwd,
      defaults: createDefaultConfig(),
    });
    const loader = new ConfigLoader(store);
    expect(loader.getConfigPath()).toContain(cwd);
    expect(loader.load().defaultPattern).toBe('waves');

    const config = loader.load();
    config.theme = 'fire';
    loader.save(config);
    expect(loader.load().theme).toBe('fire');

    loader.saveFavorite(1, { pattern: 'waves', preset: 2, theme: 'ocean' });
    expect(loader.getFavorite(1)).toEqual({ pattern: 'waves', preset: 2, theme: 'ocean' });
    loader.deleteFavorite(1);
    expect(loader.getFavorite(1)).toBeUndefined();
  });
});
