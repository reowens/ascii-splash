/**
 * CommandBuffer - Manages multi-key command input sequences
 *
 * When user presses '0', enters command mode and accumulates keypresses
 * until ENTER (execute) or ESC (cancel).
 */
export declare class CommandBuffer {
    private readonly timeoutMs;
    private active;
    private buffer;
    private cursorPos;
    private timeout;
    private history;
    private historyIndex;
    constructor(timeoutMs?: number);
    /**
     * Check if command mode is active
     */
    isActive(): boolean;
    /**
     * Enter command mode (typically triggered by '0' key)
     */
    activate(): void;
    /**
     * Exit command mode and clear buffer
     */
    deactivate(): void;
    /**
     * Add a character to the buffer at cursor position
     */
    addChar(char: string): void;
    /**
     * Remove character before cursor (backspace)
     */
    backspace(): void;
    /**
     * Move cursor left
     */
    moveCursorLeft(): void;
    /**
     * Move cursor right
     */
    moveCursorRight(): void;
    /**
     * Get current buffer contents
     */
    getBuffer(): string;
    /**
     * Get cursor position (for UI rendering)
     */
    getCursorPos(): number;
    /**
     * Execute the command (called on ENTER)
     * Returns the command string and adds to history
     */
    execute(): string;
    /**
     * Cancel the command (called on ESC)
     */
    cancel(): void;
    /**
     * Navigate to previous command in history (up arrow)
     */
    previousCommand(): void;
    /**
     * Navigate to next command in history (down arrow)
     */
    nextCommand(): void;
    /**
     * Get command history
     */
    getHistory(): string[];
    private startTimeout;
    private clearTimeout;
    private resetTimeout;
}
//# sourceMappingURL=CommandBuffer.d.ts.map