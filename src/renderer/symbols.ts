/**
 * Symbol library for the chafa-style matcher (v0.4.0 Phase 4).
 *
 * Each entry pairs an 8×8 monochrome bitmap with a Unicode codepoint. At
 * render time, for each terminal cell the matcher pulls the corresponding
 * 8×8 source patch and picks the bitmap whose lit/unlit partition best
 * separates the patch's pixels (lowest squared color error, where fg = mean
 * of lit-position pixels and bg = mean of unlit-position pixels).
 *
 * Bitmaps were hand-authored from scratch as 8-row × 8-column "X"/" "
 * strings. Chafa's actual bitmaps trace specific Terminus glyphs; we are
 * MIT-licensed and re-implement, so shapes are reasonable approximations
 * rather than pixel-exact copies.
 *
 * Tag bitmask filters the candidate set per preset (e.g. ASCII-only,
 * blocks-only). Constants are plain numbers (not a TS enum) per repo
 * eslint convention.
 */

export const TAG_ASCII = 1 << 0;
export const TAG_BLOCK = 1 << 1;
export const TAG_QUADRANT = 1 << 2;
export const TAG_SHADE = 1 << 3;
export const TAG_ALL = TAG_ASCII | TAG_BLOCK | TAG_QUADRANT | TAG_SHADE;

export interface SymbolEntry {
  /** Bitwise OR of TAG_* constants — which preset families include this symbol. */
  readonly tag: number;
  /** Single Unicode character to emit when this symbol wins matching. */
  readonly codepoint: string;
  /**
   * 8×8 monochrome bitmap, row-major (byte index = row*8 + col). Each byte
   * is 0 (unlit) or 1 (lit). Total 64 bytes per symbol.
   */
  readonly bitmap: Uint8Array;
  /** Pre-counted number of lit dots in `bitmap`. Used as a tie-breaker. */
  readonly litCount: number;
}

/**
 * Definition table. Each entry's `rows` is exactly 8 strings × 8 characters;
 * any character other than space (`' '`) counts as lit. Parsed once at
 * module load into `SYMBOLS`.
 */
interface SymbolDef {
  tag: number;
  codepoint: string;
  rows: readonly string[];
}

