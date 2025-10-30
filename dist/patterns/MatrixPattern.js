"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatrixPattern = void 0;
class MatrixPattern {
    constructor(theme, config) {
        this.name = 'matrix';
        this.columns = [];
        this.charSets = {
            katakana: 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ',
            numbers: '0123456789',
            mixed: 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        };
        this.distortions = [];
        this.theme = theme;
        this.config = {
            density: 0.3,
            speed: 1.0,
            charset: 'katakana',
            ...config
        };
    }
    initColumns(size) {
        const targetColumns = Math.floor(size.width * this.config.density);
        while (this.columns.length < targetColumns) {
            this.columns.push(this.createColumn(size));
        }
        // Remove excess columns if terminal shrunk
        this.columns = this.columns.filter(col => col.x < size.width);
    }
    createColumn(size) {
        const charset = this.charSets[this.config.charset];
        const length = Math.floor(Math.random() * 15) + 5;
        const chars = [];
        for (let i = 0; i < length; i++) {
            chars.push(charset[Math.floor(Math.random() * charset.length)]);
        }
        return {
            x: Math.floor(Math.random() * size.width),
            y: -length,
            speed: (Math.random() * 0.5 + 0.5) * this.config.speed,
            chars,
            length
        };
    }
    getRandomChar() {
        const charset = this.charSets[this.config.charset];
        return charset[Math.floor(Math.random() * charset.length)];
    }
    render(buffer, time, size, mousePos) {
        const { width, height } = size;
        this.initColumns(size);
        // Clear buffer with slight fade effect
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                buffer[y][x] = { char: ' ' };
            }
        }
        // Update distortions
        if (mousePos) {
            this.distortions = [{ x: mousePos.x, y: mousePos.y, radius: 5 }];
        }
        // Update and render columns
        for (let i = 0; i < this.columns.length; i++) {
            const col = this.columns[i];
            // Move column down
            col.y += col.speed * 0.3;
            // Reset if off screen
            if (col.y > height + col.length) {
                this.columns[i] = this.createColumn(size);
                continue;
            }
            // Render each character in the column
            for (let j = 0; j < col.length; j++) {
                const y = Math.floor(col.y - j);
                if (y >= 0 && y < height && col.x >= 0 && col.x < width) {
                    // Check for distortion
                    let char = col.chars[j];
                    let isDistorted = false;
                    for (const distortion of this.distortions) {
                        const dx = col.x - distortion.x;
                        const dy = y - distortion.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < distortion.radius) {
                            isDistorted = true;
                            char = this.getRandomChar();
                            break;
                        }
                    }
                    // Head of column is bright white
                    if (j === 0) {
                        buffer[y][col.x] = {
                            char,
                            color: { r: 255, g: 255, b: 255 }
                        };
                    }
                    // Next few characters are bright green
                    else if (j < 3) {
                        buffer[y][col.x] = {
                            char,
                            color: { r: 0, g: 255, b: 70 }
                        };
                    }
                    // Fade to darker green
                    else {
                        const fade = 1 - (j / col.length);
                        const brightness = Math.floor(fade * 200);
                        buffer[y][col.x] = {
                            char,
                            color: { r: 0, g: brightness, b: Math.floor(brightness * 0.3) }
                        };
                    }
                    // Occasionally change a character
                    if (Math.random() < 0.05) {
                        col.chars[j] = this.getRandomChar();
                    }
                }
            }
        }
    }
    onMouseMove(pos) {
        // Distortion handled in render
    }
    onMouseClick(pos) {
        // Spawn new columns around click
        const size = { width: 100, height: 100 }; // Will be overridden in render
        for (let i = 0; i < 3; i++) {
            const newCol = this.createColumn(size);
            newCol.x = pos.x + Math.floor(Math.random() * 6) - 3;
            newCol.y = pos.y - newCol.length;
            this.columns.push(newCol);
        }
    }
    reset() {
        this.columns = [];
        this.distortions = [];
    }
    getMetrics() {
        return {
            columns: this.columns.length,
            density: this.config.density
        };
    }
    applyPreset(presetId) {
        const preset = MatrixPattern.PRESETS.find(p => p.id === presetId);
        if (!preset)
            return false;
        this.config = { ...preset.config };
        this.reset();
        return true;
    }
    static getPresets() {
        return [...MatrixPattern.PRESETS];
    }
    static getPreset(id) {
        return MatrixPattern.PRESETS.find(p => p.id === id);
    }
}
exports.MatrixPattern = MatrixPattern;
MatrixPattern.PRESETS = [
    {
        id: 1,
        name: 'Classic Matrix',
        description: 'The iconic falling code effect',
        config: { density: 0.3, speed: 1.0, charset: 'katakana' }
    },
    {
        id: 2,
        name: 'Binary Rain',
        description: 'Falling numbers, digital downpour',
        config: { density: 0.4, speed: 1.2, charset: 'numbers' }
    },
    {
        id: 3,
        name: 'Code Storm',
        description: 'Dense, fast-moving characters',
        config: { density: 0.5, speed: 1.8, charset: 'mixed' }
    },
    {
        id: 4,
        name: 'Sparse Glyphs',
        description: 'Minimal, slow-falling characters',
        config: { density: 0.15, speed: 0.6, charset: 'katakana' }
    },
    {
        id: 5,
        name: 'Firewall',
        description: 'Ultra-dense security screen',
        config: { density: 0.7, speed: 2.0, charset: 'mixed' }
    },
    {
        id: 6,
        name: 'Zen Code',
        description: 'Peaceful, meditative flow',
        config: { density: 0.2, speed: 0.5, charset: 'katakana' }
    }
];
//# sourceMappingURL=MatrixPattern.js.map