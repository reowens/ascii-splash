"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlasmaPattern = void 0;
class PlasmaPattern {
    constructor(theme, config) {
        this.name = 'plasma';
        this.plasmaChars = ['█', '▓', '▒', '░', '▪', '▫', '·', ' '];
        this.theme = theme;
        this.config = {
            frequency: 0.1,
            speed: 1.0,
            complexity: 3,
            ...config
        };
    }
    reset() {
        // Stateless pattern - no reset needed
    }
    render(buffer, time, size, _mousePos) {
        const { width, height } = size;
        const { frequency, speed, complexity } = this.config;
        const t = (time * speed) / 1000;
        // Generate plasma effect using multiple sine waves
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Normalize coordinates to 0-1 range
                const nx = x / width;
                const ny = y / height;
                // Calculate plasma value using combination of sine waves
                let value = 0;
                // Wave 1: horizontal sine wave
                value += Math.sin((nx * 10 * frequency + t) * complexity);
                // Wave 2: vertical sine wave
                value += Math.sin((ny * 10 * frequency + t * 0.8) * complexity);
                // Wave 3: diagonal sine wave
                value += Math.sin(((nx + ny) * 7 * frequency + t * 1.2) * complexity);
                // Wave 4: circular sine wave (distance from center)
                const dx = nx - 0.5;
                const dy = ny - 0.5;
                const dist = Math.sqrt(dx * dx + dy * dy);
                value += Math.sin((dist * 15 * frequency - t * 1.5) * complexity);
                // Normalize value to 0-1 range
                const intensity = (value / 4 + 1) / 2; // value is in range [-4, 4], normalize to [0, 1]
                // Choose character based on intensity
                const charIndex = Math.floor(intensity * (this.plasmaChars.length - 1));
                const char = this.plasmaChars[charIndex];
                // Use theme color with intensity
                buffer[y][x] = {
                    char,
                    color: this.theme.getColor(intensity)
                };
            }
        }
    }
    onMouseMove(_pos) {
        // No mouse interaction for plasma pattern
    }
    onMouseClick(_pos) {
        // No mouse interaction for plasma pattern
    }
    getMetrics() {
        return {
            waves: 4,
            complexity: this.config.complexity
        };
    }
}
exports.PlasmaPattern = PlasmaPattern;
//# sourceMappingURL=PlasmaPattern.js.map