const DEFS: readonly SymbolDef[] = [
  // ────────── shared baseline ──────────
  // Space participates in every tag group so it's always a candidate.
  {
    tag: TAG_ASCII | TAG_BLOCK | TAG_QUADRANT | TAG_SHADE,
    codepoint: ' ',
    rows: [
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
    ],
  },

  // ────────── ASCII (15 more) ──────────
  {
    tag: TAG_ASCII,
    codepoint: '.',
    rows: [
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
      '   XX   ',
      '   XX   ',
      '        ',
    ],
  },
  {
    tag: TAG_ASCII,
    codepoint: "'",
    rows: [
      '   XX   ',
      '   XX   ',
      '   X    ',
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
    ],
  },
  {
    tag: TAG_ASCII,
    codepoint: '"',
    rows: [
      ' XX XX  ',
      ' XX XX  ',
      ' X  X   ',
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
    ],
  },
  {
    tag: TAG_ASCII,
    codepoint: '_',
    rows: [
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
      'XXXXXXXX',
    ],
  },
  {
    tag: TAG_ASCII,
    codepoint: '-',
    rows: [
      '        ',
      '        ',
      '        ',
      '  XXXX  ',
      '  XXXX  ',
      '        ',
      '        ',
      '        ',
    ],
  },
  {
    tag: TAG_ASCII,
    codepoint: '|',
    rows: [
      '   XX   ',
      '   XX   ',
      '   XX   ',
      '   XX   ',
      '   XX   ',
      '   XX   ',
      '   XX   ',
      '   XX   ',
    ],
  },
  {
    tag: TAG_ASCII,
    codepoint: '/',
    rows: [
      '      XX',
      '     XX ',
      '    XX  ',
      '   XX   ',
      '   XX   ',
      '  XX    ',
      ' XX     ',
      'XX      ',
    ],
  },
  {
    tag: TAG_ASCII,
    codepoint: '\\',
    rows: [
      'XX      ',
      ' XX     ',
      '  XX    ',
      '   XX   ',
      '   XX   ',
      '    XX  ',
      '     XX ',
      '      XX',
    ],
  },
  {
    tag: TAG_ASCII,
    codepoint: '+',
    rows: [
      '        ',
      '   XX   ',
      '   XX   ',
      ' XXXXXX ',
      ' XXXXXX ',
      '   XX   ',
      '   XX   ',
      '        ',
    ],
  },
  {
    tag: TAG_ASCII,
    codepoint: 'x',
    rows: [
      '        ',
      '        ',
      ' XX  XX ',
      '  XXXX  ',
      '  XXXX  ',
      ' XX  XX ',
      '        ',
      '        ',
    ],
  },
  {
    tag: TAG_ASCII,
    codepoint: '=',
    rows: [
      '        ',
      '        ',
      ' XXXXXX ',
      ' XXXXXX ',
      '        ',
      ' XXXXXX ',
      ' XXXXXX ',
      '        ',
    ],
  },
  {
    tag: TAG_ASCII,
    codepoint: '~',
    rows: [
      '        ',
      '        ',
      '        ',
      ' XX   X ',
      'X XX XX ',
      '   XXX  ',
      '        ',
      '        ',
    ],
  },
  {
    tag: TAG_ASCII,
    codepoint: 'o',
    rows: [
      '        ',
      '        ',
      '  XXXX  ',
      ' XX  XX ',
      ' XX  XX ',
      ' XX  XX ',
      '  XXXX  ',
      '        ',
    ],
  },
  {
    tag: TAG_ASCII,
    codepoint: 'O',
    rows: [
      '  XXXX  ',
      ' XXXXXX ',
      'XX    XX',
      'XX    XX',
      'XX    XX',
      'XX    XX',
      ' XXXXXX ',
      '  XXXX  ',
    ],
  },
  {
    tag: TAG_ASCII,
    codepoint: '#',
    rows: [
      '  X  X  ',
      '  X  X  ',
      'XXXXXXXX',
      'XXXXXXXX',
      '  X  X  ',
      'XXXXXXXX',
      'XXXXXXXX',
      '  X  X  ',
    ],
  },

  // ────────── QUADRANT (15 more — 16 total including shared space) ──────────
  // 4×4 quadrants of the 8×8 cell: UL / UR / LL / LR.
  {
    tag: TAG_QUADRANT,
    codepoint: '▘', // U+2598 — UL only
    rows: [
      'XXXX    ',
      'XXXX    ',
      'XXXX    ',
      'XXXX    ',
      '        ',
      '        ',
      '        ',
      '        ',
    ],
  },
  {
    tag: TAG_QUADRANT,
    codepoint: '▝', // U+259D — UR only
    rows: [
      '    XXXX',
      '    XXXX',
      '    XXXX',
      '    XXXX',
      '        ',
      '        ',
      '        ',
      '        ',
    ],
  },
  {
    tag: TAG_QUADRANT,
    codepoint: '▖', // U+2596 — LL only
    rows: [
      '        ',
      '        ',
      '        ',
      '        ',
      'XXXX    ',
      'XXXX    ',
      'XXXX    ',
      'XXXX    ',
    ],
  },
  {
    tag: TAG_QUADRANT,
    codepoint: '▗', // U+2597 — LR only
    rows: [
      '        ',
      '        ',
      '        ',
      '        ',
      '    XXXX',
      '    XXXX',
      '    XXXX',
      '    XXXX',
    ],
  },
  {
    tag: TAG_BLOCK | TAG_QUADRANT,
    codepoint: '▀', // U+2580 — upper half
    rows: [
      'XXXXXXXX',
      'XXXXXXXX',
      'XXXXXXXX',
      'XXXXXXXX',
      '        ',
      '        ',
      '        ',
      '        ',
    ],
  },
  {
    tag: TAG_BLOCK | TAG_QUADRANT,
    codepoint: '▄', // U+2584 — lower half
    rows: [
      '        ',
      '        ',
      '        ',
      '        ',
      'XXXXXXXX',
      'XXXXXXXX',
      'XXXXXXXX',
      'XXXXXXXX',
    ],
  },
  {
    tag: TAG_BLOCK | TAG_QUADRANT,
    codepoint: '▌', // U+258C — left half
    rows: [
      'XXXX    ',
      'XXXX    ',
      'XXXX    ',
      'XXXX    ',
      'XXXX    ',
      'XXXX    ',
      'XXXX    ',
      'XXXX    ',
    ],
  },
  {
    tag: TAG_BLOCK | TAG_QUADRANT,
    codepoint: '▐', // U+2590 — right half
    rows: [
      '    XXXX',
      '    XXXX',
      '    XXXX',
      '    XXXX',
      '    XXXX',
      '    XXXX',
      '    XXXX',
      '    XXXX',
    ],
  },
  {
    tag: TAG_QUADRANT,
    codepoint: '▚', // U+259A — UL + LR (diagonal)
    rows: [
      'XXXX    ',
      'XXXX    ',
      'XXXX    ',
      'XXXX    ',
      '    XXXX',
      '    XXXX',
      '    XXXX',
      '    XXXX',
    ],
  },
  {
    tag: TAG_QUADRANT,
    codepoint: '▞', // U+259E — UR + LL (anti-diagonal)
    rows: [
      '    XXXX',
      '    XXXX',
      '    XXXX',
      '    XXXX',
      'XXXX    ',
      'XXXX    ',
      'XXXX    ',
      'XXXX    ',
    ],
  },
  {
    tag: TAG_QUADRANT,
    codepoint: '▛', // U+259B — UL + UR + LL
    rows: [
      'XXXXXXXX',
      'XXXXXXXX',
      'XXXXXXXX',
      'XXXXXXXX',
      'XXXX    ',
      'XXXX    ',
      'XXXX    ',
      'XXXX    ',
    ],
  },
  {
    tag: TAG_QUADRANT,
    codepoint: '▜', // U+259C — UL + UR + LR
    rows: [
      'XXXXXXXX',
      'XXXXXXXX',
      'XXXXXXXX',
      'XXXXXXXX',
      '    XXXX',
      '    XXXX',
      '    XXXX',
      '    XXXX',
    ],
  },
  {
    tag: TAG_QUADRANT,
    codepoint: '▙', // U+2599 — UL + LL + LR
    rows: [
      'XXXX    ',
      'XXXX    ',
      'XXXX    ',
      'XXXX    ',
      'XXXXXXXX',
      'XXXXXXXX',
      'XXXXXXXX',
      'XXXXXXXX',
    ],
  },
  {
    tag: TAG_QUADRANT,
    codepoint: '▟', // U+259F — UR + LL + LR
    rows: [
      '    XXXX',
      '    XXXX',
      '    XXXX',
      '    XXXX',
      'XXXXXXXX',
      'XXXXXXXX',
      'XXXXXXXX',
      'XXXXXXXX',
    ],
  },
  {
    tag: TAG_BLOCK | TAG_QUADRANT | TAG_SHADE,
    codepoint: '█', // U+2588 — full block
    rows: [
      'XXXXXXXX',
      'XXXXXXXX',
      'XXXXXXXX',
      'XXXXXXXX',
      'XXXXXXXX',
      'XXXXXXXX',
      'XXXXXXXX',
      'XXXXXXXX',
    ],
  },

  // ────────── SHADE (3 — space and full block shared above) ──────────
  {
    tag: TAG_SHADE,
    codepoint: '░', // U+2591 — light shade (~25%)
    rows: [
      'X X X X ',
      '        ',
      ' X X X X',
      '        ',
      'X X X X ',
      '        ',
      ' X X X X',
      '        ',
    ],
  },
  {
    tag: TAG_SHADE,
    codepoint: '▒', // U+2592 — medium shade (~50%, checkerboard)
    rows: [
      'X X X X ',
      ' X X X X',
      'X X X X ',
      ' X X X X',
      'X X X X ',
      ' X X X X',
      'X X X X ',
      ' X X X X',
    ],
  },
  {
    tag: TAG_SHADE,
    codepoint: '▓', // U+2593 — dark shade (~75%, inverse of light)
    rows: [
      ' X X X X',
      'XXXXXXXX',
      'X X X X ',
      'XXXXXXXX',
      ' X X X X',
      'XXXXXXXX',
      'X X X X ',
      'XXXXXXXX',
    ],
  },
];

