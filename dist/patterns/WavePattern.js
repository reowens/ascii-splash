"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WavePattern = void 0;
class WavePattern {
    constructor(config) {
        this.name = 'waves';
        this.ripples = [];
        this.waveChars = ['~', '≈', '∼', '-', '.', ' '];
        this.config = {
            speed: 1.0,
            amplitude: 5,
            frequency: 0.1,
            layers: 3,
            ...config
        };
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
                // Smoother character and color transitions
                let char = ' ';
                let color = { r: 0, g: 0, b: 0 };
                if (intensity < 0.5) {
                    char = this.waveChars[0];
                    color = { r: 255, g: 255, b: 255 }; // White crest
                }
                else if (intensity < 1.5) {
                    char = this.waveChars[1];
                    const t = (intensity - 0.5) / 1.0;
                    color = {
                        r: Math.floor(255 - t * 155),
                        g: Math.floor(255 - t * 55),
                        b: 255
                    };
                }
                else if (intensity < 2.5) {
                    char = this.waveChars[2];
                    const t = (intensity - 1.5) / 1.0;
                    color = {
                        r: Math.floor(100 - t * 50),
                        g: Math.floor(200 - t * 50),
                        b: 255
                    };
                }
                else if (intensity < 4) {
                    char = this.waveChars[3];
                    const t = (intensity - 2.5) / 1.5;
                    color = {
                        r: Math.floor(50 - t * 20),
                        g: Math.floor(150 - t * 50),
                        b: Math.floor(255 - t * 55)
                    };
                }
                else if (intensity < 6) {
                    char = this.waveChars[4];
                    const t = (intensity - 4) / 2.0;
                    color = {
                        r: Math.floor(30 - t * 10),
                        g: Math.floor(100 - t * 50),
                        b: Math.floor(200 - t * 50)
                    };
                }
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
//# sourceMappingURL=WavePattern.js.map