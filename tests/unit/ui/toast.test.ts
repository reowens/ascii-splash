/**
 * ToastManager Unit Tests
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { ToastManager, getToastManager, resetToastManager } from '../../../src/ui/ToastManager.js';
import { createMockBuffer } from '../../utils/mocks.js';

describe('ToastManager', () => {
  let toastManager: ToastManager;

  beforeEach(() => {
    resetToastManager();
    toastManager = getToastManager();
  });

  describe('Singleton', () => {
    test('getToastManager returns same instance', () => {
      const instance1 = getToastManager();
      const instance2 = getToastManager();
      expect(instance1).toBe(instance2);
    });

    test('resetToastManager creates new instance', () => {
      const instance1 = getToastManager();
      resetToastManager();
      const instance2 = getToastManager();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('show()', () => {
    test('should add a toast and return an id', () => {
      const id = toastManager.show('Test message');
      expect(id).toBeGreaterThan(0);
      expect(toastManager.hasToasts()).toBe(true);
    });

    test('should accept message, type, and duration', () => {
      const id = toastManager.show('Error!', 'error', 5000);
      expect(id).toBeGreaterThan(0);
      expect(toastManager.getToastCount()).toBe(1);
    });

    test('should increment ids for each toast', () => {
      const id1 = toastManager.show('First');
      const id2 = toastManager.show('Second');
      const id3 = toastManager.show('Third');
      expect(id2).toBe(id1 + 1);
      expect(id3).toBe(id2 + 1);
    });

    test('should respect max toast limit (3)', () => {
      toastManager.show('First');
      toastManager.show('Second');
      toastManager.show('Third');
      toastManager.show('Fourth'); // Should remove first

      expect(toastManager.getToastCount()).toBe(3);
    });
  });

  describe('convenience methods', () => {
    test('success() creates success toast', () => {
      const id = toastManager.success('Success!');
      expect(id).toBeGreaterThan(0);
      expect(toastManager.hasToasts()).toBe(true);
    });

    test('error() creates error toast', () => {
      const id = toastManager.error('Error!');
      expect(id).toBeGreaterThan(0);
    });

    test('info() creates info toast', () => {
      const id = toastManager.info('Info');
      expect(id).toBeGreaterThan(0);
    });

    test('warning() creates warning toast', () => {
      const id = toastManager.warning('Warning!');
      expect(id).toBeGreaterThan(0);
    });
  });

  describe('dismiss()', () => {
    test('should remove a specific toast', () => {
      const id1 = toastManager.show('First');
      toastManager.show('Second');

      toastManager.dismiss(id1);

      expect(toastManager.getToastCount()).toBe(1);
    });

    test('should handle dismissing non-existent toast', () => {
      toastManager.show('Test');
      expect(() => toastManager.dismiss(999)).not.toThrow();
      expect(toastManager.getToastCount()).toBe(1);
    });
  });

  describe('clear()', () => {
    test('should remove all toasts', () => {
      toastManager.show('First');
      toastManager.show('Second');
      toastManager.show('Third');

      toastManager.clear();

      expect(toastManager.hasToasts()).toBe(false);
      expect(toastManager.getToastCount()).toBe(0);
    });
  });

  describe('update()', () => {
    test('should remove expired toasts', () => {
      // Add toast with 100ms duration
      toastManager.show('Quick toast', 'info', 100);
      expect(toastManager.hasToasts()).toBe(true);

      // First update initializes lastUpdateTime
      toastManager.update(1000);
      expect(toastManager.hasToasts()).toBe(true);

      // Simulate 200ms passing (more than duration)
      toastManager.update(1200);
      expect(toastManager.hasToasts()).toBe(false);
    });

    test('should keep unexpired toasts', () => {
      toastManager.show('Long toast', 'info', 5000);

      toastManager.update(1000);
      toastManager.update(1100);

      expect(toastManager.hasToasts()).toBe(true);
    });
  });

  describe('hasToasts()', () => {
    test('should return false when empty', () => {
      expect(toastManager.hasToasts()).toBe(false);
    });

    test('should return true when has toasts', () => {
      toastManager.show('Test');
      expect(toastManager.hasToasts()).toBe(true);
    });
  });

  describe('getToastCount()', () => {
    test('should return correct count', () => {
      expect(toastManager.getToastCount()).toBe(0);
      toastManager.show('First');
      expect(toastManager.getToastCount()).toBe(1);
      toastManager.show('Second');
      expect(toastManager.getToastCount()).toBe(2);
    });
  });

  describe('render()', () => {
    test('should not render when no toasts', () => {
      const buffer = createMockBuffer(80, 24);
      const size = { width: 80, height: 24 };

      toastManager.render(buffer, size);

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

    test('should render toasts to buffer', () => {
      const buffer = createMockBuffer(80, 24);
      const size = { width: 80, height: 24 };

      toastManager.show('Test message');
      toastManager.render(buffer, size);

      // Check that buffer has some content (border or text)
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

    test('should render multiple toasts stacked', () => {
      const buffer = createMockBuffer(80, 24);
      const size = { width: 80, height: 24 };

      toastManager.show('First');
      toastManager.show('Second');
      toastManager.render(buffer, size);

      // Should have content in multiple areas (toasts are 3 rows high + spacing)
      let contentRows = 0;
      for (let y = 0; y < 24; y++) {
        for (let x = 0; x < 80; x++) {
          if (buffer[y][x].char !== ' ') {
            contentRows++;
            break;
          }
        }
      }
      expect(contentRows).toBeGreaterThan(3); // More than one toast
    });

    test('should handle small buffer sizes', () => {
      const buffer = createMockBuffer(20, 10);
      const size = { width: 20, height: 10 };

      toastManager.show('Test message');

      expect(() => {
        toastManager.render(buffer, size);
      }).not.toThrow();
    });
  });
});
