/**
 * Unit tests for Buffer (double-buffering with dirty tracking)
 * Target: 90%+ coverage
 */

import { Buffer } from '../../../src/renderer/Buffer';
import { Cell, Size } from '../../../src/types';
import { createMockSize, createMockColor } from '../../utils/mocks';

describe('Buffer', () => {
  let buffer: Buffer;
  let size: Size;

  beforeEach(() => {
    size = createMockSize(10, 5); // 10 width, 5 height
    buffer = new Buffer(size);
  });

  describe('Construction', () => {
    test('creates buffer with correct size', () => {
      expect(buffer.getSize()).toEqual(size);
    });

    test('initializes buffer with empty spaces', () => {
      const buf = buffer.getBuffer();
      expect(buf.length).toBe(5); // height
      expect(buf[0].length).toBe(10); // width
      
      // All cells should be empty spaces
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 10; x++) {
          expect(buf[y][x]).toEqual({ char: ' ' });
        }
      }
    });

    test('initializes with zero changes initially', () => {
      const changes = buffer.getChanges();
      expect(changes).toEqual([]);
    });
  });

  describe('Cell Operations', () => {
    test('setCell updates a cell', () => {
      const cell: Cell = { char: 'X', color: createMockColor(255, 0, 0) };
      buffer.setCell(5, 2, cell);
      
      const retrieved = buffer.getCell(5, 2);
      expect(retrieved).toEqual(cell);
    });

    test('getCell returns undefined for out-of-bounds coordinates', () => {
      expect(buffer.getCell(-1, 0)).toBeUndefined();
      expect(buffer.getCell(0, -1)).toBeUndefined();
      expect(buffer.getCell(10, 0)).toBeUndefined(); // width is 10, so max x is 9
      expect(buffer.getCell(0, 5)).toBeUndefined(); // height is 5, so max y is 4
    });

    test('setCell ignores out-of-bounds coordinates', () => {
      const cell: Cell = { char: 'X' };
      
      // Should not throw
      expect(() => {
        buffer.setCell(-1, 0, cell);
        buffer.setCell(0, -1, cell);
        buffer.setCell(10, 0, cell);
        buffer.setCell(0, 5, cell);
      }).not.toThrow();
    });

    test('setCell at boundary coordinates works correctly', () => {
      const cell: Cell = { char: 'B' };
      
      // Top-left corner
      buffer.setCell(0, 0, cell);
      expect(buffer.getCell(0, 0)).toEqual(cell);
      
      // Top-right corner
      buffer.setCell(9, 0, cell);
      expect(buffer.getCell(9, 0)).toEqual(cell);
      
      // Bottom-left corner
      buffer.setCell(0, 4, cell);
      expect(buffer.getCell(0, 4)).toEqual(cell);
      
      // Bottom-right corner
      buffer.setCell(9, 4, cell);
      expect(buffer.getCell(9, 4)).toEqual(cell);
    });

    test('getBuffer returns the full 2D array', () => {
      const cell: Cell = { char: 'T' };
      buffer.setCell(3, 2, cell);
      
      const buf = buffer.getBuffer();
      expect(buf[2][3]).toEqual(cell);
    });
  });

  describe('Clear Operation', () => {
    test('clear resets all cells to spaces', () => {
      // Fill buffer with non-space characters
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 10; x++) {
          buffer.setCell(x, y, { char: 'X' });
        }
      }
      
      // Clear
      buffer.clear();
      
      // Verify all cells are spaces
      const buf = buffer.getBuffer();
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 10; x++) {
          expect(buf[y][x]).toEqual({ char: ' ' });
        }
      }
    });

    test('clear removes colors from cells', () => {
      const coloredCell: Cell = { 
        char: 'C', 
        color: createMockColor(100, 150, 200) 
      };
      
      buffer.setCell(5, 2, coloredCell);
      buffer.clear();
      
      const cell = buffer.getCell(5, 2);
      expect(cell?.char).toBe(' ');
      expect(cell?.color).toBeUndefined();
    });
  });

  describe('Resize Operation', () => {
    test('resize changes buffer dimensions', () => {
      const newSize: Size = { width: 20, height: 10 };
      buffer.resize(newSize);
      
      expect(buffer.getSize()).toEqual(newSize);
      
      const buf = buffer.getBuffer();
      expect(buf.length).toBe(10);
      expect(buf[0].length).toBe(20);
    });

    test('resize clears existing content', () => {
      buffer.setCell(5, 2, { char: 'X' });
      
      const newSize: Size = { width: 15, height: 8 };
      buffer.resize(newSize);
      
      // Old cell should be gone (buffer recreated)
      const buf = buffer.getBuffer();
      expect(buf[2][5]).toEqual({ char: ' ' });
    });

    test('resize to smaller dimensions works', () => {
      const smallSize: Size = { width: 5, height: 3 };
      buffer.resize(smallSize);
      
      expect(buffer.getSize()).toEqual(smallSize);
      
      const buf = buffer.getBuffer();
      expect(buf.length).toBe(3);
      expect(buf[0].length).toBe(5);
    });

    test('resize resets change tracking', () => {
      buffer.setCell(3, 2, { char: 'X' });
      buffer.swap();
      
      buffer.resize({ width: 10, height: 5 });
      
      // After resize, no changes should be detected
      const changes = buffer.getChanges();
      expect(changes).toEqual([]);
    });
  });

  describe('Change Tracking', () => {
    test('getChanges detects character changes', () => {
      buffer.swap(); // Sync buffers
      
      buffer.setCell(3, 2, { char: 'X' });
      
      const changes = buffer.getChanges();
      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        x: 3,
        y: 2,
        cell: { char: 'X' }
      });
    });

    test('getChanges detects color changes', () => {
      const cell1: Cell = { char: 'A', color: createMockColor(255, 0, 0) };
      buffer.setCell(5, 3, cell1);
      buffer.swap();
      
      const cell2: Cell = { char: 'A', color: createMockColor(0, 255, 0) };
      buffer.setCell(5, 3, cell2);
      
      const changes = buffer.getChanges();
      expect(changes).toHaveLength(1);
      expect(changes[0].cell.color).toEqual({ r: 0, g: 255, b: 0 });
    });

    test('getChanges detects multiple changes', () => {
      buffer.swap();
      
      buffer.setCell(0, 0, { char: 'A' });
      buffer.setCell(5, 2, { char: 'B' });
      buffer.setCell(9, 4, { char: 'C' });
      
      const changes = buffer.getChanges();
      expect(changes).toHaveLength(3);
      
      const coords = changes.map(c => ({ x: c.x, y: c.y }));
      expect(coords).toContainEqual({ x: 0, y: 0 });
      expect(coords).toContainEqual({ x: 5, y: 2 });
      expect(coords).toContainEqual({ x: 9, y: 4 });
    });

    test('getChanges returns empty array when no changes', () => {
      buffer.swap();
      
      const changes = buffer.getChanges();
      expect(changes).toEqual([]);
    });

    test('getChanges detects color removal', () => {
      const coloredCell: Cell = { 
        char: 'X', 
        color: createMockColor(100, 100, 100) 
      };
      buffer.setCell(3, 2, coloredCell);
      buffer.swap();
      
      // Same char, but no color
      buffer.setCell(3, 2, { char: 'X' });
      
      const changes = buffer.getChanges();
      expect(changes).toHaveLength(1);
      expect(changes[0].cell.color).toBeUndefined();
    });

    test('getChanges detects all RGB components', () => {
      const cell1: Cell = { char: 'X', color: { r: 100, g: 100, b: 100 } };
      buffer.setCell(5, 2, cell1);
      buffer.swap();
      
      // Change only red component
      const cell2: Cell = { char: 'X', color: { r: 101, g: 100, b: 100 } };
      buffer.setCell(5, 2, cell2);
      expect(buffer.getChanges()).toHaveLength(1);
      
      buffer.swap();
      
      // Change only green component
      const cell3: Cell = { char: 'X', color: { r: 101, g: 101, b: 100 } };
      buffer.setCell(5, 2, cell3);
      expect(buffer.getChanges()).toHaveLength(1);
      
      buffer.swap();
      
      // Change only blue component
      const cell4: Cell = { char: 'X', color: { r: 101, g: 101, b: 101 } };
      buffer.setCell(5, 2, cell4);
      expect(buffer.getChanges()).toHaveLength(1);
    });
  });

  describe('Swap Operation', () => {
    test('swap copies current buffer to previous', () => {
      buffer.setCell(3, 2, { char: 'X' });
      
      const changesBefore = buffer.getChanges();
      expect(changesBefore.length).toBeGreaterThan(0);
      
      buffer.swap();
      
      const changesAfter = buffer.getChanges();
      expect(changesAfter).toEqual([]);
    });

    test('swap preserves cell colors', () => {
      const coloredCell: Cell = { 
        char: 'C', 
        color: createMockColor(255, 128, 64) 
      };
      buffer.setCell(5, 2, coloredCell);
      buffer.swap();
      
      // No changes should be detected after swap
      const changes = buffer.getChanges();
      expect(changes).toEqual([]);
    });

    test('swap allows detecting new changes', () => {
      buffer.setCell(3, 2, { char: 'A' });
      buffer.swap();
      
      buffer.setCell(3, 2, { char: 'B' });
      
      const changes = buffer.getChanges();
      expect(changes).toHaveLength(1);
      expect(changes[0].cell.char).toBe('B');
    });

    test('multiple swaps work correctly', () => {
      // First change
      buffer.setCell(0, 0, { char: 'A' });
      buffer.swap();
      expect(buffer.getChanges()).toEqual([]);
      
      // Second change
      buffer.setCell(1, 1, { char: 'B' });
      buffer.swap();
      expect(buffer.getChanges()).toEqual([]);
      
      // Third change
      buffer.setCell(2, 2, { char: 'C' });
      const changes = buffer.getChanges();
      expect(changes).toHaveLength(1);
      expect(changes[0].cell.char).toBe('C');
    });
  });

  describe('Real-World Usage Patterns', () => {
    test('typical animation frame cycle', () => {
      // Frame 1: Draw some content
      buffer.clear();
      buffer.setCell(5, 2, { char: '*', color: createMockColor(255, 255, 0) });
      
      const changes1 = buffer.getChanges();
      expect(changes1.length).toBeGreaterThan(0);
      
      buffer.swap();
      
      // Frame 2: Update position
      buffer.clear();
      buffer.setCell(6, 2, { char: '*', color: createMockColor(255, 255, 0) });
      
      const changes2 = buffer.getChanges();
      // Should detect clear + new position
      expect(changes2.length).toBeGreaterThan(0);
    });

    test('optimizes unchanged areas', () => {
      // Set up static background
      for (let x = 0; x < 10; x++) {
        buffer.setCell(x, 0, { char: '-' });
      }
      buffer.swap();
      
      // Redraw same background (should detect no changes)
      for (let x = 0; x < 10; x++) {
        buffer.setCell(x, 0, { char: '-' });
      }
      
      const changes = buffer.getChanges();
      expect(changes).toEqual([]);
    });

    test('handles full screen updates efficiently', () => {
      buffer.swap();
      
      // Update entire screen
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 10; x++) {
          buffer.setCell(x, y, { char: 'X' });
        }
      }
      
      const changes = buffer.getChanges();
      expect(changes).toHaveLength(50); // 10 * 5
    });
  });

  describe('Edge Cases', () => {
    test('handles 1x1 buffer', () => {
      const tinyBuffer = new Buffer({ width: 1, height: 1 });
      tinyBuffer.setCell(0, 0, { char: 'X' });
      expect(tinyBuffer.getCell(0, 0)?.char).toBe('X');
    });

    test('handles large buffer dimensions', () => {
      const largeBuffer = new Buffer({ width: 200, height: 100 });
      expect(largeBuffer.getSize()).toEqual({ width: 200, height: 100 });
      
      largeBuffer.setCell(199, 99, { char: 'E' });
      expect(largeBuffer.getCell(199, 99)?.char).toBe('E');
    });

    test('handles cells with undefined color', () => {
      const cell: Cell = { char: 'X', color: undefined };
      buffer.setCell(5, 2, cell);
      
      const retrieved = buffer.getCell(5, 2);
      expect(retrieved?.color).toBeUndefined();
    });

    test('handles rapid cell updates at same position', () => {
      buffer.swap();
      
      buffer.setCell(5, 2, { char: 'A' });
      buffer.setCell(5, 2, { char: 'B' });
      buffer.setCell(5, 2, { char: 'C' });
      
      const changes = buffer.getChanges();
      expect(changes).toHaveLength(1);
      expect(changes[0].cell.char).toBe('C');
    });
  });
});
