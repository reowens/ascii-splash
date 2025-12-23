/**
 * StatusBar Unit Tests
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { StatusBar, getStatusBar, resetStatusBar } from '../../../src/ui/StatusBar.js';
import { createMockBuffer } from '../../utils/mocks.js';

describe('StatusBar', () => {
  let statusBar: StatusBar;

  beforeEach(() => {
    resetStatusBar();
    statusBar = getStatusBar();
  });

  describe('Singleton', () => {
    test('getStatusBar returns same instance', () => {
      const instance1 = getStatusBar();
      const instance2 = getStatusBar();
      expect(instance1).toBe(instance2);
    });

    test('resetStatusBar creates new instance', () => {
      const instance1 = getStatusBar();
      resetStatusBar();
      const instance2 = getStatusBar();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('State Management', () => {
    test('should have default state', () => {
      const state = statusBar.getState();
      expect(state).toEqual({
        patternName: 'Waves',
        presetNumber: 1,
        themeName: 'Ocean',
        fps: 30,
        shuffleMode: 'off',
        paused: false,
      });
    });

    test('update() should merge partial state', () => {
      statusBar.update({ patternName: 'Matrix' });
      const state = statusBar.getState();
      expect(state.patternName).toBe('Matrix');
      expect(state.themeName).toBe('Ocean'); // Unchanged
    });

    test('update() should handle multiple properties', () => {
      statusBar.update({
        patternName: 'Starfield',
        presetNumber: 3,
        themeName: 'Fire',
        fps: 60,
      });
      const state = statusBar.getState();
      expect(state.patternName).toBe('Starfield');
      expect(state.presetNumber).toBe(3);
      expect(state.themeName).toBe('Fire');
      expect(state.fps).toBe(60);
    });

    test('update() should update shuffleMode', () => {
      statusBar.update({ shuffleMode: 'preset' });
      expect(statusBar.getState().shuffleMode).toBe('preset');

      statusBar.update({ shuffleMode: 'all' });
      expect(statusBar.getState().shuffleMode).toBe('all');

      statusBar.update({ shuffleMode: 'off' });
      expect(statusBar.getState().shuffleMode).toBe('off');
    });

    test('update() should update paused state', () => {
      statusBar.update({ paused: true });
      expect(statusBar.getState().paused).toBe(true);

      statusBar.update({ paused: false });
      expect(statusBar.getState().paused).toBe(false);
    });

    test('getState() should return a copy', () => {
      const state1 = statusBar.getState();
      state1.patternName = 'Modified';
      const state2 = statusBar.getState();
      expect(state2.patternName).toBe('Waves'); // Original unchanged
    });
  });

  describe('render()', () => {
    test('should render to bottom row', () => {
      const buffer = createMockBuffer(80, 24);
      const size = { width: 80, height: 24 };

      statusBar.render(buffer, size);

      // Bottom row should have content
      let bottomRowHasContent = false;
      for (let x = 0; x < 80; x++) {
        if (buffer[23][x].color) {
          bottomRowHasContent = true;
          break;
        }
      }
      expect(bottomRowHasContent).toBe(true);
    });

    test('should display pattern name', () => {
      const buffer = createMockBuffer(80, 24);
      const size = { width: 80, height: 24 };

      statusBar.update({ patternName: 'TestPattern' });
      statusBar.render(buffer, size);

      const bottomRow = buffer[23].map(cell => cell.char).join('');
      expect(bottomRow).toContain('TestPattern');
    });

    test('should display preset number', () => {
      const buffer = createMockBuffer(80, 24);
      const size = { width: 80, height: 24 };

      statusBar.update({ presetNumber: 5 });
      statusBar.render(buffer, size);

      const bottomRow = buffer[23].map(cell => cell.char).join('');
      expect(bottomRow).toContain('.5');
    });

    test('should display theme name', () => {
      const buffer = createMockBuffer(80, 24);
      const size = { width: 80, height: 24 };

      statusBar.update({ themeName: 'Matrix' });
      statusBar.render(buffer, size);

      const bottomRow = buffer[23].map(cell => cell.char).join('');
      expect(bottomRow).toContain('Matrix');
    });

    test('should display FPS', () => {
      const buffer = createMockBuffer(80, 24);
      const size = { width: 80, height: 24 };

      statusBar.update({ fps: 45 });
      statusBar.render(buffer, size);

      const bottomRow = buffer[23].map(cell => cell.char).join('');
      expect(bottomRow).toContain('45fps');
    });

    test('should display shuffle status OFF', () => {
      const buffer = createMockBuffer(80, 24);
      const size = { width: 80, height: 24 };

      statusBar.update({ shuffleMode: 'off' });
      statusBar.render(buffer, size);

      const bottomRow = buffer[23].map(cell => cell.char).join('');
      expect(bottomRow).toContain('Shuffle: OFF');
    });

    test('should display shuffle status ON', () => {
      const buffer = createMockBuffer(80, 24);
      const size = { width: 80, height: 24 };

      statusBar.update({ shuffleMode: 'preset' });
      statusBar.render(buffer, size);

      const bottomRow = buffer[23].map(cell => cell.char).join('');
      expect(bottomRow).toContain('Shuffle: ON');
    });

    test('should display shuffle status ALL', () => {
      const buffer = createMockBuffer(80, 24);
      const size = { width: 80, height: 24 };

      statusBar.update({ shuffleMode: 'all' });
      statusBar.render(buffer, size);

      const bottomRow = buffer[23].map(cell => cell.char).join('');
      expect(bottomRow).toContain('Shuffle: ALL');
    });

    test('should display PAUSED when paused', () => {
      const buffer = createMockBuffer(80, 24);
      const size = { width: 80, height: 24 };

      statusBar.update({ paused: true });
      statusBar.render(buffer, size);

      const bottomRow = buffer[23].map(cell => cell.char).join('');
      expect(bottomRow).toContain('PAUSED');
    });

    test('should display help hint', () => {
      const buffer = createMockBuffer(80, 24);
      const size = { width: 80, height: 24 };

      statusBar.render(buffer, size);

      const bottomRow = buffer[23].map(cell => cell.char).join('');
      expect(bottomRow).toContain('? Help');
    });

    test('should use separators between segments', () => {
      const buffer = createMockBuffer(80, 24);
      const size = { width: 80, height: 24 };

      statusBar.render(buffer, size);

      const bottomRow = buffer[23].map(cell => cell.char).join('');
      expect(bottomRow).toContain('|');
    });

    test('should handle small buffer sizes', () => {
      const buffer = createMockBuffer(40, 10);
      const size = { width: 40, height: 10 };

      expect(() => {
        statusBar.render(buffer, size);
      }).not.toThrow();
    });

    test('should handle edge case with zero height', () => {
      const buffer: any[][] = [];
      const size = { width: 80, height: 0 };

      expect(() => {
        statusBar.render(buffer, size);
      }).not.toThrow();
    });

    test('should truncate long pattern names', () => {
      const buffer = createMockBuffer(80, 24);
      const size = { width: 80, height: 24 };

      statusBar.update({ patternName: 'VeryLongPatternNameThatShouldBeTruncated' });
      statusBar.render(buffer, size);

      const bottomRow = buffer[23].map(cell => cell.char).join('');
      // Should contain truncated name with ~ at end
      expect(bottomRow).toContain('~');
      expect(bottomRow).not.toContain('VeryLongPatternNameThatShouldBeTruncated');
    });
  });

  describe('FPS Color Coding', () => {
    test('should use good color for FPS >= 25', () => {
      const buffer = createMockBuffer(80, 24);
      const size = { width: 80, height: 24 };

      statusBar.update({ fps: 30 });
      statusBar.render(buffer, size);

      // Find the FPS segment and check its color
      const fpsText = '30fps';
      let fpsStartX = -1;
      const bottomRow = buffer[23].map(cell => cell.char).join('');
      fpsStartX = bottomRow.indexOf(fpsText);

      if (fpsStartX >= 0) {
        const fpsColor = buffer[23][fpsStartX].color;
        expect(fpsColor).toBeDefined();
        expect(fpsColor!.g).toBeGreaterThan(fpsColor!.r); // Green > Red for good
      }
    });

    test('should use warn color for FPS 15-24', () => {
      const buffer = createMockBuffer(80, 24);
      const size = { width: 80, height: 24 };

      statusBar.update({ fps: 20 });
      statusBar.render(buffer, size);

      const bottomRow = buffer[23].map(cell => cell.char).join('');
      const fpsStartX = bottomRow.indexOf('20fps');

      if (fpsStartX >= 0) {
        const fpsColor = buffer[23][fpsStartX].color;
        expect(fpsColor).toBeDefined();
        // Yellow has high R and G
        expect(fpsColor!.r).toBeGreaterThan(200);
        expect(fpsColor!.g).toBeGreaterThan(150);
      }
    });

    test('should use bad color for FPS < 15', () => {
      const buffer = createMockBuffer(80, 24);
      const size = { width: 80, height: 24 };

      statusBar.update({ fps: 10 });
      statusBar.render(buffer, size);

      const bottomRow = buffer[23].map(cell => cell.char).join('');
      const fpsStartX = bottomRow.indexOf('10fps');

      if (fpsStartX >= 0) {
        const fpsColor = buffer[23][fpsStartX].color;
        expect(fpsColor).toBeDefined();
        expect(fpsColor!.r).toBeGreaterThan(fpsColor!.g); // Red > Green for bad
      }
    });
  });

  describe('Segment Priority', () => {
    test('PAUSED should appear before pattern when paused', () => {
      const buffer = createMockBuffer(80, 24);
      const size = { width: 80, height: 24 };

      statusBar.update({ paused: true, patternName: 'TestPattern' });
      statusBar.render(buffer, size);

      const bottomRow = buffer[23].map(cell => cell.char).join('');
      const pausedIndex = bottomRow.indexOf('PAUSED');
      const patternIndex = bottomRow.indexOf('TestPattern');

      expect(pausedIndex).toBeGreaterThanOrEqual(0);
      expect(patternIndex).toBeGreaterThan(pausedIndex);
    });
  });
});
