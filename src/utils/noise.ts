/**
 * Perlin noise implementation for organic effects
 */

export class PerlinNoise {
  private permutation: number[];
  private p: number[];

  constructor(seed: number = 0) {
    // Generate permutation table based on seed
    this.permutation = [];
    for (let i = 0; i < 256; i++) {
      this.permutation[i] = i;
    }

    // Simple seeded shuffle
    let random = seed;
    for (let i = 255; i > 0; i--) {
      random = (random * 9301 + 49297) % 233280;
      const j = Math.floor((random / 233280) * (i + 1));
      [this.permutation[i], this.permutation[j]] = [this.permutation[j], this.permutation[i]];
    }

    // Duplicate permutation to avoid overflow
    this.p = [...this.permutation, ...this.permutation];
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  /**
   * Get 2D Perlin noise value at coordinates
   * @param x X coordinate
   * @param y Y coordinate
   * @returns Noise value between -1 and 1
   */
  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);

    const u = this.fade(x);
    const v = this.fade(y);

    const a = this.p[X] + Y;
    const aa = this.p[a];
    const ab = this.p[a + 1];
    const b = this.p[X + 1] + Y;
    const ba = this.p[b];
    const bb = this.p[b + 1];

    const gradAA = this.grad(this.p[aa], x, y);
    const gradBA = this.grad(this.p[ba], x - 1, y);
    const gradAB = this.grad(this.p[ab], x, y - 1);
    const gradBB = this.grad(this.p[bb], x - 1, y - 1);

    const lerpX1 = gradAA + u * (gradBA - gradAA);
    const lerpX2 = gradAB + u * (gradBB - gradAB);

    return lerpX1 + v * (lerpX2 - lerpX1);
  }

  /**
   * Get octave noise (multiple frequencies combined)
   * @param x X coordinate
   * @param y Y coordinate
   * @param octaves Number of octaves
   * @param persistence Amplitude decrease per octave
   * @returns Noise value between -1 and 1
   */
  octaveNoise2D(x: number, y: number, octaves: number = 4, persistence: number = 0.5): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }

    return total / maxValue;
  }
}

// Singleton instance for convenience
let globalNoise: PerlinNoise | null = null;

export function getGlobalNoise(seed?: number): PerlinNoise {
  if (!globalNoise || seed !== undefined) {
    globalNoise = new PerlinNoise(seed ?? Date.now());
  }
  return globalNoise;
}

/**
 * Simple turbulence function (absolute noise)
 */
export function turbulence(x: number, y: number, size: number = 32): number {
  const noise = getGlobalNoise();
  let value = 0;
  let initialSize = size;

  while (size >= 1) {
    value += Math.abs(noise.noise2D(x / size, y / size)) * size;
    size /= 2;
  }

  return value / initialSize;
}
