"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WavePattern = void 0;
class WavePattern {
    constructor(theme, config) {
        this.name = 'waves';
        this.ripples = [];
        this.waveChars = ['~', '≈', '∼', '-', '.', ' '];
        this.theme = theme;
        this.config = {
            speed: 1.0,
            amplitude: 5,
            frequency: 0.1,
            layers: 3,
            ...config
        };
    }
    /**
     * Apply a preset configuration
     */
    applyPreset(presetId) {
        const preset = WavePattern.PRESETS.find(p => p.id === presetId);
        if (!preset) {
            return false;
        }
        this.config = { ...preset.config };
        this.ripples = []; // Clear ripples when changing preset
        return true;
    }
    /**
     * Get all available presets
     */
    static getPresets() {
        return [...WavePattern.PRESETS];
    }
    /**
     * Get a specific preset by ID
     */
    static getPreset(id) {
        return WavePattern.PRESETS.find(p => p.id === id);
    }
    render(buffer, time, size, mousePos) {
        const { width, height } = size;
        const { speed, amplitude, frequency, layers } = this.config;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let totalWave = 0;
                // Multiple wave layers with smoother transitions
                for (let layer = 0; layer < layers; layer++) {
                    const layerFreq = frequency * (layer + 1) * 0.5;
                    const layerAmp = amplitude / (layer + 1);
                    const layerSpeed = speed * (layer + 1) * 0.3;
                    // Add multiple wave components for smoother effect
                    const wave1 = Math.sin((x * layerFreq) + (time * layerSpeed * 0.001)) * layerAmp;
                    const wave2 = Math.sin((x * layerFreq * 1.3) + (time * layerSpeed * 0.0008)) * (layerAmp * 0.5);
                    totalWave += wave1 + wave2;
                }
                // Add ripple effects from mouse (optimized with early rejection)
                for (const ripple of this.ripples) {
                    const dx = x - ripple.x;
                    const dy = y - ripple.y;
                    // Quick rejection test using squared distance (avoids sqrt)
                    const distSquared = dx * dx + dy * dy;
                    const radiusSquared = ripple.radius * ripple.radius;
                    if (distSquared < radiusSquared) {
                        // Only calculate sqrt when we know the point is inside
                        const dist = Math.sqrt(distSquared);
                        const age = time - ripple.time;
                        const rippleEffect = Math.sin(dist * 0.5 - age * 0.01) * (1 - dist / ripple.radius) * 3;
                        totalWave += rippleEffect;
                    }
                }
                const waveHeight = height / 2 + totalWave;
                const intensity = Math.abs(y - waveHeight);
                // Map intensity to character and theme color
                let char = ' ';
                let colorIntensity = 0;
                if (intensity < 0.5) {
                    char = this.waveChars[0];
                    colorIntensity = 1.0; // Brightest (crest)
                }
                else if (intensity < 1.5) {
                    char = this.waveChars[1];
                    colorIntensity = 1.0 - (intensity - 0.5) / 1.0 * 0.2; // 1.0 → 0.8
                }
                else if (intensity < 2.5) {
                    char = this.waveChars[2];
                    colorIntensity = 0.8 - (intensity - 1.5) / 1.0 * 0.2; // 0.8 → 0.6
                }
                else if (intensity < 4) {
                    char = this.waveChars[3];
                    colorIntensity = 0.6 - (intensity - 2.5) / 1.5 * 0.2; // 0.6 → 0.4
                }
                else if (intensity < 6) {
                    char = this.waveChars[4];
                    colorIntensity = 0.4 - (intensity - 4) / 2.0 * 0.2; // 0.4 → 0.2
                }
                const color = this.theme.getColor(colorIntensity);
                buffer[y][x] = { char, color };
            }
        }
        // Clean up old ripples
        this.ripples = this.ripples.filter(r => time - r.time < 2000);
    }
    onMouseMove(pos) {
        // Mouse movement creates subtle ripples
        this.ripples.push({
            x: pos.x,
            y: pos.y,
            time: Date.now(),
            radius: 20
        });
        // Limit number of ripples for performance
        if (this.ripples.length > 8) {
            this.ripples.shift();
        }
    }
    onMouseClick(pos) {
        // Click creates a bigger, more dramatic ripple
        this.ripples.push({
            x: pos.x,
            y: pos.y,
            time: Date.now(),
            radius: 35
        });
    }
    reset() {
        this.ripples = [];
    }
    getMetrics() {
        return {
            activeRipples: this.ripples.length,
            waveLayers: this.config.layers
        };
    }
}
exports.WavePattern = WavePattern;
// Tier 1 Presets (01-09): Essential/Popular
WavePattern.PRESETS = [
    {
        id: 1,
        name: 'Calm Seas',
        description: 'Gentle, slow-moving waves',
        config: { speed: 0.5, amplitude: 3, frequency: 0.08, layers: 2 }
    },
    {
        id: 2,
        name: 'Ocean Storm',
        description: 'Turbulent, high-energy waves',
        config: { speed: 2.0, amplitude: 8, frequency: 0.15, layers: 5 }
    },
    {
        id: 3,
        name: 'Ripple Tank',
        description: 'Physics lab interference patterns',
        config: { speed: 0.8, amplitude: 4, frequency: 0.2, layers: 4 }
    },
    {
        id: 4,
        name: 'Glass Lake',
        description: 'Barely perceptible movement',
        config: { speed: 0.3, amplitude: 2, frequency: 0.05, layers: 1 }
    },
    {
        id: 5,
        name: 'Tsunami',
        description: 'Massive, powerful waves',
        config: { speed: 1.5, amplitude: 12, frequency: 0.06, layers: 3 }
    },
    {
        id: 6,
        name: 'Choppy Waters',
        description: 'Irregular, textured surface',
        config: { speed: 1.2, amplitude: 6, frequency: 0.25, layers: 6 }
    }
];
//# sourceMappingURL=WavePattern.js.map