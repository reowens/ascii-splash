/**
 * ToastManager - Non-blocking notification system
 *
 * Displays temporary messages that auto-dismiss after a duration
 */

import type { Cell, Color, Size } from '../types/index.js';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration: number; // Total duration in ms
  elapsed: number; // Time elapsed in ms
  createdAt: number;
}

const TOAST_COLORS: Record<ToastType, { bg: Color; text: Color; border: Color }> = {
  success: {
    bg: { r: 20, g: 40, b: 30 },
    text: { r: 100, g: 220, b: 120 },
    border: { r: 60, g: 140, b: 80 },
  },
  error: {
    bg: { r: 45, g: 20, b: 20 },
    text: { r: 255, g: 120, b: 120 },
    border: { r: 180, g: 60, b: 60 },
  },
  info: {
    bg: { r: 20, g: 30, b: 45 },
    text: { r: 120, g: 180, b: 255 },
    border: { r: 60, g: 100, b: 160 },
  },
  warning: {
    bg: { r: 45, g: 35, b: 20 },
    text: { r: 255, g: 200, b: 100 },
    border: { r: 160, g: 120, b: 60 },
  },
};

export class ToastManager {
  private toasts: Toast[] = [];
  private nextId = 1;
  private maxToasts = 3;
  private defaultDuration = 3000; // 3 seconds
  private lastUpdateTime = 0;

  /**
   * Show a new toast notification
   */
  show(message: string, type: ToastType = 'info', duration?: number): number {
    const id = this.nextId++;

    const toast: Toast = {
      id,
      message,
      type,
      duration: duration ?? this.defaultDuration,
      elapsed: 0,
      createdAt: Date.now(),
    };

    this.toasts.push(toast);

    // Remove oldest if exceeding max
    while (this.toasts.length > this.maxToasts) {
      this.toasts.shift();
    }

    return id;
  }

  /**
   * Show a success toast
   */
  success(message: string, duration?: number): number {
    return this.show(message, 'success', duration);
  }

  /**
   * Show an error toast
   */
  error(message: string, duration?: number): number {
    return this.show(message, 'error', duration);
  }

  /**
   * Show an info toast
   */
  info(message: string, duration?: number): number {
    return this.show(message, 'info', duration);
  }

  /**
   * Show a warning toast
   */
  warning(message: string, duration?: number): number {
    return this.show(message, 'warning', duration);
  }

  /**
   * Remove a specific toast
   */
  dismiss(id: number): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  /**
   * Clear all toasts
   */
  clear(): void {
    this.toasts = [];
  }

  /**
   * Update toast timers (call each frame)
   */
  update(time: number): void {
    if (this.lastUpdateTime === 0) {
      this.lastUpdateTime = time;
      return;
    }

    const deltaTime = time - this.lastUpdateTime;
    this.lastUpdateTime = time;

    // Update elapsed time and remove expired toasts
    this.toasts = this.toasts.filter(toast => {
      toast.elapsed += deltaTime;
      return toast.elapsed < toast.duration;
    });
  }

  /**
   * Check if there are any active toasts
   */
  hasToasts(): boolean {
    return this.toasts.length > 0;
  }

  /**
   * Get the number of active toasts
   */
  getToastCount(): number {
    return this.toasts.length;
  }

  /**
   * Render all active toasts to the buffer
   */
  render(buffer: Cell[][], size: Size): void {
    if (this.toasts.length === 0) return;

    // Render toasts in top-right corner, stacked vertically
    const toastWidth = Math.min(40, size.width - 4);
    const startX = size.width - toastWidth - 2;
    let startY = 2;

    for (const toast of this.toasts) {
      if (startY + 3 >= size.height - 1) break; // Don't overlap status bar

      this.renderToast(buffer, toast, startX, startY, toastWidth);
      startY += 4; // Height of toast + spacing
    }
  }

  private renderToast(buffer: Cell[][], toast: Toast, x: number, y: number, width: number): void {
    const colors = TOAST_COLORS[toast.type];
    const height = 3;

    // Calculate progress (for progress bar)
    const progress = 1 - toast.elapsed / toast.duration;

    // Fill background
    for (let row = y; row < y + height && row < buffer.length; row++) {
      for (let col = x; col < x + width && col < buffer[row].length; col++) {
        if (row >= 0 && col >= 0) {
          buffer[row][col] = { char: ' ', color: colors.bg };
        }
      }
    }

    // Draw border (simple corners and edges)
    this.setCell(buffer, x, y, '+', colors.border);
    this.setCell(buffer, x + width - 1, y, '+', colors.border);
    this.setCell(buffer, x, y + height - 1, '+', colors.border);
    this.setCell(buffer, x + width - 1, y + height - 1, '+', colors.border);

    for (let col = x + 1; col < x + width - 1; col++) {
      this.setCell(buffer, col, y, '-', colors.border);
      this.setCell(buffer, col, y + height - 1, '-', colors.border);
    }

    for (let row = y + 1; row < y + height - 1; row++) {
      this.setCell(buffer, x, row, '|', colors.border);
      this.setCell(buffer, x + width - 1, row, '|', colors.border);
    }

    // Draw message (centered in middle row)
    const messageY = y + 1;
    const maxMsgLen = width - 4;
    const msg =
      toast.message.length > maxMsgLen
        ? toast.message.substring(0, maxMsgLen - 3) + '...'
        : toast.message;
    const msgX = x + 2;

    for (let i = 0; i < msg.length; i++) {
      this.setCell(buffer, msgX + i, messageY, msg[i], colors.text);
    }

    // Draw progress bar on bottom border
    const progressWidth = Math.floor((width - 2) * progress);
    for (let i = 0; i < progressWidth && i < width - 2; i++) {
      this.setCell(buffer, x + 1 + i, y + height - 1, '=', colors.text);
    }
  }

  private setCell(buffer: Cell[][], x: number, y: number, char: string, color: Color): void {
    if (y >= 0 && y < buffer.length && x >= 0 && x < buffer[y].length) {
      buffer[y][x] = { char, color };
    }
  }
}

// Singleton instance
let toastManager: ToastManager | null = null;

export function getToastManager(): ToastManager {
  if (!toastManager) {
    toastManager = new ToastManager();
  }
  return toastManager;
}

export function resetToastManager(): void {
  toastManager = null;
}
