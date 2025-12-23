/**
 * StatusBar - Persistent status display at bottom of screen
 *
 * Shows current pattern, preset, theme, FPS, shuffle status, and hints
 */

import type { Cell, Color, Size } from '../types/index.js';

interface StatusSegment {
  content: string;
  color: Color;
  priority: number; // Lower = more important, shown first
}

export interface StatusBarState {
  patternName: string;
  presetNumber: number;
  themeName: string;
  fps: number;
  shuffleMode: 'off' | 'preset' | 'all';
  paused: boolean;
}

export class StatusBar {
  private state: StatusBarState = {
    patternName: 'Waves',
    presetNumber: 1,
    themeName: 'Ocean',
    fps: 30,
    shuffleMode: 'off',
    paused: false,
  };

  // Colors
  private readonly bgColor: Color = { r: 20, g: 25, b: 35 };
  private readonly separatorColor: Color = { r: 60, g: 70, b: 90 };
  private readonly patternColor: Color = { r: 100, g: 180, b: 255 };
  private readonly themeColor: Color = { r: 180, g: 140, b: 255 };
  private readonly fpsGoodColor: Color = { r: 100, g: 220, b: 120 };
  private readonly fpsWarnColor: Color = { r: 255, g: 200, b: 100 };
  private readonly fpsBadColor: Color = { r: 255, g: 100, b: 100 };
  private readonly shuffleOnColor: Color = { r: 255, g: 180, b: 100 };
  private readonly shuffleOffColor: Color = { r: 100, g: 100, b: 120 };
  private readonly hintColor: Color = { r: 120, g: 130, b: 150 };
  private readonly pausedColor: Color = { r: 255, g: 150, b: 100 };

  update(state: Partial<StatusBarState>): void {
    this.state = { ...this.state, ...state };
  }

  getState(): StatusBarState {
    return { ...this.state };
  }

  /**
   * Render the status bar to the bottom row of the buffer
   */
  render(buffer: Cell[][], size: Size): void {
    const y = size.height - 1;
    if (y < 0 || y >= buffer.length) return;

    // Fill background
    for (let x = 0; x < size.width && x < buffer[y].length; x++) {
      buffer[y][x] = { char: ' ', color: this.bgColor };
    }

    // Build segments
    const segments = this.buildSegments();

    // Render segments from left to right
    let x = 1;
    for (let i = 0; i < segments.length && x < size.width - 10; i++) {
      const segment = segments[i];

      // Add separator if not first
      if (i > 0) {
        this.setCell(buffer, x, y, '|', this.separatorColor);
        x += 2;
      }

      // Render segment content
      for (const char of segment.content) {
        if (x >= size.width - 10) break;
        this.setCell(buffer, x, y, char, segment.color);
        x++;
      }
      x++; // Space after segment
    }

    // Render hints on the right side
    const hints = '? Help';
    const hintsX = size.width - hints.length - 2;
    if (hintsX > x + 2) {
      for (let i = 0; i < hints.length; i++) {
        this.setCell(buffer, hintsX + i, y, hints[i], this.hintColor);
      }
    }
  }

  private buildSegments(): StatusSegment[] {
    const segments: StatusSegment[] = [];

    // Paused indicator (highest priority)
    if (this.state.paused) {
      segments.push({
        content: 'PAUSED',
        color: this.pausedColor,
        priority: 0,
      });
    }

    // Pattern.Preset
    segments.push({
      content: `${this.truncate(this.state.patternName, 12)}.${String(this.state.presetNumber)}`,
      color: this.patternColor,
      priority: 1,
    });

    // Theme
    segments.push({
      content: this.truncate(this.state.themeName, 10),
      color: this.themeColor,
      priority: 2,
    });

    // FPS with color coding
    const fpsColor = this.getFpsColor(this.state.fps);
    segments.push({
      content: `${String(this.state.fps)}fps`,
      color: fpsColor,
      priority: 3,
    });

    // Shuffle status
    const shuffleContent = this.getShuffleContent();
    const shuffleColor =
      this.state.shuffleMode !== 'off' ? this.shuffleOnColor : this.shuffleOffColor;
    segments.push({
      content: shuffleContent,
      color: shuffleColor,
      priority: 4,
    });

    // Sort by priority
    segments.sort((a, b) => a.priority - b.priority);

    return segments;
  }

  private getFpsColor(fps: number): Color {
    if (fps >= 25) return this.fpsGoodColor;
    if (fps >= 15) return this.fpsWarnColor;
    return this.fpsBadColor;
  }

  private getShuffleContent(): string {
    switch (this.state.shuffleMode) {
      case 'preset':
        return 'Shuffle: ON';
      case 'all':
        return 'Shuffle: ALL';
      default:
        return 'Shuffle: OFF';
    }
  }

  private truncate(str: string, maxLen: number): string {
    if (str.length <= maxLen) return str;
    return str.substring(0, maxLen - 1) + '~';
  }

  private setCell(buffer: Cell[][], x: number, y: number, char: string, color: Color): void {
    if (y >= 0 && y < buffer.length && x >= 0 && x < buffer[y].length) {
      buffer[y][x] = { char, color };
    }
  }
}

// Singleton instance
let statusBar: StatusBar | null = null;

export function getStatusBar(): StatusBar {
  if (!statusBar) {
    statusBar = new StatusBar();
  }
  return statusBar;
}

export function resetStatusBar(): void {
  statusBar = null;
}
