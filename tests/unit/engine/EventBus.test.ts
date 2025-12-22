/**
 * EventBus Tests
 *
 * Tests for the central event system
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { EventBus, EngineEvent, getEventBus, resetEventBus } from '../../../src/engine/EventBus.js';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('Basic emit/on', () => {
    test('should emit and receive events', () => {
      const handler = jest.fn();
      eventBus.on(EngineEvent.PATTERN_CHANGE, handler);

      eventBus.emit(EngineEvent.PATTERN_CHANGE, {
        oldPattern: 'waves',
        newPattern: 'matrix',
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EngineEvent.PATTERN_CHANGE,
          data: { oldPattern: 'waves', newPattern: 'matrix' },
        })
      );
    });

    test('should include timestamp in event envelope', () => {
      const handler = jest.fn();
      eventBus.on(EngineEvent.PAUSE, handler);

      const before = Date.now();
      eventBus.emit(EngineEvent.PAUSE, undefined);
      const after = Date.now();

      expect(handler).toHaveBeenCalledTimes(1);
      const envelope = handler.mock.calls[0][0];
      expect(envelope.timestamp).toBeGreaterThanOrEqual(before);
      expect(envelope.timestamp).toBeLessThanOrEqual(after);
    });

    test('should support multiple handlers for same event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.on(EngineEvent.THEME_CHANGE, handler1);
      eventBus.on(EngineEvent.THEME_CHANGE, handler2);

      eventBus.emit(EngineEvent.THEME_CHANGE, {
        oldTheme: 'ocean',
        newTheme: 'fire',
      });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    test('should not receive events after unsubscribe', () => {
      const handler = jest.fn();
      const subscription = eventBus.on(EngineEvent.FPS_CHANGE, handler);

      eventBus.emit(EngineEvent.FPS_CHANGE, { oldFps: 30, newFps: 60 });
      expect(handler).toHaveBeenCalledTimes(1);

      subscription.unsubscribe();

      eventBus.emit(EngineEvent.FPS_CHANGE, { oldFps: 60, newFps: 30 });
      expect(handler).toHaveBeenCalledTimes(1); // Still 1, not 2
    });
  });

  describe('once()', () => {
    test('should only receive event once', () => {
      const handler = jest.fn();
      eventBus.once(EngineEvent.RESIZE, handler);

      eventBus.emit(EngineEvent.RESIZE, {
        oldSize: { width: 80, height: 24 },
        newSize: { width: 120, height: 40 },
      });
      eventBus.emit(EngineEvent.RESIZE, {
        oldSize: { width: 120, height: 40 },
        newSize: { width: 80, height: 24 },
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('should still be able to unsubscribe before event fires', () => {
      const handler = jest.fn();
      const subscription = eventBus.once(EngineEvent.PAUSE, handler);

      subscription.unsubscribe();
      eventBus.emit(EngineEvent.PAUSE, undefined);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('off()', () => {
    test('should remove specific handler', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.on(EngineEvent.FRAME_START, handler1);
      eventBus.on(EngineEvent.FRAME_START, handler2);

      eventBus.off(EngineEvent.FRAME_START, handler1);

      eventBus.emit(EngineEvent.FRAME_START, {
        time: 1000,
        frameNumber: 1,
        deltaTime: 16,
      });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    test('should handle removing non-existent handler gracefully', () => {
      const handler = jest.fn();

      // Should not throw
      expect(() => {
        eventBus.off(EngineEvent.PAUSE, handler);
      }).not.toThrow();
    });
  });

  describe('onAll()', () => {
    test('should receive all events', () => {
      const handler = jest.fn();
      eventBus.onAll(handler);

      eventBus.emit(EngineEvent.PATTERN_CHANGE, { newPattern: 'waves' });
      eventBus.emit(EngineEvent.THEME_CHANGE, { newTheme: 'fire' });
      eventBus.emit(EngineEvent.PAUSE, undefined);

      expect(handler).toHaveBeenCalledTimes(3);
    });

    test('should be able to unsubscribe from all events', () => {
      const handler = jest.fn();
      const subscription = eventBus.onAll(handler);

      eventBus.emit(EngineEvent.PAUSE, undefined);
      expect(handler).toHaveBeenCalledTimes(1);

      subscription.unsubscribe();

      eventBus.emit(EngineEvent.RESUME, undefined);
      expect(handler).toHaveBeenCalledTimes(1); // Still 1
    });
  });

  describe('Event History', () => {
    test('should track event history', () => {
      eventBus.emit(EngineEvent.PATTERN_CHANGE, { newPattern: 'waves' });
      eventBus.emit(EngineEvent.THEME_CHANGE, { newTheme: 'fire' });

      const history = eventBus.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].type).toBe(EngineEvent.PATTERN_CHANGE);
      expect(history[1].type).toBe(EngineEvent.THEME_CHANGE);
    });

    test('should limit history size', () => {
      // Emit 150 events (max is 100)
      for (let i = 0; i < 150; i++) {
        eventBus.emit(EngineEvent.FRAME_START, { time: i, frameNumber: i });
      }

      const history = eventBus.getHistory();
      expect(history.length).toBeLessThanOrEqual(100);
    });

    test('should clear history', () => {
      eventBus.emit(EngineEvent.PAUSE, undefined);
      eventBus.emit(EngineEvent.RESUME, undefined);

      eventBus.clearHistory();

      expect(eventBus.getHistory()).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    test('should not break other handlers if one throws', () => {
      const throwingHandler = jest.fn(() => {
        throw new Error('Handler error');
      });
      const normalHandler = jest.fn();

      eventBus.on(EngineEvent.PAUSE, throwingHandler);
      eventBus.on(EngineEvent.PAUSE, normalHandler);

      // Should not throw
      expect(() => {
        eventBus.emit(EngineEvent.PAUSE, undefined);
      }).not.toThrow();

      // Both handlers should have been called
      expect(throwingHandler).toHaveBeenCalledTimes(1);
      expect(normalHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Listener Management', () => {
    test('should track listener count', () => {
      expect(eventBus.listenerCount(EngineEvent.PAUSE)).toBe(0);

      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.on(EngineEvent.PAUSE, handler1);
      expect(eventBus.listenerCount(EngineEvent.PAUSE)).toBe(1);

      eventBus.on(EngineEvent.PAUSE, handler2);
      expect(eventBus.listenerCount(EngineEvent.PAUSE)).toBe(2);

      eventBus.off(EngineEvent.PAUSE, handler1);
      expect(eventBus.listenerCount(EngineEvent.PAUSE)).toBe(1);
    });

    test('should check if event has listeners', () => {
      expect(eventBus.hasListeners(EngineEvent.PAUSE)).toBe(false);

      const handler = jest.fn();
      eventBus.on(EngineEvent.PAUSE, handler);

      expect(eventBus.hasListeners(EngineEvent.PAUSE)).toBe(true);
    });

    test('should clear all listeners', () => {
      eventBus.on(EngineEvent.PAUSE, jest.fn());
      eventBus.on(EngineEvent.RESUME, jest.fn());
      eventBus.onAll(jest.fn());

      eventBus.clear();

      expect(eventBus.listenerCount(EngineEvent.PAUSE)).toBe(0);
      expect(eventBus.listenerCount(EngineEvent.RESUME)).toBe(0);
    });
  });

  describe('Custom Events', () => {
    test('should support custom event strings', () => {
      const handler = jest.fn();
      eventBus.on('custom:myEvent', handler);

      eventBus.emit('custom:myEvent', { custom: 'data' });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'custom:myEvent',
          data: { custom: 'data' },
        })
      );
    });
  });

  describe('Singleton', () => {
    beforeEach(() => {
      resetEventBus();
    });

    afterEach(() => {
      resetEventBus();
    });

    test('should return same instance', () => {
      const bus1 = getEventBus();
      const bus2 = getEventBus();
      expect(bus1).toBe(bus2);
    });

    test('should create new instance after reset', () => {
      const bus1 = getEventBus();
      resetEventBus();
      const bus2 = getEventBus();
      expect(bus1).not.toBe(bus2);
    });
  });

  describe('Event Types', () => {
    test('should handle PATTERN_CHANGE event', () => {
      const handler = jest.fn();
      eventBus.on(EngineEvent.PATTERN_CHANGE, handler);

      eventBus.emit(EngineEvent.PATTERN_CHANGE, {
        oldPattern: 'waves',
        newPattern: 'matrix',
        preset: 3,
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            oldPattern: 'waves',
            newPattern: 'matrix',
            preset: 3,
          },
        })
      );
    });

    test('should handle MOUSE_MOVE event', () => {
      const handler = jest.fn();
      eventBus.on(EngineEvent.MOUSE_MOVE, handler);

      eventBus.emit(EngineEvent.MOUSE_MOVE, {
        position: { x: 50, y: 25 },
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            position: { x: 50, y: 25 },
          },
        })
      );
    });

    test('should handle TOAST_SHOW event', () => {
      const handler = jest.fn();
      eventBus.on(EngineEvent.TOAST_SHOW, handler);

      eventBus.emit(EngineEvent.TOAST_SHOW, {
        message: 'Pattern saved!',
        type: 'success',
        duration: 3000,
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            message: 'Pattern saved!',
            type: 'success',
            duration: 3000,
          },
        })
      );
    });
  });
});
