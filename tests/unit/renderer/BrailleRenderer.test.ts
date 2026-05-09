/**
 * Unit tests for BrailleRenderer (v0.4.0 Phase 2).
 *
 * Each terminal cell encodes 2 wide × 4 tall = 8 dots. The bit layout per
 * the Unicode Braille Patterns block (U+2800–U+28FF):
 *
 *   ┌─────┬─────┐
 *   │ 0x01│ 0x08│
 *   ├─────┼─────┤
 *   │ 0x02│ 0x10│
 *   ├─────┼─────┤
 *   │ 0x04│ 0x20│
 *   ├─────┼─────┤
 *   │ 0x40│ 0x80│
 *   └─────┴─────┘
 *
 * Tests verify per-dot bit-mapping, the all-on / all-off cases, color =
 * mean of lit dots, threshold sweep, alpha handling, and bounds protection.
 */
import { renderBraille, BRAILLE_BASE } from '../../../src/renderer/BrailleRenderer.js';
import { Cell } from '../../../src/types/index.js';
import { createMockBuffer } from '../../utils/mocks.js';

/**
 * Pack 8 dots (one terminal cell) into a 2×4 RGBA pixel grid.
 * `lit` is a 2D array [4 rows][2 cols] of booleans; lit dots are white,
 * unlit are black. All pixels are opaque.
 */
function packDots(lit: boolean[][]): Uint8Array {
  const buf = new Uint8Array(2 * 4 * 4);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 2; x++) {
      const i = (y * 2 + x) * 4;
      const v = lit[y][x] ? 255 : 0;
      buf[i] = v;
      buf[i + 1] = v;
      buf[i + 2] = v;
      buf[i + 3] = 255;
    }
  }
  return buf;
}

describe('BrailleRenderer — single-dot bit mapping', () => {
  // Each entry is [y, x, expectedBit].
  const dotCases: ReadonlyArray<[number, number, number]> = [
    [0, 0, 0x01],
    [1, 0, 0x02],
    [2, 0, 0x04],
    [3, 0, 0x40],
    [0, 1, 0x08],
    [1, 1, 0x10],
    [2, 1, 0x20],
    [3, 1, 0x80],
  ];

  for (const [dy, dx, bit] of dotCases) {
    test(`dot (y=${dy}, x=${dx}) → bit 0x${bit.toString(16)}`, () => {
      const lit = [
        [false, false],
        [false, false],
        [false, false],
        [false, false],
      ];
      lit[dy][dx] = true;
      const pixels = packDots(lit);
      const buffer: Cell[][] = createMockBuffer(1, 1);
      renderBraille(buffer, pixels, 2, 4);

      expect(buffer[0][0].char.charCodeAt(0)).toBe(BRAILLE_BASE + bit);
      // Color = the only lit dot (white).
      expect(buffer[0][0].color).toEqual({ r: 255, g: 255, b: 255 });
    });
  }
});

describe('BrailleRenderer — all-on / all-off', () => {
  test('all 8 dots lit → 0x28FF', () => {
    const lit = [
      [true, true],
      [true, true],
      [true, true],
      [true, true],
    ];
    const buffer: Cell[][] = createMockBuffer(1, 1);
    renderBraille(buffer, packDots(lit), 2, 4);
    expect(buffer[0][0].char.charCodeAt(0)).toBe(0x28ff);
  });

  test('no dots lit → space, no color', () => {
    const lit = [
      [false, false],
      [false, false],
      [false, false],
      [false, false],
    ];
    const buffer: Cell[][] = createMockBuffer(1, 1);
    renderBraille(buffer, packDots(lit), 2, 4);
    expect(buffer[0][0]).toEqual({ char: ' ' });
  });
});

describe('BrailleRenderer — color is mean of lit dots', () => {
  test('two lit dots with different colors → averaged color', () => {
    // (0,0) red, (1,0) green. Both luminances must clear the threshold for
    // the test to verify averaging — green at 200 has BT.601 lum ≈ 117,
    // red at 200 has lum ≈ 60, so we use threshold=50.
    const buf = new Uint8Array(2 * 4 * 4);
    for (let i = 0; i < 8; i++) buf[i * 4 + 3] = 255;
    // Top-left dot (y=0, x=0) → bit 0x01: pure red 200
    buf[(0 * 2 + 0) * 4] = 200;
    // Middle-left dot (y=1, x=0) → bit 0x02: pure green 200
    buf[(1 * 2 + 0) * 4 + 1] = 200;

    const buffer: Cell[][] = createMockBuffer(1, 1);
    renderBraille(buffer, buf, 2, 4, { threshold: 50 });

    // Bits set: (0,0) → 0x01, (1,0) → 0x02 → bitfield 0x03
    expect(buffer[0][0].char.charCodeAt(0)).toBe(BRAILLE_BASE + 0x03);
    // Color: r mean (200, 0) = 100; g mean (0, 200) = 100; b mean = 0
    expect(buffer[0][0].color).toEqual({ r: 100, g: 100, b: 0 });
  });
});