function parseRows(rows: readonly string[], codepoint: string): Uint8Array {
  if (rows.length !== 8) {
    throw new Error(
      `symbols.ts: bitmap for ${JSON.stringify(codepoint)} must have 8 rows (got ${String(rows.length)})`
    );
  }
  const out = new Uint8Array(64);
  for (let y = 0; y < 8; y++) {
    const row = rows[y];
    if (row.length !== 8) {
      throw new Error(
        `symbols.ts: bitmap for ${JSON.stringify(codepoint)} row ${String(y)} must be 8 chars (got ${String(row.length)})`
      );
    }
    for (let x = 0; x < 8; x++) {
      out[y * 8 + x] = row[x] === ' ' ? 0 : 1;
    }
  }
  return out;
}

function buildSymbols(): readonly SymbolEntry[] {
  const out: SymbolEntry[] = [];
  for (const def of DEFS) {
    const bitmap = parseRows(def.rows, def.codepoint);
    let litCount = 0;
    for (let i = 0; i < 64; i++) {
      if (bitmap[i] !== 0) litCount++;
    }
    out.push({
      tag: def.tag,
      codepoint: def.codepoint,
      bitmap,
      litCount,
    });
  }
  return out;
}

/** All 34 symbol entries, built once at module load. */
export const SYMBOLS: readonly SymbolEntry[] = buildSymbols();

/**
 * Filter the symbol set by tag mask. Cached so repeated calls (same mask
 * per preset) don't re-allocate the array every frame.
 */
const candidateCache = new Map<number, readonly SymbolEntry[]>();

export function getSymbolCandidates(tagMask: number): readonly SymbolEntry[] {
  const cached = candidateCache.get(tagMask);
  if (cached !== undefined) return cached;
  const filtered = SYMBOLS.filter(s => (s.tag & tagMask) !== 0);
  candidateCache.set(tagMask, filtered);
  return filtered;
}
