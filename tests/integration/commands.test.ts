/**
 * Command System Integration Tests
 *
 * Tests the full command pipeline from input to execution
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { CommandBuffer } from '../../src/engine/CommandBuffer.js';
import { CommandParser } from '../../src/engine/CommandParser.js';
import { CommandExecutor } from '../../src/engine/CommandExecutor.js';
import { RuntimeController } from '../../src/engine/RuntimeController.js';
import { createMockTheme } from '../utils/mocks.js';
import { WavePattern } from '../../src/patterns/WavePattern.js';
import { StarfieldPattern } from '../../src/patterns/StarfieldPattern.js';
import { MatrixPattern } from '../../src/patterns/MatrixPattern.js';
import { Pattern, PatternSlot, Theme } from '../../src/types/index.js';

// Mock AnimationEngine for testing
class MockAnimationEngine {
  private currentPattern: Pattern;
  private fps = 30;

  constructor(pattern: Pattern) {
    this.currentPattern = pattern;
  }

  setPattern(pattern: Pattern): void {
    this.currentPattern = pattern;
  }

  getPattern(): Pattern {
    return this.currentPattern;
  }

  getFps(): number {
    return this.fps;
  }

  setFps(fps: number): void {
    this.fps = fps;
  }
}

describe('Command System Integration Tests', () => {
  let mockTheme: Theme;
  let patterns: Pattern[];
  let themes: Theme[];
  let mockEngine: MockAnimationEngine;
  let executor: CommandExecutor;
  let parser: CommandParser;
  let runtime: RuntimeController;

  beforeEach(() => {
    mockTheme = createMockTheme('ocean');
    patterns = [
      new WavePattern(mockTheme),
      new StarfieldPattern(mockTheme),
      new MatrixPattern(mockTheme),
    ];
    themes = [createMockTheme('ocean'), createMockTheme('matrix'), createMockTheme('fire')];
    mockEngine = new MockAnimationEngine(patterns[0]);
    const slots: PatternSlot[] = patterns.map(pattern => {
      const patternClass = pattern.constructor as unknown as {
        getPresets: () => Array<{ id: number; name: string }>;
      };
      const legacyName = pattern.constructor.name;
      return {
        key: legacyName.replace('Pattern', '').toLowerCase(),
        displayName: legacyName.replace('Pattern', ''),
        kind: 'procedural',
        pattern,
        seed: 1,
        shareable: true,
        presets: patternClass.getPresets(),
        legacyNames: [legacyName],
      };
    });
    runtime = new RuntimeController({
      engine: mockEngine,
      themes,
      initialSlots: slots,
      initialPatternIndex: 0,
      initialThemeIndex: 0,
      initialQuality: 'medium',
      rebuildSlots: () => slots,
    });
    executor = new CommandExecutor(runtime);
    parser = new CommandParser();
  });

  describe('Command Buffer', () => {
    test('should activate and accumulate keystrokes', () => {
      const buffer = new CommandBuffer();

      buffer.activate(); // Starts with '0'
      expect(buffer.getBuffer()).toBe('0');

      buffer.addChar('1');
      expect(buffer.getBuffer()).toBe('01');

      buffer.addChar('2');
      expect(buffer.getBuffer()).toBe('012');

      buffer.cancel();
    });

    test('should deactivate and clear buffer', () => {
      const buffer = new CommandBuffer();

      buffer.activate();
      buffer.addChar('1');
      buffer.deactivate();

      expect(buffer.getBuffer()).toBe('');
      expect(buffer.isActive()).toBe(false);
    });

    test('should check if buffer is active', () => {
      const buffer = new CommandBuffer();

      expect(buffer.isActive()).toBe(false);

      buffer.activate();
      expect(buffer.isActive()).toBe(true);

      buffer.cancel();

      buffer.deactivate();
      expect(buffer.isActive()).toBe(false);
    });

    test('should execute and return command', () => {
      const buffer = new CommandBuffer();

      buffer.activate();
      buffer.addChar('1');
      buffer.addChar('2');
      const command = buffer.execute();

      expect(command).toBe('012');
      expect(buffer.isActive()).toBe(false);
    });

    test('should support backspace', () => {
      const buffer = new CommandBuffer();

      buffer.activate();
      buffer.addChar('1');
      buffer.addChar('2');
      expect(buffer.getBuffer()).toBe('012');

      buffer.backspace();
      expect(buffer.getBuffer()).toBe('01');

      buffer.cancel();
    });

    test('should maintain command history', () => {
      const buffer = new CommandBuffer();

      buffer.activate();
      buffer.addChar('1');
      buffer.execute();

      buffer.activate();
      buffer.addChar('2');
      buffer.execute();

      expect(buffer.getHistory()).toEqual(['01', '02']);
    });
  });

  describe('Command Parser', () => {
    test('should parse preset commands', () => {
      const result = parser.parse('001');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('preset');
      expect(result?.args.presetNumber).toBe(1);
    });

    test('should parse pattern switch commands', () => {
      const result = parser.parse('0p2');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('pattern');
      expect(result?.args.patternId).toBe(2);
    });

    test('should parse pattern switch with preset', () => {
      const result = parser.parse('0p2.3');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('pattern');
      expect(result?.args.patternId).toBe(2);
      expect(result?.args.patternPreset).toBe(3);
    });

    test('should parse theme switch commands', () => {
      const result = parser.parse('0t2');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('theme');
      expect(result?.args.themeId).toBe(2);
    });

    test('should parse random preset command', () => {
      const result = parser.parse('0*');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('special');
      expect(result?.args.specialCmd).toBe('randomPreset');
    });

    test('should parse random all command', () => {
      const result = parser.parse('0**');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('special');
      expect(result?.args.specialCmd).toBe('randomAll');
    });

    test('should parse save favorite command', () => {
      const result = parser.parse('0F1');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('saveFavorite');
      expect(result?.args.favoriteSlot).toBe(1);
    });

    test('should parse load favorite command', () => {
      const result = parser.parse('0f1');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('favorite');
      expect(result?.args.favoriteSlot).toBe(1);
    });

    test('should parse shuffle command', () => {
      const result = parser.parse('0!');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('special');
      expect(result?.args.specialCmd).toBe('shuffle');
    });

    test('should parse shuffle all command', () => {
      const result = parser.parse('0!!');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('special');
      expect(result?.args.specialCmd).toBe('shuffleAll');
    });

    test('should return null for invalid commands', () => {
      expect(parser.parse('')).toBeNull();
      expect(parser.parse('0')).toBeNull();
    });

    test('should parse list presets command', () => {
      const result = parser.parse('0?');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('special');
      expect(result?.args.specialCmd).toBe('listPresets');
    });

    test('should parse search command', () => {
      const result = parser.parse('0/wave');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('special');
      expect(result?.args.specialCmd).toBe('search');
      expect(result?.args.specialArg).toBe('wave');
    });

    test('should parse reset command', () => {
      const result = parser.parse('0x');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('special');
      expect(result?.args.specialCmd).toBe('reset');
    });

    test('should parse combination commands', () => {
      const result = parser.parse('0p2+3');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('combination');
      expect(result?.args.commands).toHaveLength(2);
    });
  });

  describe('Command Executor', () => {
    test('should execute preset command', () => {
      const command = parser.parse('001');
      expect(command).not.toBeNull();

      const result = executor.execute(command!);
      expect(result.success).toBe(true);
      expect(result.message).toContain('preset');
    });

    test('should execute pattern switch command', () => {
      const command = parser.parse('0p2');
      expect(command).not.toBeNull();

      const result = executor.execute(command!);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Switched to pattern');
    });

    test('should execute theme switch command', () => {
      let themeChanged = false;
      runtime.subscribe(event => {
        if (event.previous.themeIndex !== event.current.themeIndex) themeChanged = true;
      });

      const command = parser.parse('0t2');
      expect(command).not.toBeNull();

      const result = executor.execute(command!);
      expect(result.success).toBe(true);
      expect(themeChanged).toBe(true);
    });

    test('should execute random preset command', () => {
      const command = parser.parse('0*');
      expect(command).not.toBeNull();

      const result = executor.execute(command!);
      expect(result.success).toBe(true);
      expect(result.message).toContain('preset');
    });

    test('should execute random all command', () => {
      let sceneChanged = false;
      runtime.subscribe(event => {
        if (event.kind === 'scene') sceneChanged = true;
      });

      const command = parser.parse('0**');
      expect(command).not.toBeNull();

      const result = executor.execute(command!);
      expect(result.success).toBe(true);
      expect(sceneChanged).toBe(true);
    });

    test('should fail for invalid preset number', () => {
      const command = parser.parse('099');
      expect(command).not.toBeNull();

      const result = executor.execute(command!);
      expect(result.success).toBe(false);
    });

    test('should fail for invalid pattern number', () => {
      const command = parser.parse('0p99');
      expect(command).not.toBeNull();

      const result = executor.execute(command!);
      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    test('should fail for invalid theme number', () => {
      const command = parser.parse('0t99');
      expect(command).not.toBeNull();

      const result = executor.execute(command!);
      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    test('should execute list presets command', () => {
      const command = parser.parse('0?');
      expect(command).not.toBeNull();

      const result = executor.execute(command!);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Presets');
    });

    test('should execute pattern list command', () => {
      const command = parser.parse('0p');
      expect(command).not.toBeNull();

      const result = executor.execute(command!);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Patterns');
    });

    test('should reset pattern', () => {
      const command = parser.parse('0x');
      expect(command).not.toBeNull();

      const result = executor.execute(command!);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Reset');
    });

    test('should toggle shuffle mode', () => {
      const command = parser.parse('0!');
      expect(command).not.toBeNull();

      // Enable shuffle
      let result = executor.execute(command!);
      expect(result.success).toBe(true);
      expect(result.message).toContain('enabled');
      expect(executor.isShuffleActive()).toBe(true);

      // Disable shuffle
      result = executor.execute(command!);
      expect(result.success).toBe(true);
      expect(result.message).toContain('disabled');
      expect(executor.isShuffleActive()).toBe(false);

      // Cleanup
      executor.cleanup();
    });
  });

  describe('Full Command Pipeline', () => {
    test('should process command from buffer through execution', () => {
      const buffer = new CommandBuffer();

      // Type command (simulating keystrokes after pressing '0')
      buffer.activate();
      buffer.addChar('0');
      buffer.addChar('1');

      // Get complete command
      const commandStr = buffer.execute();
      expect(commandStr).toBe('001');

      // Parse command
      const parsed = parser.parse(commandStr);
      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe('preset');

      // Execute command
      const result = executor.execute(parsed!);
      expect(result.success).toBe(true);
    });

    test('should handle rapid command sequences', () => {
      const commands = ['001', '002', '0p2', '003', '0p1'];

      for (const cmdStr of commands) {
        const parsed = parser.parse(cmdStr);
        if (parsed) {
          const result = executor.execute(parsed);
          expect(result).toBeDefined();
        }
      }
    });

    test('should maintain state across commands', () => {
      // Switch to pattern 2
      let parsed = parser.parse('0p2');
      executor.execute(parsed!);

      // Switch theme
      let themeIndex = 0;
      runtime.subscribe(event => {
        if (event.previous.themeIndex !== event.current.themeIndex) {
          themeIndex = event.current.themeIndex;
        }
      });

      parsed = parser.parse('0t2');
      executor.execute(parsed!);

      expect(themeIndex).toBe(1); // 0-indexed, so t2 = index 1
    });

    test('should update state after external changes', () => {
      // Change the shared runtime as if a direct UI shortcut selected Matrix.
      runtime.applyScene({ patternIndex: 2, themeIndex: 1 });

      // Command execution reads the same authoritative state.
      const parsed = parser.parse('0*');
      const result = executor.execute(parsed!);

      expect(result.success).toBe(true);
      expect(runtime.getSnapshot()).toMatchObject({ patternIndex: 2, themeIndex: 1 });
    });

    test('command selection becomes the starting point for direct navigation', () => {
      executor.execute(parser.parse('0p2')!);
      expect(runtime.getSnapshot().patternIndex).toBe(1);

      const state = runtime.getSnapshot();
      runtime.switchPattern((state.patternIndex + 1) % state.patternCount);
      expect(runtime.getSnapshot()).toMatchObject({ patternIndex: 2, patternKey: 'matrix' });
    });

    test('direct selection followed by a command preset targets the same pattern', () => {
      runtime.switchPattern(2);
      const result = executor.execute(parser.parse('003')!);

      expect(result.success).toBe(true);
      expect(runtime.getSnapshot()).toMatchObject({
        patternIndex: 2,
        patternKey: 'matrix',
        presetId: 3,
        presetApplied: true,
      });
    });

    test('theme commands preserve the selected pattern, preset, and seed', () => {
      runtime.switchPattern(1, 2);
      const before = runtime.getSnapshot();
      executor.execute(parser.parse('0t2')!);
      const after = runtime.getSnapshot();

      expect(after).toMatchObject({
        patternKey: before.patternKey,
        presetId: before.presetId,
        presetApplied: true,
        seed: before.seed,
        themeIndex: 1,
      });
    });

    test('save then load restores stable pattern, explicit preset, and theme', () => {
      let savedFavorite: unknown;
      const configLoader = {
        saveFavorite: (_slot: number, favorite: unknown) => {
          savedFavorite = favorite;
        },
        getFavorite: () => savedFavorite,
      } as any;
      const favoriteExecutor = new CommandExecutor(runtime, configLoader);
      runtime.applyScene({ patternIndex: 2, themeIndex: 2, presetId: 4 });

      expect(
        favoriteExecutor.execute({
          type: 'saveFavorite',
          args: { favoriteSlot: 1 },
          raw: '0F1',
        }).success
      ).toBe(true);
      expect(savedFavorite).toMatchObject({ pattern: 'matrix', preset: 4, theme: 'fire' });

      runtime.applyScene({ patternIndex: 0, themeIndex: 0, presetId: 1 });
      expect(
        favoriteExecutor.execute({ type: 'favorite', args: { favoriteSlot: 1 }, raw: '0f1' })
          .success
      ).toBe(true);
      expect(runtime.getSnapshot()).toMatchObject({
        patternKey: 'matrix',
        presetId: 4,
        presetApplied: true,
        themeName: 'fire',
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty command gracefully', () => {
      const parsed = parser.parse('');
      expect(parsed).toBeNull();
    });

    test('should handle command prefix only', () => {
      const parsed = parser.parse('0');
      expect(parsed).toBeNull();
    });

    test('should handle multiple special characters', () => {
      // 0** should be randomAll
      const parsed = parser.parse('0**');
      expect(parsed).not.toBeNull();
      expect(parsed?.args.specialCmd).toBe('randomAll');
    });

    test('should clean up shuffle timer on cleanup', () => {
      // Enable shuffle
      const parsed = parser.parse('0!');
      executor.execute(parsed!);
      expect(executor.isShuffleActive()).toBe(true);

      // Cleanup
      executor.cleanup();
      expect(executor.isShuffleActive()).toBe(false);
    });

    test('should provide shuffle info', () => {
      // No shuffle active
      expect(executor.getShuffleInfo()).toBe('');

      // Enable shuffle
      const parsed = parser.parse('0!');
      executor.execute(parsed!);

      const info = executor.getShuffleInfo();
      expect(info).toContain('Shuffle');
      expect(info).toContain('PRESET');

      executor.cleanup();
    });
  });

  describe('Search Command', () => {
    test('should search for patterns', () => {
      const parsed = parser.parse('0/wave');
      if (parsed) {
        const result = executor.execute(parsed);
        expect(result.success).toBe(true);
        expect(result.message).toContain('Wave');
      }
    });

    test('should search for themes', () => {
      const parsed = parser.parse('0/ocean');
      if (parsed) {
        const result = executor.execute(parsed);
        expect(result.success).toBe(true);
      }
    });

    test('should handle no search results', () => {
      const parsed = parser.parse('0/nonexistent');
      if (parsed) {
        const result = executor.execute(parsed);
        expect(result.success).toBe(false);
        expect(result.message).toContain('No matches');
      }
    });
  });
});
