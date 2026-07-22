import { isPauseKey } from '../../../src/cli/keyBindings.js';

describe('direct key bindings', () => {
  describe('isPauseKey', () => {
    it('accepts terminal-kit printable-space events', () => {
      expect(isPauseKey(' ', { isCharacter: true, codepoint: 32 })).toBe(true);
    });

    it('accepts symbolic SPACE events', () => {
      expect(isPauseKey('SPACE', { isCharacter: false })).toBe(true);
    });

    it('accepts a space codepoint when the terminal name differs', () => {
      expect(isPauseKey('CHARACTER', { isCharacter: true, codepoint: 32 })).toBe(true);
    });

    it('rejects non-space and modified-space keys', () => {
      expect(isPauseKey('p', { isCharacter: true, codepoint: 112 })).toBe(false);
      expect(isPauseKey('ALT_SPACE', { isCharacter: false, codepoint: 32 })).toBe(false);
    });
  });
});
