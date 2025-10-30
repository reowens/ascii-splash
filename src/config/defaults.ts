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
      spiralCount: 3,
      rotationSpeed: 0.5,
      armLength: 8,
      density: 15,
      expandSpeed: 0.3,
    },
    plasma: {
      frequency: 0.1,
      speed: 1.0,
      complexity: 3,
    },
    tunnel: {
      shape: 'circle',
      ringCount: 12,
      ringSpacing: 0.5,
      speed: 1.0,
      rotationSpeed: 0.2,
      radius: 15,
    },
    lightning: {
      boltDensity: 0.5,
      branchProbability: 0.3,
      branchAngle: 30,
      fadeTime: 300,
      strikeInterval: 1500,
      maxBranches: 3,
      thickness: 1,
    },
    fireworks: {
      burstSize: 80,
      launchSpeed: 0.8,
      gravity: 0.015,
      fadeRate: 0.02,
      spawnInterval: 1500,
      trailLength: 8,
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
