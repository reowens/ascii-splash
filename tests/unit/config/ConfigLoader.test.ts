/**
 * Unit tests for ConfigLoader
 * Target: 85%+ coverage
 *
 * Note: We mock the Conf library since it interacts with the filesystem
 */

import { jest, describe, expect, beforeEach, afterEach, test } from '@jest/globals';
import { ConfigSchema, CliOptions, FavoriteSlot } from '../../../src/types/index.js';
import { defaultConfig, qualityPresets } from '../../../src/config/defaults.js';
import { hashConfig } from '../../../src/utils/shareCode.js';
import { validateFileConfig } from '../../../src/config/validateConfig.js';
import { readFileSync } from 'node:fs';

// Create mock store
const mockStore = {
  has: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  clear: jest.fn(),
  path: '/mock/path/.splashrc.json',
};

// Create mock Conf constructor
const MockConf = jest.fn().mockImplementation(() => mockStore);

// Mock the Conf library with ESM-compatible approach
jest.unstable_mockModule('conf', () => ({
  default: MockConf,
}));

// Import ConfigLoader after mocking
const { ConfigLoader } = await import('../../../src/config/ConfigLoader.js');
type ConfigLoaderType = InstanceType<typeof ConfigLoader>;

describe('ConfigLoader', () => {
  let configLoader: ConfigLoaderType;

  beforeEach(() => {
    // Reset all mock functions
    jest.clearAllMocks();
    mockStore.has.mockReturnValue(false);
    mockStore.get.mockReturnValue(undefined);
    mockStore.set.mockImplementation(() => {}); // Reset to no-op implementation
    mockStore.clear.mockImplementation(() => {}); // Reset to no-op implementation

    configLoader = new ConfigLoader();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Construction', () => {
    test('initializes with correct project name', () => {
      expect(MockConf).toHaveBeenCalledWith({
        projectName: 'ascii-splash',
        defaults: defaultConfig,
        configName: '.splashrc',
      });
    });
  });

  describe('load()', () => {
    test('returns default config when no overrides', () => {
      mockStore.has.mockReturnValue(false);

      const config = configLoader.load();

      expect(config).toEqual(defaultConfig);
    });

    test('merges CLI options with highest priority', () => {
      mockStore.has.mockReturnValue(false);

      const cliOptions: CliOptions = {
        pattern: 'starfield',
        fps: 60,
        theme: 'fire',
      };

      const config = configLoader.load(cliOptions);

      expect(config.defaultPattern).toBe('starfield');
      expect(config.fps).toBe(60);
      expect(config.theme).toBe('fire');
    });

    test('CLI options override file config', () => {
      // File says waves, CLI says starfield
      mockStore.has.mockImplementation((key: any) => key === 'defaultPattern');
      mockStore.get.mockImplementation((key: any) => {
        if (key === 'defaultPattern') return 'waves';
      });

      const cliOptions: CliOptions = {
        pattern: 'starfield',
      };

      const config = configLoader.load(cliOptions);

      expect(config.defaultPattern).toBe('starfield'); // CLI wins
    });

    test('loads all config file settings', () => {
      mockStore.has.mockReturnValue(true);
      mockStore.get.mockImplementation((key: any) => {
        const fileConfig: any = {
          defaultPattern: 'matrix',
          quality: 'high',
          fps: 45,
          theme: 'starlight',
          mouseEnabled: false,
          patterns: {
            waves: { frequency: 0.2 },
          },
          favorites: {
            1: { pattern: 'WavePattern', theme: 'ocean' },
          },
        };
        return fileConfig[key];
      });

      const config = configLoader.load();

      expect(config.defaultPattern).toBe('matrix');
      expect(config.quality).toBe('high');
      expect(config.fps).toBe(45);
      expect(config.theme).toBe('starlight');
      expect(config.mouseEnabled).toBe(false);
      expect(config.patterns?.waves?.frequency).toBe(0.2);
      expect(config.favorites?.[1]).toEqual({ pattern: 'WavePattern', theme: 'ocean' });
    });

    test('handles quality preset CLI option', () => {
      mockStore.has.mockReturnValue(false);

      const cliOptions: CliOptions = {
        quality: 'high',
      };

      const config = configLoader.load(cliOptions);

      expect(config.quality).toBe('high');
    });

    test('handles mouse CLI option', () => {
      mockStore.has.mockReturnValue(false);

      const cliOptions: CliOptions = {
        mouse: false,
      };

      const config = configLoader.load(cliOptions);

      expect(config.mouseEnabled).toBe(false);
    });

    test('deep merges pattern configurations', () => {
      // File has partial wave config
      mockStore.has.mockImplementation((key: any) => key === 'patterns');
      mockStore.get.mockImplementation((key: any) => {
        if (key === 'patterns') {
          return {
            waves: { frequency: 0.5 }, // Only override frequency
          };
        }
      });

      const config = configLoader.load();

      // Should have default values + overridden frequency
      expect(config.patterns?.waves?.frequency).toBe(0.5);
      expect(config.patterns?.waves?.amplitude).toBe(3); // From defaults
      expect(config.patterns?.waves?.layers).toBe(3); // From defaults
    });

    test('does not mutate defaultConfig when merging nested file overrides', () => {
      const defaultsBefore = structuredClone(defaultConfig);
      mockStore.has.mockImplementation((key: any) => key === 'patterns');
      mockStore.get.mockImplementation((key: any) =>
        key === 'patterns' ? { waves: { frequency: 0.777 } } : undefined
      );

      const config = configLoader.load();

      expect(config.patterns?.waves?.frequency).toBe(0.777);
      expect(defaultConfig).toEqual(defaultsBefore);
      expect(defaultConfig.patterns?.waves?.frequency).toBe(0.1);
    });

    test('returns isolated nested config objects on sequential loads', () => {
      mockStore.has.mockReturnValue(false);

      const first = configLoader.load();
      first.patterns!.waves!.frequency = 999;
      first.patterns!.workspaceViz!.ignore = ['dist/**'];

      const second = configLoader.load();

      expect(second.patterns?.waves?.frequency).toBe(0.1);
      expect(second.patterns?.workspaceViz?.ignore).toBeUndefined();
      expect(defaultConfig.patterns?.waves?.frequency).toBe(0.1);
    });

    test('does not retain mutable arrays returned by the config store', () => {
      const ignore = ['dist/**'];
      mockStore.has.mockImplementation((key: any) => key === 'patterns');
      mockStore.get.mockImplementation((key: any) =>
        key === 'patterns' ? { workspaceViz: { ignore } } : undefined
      );

      const config = configLoader.load();
      config.patterns?.workspaceViz?.ignore?.push('coverage/**');

      expect(ignore).toEqual(['dist/**']);
    });

    test('preserves non-default values in the share-code config fingerprint', () => {
      mockStore.has.mockImplementation((key: any) => key === 'patterns');
      mockStore.get.mockImplementation((key: any) =>
        key === 'patterns' ? { waves: { frequency: 0.777 } } : undefined
      );

      const config = configLoader.load();
      const loadedHash = hashConfig(
        config.patterns?.waves as Record<string, unknown>,
        defaultConfig.patterns?.waves as Record<string, unknown>
      );
      const defaultHash = hashConfig(
        defaultConfig.patterns?.waves as Record<string, unknown>,
        defaultConfig.patterns?.waves as Record<string, unknown>
      );

      expect(loadedHash).not.toBe(defaultHash);
    });

    test('falls back field-by-field for invalid globals, counts, intervals, enums, and chars', () => {
      mockStore.has.mockReturnValue(true);
      mockStore.get.mockImplementation((key: any) => {
        const invalid: Record<string, unknown> = {
          defaultPattern: 'unknown',
          quality: 'ultra',
          fps: 1000,
          theme: 'missing',
          mouseEnabled: 'yes',
          patterns: {
            starfield: { starCount: 1e9 },
            tunnel: { ringCount: -1, shape: 'triangle' },
            lightning: { strikeInterval: 0 },
            maze: { cellSize: 0, wallChar: '\n' },
          },
        };
        return invalid[key];
      });
      const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const config = configLoader.load();

      expect(config).toMatchObject({
        defaultPattern: defaultConfig.defaultPattern,
        quality: defaultConfig.quality,
        fps: defaultConfig.fps,
        theme: defaultConfig.theme,
        mouseEnabled: defaultConfig.mouseEnabled,
      });
      expect(config.patterns?.starfield?.starCount).toBe(
        defaultConfig.patterns?.starfield?.starCount
      );
      expect(config.patterns?.tunnel?.ringCount).toBe(defaultConfig.patterns?.tunnel?.ringCount);
      expect(config.patterns?.maze?.cellSize).toBe(defaultConfig.patterns?.maze?.cellSize);
      expect(warning).toHaveBeenCalledWith(expect.stringContaining(mockStore.path));
      expect(warning).toHaveBeenCalledWith(expect.stringContaining('patterns.starfield.starCount'));
    });

    test('rejects non-finite values and repairs coupled lava-lamp radii', () => {
      mockStore.has.mockImplementation((key: any) => key === 'patterns');
      mockStore.get.mockReturnValue({
        waves: { speed: NaN, amplitude: Infinity },
        lavaLamp: { minRadius: 50, maxRadius: 5 },
        workspaceViz: { heatHalfLifeMs: -1, nodeBudget: 1000000 },
      });
      jest.spyOn(console, 'warn').mockImplementation(() => {});

      const config = configLoader.load();

      expect(config.patterns?.waves?.speed).toBe(defaultConfig.patterns?.waves?.speed);
      expect(config.patterns?.waves?.amplitude).toBe(defaultConfig.patterns?.waves?.amplitude);
      expect(config.patterns?.lavaLamp?.minRadius).toBe(
        defaultConfig.patterns?.lavaLamp?.minRadius
      );
      expect(config.patterns?.lavaLamp?.maxRadius).toBe(
        defaultConfig.patterns?.lavaLamp?.maxRadius
      );
      expect(config.patterns?.workspaceViz?.nodeBudget).toBe(
        defaultConfig.patterns?.workspaceViz?.nodeBudget
      );
    });

    test('sanitizes before share fingerprinting', () => {
      mockStore.has.mockImplementation((key: any) => key === 'patterns');
      mockStore.get.mockReturnValue({ waves: { layers: 999999 } });
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      const config = configLoader.load();
      expect(
        hashConfig(
          config.patterns?.waves as Record<string, unknown>,
          defaultConfig.patterns?.waves as Record<string, unknown>
        )
      ).toBe(
        hashConfig(
          defaultConfig.patterns?.waves as Record<string, unknown>,
          defaultConfig.patterns?.waves as Record<string, unknown>
        )
      );
    });

    test('accepts all defaults unchanged through the schema', () => {
      const warnings: string[] = [];
      expect(
        validateFileConfig(defaultConfig, defaultConfig, mockStore.path, message =>
          warnings.push(message)
        )
      ).toEqual(defaultConfig);
      expect(warnings).toEqual([]);
    });

    test('accepts every documented example value without warnings', () => {
      const example = JSON.parse(
        readFileSync(`${process.cwd()}/examples/.splashrc.example`, 'utf8')
      ) as unknown;
      const warnings: string[] = [];
      const sanitized = validateFileConfig(example, defaultConfig, mockStore.path, message =>
        warnings.push(message)
      );
      expect(warnings).toEqual([]);
      expect(sanitized).toMatchObject({ defaultPattern: 'waves', fps: 30, theme: 'ocean' });
    });

    test('bounds workspace ignore arrays and extension colors', () => {
      mockStore.has.mockImplementation((key: any) => key === 'patterns');
      mockStore.get.mockReturnValue({
        workspaceViz: {
          ignore: new Array(101).fill('x'),
          extColors: { '.ts': 'not-a-color' },
        },
      });
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      const config = configLoader.load();
      expect(config.patterns?.workspaceViz?.ignore).toBeUndefined();
      expect(config.patterns?.workspaceViz?.extColors).toBeUndefined();
    });
  });

  describe('save()', () => {
    test('saves config to store', () => {
      const config: ConfigSchema = {
        defaultPattern: 'starfield',
        fps: 60,
        theme: 'fire',
      };

      configLoader.save(config);

      expect(mockStore.set).toHaveBeenCalledWith(config);
    });

    test('handles save errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockStore.set.mockImplementation(() => {
        throw new Error('Write error');
      });

      const config: ConfigSchema = {};

      expect(() => {
        configLoader.save(config);
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getConfigPath()', () => {
    test('returns config file path', () => {
      const path = configLoader.getConfigPath();
      expect(path).toBe('/mock/path/.splashrc.json');
    });
  });

  describe('reset()', () => {
    test('clears config store', () => {
      configLoader.reset();
      expect(mockStore.clear).toHaveBeenCalled();
    });
  });

  describe('getFpsFromConfig()', () => {
    test('returns explicit fps when set', () => {
      const config: ConfigSchema = {
        fps: 45,
        quality: 'high',
      };

      const fps = ConfigLoader.getFpsFromConfig(config);
      expect(fps).toBe(45); // Explicit fps takes priority
    });

    test('returns quality preset fps when no explicit fps', () => {
      const config: ConfigSchema = {
        quality: 'high',
      };

      const fps = ConfigLoader.getFpsFromConfig(config);
      expect(fps).toBe(qualityPresets.high); // 60
    });

    test('defaults to medium quality when neither set', () => {
      const config: ConfigSchema = {};

      const fps = ConfigLoader.getFpsFromConfig(config);
      expect(fps).toBe(qualityPresets.medium); // 30
    });

    test('respects low quality preset', () => {
      const config: ConfigSchema = {
        quality: 'low',
      };

      const fps = ConfigLoader.getFpsFromConfig(config);
      expect(fps).toBe(qualityPresets.low); // 15
    });
  });

  describe('Favorites Management', () => {
    test('getFavorite retrieves a favorite', () => {
      const favorite: FavoriteSlot = {
        pattern: 'WavePattern',
        preset: 3,
        theme: 'ocean',
        savedAt: '2025-01-01T00:00:00.000Z',
      };

      mockStore.get.mockReturnValue({
        1: favorite,
      });

      const result = configLoader.getFavorite(1);
      expect(result).toEqual(favorite);
    });

    test('getFavorite returns undefined for non-existent slot', () => {
      mockStore.get.mockReturnValue({});

      const result = configLoader.getFavorite(99);
      expect(result).toBeUndefined();
    });

    test('getFavorite handles missing favorites object', () => {
      mockStore.get.mockReturnValue(undefined);

      const result = configLoader.getFavorite(1);
      expect(result).toBeUndefined();
    });

    test('saveFavorite adds a new favorite', () => {
      mockStore.get.mockReturnValue({});

      const favorite: FavoriteSlot = {
        pattern: 'StarfieldPattern',
        preset: 5,
        theme: 'starlight',
        savedAt: '2025-01-01T00:00:00.000Z',
      };

      configLoader.saveFavorite(1, favorite);

      expect(mockStore.set).toHaveBeenCalledWith('favorites', {
        1: favorite,
      });
    });

    test('saveFavorite updates existing favorite', () => {
      const oldFavorite: FavoriteSlot = {
        pattern: 'WavePattern',
        theme: 'ocean',
        savedAt: '2025-01-01T00:00:00.000Z',
      };

      mockStore.get.mockReturnValue({
        1: oldFavorite,
        2: { pattern: 'MatrixPattern', theme: 'matrix', savedAt: '2025-01-01' },
      });

      const newFavorite: FavoriteSlot = {
        pattern: 'StarfieldPattern',
        theme: 'starlight',
        savedAt: '2025-01-02T00:00:00.000Z',
      };

      configLoader.saveFavorite(1, newFavorite);

      expect(mockStore.set).toHaveBeenCalledWith('favorites', {
        1: newFavorite,
        2: { pattern: 'MatrixPattern', theme: 'matrix', savedAt: '2025-01-01' },
      });
    });

    test('getAllFavorites returns all favorites', () => {
      const favorites = {
        1: { pattern: 'WavePattern', theme: 'ocean', savedAt: '2025-01-01' },
        2: { pattern: 'StarfieldPattern', theme: 'starlight', savedAt: '2025-01-02' },
      };

      mockStore.get.mockReturnValue(favorites);

      const result = configLoader.getAllFavorites();
      expect(result).toEqual(favorites);
    });

    test('getAllFavorites returns empty object when none exist', () => {
      mockStore.get.mockReturnValue(undefined);

      const result = configLoader.getAllFavorites();
      expect(result).toEqual({});
    });

    test('deleteFavorite removes a favorite', () => {
      mockStore.get.mockReturnValue({
        1: { pattern: 'WavePattern', theme: 'ocean', savedAt: '2025-01-01' },
        2: { pattern: 'StarfieldPattern', theme: 'starlight', savedAt: '2025-01-02' },
      });

      configLoader.deleteFavorite(1);

      expect(mockStore.set).toHaveBeenCalledWith('favorites', {
        2: { pattern: 'StarfieldPattern', theme: 'starlight', savedAt: '2025-01-02' },
      });
    });

    test('deleteFavorite handles non-existent slot', () => {
      mockStore.get.mockReturnValue({
        1: { pattern: 'WavePattern', theme: 'ocean', savedAt: '2025-01-01' },
      });

      configLoader.deleteFavorite(99);

      expect(mockStore.set).toHaveBeenCalledWith('favorites', {
        1: { pattern: 'WavePattern', theme: 'ocean', savedAt: '2025-01-01' },
      });
    });
  });

  describe('Error Handling', () => {
    test('handles config file read errors', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      mockStore.has.mockImplementation(() => {
        throw new Error('File system error');
      });

      const config = configLoader.load();

      // Should still return defaults
      expect(config.defaultPattern).toBe('waves');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Warning: Could not load config file, using defaults'
      );

      consoleSpy.mockRestore();
    });
  });
});
