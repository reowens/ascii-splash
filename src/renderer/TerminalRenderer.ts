import terminalKit from 'terminal-kit';
import { Buffer } from './Buffer.js';
  import { Size } from '../types/index.js';

const term = terminalKit.terminal;

export class TerminalRenderer {
  private buffer: Buffer;
  private size: Size;
  private mouseEnabled: boolean;
  private readonly MAX_CHANGES_PER_FRAME = 500; // Limit to prevent terminal overload

  constructor(mouseEnabled: boolean = true) {
    this.mouseEnabled = mouseEnabled;
    this.size = { width: term.width, height: term.height };
    this.buffer = new Buffer(this.size);
    
    // Setup terminal
    term.fullscreen(true);
    term.clear();
    term.hideCursor();
    
    // Enable input (with or without mouse)
    if (this.mouseEnabled) {
      term.grabInput({ mouse: 'motion' });
    } else {
      term.grabInput({});
    }
    
    // Handle resize
    term.on('resize', (width: number, height: number) => {
      this.handleResize(width, height);
    });
  }

  private handleResize(width: number, height: number): void {
    this.size = { width, height };
    this.buffer.resize(this.size);
    term.clear();
  }

  getSize(): Size {
    return this.size;
  }

  getBuffer(): Buffer {
    return this.buffer;
  }

  clear(): void {
    this.buffer.clear();
  }

  clearScreen(): void {
    term.clear();
    this.buffer.clear();
    this.buffer.clearAllOverlays();
    this.buffer.swap();
  }

  render(): number {
    const changes = this.buffer.getChanges();
    
    // CRITICAL: Batch all writes into a single string to prevent
    // incomplete ANSI escape sequences from corrupting the terminal.
    // This is essential for high-frequency rendering (30-60 FPS).
    
    if (changes.length === 0) {
      this.buffer.swap();
      return 0;
    }
    
    // Build complete output string with all escape sequences
    // This ensures atomic writes and prevents terminal corruption
    let outputBuffer = '';
    
    for (const change of changes) {
      // Add cursor position (terminal-kit uses 1-based indexing)
      outputBuffer += `\x1b[${change.y + 1};${change.x + 1}H`;
      
      // Add color if present
      if (change.cell.color) {
        const r = Math.max(0, Math.min(255, change.cell.color.r));
        const g = Math.max(0, Math.min(255, change.cell.color.g));
        const b = Math.max(0, Math.min(255, change.cell.color.b));
        outputBuffer += `\x1b[38;2;${r};${g};${b}m`;
      } else {
        outputBuffer += '\x1b[39m'; // Default foreground color
      }
      
      // Add character (escape special characters if needed)
      outputBuffer += change.cell.char;
      
      // Reset style after each character to prevent style bleed
      outputBuffer += '\x1b[0m';
    }
    
    // Write entire frame as single atomic operation
    // This prevents incomplete escape sequences from reaching the terminal
    process.stdout.write(outputBuffer);
    
    // Swap buffers
    this.buffer.swap();
    
    return changes.length;
  }

  cleanup(): void {
    term.clear();
    term.fullscreen(false);
    term.hideCursor(false);
    term.grabInput(false);
    // Let caller handle process exit, not renderer
  }

  // Overlay management (delegates to Buffer)

  setOverlayText(x: number, y: number, text: string, color?: { r: number; g: number; b: number }): void {
    this.buffer.setOverlayText(x, y, text, color);
  }

  clearOverlayRow(y: number): void {
    this.buffer.clearOverlayRow(y);
  }

  clearAllOverlays(): void {
    this.buffer.clearAllOverlays();
  }
}
