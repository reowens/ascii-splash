/**
 * Unit tests for CommandParser
 * Target: 100% coverage
 */

import { CommandParser } from '../../../src/engine/CommandParser.js';

describe('CommandParser', () => {
  let parser: CommandParser;

  beforeEach(() => {
    parser = new CommandParser();
  });

  describe('Basic Parsing', () => {
    test('returns null for empty string', () => {
      expect(parser.parse('')).toBeNull();
      expect(parser.parse('  ')).toBeNull();
    });

    test('returns null for lone "0"', () => {
      expect(parser.parse('0')).toBeNull();
    });

    test('handles leading whitespace', () => {
      const result = parser.parse('  01');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('preset');
    });

    test('handles trailing whitespace', () => {
      const result = parser.parse('01  ');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('preset');
    });
  });

  describe('Preset Commands', () => {
    test('parses single digit preset (01)', () => {
      const result = parser.parse('01');
      expect(result).toEqual({
        type: 'preset',
        args: { presetNumber: 1 },
        raw: '01'
      });
    });

    test('parses double digit preset (012)', () => {
      const result = parser.parse('012');
      expect(result).toEqual({
        type: 'preset',
        args: { presetNumber: 12 },
        raw: '012'
      });
    });

    test('parses triple digit preset (0123)', () => {
      const result = parser.parse('0123');
      expect(result).toEqual({
        type: 'preset',
        args: { presetNumber: 123 },
        raw: '0123'
      });
    });

    test('parses preset without leading 0', () => {
      const result = parser.parse('5');
      expect(result).toEqual({
        type: 'preset',
        args: { presetNumber: 5 },
        raw: '5'
      });
    });
  });

  describe('Favorite Commands', () => {
    test('parses load favorite (0f1)', () => {
      const result = parser.parse('0f1');
      expect(result).toEqual({
        type: 'favorite',
        args: { favoriteSlot: 1 },
        raw: '0f1'
      });
    });

    test('parses load favorite with double digits (0f99)', () => {
      const result = parser.parse('0f99');
      expect(result).toEqual({
        type: 'favorite',
        args: { favoriteSlot: 99 },
        raw: '0f99'
      });
    });

    test('parses save favorite (0F1)', () => {
      const result = parser.parse('0F1');
      expect(result).toEqual({
        type: 'saveFavorite',
        args: { favoriteSlot: 1 },
        raw: '0F1'
      });
    });

    test('parses save favorite with double digits (0F42)', () => {
      const result = parser.parse('0F42');
      expect(result).toEqual({
        type: 'saveFavorite',
        args: { favoriteSlot: 42 },
        raw: '0F42'
      });
    });

    test('parses favorite list (0fl)', () => {
      const result = parser.parse('0fl');
      expect(result).toEqual({
        type: 'special',
        args: { specialCmd: 'favoriteList' },
        raw: '0fl'
      });
    });
  });

  describe('Pattern Commands', () => {
    test('parses pattern by number (0p3)', () => {
      const result = parser.parse('0p3');
      expect(result).toEqual({
        type: 'pattern',
        args: { patternId: 3 },
        raw: '0p3'
      });
    });

    test('parses pattern by name (0pwaves)', () => {
      const result = parser.parse('0pwaves');
      expect(result).toEqual({
        type: 'pattern',
        args: { patternId: 'waves' },
        raw: '0pwaves'
      });
    });

    test('parses pattern with preset by number (0p3.5)', () => {
      const result = parser.parse('0p3.5');
      expect(result).toEqual({
        type: 'pattern',
        args: { 
          patternId: 3,
          patternPreset: 5
        },
        raw: '0p3.5'
      });
    });

    test('parses pattern with preset by name (0pwaves.2)', () => {
      const result = parser.parse('0pwaves.2');
      expect(result).toEqual({
        type: 'pattern',
        args: { 
          patternId: 'waves',
          patternPreset: 2
        },
        raw: '0pwaves.2'
      });
    });

    test('parses lone pattern command as pattern list (0p)', () => {
      const result = parser.parse('0p');
      expect(result).toEqual({
        type: 'special',
        args: { specialCmd: 'patternList' },
        raw: '0p'
      });
    });

    test('handles pattern with non-numeric preset (0pwaves.abc)', () => {
      const result = parser.parse('0pwaves.abc');
      expect(result).toEqual({
        type: 'pattern',
        args: { 
          patternId: 'waves',
          patternPreset: undefined
        },
        raw: '0pwaves.abc'
      });
    });
  });

  describe('Theme Commands', () => {
    test('parses theme by number (0t2)', () => {
      const result = parser.parse('0t2');
      expect(result).toEqual({
        type: 'theme',
        args: { themeId: 2 },
        raw: '0t2'
      });
    });

    test('parses theme by name (0tfire)', () => {
      const result = parser.parse('0tfire');
      expect(result).toEqual({
        type: 'theme',
        args: { themeId: 'fire' },
        raw: '0tfire'
      });
    });

    test('parses random theme (0tr)', () => {
      const result = parser.parse('0tr');
      expect(result).toEqual({
        type: 'special',
        args: { specialCmd: 'randomTheme' },
        raw: '0tr'
      });
    });

    test('parses lone theme command as theme picker (0t)', () => {
      const result = parser.parse('0t');
      expect(result).toEqual({
        type: 'special',
        args: { specialCmd: 'themePicker' },
        raw: '0t'
      });
    });
  });

  describe('Special Commands', () => {
    test('parses random preset (0*)', () => {
      const result = parser.parse('0*');
      expect(result).toEqual({
        type: 'special',
        args: { specialCmd: 'randomPreset' },
        raw: '0*'
      });
    });

    test('parses random all (0**)', () => {
      const result = parser.parse('0**');
      expect(result).toEqual({
        type: 'special',
        args: { specialCmd: 'randomAll' },
        raw: '0**'
      });
    });

    test('parses list presets (0?)', () => {
      const result = parser.parse('0?');
      expect(result).toEqual({
        type: 'special',
        args: { specialCmd: 'listPresets' },
        raw: '0?'
      });
    });

    test('parses catalog presets (0??)', () => {
      const result = parser.parse('0??');
      expect(result).toEqual({
        type: 'special',
        args: { specialCmd: 'catalogPresets' },
        raw: '0??'
      });
    });

    test('parses randomize (0r)', () => {
      const result = parser.parse('0r');
      expect(result).toEqual({
        type: 'special',
        args: { specialCmd: 'randomize' },
        raw: '0r'
      });
    });

    test('parses save (0s)', () => {
      const result = parser.parse('0s');
      expect(result).toEqual({
        type: 'special',
        args: { specialCmd: 'save' },
        raw: '0s'
      });
    });

    test('parses reset (0x)', () => {
      const result = parser.parse('0x');
      expect(result).toEqual({
        type: 'special',
        args: { specialCmd: 'reset' },
        raw: '0x'
      });
    });

    test('parses shuffle (0!)', () => {
      const result = parser.parse('0!');
      expect(result).toEqual({
        type: 'special',
        args: { specialCmd: 'shuffle' },
        raw: '0!'
      });
    });

    test('parses shuffle all (0!!)', () => {
      const result = parser.parse('0!!');
      expect(result).toEqual({
        type: 'special',
        args: { specialCmd: 'shuffleAll' },
        raw: '0!!'
      });
    });

    test('parses shuffle with numeric interval (0!5)', () => {
      const result = parser.parse('0!5');
      expect(result).toEqual({
        type: 'special',
        args: { 
          specialCmd: 'shuffle',
          specialArg: '5'
        },
        raw: '0!5'
      });
    });

    test('parses shuffle with long interval (0!120)', () => {
      const result = parser.parse('0!120');
      expect(result).toEqual({
        type: 'special',
        args: { 
          specialCmd: 'shuffle',
          specialArg: '120'
        },
        raw: '0!120'
      });
    });

    test('parses search (0/)', () => {
      const result = parser.parse('0/');
      expect(result).toEqual({
        type: 'special',
        args: { specialCmd: 'search' },
        raw: '0/'
      });
    });

    test('parses search with term (0/storm)', () => {
      const result = parser.parse('0/storm');
      expect(result).toEqual({
        type: 'special',
        args: { 
          specialCmd: 'search',
          specialArg: 'storm'
        },
        raw: '0/storm'
      });
    });

    test('parses undo (0\\)', () => {
      const result = parser.parse('0\\');
      expect(result).toEqual({
        type: 'special',
        args: { specialCmd: 'undo' },
        raw: '0\\'
      });
    });

    test('parses repeat (0.)', () => {
      const result = parser.parse('0.');
      expect(result).toEqual({
        type: 'special',
        args: { specialCmd: 'repeat' },
        raw: '0.'
      });
    });

    test('parses history (0h)', () => {
      const result = parser.parse('0h');
      expect(result).toEqual({
        type: 'special',
        args: { specialCmd: 'history' },
        raw: '0h'
      });
    });
  });

  describe('Combination Commands', () => {
    test('parses pattern + preset combination (0p3+05)', () => {
      const result = parser.parse('0p3+05');
      expect(result?.type).toBe('combination');
      expect(result?.args.commands).toHaveLength(2);
      
      const commands = result?.args.commands!;
      expect(commands[0]).toEqual({
        type: 'pattern',
        args: { patternId: 3 },
        raw: '0p3'
      });
      expect(commands[1]).toEqual({
        type: 'preset',
        args: { presetNumber: 5 },
        raw: '005' // Parser adds '0' prefix when parsing parts
      });
    });

    test('parses pattern + theme combination (0p3+t2)', () => {
      const result = parser.parse('0p3+t2');
      expect(result?.type).toBe('combination');
      expect(result?.args.commands).toHaveLength(2);
      
      const commands = result?.args.commands!;
      expect(commands[0]).toEqual({
        type: 'pattern',
        args: { patternId: 3 },
        raw: '0p3'
      });
      expect(commands[1]).toEqual({
        type: 'theme',
        args: { themeId: 2 },
        raw: '0t2'
      });
    });

    test('parses triple combination (0p3+05+t2)', () => {
      const result = parser.parse('0p3+05+t2');
      expect(result?.type).toBe('combination');
      expect(result?.args.commands).toHaveLength(3);
      
      const commands = result?.args.commands!;
      expect(commands[0].type).toBe('pattern');
      expect(commands[1].type).toBe('preset');
      expect(commands[2].type).toBe('theme');
    });

    test('parses combination with spaces', () => {
      const result = parser.parse('0p3 + 05 + t2');
      expect(result?.type).toBe('combination');
      expect(result?.args.commands).toHaveLength(3);
    });

    test('parses combination with named values (0pwaves+tfire)', () => {
      const result = parser.parse('0pwaves+tfire');
      expect(result?.type).toBe('combination');
      expect(result?.args.commands).toHaveLength(2);
      
      const commands = result?.args.commands!;
      expect(commands[0]).toEqual({
        type: 'pattern',
        args: { patternId: 'waves' },
        raw: '0pwaves'
      });
      expect(commands[1]).toEqual({
        type: 'theme',
        args: { themeId: 'fire' },
        raw: '0tfire'
      });
    });

    test('filters out invalid parts in combination', () => {
      const result = parser.parse('0p3+invalid+t2');
      expect(result?.type).toBe('combination');
      expect(result?.args.commands).toHaveLength(2); // Only p3 and t2
    });

    test('returns null for combination with all invalid parts', () => {
      const result = parser.parse('0invalid+badcmd');
      expect(result).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    test('returns null for unknown command', () => {
      expect(parser.parse('0xyz')).toBeNull();
      expect(parser.parse('0@#$')).toBeNull();
    });

    test('handles very long numeric preset', () => {
      const result = parser.parse('099999');
      expect(result).toEqual({
        type: 'preset',
        args: { presetNumber: 99999 },
        raw: '099999'
      });
    });

    test('trims command but preserves it in raw', () => {
      const original = '  0p3+t2  ';
      const result = parser.parse(original);
      // Parser trims whitespace before storing
      expect(result?.raw).toBe('0p3+t2');
    });

    test('handles case sensitivity (F vs f)', () => {
      const loadResult = parser.parse('0f5');
      expect(loadResult?.type).toBe('favorite');
      
      const saveResult = parser.parse('0F5');
      expect(saveResult?.type).toBe('saveFavorite');
    });

    test('handles pattern with multiple dots (0pwaves.2.3)', () => {
      const result = parser.parse('0pwaves.2.3');
      // Should only parse first dot as preset separator
      expect(result?.type).toBe('pattern');
      expect(result?.args.patternId).toBe('waves');
      // '2.3' is not a valid number, so preset should be undefined
      expect(result?.args.patternPreset).toBeUndefined();
    });

    test('handles empty pattern after p (edge case)', () => {
      const result = parser.parse('0p.');
      expect(result?.type).toBe('pattern');
      // After slicing 'p', we get '.', and after splitting on '.', first part is ''
      // but the pattern detection treats '.' as the pattern ID
      expect(result?.args.patternId).toBe('.');
      expect(result?.args.patternPreset).toBeUndefined();
    });
  });

  describe('Real-World Usage Patterns', () => {
    test('quick preset switch during animation (03)', () => {
      const result = parser.parse('03');
      expect(result?.type).toBe('preset');
      expect(result?.args.presetNumber).toBe(3);
    });

    test('switch to starfield with high-speed preset (0pstarfield.4)', () => {
      const result = parser.parse('0pstarfield.4');
      expect(result?.type).toBe('pattern');
      expect(result?.args.patternId).toBe('starfield');
      expect(result?.args.patternPreset).toBe(4);
    });

    test('save current favorite after tweaking (0F1)', () => {
      const result = parser.parse('0F1');
      expect(result?.type).toBe('saveFavorite');
      expect(result?.args.favoriteSlot).toBe(1);
    });

    test('load favorite and override theme (0f1+tmatrix)', () => {
      const result = parser.parse('0f1+tmatrix');
      expect(result?.type).toBe('combination');
      expect(result?.args.commands).toHaveLength(2);
    });

    test('randomize everything (0**)', () => {
      const result = parser.parse('0**');
      expect(result?.type).toBe('special');
      expect(result?.args.specialCmd).toBe('randomAll');
    });

    test('enable shuffle with 30s interval (0!30)', () => {
      const result = parser.parse('0!30');
      expect(result?.type).toBe('special');
      expect(result?.args.specialCmd).toBe('shuffle');
      expect(result?.args.specialArg).toBe('30');
    });

    test('search for storm presets (0/storm)', () => {
      const result = parser.parse('0/storm');
      expect(result?.type).toBe('special');
      expect(result?.args.specialCmd).toBe('search');
      expect(result?.args.specialArg).toBe('storm');
    });
  });
});
