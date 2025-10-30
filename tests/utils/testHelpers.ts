/**
 * Test helper utilities for async operations and common patterns
 */

/**
 * Waits for a specified number of milliseconds
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Waits for a condition to become true
 */
export async function waitFor(
  condition: () => boolean,
  timeout: number = 1000,
  interval: number = 10
): Promise<void> {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('waitFor timeout exceeded');
    }
    await wait(interval);
  }
}

/**
 * Captures console output during a function execution
 */
export async function captureConsole(
  fn: () => void | Promise<void>
): Promise<{ stdout: string[]; stderr: string[] }> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.log = (...args: any[]) => stdout.push(args.join(' '));
  console.error = (...args: any[]) => stderr.push(args.join(' '));
  console.warn = (...args: any[]) => stderr.push(args.join(' '));
  
  try {
    await fn();
  } finally {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  }
  
  return { stdout, stderr };
}

/**
 * Runs a function multiple times and returns the average execution time in ms
 */
export function benchmark(fn: () => void, iterations: number = 100): number {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();
  return (end - start) / iterations;
}

/**
 * Asserts that a value is within a range
 */
export function assertInRange(value: number, min: number, max: number, message?: string): void {
  if (value < min || value > max) {
    throw new Error(
      message || `Expected ${value} to be between ${min} and ${max}`
    );
  }
}

/**
 * Asserts that two numbers are approximately equal (within epsilon)
 */
export function assertApproximately(
  actual: number,
  expected: number,
  epsilon: number = 0.001,
  message?: string
): void {
  const diff = Math.abs(actual - expected);
  if (diff > epsilon) {
    throw new Error(
      message || `Expected ${actual} to be approximately ${expected} (within ${epsilon}), but difference was ${diff}`
    );
  }
}
