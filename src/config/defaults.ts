import { ConfigSchema } from '../types';

/**
 * Default configuration values for ascii-splash.
 * These serve as fallbacks when no user config is provided.
 */
export const defaultConfig: ConfigSchema = {
  // Global settings
  defaultPattern: 'waves',
  quality: 'medium',
  fps: 30,
  theme: 'ocean',
  mouseEnabled: true,

  // Pattern-specific configurations
  patterns: {
    waves: {
      frequency: 0.1,
      amplitude: 3,
      speed: 1.0,
      layers: 3,
      rippleDuration: 2000,
    },
    starfield: {
      starCount: 200,
      speed: 50,
      forceFieldRadius: 15,
      forceFieldStrength: 200,
    },
    matrix: {
      columnDensity: 0.1,
      speed: 1.0,
      fadeTime: 1000,
      distortionRadius: 10,
    },
    rain: {
      dropCount: 100,
      speed: 1.0,
      splashDuration: 500,
    },
    quicksilver: {
      blobCount: 15,
      speed: 1.0,
      viscosity: 0.95,
      mousePull: 0.3,
    },
    particles: {
      particleCount: 100,
      speed: 1.0,
      gravity: 0.02,
      mouseForce: 0.5,
      spawnRate: 2,
    },
    spiral: {
      armCount: 4,
      particleCount: 100,
      spiralTightness: 0.1,
      rotationSpeed: 0.3,
      particleSpeed: 1.0,
      trailLength: 5,
      direction: 'outward' as const,
      pulseEffect: true,
    },
    plasma: {
      frequency: 0.1,
      speed: 1.0,
      complexity: 3,
    },
    tunnel: {
      shape: 'circle' as const,
      ringCount: 35,
      speed: 2.0,
      particleCount: 60,
      speedLineCount: 20,
      turbulence: 0.1,
      glowIntensity: 0.7,
      chromatic: false,
      rotationSpeed: 0.3,
      radius: 0.75,
    },
    lightning: {
      branchProbability: 0.3,
      fadeTime: 300,
      strikeInterval: 1500,
      mainPathJaggedness: 8,
      branchSpread: 10,
    },
    fireworks: {
      burstSize: 80,
      launchSpeed: 0.8,
      gravity: 0.015,
      fadeRate: 0.02,
      spawnInterval: 1500,
      trailLength: 8,
    },
    maze: {
      algorithm: 'dfs',
      cellSize: 3,
      generationSpeed: 50,
      wallChar: '█',
      pathChar: ' ',
      animateGeneration: true,
    },
    life: {
      cellSize: 2,
      updateSpeed: 100,
      wrapEdges: true,
      aliveChar: '█',
      deadChar: ' ',
      randomDensity: 0.3,
      initialPattern: 'random',
    },
    dna: {
      rotationSpeed: 0.5,
      helixRadius: 4,
      helixHeight: 20,
      basePairSpacing: 2,
      twistRate: 0.3,
    },
    lavaLamp: {
      blobCount: 5,
      minRadius: 6,
      maxRadius: 12,
      riseSpeed: 0.3,
      driftSpeed: 0.2,
      threshold: 1.0,
      mouseForce: 2.0,
      turbulence: true,
      gravity: true,
    },
    smoke: {
      plumeCount: 3,
      particleCount: 60,
      riseSpeed: 0.5,
      dissipationRate: 0.03,
      turbulence: 0.8,
      spread: 0.5,
      windStrength: 0.2,
      mouseBlowForce: 2.5,
    },
    snow: {
      particleCount: 50,
      fallSpeed: 0.3,
      windStrength: 0.5,
      turbulence: 0.6,
      rotationSpeed: 1.0,
      particleType: 'snow' as const,
      mouseWindForce: 2.0,
      accumulation: true,
    },
  },
};

/**
 * Quality preset FPS values
 */
export const qualityPresets = {
  low: 15,
  medium: 30,
  high: 60,
};
