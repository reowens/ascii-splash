/**
 * Buffer Snapshot Utilities
 *
 * Utilities for capturing and comparing buffer snapshots in visual tests
 */

import { Cell } from '../../src/types/index.js';

export interface BufferSnapshot {
  width: number;
  height: number;
  chars: string;
  colors?: string; // Serialized color data
  timestamp?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Serialize a buffer to a snapshot format
 */
export function captureSnapshot(
  buffer: Cell[][],
  options: { includeColors?: boolean; metadata?: Record<string, unknown> } = {}
): BufferSnapshot {
  const height = buffer.length;
  const width = buffer[0]?.length ?? 0;

  // Capture characters
  const chars = buffer.map(row => row.map(cell => cell.char).join('')).join('\n');

  // Optionally capture colors
  let colors: string | undefined;
  if (options.includeColors) {
    const colorData: string[] = [];
    for (const row of buffer) {
      const rowColors: string[] = [];
      for (const cell of row) {
        if (cell.color) {
          rowColors.push(`${cell.color.r},${cell.color.g},${cell.color.b}`);
        } else {
          rowColors.push('');
        }
      }
      colorData.push(rowColors.join('|'));
    }
    colors = colorData.join('\n');
  }

  return {
    width,
    height,
    chars,
    colors,
    timestamp: Date.now(),
    metadata: options.metadata,
  };
}

/**
 * Compare two snapshots for character equality
 */
export function compareSnapshots(a: BufferSnapshot, b: BufferSnapshot): boolean {
  return a.width === b.width && a.height === b.height && a.chars === b.chars;
}

/**
 * Calculate similarity between two snapshots (0 = completely different, 1 = identical)
 */
export function snapshotSimilarity(a: BufferSnapshot, b: BufferSnapshot): number {
  if (a.width !== b.width || a.height !== b.height) {
    return 0;
  }

  const charsA = a.chars.replace(/\n/g, '');
  const charsB = b.chars.replace(/\n/g, '');

  if (charsA.length !== charsB.length) {
    return 0;
  }

  let matches = 0;
  for (let i = 0; i < charsA.length; i++) {
    if (charsA[i] === charsB[i]) {
      matches++;
    }
  }

  return matches / charsA.length;
}

/**
 * Get a diff between two snapshots
 */
export function snapshotDiff(
  a: BufferSnapshot,
  b: BufferSnapshot
): { row: number; col: number; expected: string; actual: string }[] {
  const diffs: { row: number; col: number; expected: string; actual: string }[] = [];

  const rowsA = a.chars.split('\n');
  const rowsB = b.chars.split('\n');

  const maxRows = Math.max(rowsA.length, rowsB.length);

  for (let row = 0; row < maxRows; row++) {
    const lineA = rowsA[row] ?? '';
    const lineB = rowsB[row] ?? '';
    const maxCols = Math.max(lineA.length, lineB.length);

    for (let col = 0; col < maxCols; col++) {
      const charA = lineA[col] ?? ' ';
      const charB = lineB[col] ?? ' ';

      if (charA !== charB) {
        diffs.push({
          row,
          col,
          expected: charA,
          actual: charB,
        });
      }
    }
  }

  return diffs;
}

/**
 * Create a visual diff representation
 */
export function visualDiff(a: BufferSnapshot, b: BufferSnapshot): string {
  const rowsA = a.chars.split('\n');
  const rowsB = b.chars.split('\n');

  const lines: string[] = [];
  const maxRows = Math.max(rowsA.length, rowsB.length);

  for (let row = 0; row < maxRows; row++) {
    const lineA = rowsA[row] ?? '';
    const lineB = rowsB[row] ?? '';

    if (lineA === lineB) {
      lines.push(`  ${lineA}`);
    } else {
      lines.push(`- ${lineA}`);
      lines.push(`+ ${lineB}`);
    }
  }

  return lines.join('\n');
}

/**
 * Check if a snapshot contains expected patterns
 */
export function snapshotContains(snapshot: BufferSnapshot, pattern: string): boolean {
  return snapshot.chars.includes(pattern);
}

/**
 * Check if a snapshot contains any of the specified characters
 */
export function snapshotContainsChars(snapshot: BufferSnapshot, chars: string[]): boolean {
  for (const char of chars) {
    if (snapshot.chars.includes(char)) {
      return true;
    }
  }
  return false;
}

/**
 * Count occurrences of a character in a snapshot
 */
export function countCharInSnapshot(snapshot: BufferSnapshot, char: string): number {
  let count = 0;
  for (const c of snapshot.chars) {
    if (c === char) {
      count++;
    }
  }
  return count;
}

/**
 * Get non-empty character count
 */
export function getNonEmptyCount(snapshot: BufferSnapshot): number {
  let count = 0;
  for (const c of snapshot.chars) {
    if (c !== ' ' && c !== '\n') {
      count++;
    }
  }
  return count;
}

/**
 * Get fill ratio (non-empty cells / total cells)
 */
export function getFillRatio(snapshot: BufferSnapshot): number {
  const nonEmpty = getNonEmptyCount(snapshot);
  const total = snapshot.width * snapshot.height;
  return total > 0 ? nonEmpty / total : 0;
}

/**
 * Serialize snapshot to JSON string
 */
export function serializeSnapshot(snapshot: BufferSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

/**
 * Deserialize snapshot from JSON string
 */
export function deserializeSnapshot(json: string): BufferSnapshot {
  return JSON.parse(json) as BufferSnapshot;
}

/**
 * Create a hash of a snapshot for quick comparison
 */
export function hashSnapshot(snapshot: BufferSnapshot): string {
  // Simple hash based on content
  let hash = 0;
  const str = snapshot.chars;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

/**
 * Extract a region from a snapshot
 */
export function extractRegion(
  snapshot: BufferSnapshot,
  x: number,
  y: number,
  width: number,
  height: number
): BufferSnapshot {
  const rows = snapshot.chars.split('\n');
  const regionRows: string[] = [];

  for (let row = y; row < y + height && row < rows.length; row++) {
    const line = rows[row] ?? '';
    regionRows.push(line.substring(x, x + width).padEnd(width, ' '));
  }

  return {
    width,
    height: regionRows.length,
    chars: regionRows.join('\n'),
    timestamp: Date.now(),
  };
}
