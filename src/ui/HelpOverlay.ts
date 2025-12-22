/**
 * HelpOverlay - Interactive help system showing controls and commands
 *
 * Displays a context-aware help overlay when user presses '?'
 */

import type { Cell, Color, Size } from '../types/index.js';

export type HelpTab = 'controls' | 'commands' | 'patterns' | 'themes';

interface HelpSection {
  title: string;
  items: { key: string; description: string }[];
}

const HELP_SECTIONS: Record<HelpTab, HelpSection[]> = {
  controls: [
    {
      title: 'QUICK CONTROLS',
      items: [
        { key: '1-9', description: 'Patterns 1-9' },
        { key: 'n / b', description: 'Next/Previous pattern' },
        { key: '. / ,', description: 'Next/Prev preset' },
        { key: 'r', description: 'Random everything' },
        { key: 't', description: 'Cycle themes' },
        { key: 'SPACE', description: 'Pause/Resume' },
        { key: 'd', description: 'Debug overlay' },
        { key: '?', description: 'Toggle help' },
      ],
    },
    {
      title: 'MOUSE',
      items: [
        { key: 'Move', description: 'Interactive effects' },
        { key: 'Click', description: 'Ripple/burst/interact' },
      ],
    },
  ],
  commands: [
    {
      title: 'COMMAND MODE (c prefix)',
      items: [
        { key: 'c01-c99', description: 'Apply preset #' },
        { key: 'cp#', description: 'Switch to pattern #' },
        { key: 'ct#', description: 'Switch to theme #' },
        { key: 'cF#', description: 'Save to favorite #' },
        { key: 'cf#', description: 'Load favorite #' },
        { key: 'c*', description: 'Random preset' },
        { key: 'c**', description: 'Random everything' },
        { key: 'c!', description: 'Toggle preset shuffle' },
        { key: 'c!!', description: 'Toggle full shuffle' },
        { key: 'cs', description: 'Save configuration' },
      ],
    },
  ],
  patterns: [
    {
      title: 'PATTERNS (23)',
      items: [
        { key: '1', description: 'Waves' },
        { key: '2', description: 'Starfield' },
        { key: '3', description: 'Matrix' },
        { key: '4', description: 'Rain' },
        { key: '5', description: 'Quicksilver' },
        { key: '6', description: 'Particles' },
        { key: '7', description: 'Spiral' },
        { key: '8', description: 'Plasma' },
        { key: '9', description: 'Tunnel' },
        { key: 'n', description: 'More patterns...' },
      ],
    },
  ],
  themes: [
    {
      title: 'THEMES (5)',
      items: [
        { key: 'ct1', description: 'Ocean (default)' },
        { key: 'ct2', description: 'Matrix' },
        { key: 'ct3', description: 'Starlight' },
        { key: 'ct4', description: 'Fire' },
        { key: 'ct5', description: 'Monochrome' },
      ],
    },
  ],
};

const TABS: HelpTab[] = ['controls', 'commands', 'patterns', 'themes'];

export class HelpOverlay {
  private visible = false;
  private currentTab: HelpTab = 'controls';

  // Colors for the overlay
  private readonly bgColor: Color = { r: 20, g: 20, b: 30 };
  private readonly borderColor: Color = { r: 80, g: 120, b: 180 };
  private readonly titleColor: Color = { r: 100, g: 180, b: 255 };
  private readonly keyColor: Color = { r: 255, g: 200, b: 100 };
  private readonly textColor: Color = { r: 180, g: 180, b: 180 };
  private readonly activeTabColor: Color = { r: 100, g: 180, b: 255 };
  private readonly inactiveTabColor: Color = { r: 80, g: 80, b: 100 };

  toggle(): void {
    this.visible = !this.visible;
    if (this.visible) {
      this.currentTab = 'controls'; // Reset to first tab when opening
    }
  }

  show(): void {
    this.visible = true;
    this.currentTab = 'controls';
  }

  hide(): void {
    this.visible = false;
  }

  isVisible(): boolean {
    return this.visible;
  }

  nextTab(): void {
    const currentIndex = TABS.indexOf(this.currentTab);
    this.currentTab = TABS[(currentIndex + 1) % TABS.length];
  }

  prevTab(): void {
    const currentIndex = TABS.indexOf(this.currentTab);
    this.currentTab = TABS[(currentIndex - 1 + TABS.length) % TABS.length];
  }

  setTab(tab: HelpTab): void {
    if (TABS.includes(tab)) {
      this.currentTab = tab;
    }
  }

  getCurrentTab(): HelpTab {
    return this.currentTab;
  }

