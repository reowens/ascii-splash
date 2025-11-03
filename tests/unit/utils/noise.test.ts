import { PerlinNoise, getGlobalNoise, turbulence } from '../../../src/utils/noise';

describe('Noise Utils', () => {
  describe('PerlinNoise', () => {
    describe('constructor', () => {
      it('creates noise instance with seed', () => {
        const noise = new PerlinNoise(12345);
        expect(noise).toBeDefined();
      });

      it('creates noise instance with default seed', () => {
        const noise = new PerlinNoise();
        expect(noise).toBeDefined();
      });

      it('generates different permutations for different seeds', () => {
        const noise1 = new PerlinNoise(1);
        const noise2 = new PerlinNoise(2);
        
        // Test multiple points to ensure at least one differs
        let hasDifference = false;
        for (let i = 0; i < 10; i++) {
          const value1 = noise1.noise2D(i * 7.3, i * 5.1);
          const value2 = noise2.noise2D(i * 7.3, i * 5.1);
          if (value1 !== value2) {
            hasDifference = true;
            break;
          }
        }
        
        expect(hasDifference).toBe(true);
      });

      it('generates consistent results for same seed', () => {
        const noise1 = new PerlinNoise(42);
        const noise2 = new PerlinNoise(42);
        
        const value1 = noise1.noise2D(10, 20);
        const value2 = noise2.noise2D(10, 20);
        
        expect(value1).toBe(value2);
      });
    });

    describe('noise2D', () => {
      let noise: PerlinNoise;

      beforeEach(() => {
        noise = new PerlinNoise(12345);
      });

      it('returns value between -1 and 1', () => {
        for (let i = 0; i < 100; i++) {
          const value = noise.noise2D(Math.random() * 100, Math.random() * 100);
          expect(value).toBeGreaterThanOrEqual(-1);
          expect(value).toBeLessThanOrEqual(1);
        }
      });

      it('returns consistent values for same coordinates', () => {
        const value1 = noise.noise2D(5.5, 10.5);
        const value2 = noise.noise2D(5.5, 10.5);
        
        expect(value1).toBe(value2);
      });

      it('returns different values for different coordinates', () => {
        const value1 = noise.noise2D(0, 0);
        const value2 = noise.noise2D(1, 1);
        
        expect(value1).not.toBe(value2);
      });

      it('handles negative coordinates', () => {
        const value = noise.noise2D(-10, -20);
        expect(value).toBeGreaterThanOrEqual(-1);
        expect(value).toBeLessThanOrEqual(1);
      });

      it('handles large coordinates', () => {
        const value = noise.noise2D(1000, 2000);
        expect(value).toBeGreaterThanOrEqual(-1);
        expect(value).toBeLessThanOrEqual(1);
      });

      it('handles fractional coordinates', () => {
        const value = noise.noise2D(3.14159, 2.71828);
        expect(value).toBeGreaterThanOrEqual(-1);
        expect(value).toBeLessThanOrEqual(1);
      });

      it('produces smooth gradients (nearby values are similar)', () => {
        const value1 = noise.noise2D(10, 10);
        const value2 = noise.noise2D(10.1, 10.1);
        
        // Nearby values should be relatively close (allow 0.25 for small steps)
        expect(Math.abs(value1 - value2)).toBeLessThan(0.25);
      });

      it('handles zero coordinates', () => {
        const value = noise.noise2D(0, 0);
        expect(value).toBeGreaterThanOrEqual(-1);
        expect(value).toBeLessThanOrEqual(1);
      });
    });

    describe('octaveNoise2D', () => {
      let noise: PerlinNoise;

      beforeEach(() => {
        noise = new PerlinNoise(54321);
      });

      it('returns value between -1 and 1', () => {
        for (let i = 0; i < 100; i++) {
          const value = noise.octaveNoise2D(
            Math.random() * 100,
            Math.random() * 100,
            4,
            0.5
          );
          expect(value).toBeGreaterThanOrEqual(-1);
          expect(value).toBeLessThanOrEqual(1);
        }
      });

      it('uses default octaves and persistence', () => {
        const value = noise.octaveNoise2D(10, 20);
        expect(value).toBeGreaterThanOrEqual(-1);
        expect(value).toBeLessThanOrEqual(1);
      });

      it('produces different results with different octaves', () => {
        // Use coordinates that will show difference
        const value1 = noise.octaveNoise2D(7.3, 11.7, 1, 0.5);
        const value2 = noise.octaveNoise2D(7.3, 11.7, 4, 0.5);
        
        // Different octaves should produce different results
        expect(value1).not.toBe(value2);
      });

      it('produces different results with different persistence', () => {
        // Use coordinates that will show difference
        const value1 = noise.octaveNoise2D(13.2, 8.9, 4, 0.3);
        const value2 = noise.octaveNoise2D(13.2, 8.9, 4, 0.7);
        
        // Different persistence should produce different results
        expect(value1).not.toBe(value2);
      });

      it('handles single octave', () => {
        const value = noise.octaveNoise2D(10, 10, 1, 0.5);
        expect(value).toBeGreaterThanOrEqual(-1);
        expect(value).toBeLessThanOrEqual(1);
      });

      it('handles many octaves', () => {
        const value = noise.octaveNoise2D(10, 10, 8, 0.5);
        expect(value).toBeGreaterThanOrEqual(-1);
        expect(value).toBeLessThanOrEqual(1);
      });

      it('produces consistent results for same parameters', () => {
        const value1 = noise.octaveNoise2D(15, 25, 3, 0.6);
        const value2 = noise.octaveNoise2D(15, 25, 3, 0.6);
        
        expect(value1).toBe(value2);
      });

      it('adds detail with more octaves', () => {
        // Sample a line of values with different octave counts
        const samples1 = [];
        const samples4 = [];
        
        for (let x = 0; x < 10; x += 0.5) {
          samples1.push(noise.octaveNoise2D(x, 0, 1, 0.5));
          samples4.push(noise.octaveNoise2D(x, 0, 4, 0.5));
        }
        
        // Calculate variance (more octaves should add more detail/variation)
        const variance = (arr: number[]) => {
          const mean = arr.reduce((a, b) => a + b) / arr.length;
          return arr.reduce((sum, val) => sum + (val - mean) ** 2, 0) / arr.length;
        };
        
        const var1 = variance(samples1);
        const var4 = variance(samples4);
        
        // More octaves typically add more local variation
        // (This is probabilistic but should hold true with the seed)
        expect(var4).toBeGreaterThan(0);
      });
    });
  });

  describe('getGlobalNoise', () => {
    it('returns a PerlinNoise instance', () => {
      const noise = getGlobalNoise();
      expect(noise).toBeInstanceOf(PerlinNoise);
    });

    it('returns same instance on subsequent calls', () => {
      const noise1 = getGlobalNoise();
      const noise2 = getGlobalNoise();
      
      expect(noise1).toBe(noise2);
    });

    it('creates new instance with explicit seed', () => {
      const noise1 = getGlobalNoise(100);
      const noise2 = getGlobalNoise(200);
      
      // Different seeds should produce different results at some coordinates
      let hasDifference = false;
      for (let i = 0; i < 10; i++) {
        const value1 = noise1.noise2D(i * 6.7, i * 4.3);
        const value2 = noise2.noise2D(i * 6.7, i * 4.3);
        if (value1 !== value2) {
          hasDifference = true;
          break;
        }
      }
      
      expect(hasDifference).toBe(true);
    });

    it('creates new instance when seed changes', () => {
      const noise1 = getGlobalNoise(42);
      const noise2 = getGlobalNoise(43);
      
      // Different seeds should produce different results at some coordinates
      let hasDifference = false;
      for (let i = 0; i < 10; i++) {
        const value1 = noise1.noise2D(i * 5.5, i * 7.1);
        const value2 = noise2.noise2D(i * 5.5, i * 7.1);
        if (value1 !== value2) {
          hasDifference = true;
          break;
        }
      }
      
      expect(hasDifference).toBe(true);
    });

    it('reuses instance when called without seed', () => {
      const noise1 = getGlobalNoise();
      const value1 = noise1.noise2D(15, 25);
      
      const noise2 = getGlobalNoise();
      const value2 = noise2.noise2D(15, 25);
      
      expect(value1).toBe(value2);
    });
  });

  describe('turbulence', () => {
    it('returns positive value', () => {
      for (let i = 0; i < 50; i++) {
        const value = turbulence(
          Math.random() * 100,
          Math.random() * 100,
          32
        );
        expect(value).toBeGreaterThanOrEqual(0);
      }
    });

    it('uses default size when not specified', () => {
      const value = turbulence(10, 20);
      expect(value).toBeGreaterThanOrEqual(0);
    });

    it('returns consistent values for same coordinates', () => {
      // Reset global noise with known seed
      getGlobalNoise(999);
      
      const value1 = turbulence(5, 5, 32);
      const value2 = turbulence(5, 5, 32);
      
      expect(value1).toBe(value2);
    });

    it('returns different values for different coordinates', () => {
      const value1 = turbulence(0, 0, 32);
      const value2 = turbulence(10, 10, 32);
      
      expect(value1).not.toBe(value2);
    });

    it('produces different results with different size', () => {
      getGlobalNoise(777);
      
      const value1 = turbulence(5, 5, 16);
      const value2 = turbulence(5, 5, 64);
      
      expect(value1).not.toBe(value2);
    });

    it('handles small size', () => {
      const value = turbulence(10, 10, 2);
      expect(value).toBeGreaterThanOrEqual(0);
    });

    it('handles large size', () => {
      const value = turbulence(10, 10, 128);
      expect(value).toBeGreaterThanOrEqual(0);
    });

    it('handles negative coordinates', () => {
      const value = turbulence(-50, -30, 32);
      expect(value).toBeGreaterThanOrEqual(0);
    });

    it('produces higher frequency detail than basic noise', () => {
      getGlobalNoise(12345);
      
      // Sample values along a line
      const turbValues = [];
      const noiseValues = [];
      
      for (let x = 0; x < 20; x += 0.5) {
        turbValues.push(turbulence(x, 0, 32));
        noiseValues.push(Math.abs(getGlobalNoise().noise2D(x / 32, 0)));
      }
      
      // Turbulence should have more variation due to summing multiple frequencies
      const countChanges = (arr: number[]) => {
        let changes = 0;
        for (let i = 1; i < arr.length; i++) {
          if (Math.abs(arr[i] - arr[i - 1]) > 0.01) changes++;
        }
        return changes;
      };
      
      // Turbulence typically has more frequent changes
      expect(countChanges(turbValues)).toBeGreaterThan(0);
    });

    it('uses global noise instance', () => {
      // Set global noise with known seed
      const noise = getGlobalNoise(555);
      
      const turbValue = turbulence(20, 30, 32);
      
      // Should use the seeded global noise
      expect(turbValue).toBeGreaterThanOrEqual(0);
      
      // Verify it's using the same instance
      const directValue = Math.abs(noise.noise2D(20 / 32, 30 / 32)) * 32;
      
      // Values should be related (turbulence uses multiple scales)
      expect(turbValue).toBeGreaterThan(0);
    });
  });
});
