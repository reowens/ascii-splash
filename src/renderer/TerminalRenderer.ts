import terminalKit from 'terminal-kit';
import { Buffer } from './Buffer';
import { Size, Cell } from '../types';

const term = terminalKit.terminal;

export class TerminalRenderer {
  private buffer: Buffer;
  private size: Size;
  private mouseEnabled: boolean;

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

  render(): number {
    const changes = this.buffer.getChanges();
    
    // Only render changed cells for performance
    for (const change of changes) {
      term.moveTo(change.x + 1, change.y + 1); // terminal-kit uses 1-based indexing
      
      if (change.cell.color) {
        term.colorRgb(
          change.cell.color.r,
          change.cell.color.g,
          change.cell.color.b
        );
      } else {
        term.defaultColor();
      }
      
      term(change.cell.char);
    }
    
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
}
