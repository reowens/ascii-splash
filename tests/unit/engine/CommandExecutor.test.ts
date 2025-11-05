/**
 * CommandExecutor Tests
 * 
 * Comprehensive test suite for CommandExecutor - the orchestrator that executes
 * parsed commands and manages pattern/theme/favorite state.
 * 
 * Coverage target: 95%+
 * Expected tests: ~70
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { CommandExecutor, ExecutionResult } from '../../../src/engine/CommandExecutor.js';
import { ParsedCommand } from '../../../src/engine/CommandParser.js';
import { AnimationEngine } from '../../../src/engine/AnimationEngine.js';
import { ConfigLoader } from '../../../src/config/ConfigLoader.js';
import { Pattern, Theme, FavoriteSlot } from '../../../src/types/index.js';

// Mock dependencies
jest.mock('../../../src/engine/AnimationEngine');
jest.mock('../../../src/config/ConfigLoader');

// Helper function to create ParsedCommand objects with required 'raw' property
const cmd = (type: ParsedCommand['type'], args: any, raw: string = 'test'): ParsedCommand => ({
  type,
  args,
  raw
});

// Base mock pattern with preset support
const createMockPatternClass = (className: string, hasPresets: boolean) => {
  const MockClass = class implements Partial<Pattern> {
    name: string = className;
    applyPreset?: (presetId: number) => boolean;
    reset = jest.fn();
    render = jest.fn();
    onMouseMove = jest.fn();
    onMouseClick = jest.fn();

    constructor() {
      if (hasPresets) {
        this.applyPreset = jest.fn((id: number) => id >= 1 && id <= 6);
      }
    }
  };

  // Only add static methods if pattern has presets
  if (hasPresets) {
    (MockClass as any).getPresets = jest.fn(() => [
      { id: 1, name: 'Preset 1' },
      { id: 2, name: 'Preset 2' },
      { id: 3, name: 'Preset 3' },
      { id: 4, name: 'Preset 4' },
      { id: 5, name: 'Preset 5' },
      { id: 6, name: 'Preset 6' }
    ]);

    (MockClass as any).getPreset = jest.fn((id: number) => {
      const presets = (MockClass as any).getPresets();
      return presets.find((p: any) => p.id === id);
    });
  }

  // Override the constructor name
  Object.defineProperty(MockClass, 'name', { value: className, writable: false });
  return MockClass;
};

// Create specific pattern classes
const WavePattern = createMockPatternClass('WavePattern', true);
const SimplePattern = createMockPatternClass('SimplePattern', false);
const StarfieldPattern = createMockPatternClass('StarfieldPattern', true);

// Mock Theme
const createMockTheme = (name: string, displayName: string): Theme => ({
  name,
  displayName,
  colors: [{ r: 0, g: 0, b: 0 }],
  getColor: jest.fn(() => ({ r: 0, g: 0, b: 0 }))
});

describe('CommandExecutor', () => {
  let executor: CommandExecutor;
  let mockEngine: jest.Mocked<AnimationEngine>;
  let mockConfigLoader: jest.Mocked<ConfigLoader>;
  let patterns: Pattern[];
  let themes: Theme[];

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Create mock engine
    mockEngine = {
      setPattern: jest.fn(),
      getFps: jest.fn(() => 30)
    } as any;

    // Create mock patterns using the specific classes
    patterns = [
      new WavePattern() as any,
      new SimplePattern() as any,
      new StarfieldPattern() as any
    ];

    // Create mock themes
    themes = [
      createMockTheme('ocean', 'Ocean'),
      createMockTheme('fire', 'Fire'),
      createMockTheme('matrix', 'Matrix')
    ];

    // Create mock config loader
    mockConfigLoader = {
      getFavorite: jest.fn(),
      saveFavorite: jest.fn(),
      getAllFavorites: jest.fn(() => ({})),
      deleteFavorite: jest.fn(),
      load: jest.fn(() => ({})),
      save: jest.fn(),
      getConfigPath: jest.fn(),
      reset: jest.fn()
    } as any;

    // Create executor
    executor = new CommandExecutor(
      mockEngine,
      patterns,
      themes,
      0, // currentPatternIndex
      0, // currentThemeIndex
      mockConfigLoader
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    executor.cleanup();
  });

  // =============================================================================
  // SECTION 1: Constructor & State Management
  // =============================================================================
  describe('Constructor & Initialization', () => {
    test('initializes with correct engine, patterns, themes', () => {
      expect(executor).toBeDefined();
      expect(executor.isShuffleActive()).toBe(false);
    });

    test('initializes with current pattern and theme indices', () => {
      const result = executor.execute(cmd('special', { specialCmd: 'patternList' }, '0p'));
      expect(result.success).toBe(true);
      expect(result.message).toContain('Wave');
    });

    test('works without config loader (optional)', () => {
      const executorNoConfig = new CommandExecutor(
        mockEngine,
        patterns,
        themes,
        0,
        0
      );
      const result = executorNoConfig.execute(cmd('favorite', { favoriteSlot: 1 }, '0f1'));
      expect(result.success).toBe(false);
      expect(result.message).toContain('Config loader not available');
    });
  });

  describe('State Management', () => {
    test('updateState updates current indices', () => {
      executor.updateState(2, 1);
      
      // Verify by checking pattern switch doesn't happen when already on pattern 2
      mockEngine.setPattern.mockClear();
      const result = executor.execute(cmd('pattern', { patternId: 3 }, '0p3'));
      expect(result.success).toBe(true);
    });

    test('setThemeChangeCallback registers callback', () => {
      const callback = jest.fn();
      executor.setThemeChangeCallback(callback);
      
      // Trigger theme change
      executor.execute(cmd('theme', { themeId: 2 }, '0t2'));
      
      expect(callback).toHaveBeenCalledWith(1); // Theme index 1 (0-based)
    });

    test('theme change callback is optional', () => {
      // Don't set callback
      const result = executor.execute(cmd('theme', { themeId: 2 }, '0t2'));
      expect(result.success).toBe(true);
    });
  });

  // =============================================================================
  // SECTION 2: Preset Commands
  // =============================================================================
  describe('executePreset()', () => {
    test('applies valid preset to current pattern', () => {
      const result = executor.execute(cmd('preset', { presetNumber: 3 }, '03'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('Applied preset 3');
      expect(result.message).toContain('WavePattern');
      expect(patterns[0].applyPreset).toHaveBeenCalledWith(3);
    });

    test('rejects preset for pattern without preset support', () => {
      // Switch to SimplePattern (no presets)
      executor.execute(cmd('pattern', { patternId: 2 }, '0p2'));

      const result = executor.execute(cmd('preset', { presetNumber: 1 }, '01'));

      expect(result.success).toBe(false);
      expect(result.message).toContain("doesn't support presets");
    });

    test('rejects invalid preset number', () => {
      const result = executor.execute(cmd('preset', { presetNumber: 99 }, '099'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('Preset 99 not found');
    });

    test('handles undefined preset number', () => {
      const result = executor.execute(cmd('preset', {}, '0'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid preset number');
    });

    test('applies preset 1 successfully', () => {
      const result = executor.execute(cmd('preset', { presetNumber: 1 }, '01'));

      expect(result.success).toBe(true);
      expect(patterns[0].applyPreset).toHaveBeenCalledWith(1);
    });

    test('applies preset 6 successfully', () => {
      const result = executor.execute(cmd('preset', { presetNumber: 6 }, '06'));

      expect(result.success).toBe(true);
      expect(patterns[0].applyPreset).toHaveBeenCalledWith(6);
    });
  });

  // =============================================================================
  // SECTION 3: Pattern Commands
  // =============================================================================
  describe('executePattern()', () => {
    test('switches pattern by number (1-based)', () => {
      const result = executor.execute(cmd('pattern', { patternId: 2 }, '0p2'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('Switched to pattern 2');
      expect(result.message).toContain('SimplePattern');
      expect(mockEngine.setPattern).toHaveBeenCalledWith(patterns[1]);
    });

    test('switches pattern by name (case-insensitive)', () => {
      const result = executor.execute(cmd('pattern', { patternId: 'starfield' }, '0pstarfield'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('StarfieldPattern');
      expect(mockEngine.setPattern).toHaveBeenCalledWith(patterns[2]);
    });

    test('switches pattern with preset', () => {
      const result = executor.execute(cmd('pattern', { patternId: 3, patternPreset: 4 }, '0p3.4'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('Switched to pattern 3');
      expect(result.message).toContain('preset 4');
      expect(mockEngine.setPattern).toHaveBeenCalledWith(patterns[2]);
      expect(patterns[2].applyPreset).toHaveBeenCalledWith(4);
    });

    test('handles pattern with invalid preset gracefully', () => {
      const result = executor.execute(cmd('pattern', { patternId: 3, patternPreset: 99 }, '0p3.99'));

      expect(result.success).toBe(true); // Pattern switch succeeds
      expect(result.message).toContain('Switched to pattern 3');
      expect(result.message).toContain('preset 99 not found');
    });

    test('handles pattern without preset support when preset requested', () => {
      const result = executor.execute(cmd('pattern', { patternId: 2, patternPreset: 1 }, '0p2.1'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('presets not supported');
    });

    test('rejects invalid pattern number', () => {
      const result = executor.execute(cmd('pattern', { patternId: 99 }, '0p99'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('Pattern "99" not found');
    });

    test('rejects invalid pattern name', () => {
      const result = executor.execute(cmd('pattern', { patternId: 'nonexistent' }, '0pnonexistent'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    test('handles undefined pattern ID', () => {
      const result = executor.execute(cmd('pattern', {}, '0p'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid pattern ID');
    });

    test('switches to pattern 1 by number', () => {
      executor.updateState(2, 0); // Start from different pattern
      const result = executor.execute(cmd('pattern', { patternId: 1 }, '0p1'));

      expect(result.success).toBe(true);
      expect(mockEngine.setPattern).toHaveBeenCalledWith(patterns[0]);
    });
  });

  // =============================================================================
  // SECTION 4: Theme Commands
  // =============================================================================
  describe('executeTheme()', () => {
    test('switches theme by number (1-based)', () => {
      const callback = jest.fn();
      executor.setThemeChangeCallback(callback);

      const result = executor.execute(cmd('theme', { themeId: 2 }, '0t2'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('Switched to theme: Fire');
      expect(callback).toHaveBeenCalledWith(1); // 0-based index
    });

    test('switches theme by name (case-insensitive)', () => {
      const callback = jest.fn();
      executor.setThemeChangeCallback(callback);

      const result = executor.execute(cmd('theme', { themeId: 'matrix' }, '0tmatrix'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('Matrix');
      expect(callback).toHaveBeenCalledWith(2);
    });

    test('rejects invalid theme number', () => {
      const result = executor.execute(cmd('theme', { themeId: 99 }, '0t99'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('Theme "99" not found');
    });

    test('rejects invalid theme name', () => {
      const result = executor.execute(cmd('theme', { themeId: 'nonexistent' }, '0tnonexistent'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    test('handles undefined theme ID', () => {
      const result = executor.execute(cmd('theme', {}, '0t'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid theme ID');
    });

    test('switches to first theme', () => {
      executor.updateState(0, 2); // Start from different theme
      const callback = jest.fn();
      executor.setThemeChangeCallback(callback);

      const result = executor.execute(cmd('theme', { themeId: 1 }, '0t1'));

      expect(result.success).toBe(true);
      expect(callback).toHaveBeenCalledWith(0);
    });
  });

  // =============================================================================
  // SECTION 5: Favorite Commands
  // =============================================================================
  describe('executeFavorite() - Load', () => {
    test('loads favorite with pattern, theme, and preset', () => {
      const favorite: FavoriteSlot = {
        pattern: 'StarfieldPattern',
        theme: 'fire',
        preset: 3,
        savedAt: new Date().toISOString()
      };
      mockConfigLoader.getFavorite.mockReturnValue(favorite);

      const callback = jest.fn();
      executor.setThemeChangeCallback(callback);

      const result = executor.execute(cmd('favorite', { favoriteSlot: 5 }, '0f5'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('Loaded favorite 5');
      expect(result.message).toContain('StarfieldPattern');
      expect(result.message).toContain('preset 3');
      expect(result.message).toContain('Fire');
      expect(mockEngine.setPattern).toHaveBeenCalledWith(patterns[2]);
      expect(callback).toHaveBeenCalledWith(1); // Fire theme index
      expect(patterns[2].applyPreset).toHaveBeenCalledWith(3);
    });

    test('loads favorite without preset', () => {
      const favorite: FavoriteSlot = {
        pattern: 'WavePattern',
        theme: 'ocean',
        savedAt: new Date().toISOString()
      };
      mockConfigLoader.getFavorite.mockReturnValue(favorite);

      const result = executor.execute(cmd('favorite', { favoriteSlot: 1 }, '0f1'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('Loaded favorite 1');
      expect(result.message).not.toContain('preset');
    });

    test('loads favorite with note', () => {
      const favorite: FavoriteSlot = {
        pattern: 'WavePattern',
        theme: 'ocean',
        note: 'Calm vibes',
        savedAt: new Date().toISOString()
      };
      mockConfigLoader.getFavorite.mockReturnValue(favorite);

      const result = executor.execute(cmd('favorite', { favoriteSlot: 1 }, '0f1'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('(Calm vibes)');
    });

    test('handles empty favorite slot', () => {
      mockConfigLoader.getFavorite.mockReturnValue(undefined);

      const result = executor.execute(cmd('favorite', { favoriteSlot: 10 }, '0f10'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('Favorite slot 10 is empty');
    });

    test('handles pattern not found in favorites', () => {
      const favorite: FavoriteSlot = {
        pattern: 'NonExistentPattern',
        theme: 'ocean',
        savedAt: new Date().toISOString()
      };
      mockConfigLoader.getFavorite.mockReturnValue(favorite);

      const result = executor.execute(cmd('favorite', { favoriteSlot: 1 }, '0f1'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('Pattern "NonExistentPattern" not found');
    });

    test('handles theme not found in favorites', () => {
      const favorite: FavoriteSlot = {
        pattern: 'WavePattern',
        theme: 'nonexistent',
        savedAt: new Date().toISOString()
      };
      mockConfigLoader.getFavorite.mockReturnValue(favorite);

      const result = executor.execute(cmd('favorite', { favoriteSlot: 1 }, '0f1'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('Theme "nonexistent" not found');
    });

    test('handles undefined favorite slot', () => {
      const result = executor.execute(cmd('favorite', {}, '0f'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid favorite slot');
    });

    test('handles missing config loader', () => {
      const executorNoConfig = new CommandExecutor(
        mockEngine,
        patterns,
        themes,
        0,
        0
      );

      const result = executorNoConfig.execute(cmd('favorite', { favoriteSlot: 1 }, '0f1'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('Config loader not available');
    });

    test('does not change theme if already on correct theme', () => {
      const favorite: FavoriteSlot = {
        pattern: 'StarfieldPattern',
        theme: 'ocean', // Already on this theme (index 0)
        savedAt: new Date().toISOString()
      };
      mockConfigLoader.getFavorite.mockReturnValue(favorite);

      const callback = jest.fn();
      executor.setThemeChangeCallback(callback);

      const result = executor.execute(cmd('favorite', { favoriteSlot: 1 }, '0f1'));

      expect(result.success).toBe(true);
      expect(callback).not.toHaveBeenCalled(); // Theme unchanged
    });
  });

  describe('executeSaveFavorite()', () => {
    test('saves current state to favorite slot', () => {
      const result = executor.execute(cmd('saveFavorite', { favoriteSlot: 3 }, '0F3'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('Saved to favorite 3');
      expect(result.message).toContain('WavePattern');
      expect(result.message).toContain('Ocean');
      expect(mockConfigLoader.saveFavorite).toHaveBeenCalledWith(
        3,
        expect.objectContaining({
          pattern: 'WavePattern',
          theme: 'ocean'
        })
      );
    });

    test('saved favorite includes timestamp', () => {
      executor.execute(cmd('saveFavorite', { favoriteSlot: 1 }, '0F1'));

      expect(mockConfigLoader.saveFavorite).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          savedAt: expect.any(String)
        })
      );
    });

    test('handles undefined favorite slot', () => {
      const result = executor.execute(cmd('saveFavorite', {}, '0F'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid favorite slot');
    });

    test('handles missing config loader', () => {
      const executorNoConfig = new CommandExecutor(
        mockEngine,
        patterns,
        themes,
        0,
        0
      );

      const result = executorNoConfig.execute(cmd('saveFavorite', { favoriteSlot: 1 }, '0F1'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('Config loader not available');
    });

    test('saves from different pattern and theme', () => {
      executor.updateState(2, 1); // StarfieldPattern, Fire theme

      const result = executor.execute(cmd('saveFavorite', { favoriteSlot: 7 }, '0F7'));

      expect(result.success).toBe(true);
      expect(mockConfigLoader.saveFavorite).toHaveBeenCalledWith(
        7,
        expect.objectContaining({
          pattern: 'StarfieldPattern',
          theme: 'fire'
        })
      );
    });
  });

  // =============================================================================
  // SECTION 6: Special Commands - List/Catalog
  // =============================================================================
  describe('Special Commands - Lists', () => {
    test('listPresets shows presets for current pattern', () => {
      const result = executor.execute(cmd('special', { specialCmd: 'listPresets' }, '0?'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('Presets for Wave');
      expect(result.message).toContain('1:Preset 1');
      expect(result.message).toContain('6:Preset 6');
    });

    test('listPresets handles pattern without presets', () => {
      executor.updateState(1, 0); // SimplePattern (no presets)

      const result = executor.execute(cmd('special', { specialCmd: 'listPresets' }, '0?'));

      expect(result.success).toBe(false);
      expect(result.message).toContain("doesn't support presets");
    });

    test('catalogPresets shows all patterns with presets', () => {
      const result = executor.execute(cmd('special', { specialCmd: 'catalogPresets' }, '0??'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('Catalog:');
      expect(result.message).toContain('1.Wave');
      expect(result.message).toContain('3.Starfield');
      expect(result.message).not.toContain('2.Simple'); // No presets
    });

    test('patternList shows all patterns', () => {
      const result = executor.execute(cmd('special', { specialCmd: 'patternList' }, '0p'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('Patterns:');
      expect(result.message).toContain('1:Wave');
      expect(result.message).toContain('2:Simple');
      expect(result.message).toContain('3:Starfield');
    });

    test('themePicker shows all themes', () => {
      const result = executor.execute(cmd('special', { specialCmd: 'themePicker' }, '0t'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('Themes:');
      expect(result.message).toContain('1:Ocean');
      expect(result.message).toContain('2:Fire');
      expect(result.message).toContain('3:Matrix');
    });

    test('favoriteList shows all favorites', () => {
      mockConfigLoader.getAllFavorites.mockReturnValue({
        1: {
          pattern: 'WavePattern',
          theme: 'ocean',
          preset: 2,
          savedAt: '2025-01-01T00:00:00.000Z'
        },
        5: {
          pattern: 'StarfieldPattern',
          theme: 'fire',
          note: 'Cool effect',
          savedAt: '2025-01-02T00:00:00.000Z'
        }
      });

      const result = executor.execute(cmd('special', { specialCmd: 'favoriteList' }, '0fl'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('Favorites:');
      expect(result.message).toContain('1:Wave.2+ocean');
      expect(result.message).toContain('5:Starfield+fire "Cool effect"');
    });

    test('favoriteList handles empty favorites', () => {
      mockConfigLoader.getAllFavorites.mockReturnValue({});

      const result = executor.execute(cmd('special', { specialCmd: 'favoriteList' }, '0fl'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('No favorites saved yet');
    });

    test('favoriteList handles missing config loader', () => {
      const executorNoConfig = new CommandExecutor(
        mockEngine,
        patterns,
        themes,
        0,
        0
      );

      const result = executorNoConfig.execute(cmd('special', { specialCmd: 'favoriteList' }, '0fl'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('Config loader not available');
    });
  });

  // =============================================================================
  // SECTION 7: Special Commands - Randomization
  // =============================================================================
  describe('Special Commands - Randomization', () => {
    beforeEach(() => {
      // Mock Math.random for predictable tests
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
    });

    test('randomPreset applies random preset to current pattern', () => {
      const result = executor.execute(cmd('special', { specialCmd: 'randomPreset' }, '0*'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('Random preset:');
      expect(patterns[0].applyPreset).toHaveBeenCalled();
    });

    test('randomPreset handles pattern without presets', () => {
      executor.updateState(1, 0); // SimplePattern

      const result = executor.execute(cmd('special', { specialCmd: 'randomPreset' }, '0*'));

      expect(result.success).toBe(false);
      expect(result.message).toContain("doesn't support presets");
    });

    test('randomAll switches to random pattern, preset, and theme', () => {
      const callback = jest.fn();
      executor.setThemeChangeCallback(callback);

      const result = executor.execute(cmd('special', { specialCmd: 'randomAll' }, '0**'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('Random:');
      expect(mockEngine.setPattern).toHaveBeenCalled();
      expect(callback).toHaveBeenCalled();
    });

    test('randomAll includes theme name in message', () => {
      const result = executor.execute(cmd('special', { specialCmd: 'randomAll' }, '0**'));

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/Ocean|Fire|Matrix/);
    });

    test('randomTheme switches to random theme', () => {
      const callback = jest.fn();
      executor.setThemeChangeCallback(callback);

      const result = executor.execute(cmd('special', { specialCmd: 'randomTheme' }, '0tr'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('Random theme:');
      expect(callback).toHaveBeenCalled();
    });

    test('randomize switches pattern and theme', () => {
      const callback = jest.fn();
      executor.setThemeChangeCallback(callback);

      const result = executor.execute(cmd('special', { specialCmd: 'randomize' }, '0x'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('Randomized:');
      expect(mockEngine.setPattern).toHaveBeenCalled();
      expect(callback).toHaveBeenCalled();
    });
  });

  // =============================================================================
  // SECTION 8: Special Commands - Config & Reset
  // =============================================================================
  describe('Special Commands - Config & Reset', () => {
    test('save saves current state to config file', () => {
      mockConfigLoader.load.mockReturnValue({});

      const result = executor.execute(cmd('special', { specialCmd: 'save' }, '0s'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('Saved:');
      expect(result.message).toContain('WavePattern');
      expect(result.message).toContain('Ocean');
      expect(result.message).toContain('30fps');
      expect(mockConfigLoader.save).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultPattern: 'wave',
          theme: 'ocean',
          fps: 30
        })
      );
    });

    test('save handles missing config loader', () => {
      const executorNoConfig = new CommandExecutor(
        mockEngine,
        patterns,
        themes,
        0,
        0
      );

      const result = executorNoConfig.execute(cmd('special', { specialCmd: 'save' }, '0s'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('Config loader not available');
    });

    test('reset calls pattern reset method', () => {
      const result = executor.execute(cmd('special', { specialCmd: 'reset' }, '0r'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('Reset: WavePattern');
      expect(patterns[0].reset).toHaveBeenCalled();
    });
  });

  // =============================================================================
  // SECTION 9: Special Commands - Search
  // =============================================================================
  describe('Special Commands - Search', () => {
    test('search finds patterns by name', () => {
      const result = executor.execute(cmd('special', { specialCmd: 'search', specialArg: 'wave' }, '0/wave'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('Found:');
      expect(result.message).toContain('P1:Wave');
    });

    test('search finds themes by name', () => {
      const result = executor.execute(cmd('special', { specialCmd: 'search', specialArg: 'fire' }, '0/fire'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('T2:Fire');
    });

    test('search finds both patterns and themes', () => {
      const result = executor.execute(cmd('special', { specialCmd: 'search', specialArg: 'a' }, '0/a'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('P1:Wave'); // Contains 'a'
      expect(result.message).toContain('P3:Starfield'); // Contains 'a'
      expect(result.message).toContain('T1:Ocean'); // Contains 'a'
      expect(result.message).toContain('T3:Matrix'); // Contains 'a'
    });

    test('search is case-insensitive', () => {
      const result = executor.execute(cmd('special', { specialCmd: 'search', specialArg: 'WAVE' }, '0/WAVE'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('P1:Wave');
    });

    test('search handles no matches', () => {
      const result = executor.execute(cmd('special', { specialCmd: 'search', specialArg: 'xyz123' }, '0/xyz123'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('No matches for "xyz123"');
    });

    test('search requires term', () => {
      const result = executor.execute(cmd('special', { specialCmd: 'search', specialArg: '' }, '0/'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('Search term required');
    });

    test('search without specialArg fails', () => {
      const result = executor.execute(cmd('special', { specialCmd: 'search' }, '0/'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('Search term required');
    });
  });

  // =============================================================================
  // SECTION 10: Shuffle Mode
  // =============================================================================
  describe('Shuffle Mode', () => {
    test('toggles shuffle on with default interval', () => {
      const result = executor.execute(cmd('special', { specialCmd: 'shuffle' }, '0!'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('Shuffle mode enabled');
      expect(result.message).toContain('10s intervals');
      expect(result.message).toContain('presets only');
      expect(executor.isShuffleActive()).toBe(true);
    });

    test('toggles shuffle off when already active', () => {
      // Turn on
      executor.execute(cmd('special', { specialCmd: 'shuffle' }, '0!'));

      // Turn off
      const result = executor.execute(cmd('special', { specialCmd: 'shuffle' }, '0!'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('Shuffle mode disabled');
      expect(executor.isShuffleActive()).toBe(false);
    });

    test('sets custom shuffle interval', () => {
      const result = executor.execute(cmd('special', { specialCmd: 'shuffle', specialArg: '5' }, '0!5'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('5s intervals');
    });

    test('rejects invalid shuffle interval (too low)', () => {
      const result = executor.execute(cmd('special', { specialCmd: 'shuffle', specialArg: '0' }, '0!0'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('Shuffle interval must be 1-300 seconds');
    });

    test('rejects invalid shuffle interval (too high)', () => {
      const result = executor.execute(cmd('special', { specialCmd: 'shuffle', specialArg: '500' }, '0!500'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('Shuffle interval must be 1-300 seconds');
    });

    test('rejects non-numeric shuffle interval', () => {
      const result = executor.execute(cmd('special', { specialCmd: 'shuffle', specialArg: 'abc' }, '0!abc'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('Shuffle interval must be 1-300 seconds');
    });

    test('shuffle timer triggers randomPreset', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      executor.execute(cmd('special', { specialCmd: 'shuffle' }, '0!'));

      // Advance timer by 10 seconds
      jest.advanceTimersByTime(10000);

      expect(patterns[0].applyPreset).toHaveBeenCalled();
    });

    test('shuffle timer respects custom interval', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      executor.execute(cmd('special', { specialCmd: 'shuffle', specialArg: '3' }, '0!3'));

      // Advance by 3 seconds
      jest.advanceTimersByTime(3000);

      expect(patterns[0].applyPreset).toHaveBeenCalled();
    });

    test('shuffle stops when toggled off', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      executor.execute(cmd('special', { specialCmd: 'shuffle' }, '0!'));

      // Clear mock calls from activation
      (patterns[0].applyPreset as jest.Mock).mockClear();

      // Toggle off
      executor.execute(cmd('special', { specialCmd: 'shuffle' }, '0!'));

      // Advance timer
      jest.advanceTimersByTime(10000);

      // Should NOT trigger preset change
      expect(patterns[0].applyPreset).not.toHaveBeenCalled();
    });

    test('getShuffleInfo returns correct info when active', () => {
      executor.execute(cmd('special', { specialCmd: 'shuffle', specialArg: '7' }, '0!7'));

      const info = executor.getShuffleInfo();
      expect(info).toContain('Shuffle: PRESET');
      expect(info).toContain('7s');
    });

    test('getShuffleInfo returns empty string when inactive', () => {
      const info = executor.getShuffleInfo();
      expect(info).toBe('');
    });
  });

  describe('Shuffle All Mode', () => {
    test('toggles shuffle all on', () => {
      const result = executor.execute(cmd('special', { specialCmd: 'shuffleAll' }, '0!!'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('Shuffle all mode enabled');
      expect(result.message).toContain('patterns + presets + themes');
      expect(executor.isShuffleActive()).toBe(true);
    });

    test('toggles shuffle all off when already active', () => {
      // Turn on
      executor.execute(cmd('special', { specialCmd: 'shuffleAll' }, '0!!'));

      // Turn off
      const result = executor.execute(cmd('special', { specialCmd: 'shuffleAll' }, '0!!'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('Shuffle all mode disabled');
      expect(executor.isShuffleActive()).toBe(false);
    });

    test('shuffle all timer triggers randomAll', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      const callback = jest.fn();
      executor.setThemeChangeCallback(callback);

      executor.execute(cmd('special', { specialCmd: 'shuffleAll' }, '0!!'));

      // Clear previous calls
      mockEngine.setPattern.mockClear();
      callback.mockClear();

      // Advance timer by 10 seconds
      jest.advanceTimersByTime(10000);

      expect(mockEngine.setPattern).toHaveBeenCalled();
      expect(callback).toHaveBeenCalled();
    });

    test('getShuffleInfo returns ALL mode when shuffle all active', () => {
      executor.execute(cmd('special', { specialCmd: 'shuffleAll' }, '0!!'));

      const info = executor.getShuffleInfo();
      expect(info).toContain('Shuffle: ALL');
    });

    test('cleanup stops shuffle timer', () => {
      executor.execute(cmd('special', { specialCmd: 'shuffle' }, '0!'));

      expect(executor.isShuffleActive()).toBe(true);

      executor.cleanup();

      expect(executor.isShuffleActive()).toBe(false);
    });
  });

  // =============================================================================
  // SECTION 11: Combination Commands
  // =============================================================================
  describe('Combination Commands', () => {
    test('executes multiple commands in sequence', () => {
      const callback = jest.fn();
      executor.setThemeChangeCallback(callback);

      const result = executor.execute(cmd('combination', {
        commands: [
          cmd('pattern', { patternId: 1 }, '0p1'),
          cmd('theme', { themeId: 2 }, '0t2'),
          cmd('preset', { presetNumber: 3 }, '03')
        ]
      }, '0p1+t2+03'));

      expect(result.success).toBe(true);
      expect(result.message).toContain('Switched to pattern 1');
      expect(result.message).toContain('Switched to theme: Fire');
      expect(result.message).toContain('Applied preset 3');
      expect(mockEngine.setPattern).toHaveBeenCalled();
      expect(callback).toHaveBeenCalled();
    });

    test('reports failure if any sub-command fails', () => {
      const result = executor.execute(cmd('combination', {
        commands: [
          cmd('pattern', { patternId: 1 }, '0p1'),
          cmd('pattern', { patternId: 99 }, '0p99'),
          cmd('theme', { themeId: 1 }, '0t1')
        ]
      }, 'test'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('❌');
      expect(result.message).toContain('not found');
    });

    test('executes successful commands even if others fail', () => {
      const callback = jest.fn();
      executor.setThemeChangeCallback(callback);

      const result = executor.execute(cmd('combination', {
        commands: [
          cmd('theme', { themeId: 2 }, '0t2'),
          cmd('pattern', { patternId: 99 }, '0p99'),
          cmd('theme', { themeId: 3 }, '0t3')
        ]
      }, 'test'));

      expect(result.success).toBe(false);
      expect(callback).toHaveBeenCalledTimes(2); // Both theme changes
    });

    test('handles empty combination', () => {
      const result = executor.execute(cmd('combination', { commands: [] }, '0'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('Empty combination');
    });

    test('handles missing commands array', () => {
      const result = executor.execute(cmd('combination', {}, '0'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('Empty combination');
    });

    test('combines pattern and preset', () => {
      const result = executor.execute(cmd('combination', {
        commands: [
          cmd('pattern', { patternId: 3 }, '0p3'),
          cmd('preset', { presetNumber: 4 }, '04')
        ]
      }, '0p3.4'));

      expect(result.success).toBe(true);
      expect(mockEngine.setPattern).toHaveBeenCalledWith(patterns[2]);
      expect(patterns[2].applyPreset).toHaveBeenCalledWith(4);
    });
  });

  // =============================================================================
  // SECTION 12: Unimplemented Commands
  // =============================================================================
  describe('Unimplemented Commands', () => {
    test('undo returns not implemented', () => {
      const result = executor.execute(cmd('special', { specialCmd: 'undo' }, '0u'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('Undo not implemented yet');
    });

    test('repeat returns not implemented', () => {
      const result = executor.execute(cmd('special', { specialCmd: 'repeat' }, '0.'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('Repeat not implemented yet');
    });

    test('history returns not implemented', () => {
      const result = executor.execute(cmd('special', { specialCmd: 'history' }, '0h'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('History not implemented yet');
    });
  });

  // =============================================================================
  // SECTION 13: Edge Cases & Error Handling
  // =============================================================================
  describe('Edge Cases', () => {
    test('handles unknown command type', () => {
      const result = executor.execute(cmd('unknown' as any, {}, 'test'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('Unknown command type');
    });

    test('handles unknown special command', () => {
      const result = executor.execute(cmd('special', { specialCmd: 'unknownSpecial' }, 'test'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('Unknown special command');
    });

    test('handles missing specialCmd', () => {
      const result = executor.execute(cmd('special', {}, '0'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid special command');
    });

    test('handles pattern without constructor name', () => {
      // Edge case: pattern without proper constructor
      const weirdPattern = { name: 'Weird' } as any;
      const weirdPatterns = [weirdPattern];
      const weirdExecutor = new CommandExecutor(
        mockEngine,
        weirdPatterns,
        themes,
        0,
        0,
        mockConfigLoader
      );

      const result = weirdExecutor.execute(cmd('special', { specialCmd: 'patternList' }, '0p'));

      expect(result.success).toBe(true);
    });

    test('handles rapid command execution', () => {
      for (let i = 0; i < 20; i++) {
        const result = executor.execute(cmd('theme', { themeId: (i % 3) + 1 }, `0t${(i % 3) + 1}`));
        expect(result.success).toBe(true);
      }
    });

    test('handles preset application failure gracefully', () => {
      // Mock applyPreset to return false
      (patterns[0].applyPreset as jest.Mock).mockReturnValueOnce(false);

      const result = executor.execute(cmd('preset', { presetNumber: 3 }, '03'));

      expect(result.success).toBe(false);
      expect(result.message).toContain('Preset 3 not found');
    });
  });
});
