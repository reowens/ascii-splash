/**
 * Unit tests for ConfigLoader
 * Target: 85%+ coverage
 * 
 * Note: We mock the Conf library since it interacts with the filesystem
 */

import { ConfigLoader } from '../../../src/config/ConfigLoader';
import { ConfigSchema, CliOptions, FavoriteSlot } from '../../../src/types';
import { defaultConfig, qualityPresets } from '../../../src/config/defaults';

// Mock the Conf library
jest.mock('conf');

describe('ConfigLoader', () => {
  let configLoader: ConfigLoader;
  let mockStore: any;

  beforeEach(() => {
    // Reset mock before each test
    mockStore = {
      has: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      clear: jest.fn(),
      path: '/mock/path/.splashrc.json'
    };

    // Mock Conf constructor to return our mock store
    const Conf = require('conf');
    Conf.mockImplementation(() => mockStore);

    configLoader = new ConfigLoader();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Construction', () => {
    test('initializes with correct project name', () => {
      const Conf = require('conf');
      expect(Conf).toHaveBeenCalledWith({
        projectName: 'ascii-splash',
        defaults: defaultConfig,
        configName: '.splashrc'
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
        theme: 'fire'
      };

      const config = configLoader.load(cliOptions);

      expect(config.defaultPattern).toBe('starfield');
      expect(config.fps).toBe(60);
      expect(config.theme).toBe('fire');
    });

    test('CLI options override file config', () => {
      // File says waves, CLI says starfield
      mockStore.has.mockImplementation((key: string) => key === 'defaultPattern');
      mockStore.get.mockImplementation((key: string) => {
        if (key === 'defaultPattern') return 'waves';
      });

      const cliOptions: CliOptions = {
        pattern: 'starfield'
      };

      const config = configLoader.load(cliOptions);

      expect(config.defaultPattern).toBe('starfield'); // CLI wins
    });

    test('loads all config file settings', () => {
      mockStore.has.mockReturnValue(true);
      mockStore.get.mockImplementation((key: string) => {
        const fileConfig: any = {
          defaultPattern: 'matrix',
          quality: 'high',
          fps: 45,
          theme: 'starlight',
          mouseEnabled: false,
          patterns: {
            waves: { frequency: 0.2 }
          },
          favorites: {
            1: { pattern: 'WavePattern', theme: 'ocean' }
          }
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
        quality: 'high'
      };

      const config = configLoader.load(cliOptions);

      expect(config.quality).toBe('high');
    });

    test('handles mouse CLI option', () => {
      mockStore.has.mockReturnValue(false);

      const cliOptions: CliOptions = {
        mouse: false
      };

      const config = configLoader.load(cliOptions);

      expect(config.mouseEnabled).toBe(false);
    });

    test('deep merges pattern configurations', () => {
      // File has partial wave config
      mockStore.has.mockImplementation((key: string) => key === 'patterns');
      mockStore.get.mockImplementation((key: string) => {
        if (key === 'patterns') {
          return {
            waves: { frequency: 0.5 } // Only override frequency
          };
        }
      });

      const config = configLoader.load();

      // Should have default values + overridden frequency
      expect(config.patterns?.waves?.frequency).toBe(0.5);
      expect(config.patterns?.waves?.amplitude).toBe(3); // From defaults
      expect(config.patterns?.waves?.layers).toBe(3); // From defaults
    });
  });

  describe('save()', () => {
    test('saves config to store', () => {
      const config: ConfigSchema = {
        defaultPattern: 'starfield',
        fps: 60,
        theme: 'fire'
      };

      configLoader.save(config);

      expect(mockStore.set).toHaveBeenCalledWith(config);
    });

    test('handles save errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
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
        quality: 'high'
      };

      const fps = ConfigLoader.getFpsFromConfig(config);
      expect(fps).toBe(45); // Explicit fps takes priority
    });

    test('returns quality preset fps when no explicit fps', () => {
      const config: ConfigSchema = {
        quality: 'high'
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
        quality: 'low'
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
        savedAt: '2025-01-01T00:00:00.000Z'
      };

      mockStore.get.mockReturnValue({
        1: favorite
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
        savedAt: '2025-01-01T00:00:00.000Z'
      };

      configLoader.saveFavorite(1, favorite);

      expect(mockStore.set).toHaveBeenCalledWith('favorites', {
        1: favorite
      });
    });

    test('saveFavorite updates existing favorite', () => {
      const oldFavorite: FavoriteSlot = {
        pattern: 'WavePattern',
        theme: 'ocean',
        savedAt: '2025-01-01T00:00:00.000Z'
      };

      mockStore.get.mockReturnValue({
        1: oldFavorite,
        2: { pattern: 'MatrixPattern', theme: 'matrix', savedAt: '2025-01-01' }
      });

      const newFavorite: FavoriteSlot = {
        pattern: 'StarfieldPattern',
        theme: 'starlight',
        savedAt: '2025-01-02T00:00:00.000Z'
      };

      configLoader.saveFavorite(1, newFavorite);

      expect(mockStore.set).toHaveBeenCalledWith('favorites', {
        1: newFavorite,
        2: { pattern: 'MatrixPattern', theme: 'matrix', savedAt: '2025-01-01' }
      });
    });

    test('getAllFavorites returns all favorites', () => {
      const favorites = {
        1: { pattern: 'WavePattern', theme: 'ocean', savedAt: '2025-01-01' },
        2: { pattern: 'StarfieldPattern', theme: 'starlight', savedAt: '2025-01-02' }
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
        2: { pattern: 'StarfieldPattern', theme: 'starlight', savedAt: '2025-01-02' }
      });

      configLoader.deleteFavorite(1);

      expect(mockStore.set).toHaveBeenCalledWith('favorites', {
        2: { pattern: 'StarfieldPattern', theme: 'starlight', savedAt: '2025-01-02' }
      });
    });

    test('deleteFavorite handles non-existent slot', () => {
      mockStore.get.mockReturnValue({
        1: { pattern: 'WavePattern', theme: 'ocean', savedAt: '2025-01-01' }
      });

      configLoader.deleteFavorite(99);

      expect(mockStore.set).toHaveBeenCalledWith('favorites', {
        1: { pattern: 'WavePattern', theme: 'ocean', savedAt: '2025-01-01' }
      });
    });
  });

  describe('Error Handling', () => {
    test('handles config file read errors', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
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
