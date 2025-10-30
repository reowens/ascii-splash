"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.qualityPresets = exports.defaultConfig = void 0;
/**
 * Default configuration values for ascii-splash.
 * These serve as fallbacks when no user config is provided.
 */
exports.defaultConfig = {
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
    },
};
/**
 * Quality preset FPS values
 */
exports.qualityPresets = {
    low: 15,
    medium: 30,
    high: 60,
};
//# sourceMappingURL=defaults.js.map