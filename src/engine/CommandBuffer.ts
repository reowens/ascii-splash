/**
 * CommandBuffer - Manages multi-key command input sequences
 * 
 * When user presses '0', enters command mode and accumulates keypresses
 * until ENTER (execute) or ESC (cancel).
 */
export class CommandBuffer {
  private active: boolean = false;
  private buffer: string = '';
  private cursorPos: number = 0;
  private timeout: NodeJS.Timeout | null = null;
  
  // Command history for up/down arrow navigation
  private history: string[] = [];
  private historyIndex: number = -1;
  
  constructor(private readonly timeoutMs: number = 10000) {}
  
  /**
   * Check if command mode is active
   */
  isActive(): boolean {
    return this.active;
  }
  
  /**
   * Enter command mode (typically triggered by '0' key)
   */
  activate(): void {
    this.active = true;
    this.buffer = '0';
    this.cursorPos = 1;
    this.startTimeout();
  }
  
  /**
   * Exit command mode and clear buffer
   */
  deactivate(): void {
    this.active = false;
    this.buffer = '';
    this.cursorPos = 0;
    this.historyIndex = -1;
    this.clearTimeout();
  }
  
  /**
   * Add a character to the buffer at cursor position
   */
  addChar(char: string): void {
    if (!this.active) return;
    
    // Insert character at cursor position
    this.buffer = 
      this.buffer.slice(0, this.cursorPos) + 
      char + 
      this.buffer.slice(this.cursorPos);
    this.cursorPos++;
    
    this.resetTimeout();
  }
  
  /**
   * Remove character before cursor (backspace)
   */
  backspace(): void {
    if (!this.active || this.cursorPos <= 1) return; // Can't delete the initial '0'
    
    this.buffer = 
      this.buffer.slice(0, this.cursorPos - 1) + 
      this.buffer.slice(this.cursorPos);
    this.cursorPos--;
    
    this.resetTimeout();
  }
  
  /**
   * Move cursor left
   */
  moveCursorLeft(): void {
    if (this.cursorPos > 1) { // Can't go before '0'
      this.cursorPos--;
    }
  }
  
  /**
   * Move cursor right
   */
  moveCursorRight(): void {
    if (this.cursorPos < this.buffer.length) {
      this.cursorPos++;
    }
  }
  
  /**
   * Get current buffer contents
   */
  getBuffer(): string {
    return this.buffer;
  }
  
  /**
   * Get cursor position (for UI rendering)
   */
  getCursorPos(): number {
    return this.cursorPos;
  }
  
  /**
   * Execute the command (called on ENTER)
   * Returns the command string and adds to history
   */
  execute(): string {
    const cmd = this.buffer;
    
    // Add to history if not empty and not duplicate of last command
    if (cmd.length > 1 && (this.history.length === 0 || this.history[this.history.length - 1] !== cmd)) {
      this.history.push(cmd);
      
      // Limit history size
      if (this.history.length > 50) {
        this.history.shift();
      }
    }
    
    this.deactivate();
    return cmd;
  }
  
  /**
   * Cancel the command (called on ESC)
   */
  cancel(): void {
    this.deactivate();
  }
  
  /**
   * Navigate to previous command in history (up arrow)
   */
  previousCommand(): void {
    if (this.history.length === 0) return;
    
    if (this.historyIndex === -1) {
      this.historyIndex = this.history.length - 1;
    } else if (this.historyIndex > 0) {
      this.historyIndex--;
    }
    
    this.buffer = this.history[this.historyIndex];
    this.cursorPos = this.buffer.length;
    this.resetTimeout();
  }
  
  /**
   * Navigate to next command in history (down arrow)
   */
  nextCommand(): void {
    if (this.historyIndex === -1) return;
    
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.buffer = this.history[this.historyIndex];
    } else {
      // Back to empty command
      this.historyIndex = -1;
      this.buffer = '0';
    }
    
    this.cursorPos = this.buffer.length;
    this.resetTimeout();
  }
  
  /**
   * Get command history
   */
  getHistory(): string[] {
    return [...this.history];
  }
  
  // Private timeout management
  
  private startTimeout(): void {
    this.timeout = setTimeout(() => {
      this.cancel();
    }, this.timeoutMs);
  }
  
  private clearTimeout(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
  
  private resetTimeout(): void {
    this.clearTimeout();
    this.startTimeout();
  }
}
