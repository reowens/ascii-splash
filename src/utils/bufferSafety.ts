import { Cell, Color } from '../types';

/**
 * Error logging utility for pattern rendering
 * Provides safe buffer writes with bounds checking and error tracking
 */

interface RenderError {
  patternName: string;
  message: string;
  timestamp: number;
  x?: number;
  y?: number;
  bufferWidth?: number;
  bufferHeight?: number;
}

class BufferSafetyMonitor {
  private errors: RenderError[] = [];
  private readonly MAX_ERRORS = 50; // Keep last 50 errors
  private debugMode: boolean = false;

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Safely write to buffer with bounds checking
   * Returns true if write was successful, false if out of bounds
   */
  safeWrite(
    buffer: Cell[][],
    x: number,
    y: number,
    char: string,
    color: Color,
    patternName: string = 'unknown'
  ): boolean {
    // Get buffer dimensions
    const height = buffer.length;
    const width = height > 0 ? buffer[0].length : 0;

    // Bounds check
    if (y < 0 || y >= height || x < 0 || x >= width) {
      this.logError({
        patternName,
        message: `Out of bounds write attempt: (${x}, ${y})`,
        timestamp: Date.now(),
        x,
        y,
        bufferWidth: width,
        bufferHeight: height
      });
      return false;
    }

    // Verify buffer row exists
    if (!buffer[y]) {
      this.logError({
        patternName,
        message: `Buffer row undefined at y=${y}`,
        timestamp: Date.now(),
        y,
        bufferWidth: width,
        bufferHeight: height
      });
      return false;
    }

    try {
      buffer[y][x] = { char, color };
      return true;
    } catch (err) {
      this.logError({
        patternName,
        message: `Exception during write: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: Date.now(),
        x,
        y,
        bufferWidth: width,
        bufferHeight: height
      });
      return false;
    }
  }

  /**
   * Log a rendering error
   */
  private logError(error: RenderError): void {
    this.errors.push(error);
    
    // Trim old errors
    if (this.errors.length > this.MAX_ERRORS) {
      this.errors.shift();
    }

    // Log to console in debug mode
    if (this.debugMode) {
      console.error(`[BufferSafety] ${error.patternName}: ${error.message}`, {
        coordinates: error.x !== undefined ? `(${error.x}, ${error.y})` : 'N/A',
        bufferSize: error.bufferWidth !== undefined ? `${error.bufferWidth}x${error.bufferHeight}` : 'N/A',
        timestamp: new Date(error.timestamp).toISOString()
      });
    }
  }

  /**
   * Log a general pattern error (not buffer-related)
   */
  logPatternError(patternName: string, message: string, details?: any): void {
    this.logError({
      patternName,
      message,
      timestamp: Date.now()
    });

    if (this.debugMode) {
      console.error(`[Pattern Error] ${patternName}: ${message}`, details || '');
    }
  }

  /**
   * Get recent errors for debugging
   */
  getErrors(): RenderError[] {
    return [...this.errors];
  }

  /**
   * Get error count by pattern
   */
  getErrorsByPattern(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const error of this.errors) {
      counts[error.patternName] = (counts[error.patternName] || 0) + 1;
    }
    return counts;
  }

  /**
   * Clear all logged errors
   */
  clearErrors(): void {
    this.errors = [];
  }

  /**
   * Get summary of errors for display
   */
  getSummary(): string {
    if (this.errors.length === 0) return 'No errors';
    
    const byPattern = this.getErrorsByPattern();
    const lines: string[] = [`Total errors: ${this.errors.length}`];
    
    for (const [pattern, count] of Object.entries(byPattern)) {
      lines.push(`  ${pattern}: ${count}`);
    }
    
    // Show last error
    const lastError = this.errors[this.errors.length - 1];
    lines.push(`Last: ${lastError.message}`);
    
    return lines.join('\n');
  }
}

// Singleton instance
export const bufferSafety = new BufferSafetyMonitor();

/**
 * Wrap pattern render() with error catching
 */
export function safeRenderWrapper(
  patternName: string,
  renderFn: () => void
): void {
  try {
    renderFn();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : '';
    
    bufferSafety.logPatternError(
      patternName,
      `Unhandled exception in render(): ${message}`,
      { stack }
    );
    
    // In production, don't crash - just log and continue
    // This prevents one bad pattern from killing the whole app
    if (bufferSafety['debugMode']) {
      console.error(`[SafeRender] ${patternName} crashed:`, err);
    }
  }
}