  /**
   * Render the help overlay to the buffer
   */
  render(buffer: Cell[][], size: Size): void {
    if (!this.visible) return;

    // Calculate overlay dimensions (centered, 60x20 or fit to screen)
    const overlayWidth = Math.min(62, size.width - 4);
    const overlayHeight = Math.min(22, size.height - 4);
    const startX = Math.floor((size.width - overlayWidth) / 2);
    const startY = Math.floor((size.height - overlayHeight) / 2);

    // Draw background
    this.fillRect(buffer, startX, startY, overlayWidth, overlayHeight, ' ', this.bgColor);

    // Draw border
    this.drawBorder(buffer, startX, startY, overlayWidth, overlayHeight);

    // Draw title
    const title = ' ascii-splash Help ';
    const titleX = startX + Math.floor((overlayWidth - title.length) / 2);
    this.drawText(buffer, titleX, startY, title, this.titleColor);

    // Draw tab bar
    this.drawTabBar(buffer, startX + 2, startY + 2, overlayWidth - 4);

    // Draw content
    this.drawContent(buffer, startX + 2, startY + 4, overlayWidth - 4, overlayHeight - 6);

    // Draw footer
    const footer = '[TAB: next] [ESC/?: close]';
    const footerX = startX + Math.floor((overlayWidth - footer.length) / 2);
    this.drawText(buffer, footerX, startY + overlayHeight - 1, footer, this.textColor);
  }

  private fillRect(
    buffer: Cell[][],
    x: number,
    y: number,
    width: number,
    height: number,
    char: string,
    color: Color
  ): void {
    for (let row = y; row < y + height && row < buffer.length; row++) {
      for (let col = x; col < x + width && col < buffer[row].length; col++) {
        if (row >= 0 && col >= 0) {
          buffer[row][col] = { char, color };
        }
      }
    }
  }

  private drawBorder(buffer: Cell[][], x: number, y: number, width: number, height: number): void {
    // Corners
    this.setCell(buffer, x, y, '+', this.borderColor);
    this.setCell(buffer, x + width - 1, y, '+', this.borderColor);
    this.setCell(buffer, x, y + height - 1, '+', this.borderColor);
    this.setCell(buffer, x + width - 1, y + height - 1, '+', this.borderColor);

    // Top and bottom borders
    for (let col = x + 1; col < x + width - 1; col++) {
      this.setCell(buffer, col, y, '=', this.borderColor);
      this.setCell(buffer, col, y + height - 1, '=', this.borderColor);
    }

    // Left and right borders
    for (let row = y + 1; row < y + height - 1; row++) {
      this.setCell(buffer, x, row, '|', this.borderColor);
      this.setCell(buffer, x + width - 1, row, '|', this.borderColor);
    }
  }

  private drawTabBar(buffer: Cell[][], x: number, y: number, _width: number): void {
    let currentX = x;
    for (const tab of TABS) {
      const isActive = tab === this.currentTab;
      const tabText = ` ${tab.charAt(0).toUpperCase() + tab.slice(1)} `;
      const color = isActive ? this.activeTabColor : this.inactiveTabColor;

      // Draw tab with brackets if active
      if (isActive) {
        this.drawText(buffer, currentX, y, '[', this.borderColor);
        this.drawText(buffer, currentX + 1, y, tabText.trim(), color);
        this.drawText(buffer, currentX + tabText.length, y, ']', this.borderColor);
        currentX += tabText.length + 2;
      } else {
        this.drawText(buffer, currentX, y, tabText, color);
        currentX += tabText.length;
      }
      currentX += 1; // Space between tabs
    }
  }

  private drawContent(buffer: Cell[][], x: number, y: number, width: number, height: number): void {
    const sections = HELP_SECTIONS[this.currentTab];
    let currentY = y;

    for (const section of sections) {
      if (currentY >= y + height - 1) break;

      // Draw section title
      this.drawText(buffer, x, currentY, section.title, this.titleColor);
      currentY++;

      // Draw separator
      this.drawText(
        buffer,
        x,
        currentY,
        '-'.repeat(Math.min(section.title.length + 4, width)),
        this.borderColor
      );
      currentY++;

      // Draw items
      for (const item of section.items) {
        if (currentY >= y + height - 1) break;

        // Draw key
        const keyStr = item.key.padEnd(12);
        this.drawText(buffer, x, currentY, keyStr, this.keyColor);

        // Draw description
        const descX = x + 12;
        const maxDescLen = width - 14;
        const desc =
          item.description.length > maxDescLen
            ? item.description.substring(0, maxDescLen - 3) + '...'
            : item.description;
        this.drawText(buffer, descX, currentY, desc, this.textColor);

        currentY++;
      }

      currentY++; // Space between sections
    }
  }

  private drawText(buffer: Cell[][], x: number, y: number, text: string, color: Color): void {
    for (let i = 0; i < text.length; i++) {
      this.setCell(buffer, x + i, y, text[i], color);
    }
  }

  private setCell(buffer: Cell[][], x: number, y: number, char: string, color: Color): void {
    if (y >= 0 && y < buffer.length && x >= 0 && x < buffer[y].length) {
      buffer[y][x] = { char, color };
    }
  }
}

// Singleton instance
let helpOverlay: HelpOverlay | null = null;

export function getHelpOverlay(): HelpOverlay {
  if (!helpOverlay) {
    helpOverlay = new HelpOverlay();
  }
  return helpOverlay;
}

export function resetHelpOverlay(): void {
  helpOverlay = null;
}
