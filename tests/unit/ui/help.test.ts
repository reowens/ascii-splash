/**
 * HelpOverlay Unit Tests
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  HelpOverlay,
  getHelpOverlay,
  resetHelpOverlay,
  HelpTab,
} from '../../../src/ui/HelpOverlay.js';
import { createMockBuffer } from '../../utils/mocks.js';

describe('HelpOverlay', () => {
  let helpOverlay: HelpOverlay;

  beforeEach(() => {
    resetHelpOverlay();
    helpOverlay = getHelpOverlay();
  });

  describe('Singleton', () => {
    test('getHelpOverlay returns same instance', () => {
      const instance1 = getHelpOverlay();
      const instance2 = getHelpOverlay();
      expect(instance1).toBe(instance2);
    });

    test('resetHelpOverlay creates new instance', () => {
      const instance1 = getHelpOverlay();
      resetHelpOverlay();
      const instance2 = getHelpOverlay();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Visibility', () => {
    test('should start hidden', () => {
      expect(helpOverlay.isVisible()).toBe(false);
    });

    test('show() makes overlay visible', () => {
      helpOverlay.show();
      expect(helpOverlay.isVisible()).toBe(true);
    });

    test('hide() makes overlay hidden', () => {
      helpOverlay.show();
      helpOverlay.hide();
      expect(helpOverlay.isVisible()).toBe(false);
    });

    test('toggle() switches visibility', () => {
      expect(helpOverlay.isVisible()).toBe(false);
      helpOverlay.toggle();
      expect(helpOverlay.isVisible()).toBe(true);
      helpOverlay.toggle();
      expect(helpOverlay.isVisible()).toBe(false);
    });

    test('toggle() resets tab to controls when opening', () => {
      helpOverlay.show();
      helpOverlay.setTab('themes');
      expect(helpOverlay.getCurrentTab()).toBe('themes');
      helpOverlay.toggle(); // close
      helpOverlay.toggle(); // open again
      expect(helpOverlay.getCurrentTab()).toBe('controls');
    });
  });

  describe('Tab Navigation', () => {
    test('should start on controls tab', () => {
      expect(helpOverlay.getCurrentTab()).toBe('controls');
    });

    test('nextTab() cycles through tabs', () => {
      expect(helpOverlay.getCurrentTab()).toBe('controls');
      helpOverlay.nextTab();
      expect(helpOverlay.getCurrentTab()).toBe('commands');
      helpOverlay.nextTab();
      expect(helpOverlay.getCurrentTab()).toBe('patterns');
      helpOverlay.nextTab();
      expect(helpOverlay.getCurrentTab()).toBe('themes');
      helpOverlay.nextTab();
      expect(helpOverlay.getCurrentTab()).toBe('controls'); // Wraps around
    });

    test('prevTab() cycles backwards', () => {
      expect(helpOverlay.getCurrentTab()).toBe('controls');
      helpOverlay.prevTab();
      expect(helpOverlay.getCurrentTab()).toBe('themes'); // Wraps around
      helpOverlay.prevTab();
      expect(helpOverlay.getCurrentTab()).toBe('patterns');
    });

    test('setTab() changes to specific tab', () => {
      helpOverlay.setTab('themes');
      expect(helpOverlay.getCurrentTab()).toBe('themes');
      helpOverlay.setTab('patterns');
      expect(helpOverlay.getCurrentTab()).toBe('patterns');
    });

    test('setTab() ignores invalid tabs', () => {
      helpOverlay.setTab('themes');
      helpOverlay.setTab('invalid' as HelpTab);
      expect(helpOverlay.getCurrentTab()).toBe('themes');
    });

    test('show() resets tab to controls', () => {
      helpOverlay.setTab('themes');
      helpOverlay.show();
      expect(helpOverlay.getCurrentTab()).toBe('controls');
    });
  });

  describe('render()', () => {
    test('should not render when hidden', () => {
      const buffer = createMockBuffer(80, 24);
      const size = { width: 80, height: 24 };

      helpOverlay.render(buffer, size);

      // Check that buffer is unchanged (all spaces)
      let hasContent = false;
      for (let y = 0; y < 24; y++) {
        for (let x = 0; x < 80; x++) {
          if (buffer[y][x].char !== ' ') {
            hasContent = true;
            break;
          }
        }
      }
      expect(hasContent).toBe(false);
    });

    test('should render overlay when visible', () => {
      const buffer = createMockBuffer(80, 24);
      const size = { width: 80, height: 24 };

      helpOverlay.show();
      helpOverlay.render(buffer, size);

      // Check that buffer has content
      let hasContent = false;
      for (let y = 0; y < 24; y++) {
        for (let x = 0; x < 80; x++) {
          if (buffer[y][x].char !== ' ') {
            hasContent = true;
            break;
          }
        }
      }
      expect(hasContent).toBe(true);
    });

    test('should render title', () => {
      const buffer = createMockBuffer(80, 24);
      const size = { width: 80, height: 24 };

      helpOverlay.show();
      helpOverlay.render(buffer, size);

      // Extract text from buffer
      const text = buffer.map(row => row.map(cell => cell.char).join('')).join('');
      expect(text).toContain('ascii-splash Help');
    });

    test('should render tab bar', () => {
      const buffer = createMockBuffer(80, 24);
      const size = { width: 80, height: 24 };

      helpOverlay.show();
      helpOverlay.render(buffer, size);

      const text = buffer.map(row => row.map(cell => cell.char).join('')).join('');
      expect(text).toContain('Controls');
      expect(text).toContain('Commands');
      expect(text).toContain('Patterns');
      expect(text).toContain('Themes');
    });

    test('should render controls content on controls tab', () => {
      const buffer = createMockBuffer(80, 24);
      const size = { width: 80, height: 24 };

      helpOverlay.show();
      helpOverlay.setTab('controls');
      helpOverlay.render(buffer, size);

      const text = buffer.map(row => row.map(cell => cell.char).join('')).join('');
      expect(text).toContain('QUICK CONTROLS');
    });

    test('should render commands content on commands tab', () => {
      const buffer = createMockBuffer(80, 24);
      const size = { width: 80, height: 24 };

      helpOverlay.show();
      helpOverlay.setTab('commands');
      helpOverlay.render(buffer, size);

      const text = buffer.map(row => row.map(cell => cell.char).join('')).join('');
      expect(text).toContain('COMMAND MODE');
    });

    test('should render patterns content on patterns tab', () => {
      const buffer = createMockBuffer(80, 24);
      const size = { width: 80, height: 24 };

      helpOverlay.show();
      helpOverlay.setTab('patterns');
      helpOverlay.render(buffer, size);

      const text = buffer.map(row => row.map(cell => cell.char).join('')).join('');
      expect(text).toContain('PATTERNS');
    });

    test('should render themes content on themes tab', () => {
      const buffer = createMockBuffer(80, 24);
      const size = { width: 80, height: 24 };

      helpOverlay.show();
      helpOverlay.setTab('themes');
      helpOverlay.render(buffer, size);

      const text = buffer.map(row => row.map(cell => cell.char).join('')).join('');
      expect(text).toContain('THEMES');
    });

    test('should render footer with hints', () => {
      const buffer = createMockBuffer(80, 24);
      const size = { width: 80, height: 24 };

      helpOverlay.show();
      helpOverlay.render(buffer, size);

      const text = buffer.map(row => row.map(cell => cell.char).join('')).join('');
      expect(text).toContain('TAB');
      expect(text).toContain('ESC');
    });

    test('should handle small buffer sizes', () => {
      const buffer = createMockBuffer(30, 10);
      const size = { width: 30, height: 10 };

      helpOverlay.show();

      expect(() => {
        helpOverlay.render(buffer, size);
      }).not.toThrow();
    });

    test('should handle very small buffer sizes gracefully', () => {
      const buffer = createMockBuffer(10, 5);
      const size = { width: 10, height: 5 };

      helpOverlay.show();

      expect(() => {
        helpOverlay.render(buffer, size);
      }).not.toThrow();
    });
  });

  describe('Border and Layout', () => {
    test('should render border corners', () => {
      const buffer = createMockBuffer(80, 24);
      const size = { width: 80, height: 24 };

      helpOverlay.show();
      helpOverlay.render(buffer, size);

      // Find any '+' characters (corners)
      let hasCorners = false;
      for (let y = 0; y < 24; y++) {
        for (let x = 0; x < 80; x++) {
          if (buffer[y][x].char === '+') {
            hasCorners = true;
            break;
          }
        }
      }
      expect(hasCorners).toBe(true);
    });

    test('should render border edges', () => {
      const buffer = createMockBuffer(80, 24);
      const size = { width: 80, height: 24 };

      helpOverlay.show();
      helpOverlay.render(buffer, size);

      // Find '|' and '=' characters (edges)
      let hasVertical = false;
      let hasHorizontal = false;
      for (let y = 0; y < 24; y++) {
        for (let x = 0; x < 80; x++) {
          if (buffer[y][x].char === '|') hasVertical = true;
          if (buffer[y][x].char === '=') hasHorizontal = true;
        }
      }
      expect(hasVertical).toBe(true);
      expect(hasHorizontal).toBe(true);
    });
  });

  describe('Colors', () => {
    test('should apply colors to rendered content', () => {
      const buffer = createMockBuffer(80, 24);
      const size = { width: 80, height: 24 };

      helpOverlay.show();
      helpOverlay.render(buffer, size);

      // Find cells with colors
      let hasColors = false;
      for (let y = 0; y < 24; y++) {
        for (let x = 0; x < 80; x++) {
          if (buffer[y][x].color) {
            hasColors = true;
            break;
          }
        }
      }
      expect(hasColors).toBe(true);
    });
  });
});
