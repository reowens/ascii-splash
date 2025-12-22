/**
 * EventBus - Central event system for decoupled component communication
 *
 * Enables patterns, engine, renderer, and UI components to communicate
 * without direct dependencies.
 */

import type { Size, Point } from '../types/index.js';

// Event type definitions
export enum EngineEvent {
  // Lifecycle events
  PATTERN_CHANGE = 'engine:pattern:change',
  PATTERN_BEFORE_CHANGE = 'engine:pattern:beforeChange',
  THEME_CHANGE = 'engine:theme:change',
  THEME_BEFORE_CHANGE = 'engine:theme:beforeChange',
  FPS_CHANGE = 'engine:fps:change',
  RESIZE = 'engine:resize',
  PAUSE = 'engine:pause',
  RESUME = 'engine:resume',

  // Frame events
  FRAME_START = 'engine:frame:start',
  FRAME_END = 'engine:frame:end',
  FRAME_DROP = 'engine:frame:drop',

  // Input events
  MOUSE_MOVE = 'input:mouse:move',
  MOUSE_CLICK = 'input:mouse:click',
  KEY_PRESS = 'input:key:press',
  COMMAND_EXECUTE = 'input:command:execute',
  COMMAND_SUCCESS = 'input:command:success',
  COMMAND_ERROR = 'input:command:error',

  // UI events
  OVERLAY_SHOW = 'ui:overlay:show',
  OVERLAY_HIDE = 'ui:overlay:hide',
  TOAST_SHOW = 'ui:toast:show',

  // Pattern events
  PATTERN_CUSTOM = 'pattern:custom',
}

// Event payload interfaces
export interface PatternChangePayload {
  oldPattern?: string;
  newPattern: string;
  preset?: number;
}

export interface ThemeChangePayload {
  oldTheme?: string;
  newTheme: string;
}

export interface FpsChangePayload {
  oldFps: number;
  newFps: number;
}

export interface ResizePayload {
  oldSize?: Size;
  newSize: Size;
}

export interface FramePayload {
  time: number;
  frameNumber: number;
  deltaTime?: number;
}

export interface MousePayload {
  position: Point;
  button?: number;
}

export interface KeyPayload {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
}

export interface CommandPayload {
  command: string;
  args?: string[];
}

export interface ToastPayload {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export interface CustomEventPayload {
  source: string;
  eventName: string;
  data: unknown;
}

// Event payload type mapping
export interface EventPayloadMap {
  [EngineEvent.PATTERN_CHANGE]: PatternChangePayload;
  [EngineEvent.PATTERN_BEFORE_CHANGE]: PatternChangePayload;
  [EngineEvent.THEME_CHANGE]: ThemeChangePayload;
  [EngineEvent.THEME_BEFORE_CHANGE]: ThemeChangePayload;
  [EngineEvent.FPS_CHANGE]: FpsChangePayload;
  [EngineEvent.RESIZE]: ResizePayload;
  [EngineEvent.PAUSE]: undefined;
  [EngineEvent.RESUME]: undefined;
  [EngineEvent.FRAME_START]: FramePayload;
  [EngineEvent.FRAME_END]: FramePayload;
  [EngineEvent.FRAME_DROP]: FramePayload;
  [EngineEvent.MOUSE_MOVE]: MousePayload;
  [EngineEvent.MOUSE_CLICK]: MousePayload;
  [EngineEvent.KEY_PRESS]: KeyPayload;
  [EngineEvent.COMMAND_EXECUTE]: CommandPayload;
  [EngineEvent.COMMAND_SUCCESS]: CommandPayload;
  [EngineEvent.COMMAND_ERROR]: CommandPayload & { error: string };
  [EngineEvent.OVERLAY_SHOW]: { overlay: string };
  [EngineEvent.OVERLAY_HIDE]: { overlay: string };
  [EngineEvent.TOAST_SHOW]: ToastPayload;
  [EngineEvent.PATTERN_CUSTOM]: CustomEventPayload;
}

// Generic event wrapper
export interface EventEnvelope<T = unknown> {
  type: string;
  timestamp: number;
  data: T;
}

// Subscription handle
export interface Subscription {
  unsubscribe(): void;
}

// Event handler type
type EventHandler<T = unknown> = (envelope: EventEnvelope<T>) => void;

/**
 * EventBus implementation with type-safe events
 */
export class EventBus {
  private listeners = new Map<string, Set<EventHandler>>();
  private wildcardListeners = new Set<EventHandler>();
  private eventHistory: EventEnvelope[] = [];
  private maxHistorySize = 100;

  /**
   * Emit an event to all registered listeners
   */
  emit<K extends keyof EventPayloadMap>(event: K, data: EventPayloadMap[K]): void;
  emit(event: string, data: unknown): void;
  emit(event: string, data: unknown): void {
    const envelope: EventEnvelope = {
      type: event,
      timestamp: Date.now(),
      data,
    };

    // Add to history
    this.eventHistory.push(envelope);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Notify specific listeners
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(envelope);
        } catch {
          // Don't let one handler break others
          // In production, this could be logged
        }
      });
    }

    // Notify wildcard listeners
    this.wildcardListeners.forEach(handler => {
      try {
        handler(envelope);
      } catch {
        // Don't let one handler break others
      }
    });
  }

  /**
   * Subscribe to an event
   */
  on<K extends keyof EventPayloadMap>(
    event: K,
    handler: (envelope: EventEnvelope<EventPayloadMap[K]>) => void
  ): Subscription;
  on(event: string, handler: EventHandler): Subscription;
  on(event: string, handler: EventHandler): Subscription {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.add(handler);
    }

    return {
      unsubscribe: () => {
        this.off(event, handler);
      },
    };
  }

  /**
   * Subscribe to an event for one emission only
   */
  once<K extends keyof EventPayloadMap>(
    event: K,
    handler: (envelope: EventEnvelope<EventPayloadMap[K]>) => void
  ): Subscription;
  once(event: string, handler: EventHandler): Subscription;
  once(event: string, handler: EventHandler): Subscription {
    const wrappedHandler: EventHandler = envelope => {
      this.off(event, wrappedHandler);
      handler(envelope);
    };
    return this.on(event, wrappedHandler);
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, handler: EventHandler): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Subscribe to all events (useful for logging/debugging)
   */
  onAll(handler: EventHandler): Subscription {
    this.wildcardListeners.add(handler);
    return {
      unsubscribe: () => this.wildcardListeners.delete(handler),
    };
  }

  /**
   * Get recent event history (useful for debugging)
   */
  getHistory(): readonly EventEnvelope[] {
    return [...this.eventHistory];
  }

  /**
   * Clear all listeners (useful for testing)
   */
  clear(): void {
    this.listeners.clear();
    this.wildcardListeners.clear();
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  /**
   * Check if there are any listeners for an event
   */
  hasListeners(event: string): boolean {
    return this.listenerCount(event) > 0;
  }
}

// Singleton instance for global access
let globalEventBus: EventBus | null = null;

/**
 * Get or create the global EventBus instance
 */
export function getEventBus(): EventBus {
  if (!globalEventBus) {
    globalEventBus = new EventBus();
  }
  return globalEventBus;
}

/**
 * Reset the global EventBus (for testing)
 */
export function resetEventBus(): void {
  if (globalEventBus) {
    globalEventBus.clear();
    globalEventBus.clearHistory();
  }
  globalEventBus = null;
}