describe('BrailleRenderer — threshold and invert', () => {
  test('threshold rejects low-luminance dots', () => {
    // Mid-gray (50) below threshold 128 → unlit.
    const buf = new Uint8Array(2 * 4 * 4);
    for (let i = 0; i < 8; i++) {
      buf[i * 4] = 50;
      buf[i * 4 + 1] = 50;
      buf[i * 4 + 2] = 50;
      buf[i * 4 + 3] = 255;
    }
    const buffer: Cell[][] = createMockBuffer(1, 1);
    renderBraille(buffer, buf, 2, 4, { threshold: 128 });
    expect(buffer[0][0]).toEqual({ char: ' ' });
  });

  test('invert reverses the lit/unlit test', () => {
    const buf = new Uint8Array(2 * 4 * 4);
    for (let i = 0; i < 8; i++) {
      buf[i * 4] = 50;
      buf[i * 4 + 1] = 50;
      buf[i * 4 + 2] = 50;
      buf[i * 4 + 3] = 255;
    }
    const buffer: Cell[][] = createMockBuffer(1, 1);
    renderBraille(buffer, buf, 2, 4, { threshold: 128, invert: true });
    // All dots dark → all become lit when inverted.
    expect(buffer[0][0].char.charCodeAt(0)).toBe(0x28ff);
  });
});

describe('BrailleRenderer — preBinarized mode', () => {
  test('treats nonzero red as lit (skips luminance calc)', () => {
    const buf = new Uint8Array(2 * 4 * 4);
    for (let i = 0; i < 8; i++) buf[i * 4 + 3] = 255;
    // Mark one dot with R=1 — would fail a normal threshold but is "lit" preBinarized.
    buf[(2 * 2 + 1) * 4] = 1; // dot (y=2, x=1) → bit 0x20

    const buffer: Cell[][] = createMockBuffer(1, 1);
    renderBraille(buffer, buf, 2, 4, { preBinarized: true });
    expect(buffer[0][0].char.charCodeAt(0)).toBe(BRAILLE_BASE + 0x20);
  });
});

describe('BrailleRenderer — alpha handling', () => {
  test('transparent dots are unlit even when bright', () => {
    const buf = new Uint8Array(2 * 4 * 4);
    // Make all dots bright but transparent.
    for (let i = 0; i < 8; i++) {
      buf[i * 4] = 255;
      buf[i * 4 + 3] = 0; // alpha 0 = transparent
    }
    const buffer: Cell[][] = createMockBuffer(1, 1);
    renderBraille(buffer, buf, 2, 4);
    expect(buffer[0][0]).toEqual({ char: ' ' });
  });
});

describe('BrailleRenderer — multi-cell layout', () => {
  test('renders a 4×8 source as 2 cell columns × 2 cell rows', () => {
    // 4 wide × 8 tall = 2 cell cols × 2 cell rows. Top-left cell all lit,
    // bottom-right cell all lit, others all unlit.
    const W = 4;
    const H = 8;
    const buf = new Uint8Array(W * H * 4);
    const setLit = (x: number, y: number) => {
      const i = (y * W + x) * 4;
      buf[i] = 255;
      buf[i + 1] = 255;
      buf[i + 2] = 255;
      buf[i + 3] = 255;
    };
    // Top-left cell → x in 0..1, y in 0..3
    for (let y = 0; y < 4; y++) for (let x = 0; x < 2; x++) setLit(x, y);
    // Bottom-right cell → x in 2..3, y in 4..7
    for (let y = 4; y < 8; y++) for (let x = 2; x < 4; x++) setLit(x, y);

    const buffer: Cell[][] = createMockBuffer(2, 2);
    renderBraille(buffer, buf, W, H);

    expect(buffer[0][0].char.charCodeAt(0)).toBe(0x28ff);
    expect(buffer[0][1]).toEqual({ char: ' ' });
    expect(buffer[1][0]).toEqual({ char: ' ' });
    expect(buffer[1][1].char.charCodeAt(0)).toBe(0x28ff);
  });
});

describe('BrailleRenderer — buffer-bounds protection', () => {
  test('does not crash when image is larger than buffer', () => {
    const W = 8;
    const H = 16;
    const buf = new Uint8Array(W * H * 4);
    for (let i = 0; i < W * H; i++) {
      buf[i * 4] = 255;
      buf[i * 4 + 1] = 255;
      buf[i * 4 + 2] = 255;
      buf[i * 4 + 3] = 255;
    }
    const buffer: Cell[][] = createMockBuffer(2, 2);
    expect(() => renderBraille(buffer, buf, W, H)).not.toThrow();
    // Region inside the buffer is filled.
    expect(buffer[0][0].char.charCodeAt(0)).toBe(0x28ff);
  });

  test('handles empty buffer gracefully', () => {
    const buf = new Uint8Array(8 * 4);
    expect(() => renderBraille([], buf, 2, 4)).not.toThrow();
  });

  test('throws on truncated pixel buffer', () => {
    const buffer: Cell[][] = createMockBuffer(1, 1);
    const tiny = new Uint8Array(8); // need 2*4*4=32 bytes
    expect(() => renderBraille(buffer, tiny, 2, 4)).toThrow(/too small/);
  });
});

describe('BrailleRenderer — determinism', () => {
  test('two renders with identical inputs produce identical buffers', () => {
    const W = 4;
    const H = 8;
    const buf = new Uint8Array(W * H * 4);
    for (let i = 0; i < W * H; i++) {
      buf[i * 4] = (i * 17) % 256;
      buf[i * 4 + 1] = (i * 31) % 256;
      buf[i * 4 + 2] = (i * 53) % 256;
      buf[i * 4 + 3] = 255;
    }
    const a: Cell[][] = createMockBuffer(2, 2);
    const b: Cell[][] = createMockBuffer(2, 2);
    renderBraille(a, buf, W, H);
    renderBraille(b, buf, W, H);
    expect(a).toEqual(b);
  });
});
