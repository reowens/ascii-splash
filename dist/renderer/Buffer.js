"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Buffer = void 0;
class Buffer {
    constructor(size) {
        this.size = size;
        this.buffer = this.createEmptyBuffer(size);
        this.prevBuffer = this.createEmptyBuffer(size);
    }
    createEmptyBuffer(size) {
        const buffer = [];
        for (let y = 0; y < size.height; y++) {
            buffer[y] = [];
            for (let x = 0; x < size.width; x++) {
                buffer[y][x] = { char: ' ' };
            }
        }
        return buffer;
    }
    resize(size) {
        this.size = size;
        this.buffer = this.createEmptyBuffer(size);
        this.prevBuffer = this.createEmptyBuffer(size);
    }
    clear() {
        for (let y = 0; y < this.size.height; y++) {
            for (let x = 0; x < this.size.width; x++) {
                this.buffer[y][x] = { char: ' ' };
            }
        }
    }
    setCell(x, y, cell) {
        if (x >= 0 && x < this.size.width && y >= 0 && y < this.size.height) {
            this.buffer[y][x] = cell;
        }
    }
    getCell(x, y) {
        if (x >= 0 && x < this.size.width && y >= 0 && y < this.size.height) {
            return this.buffer[y][x];
        }
        return undefined;
    }
    getBuffer() {
        return this.buffer;
    }
    getChanges() {
        const changes = [];
        for (let y = 0; y < this.size.height; y++) {
            for (let x = 0; x < this.size.width; x++) {
                const curr = this.buffer[y][x];
                const prev = this.prevBuffer[y][x];
                if (curr.char !== prev.char ||
                    curr.color?.r !== prev.color?.r ||
                    curr.color?.g !== prev.color?.g ||
                    curr.color?.b !== prev.color?.b) {
                    changes.push({ x, y, cell: curr });
                }
            }
        }
        return changes;
    }
    swap() {
        // Copy current buffer to previous buffer
        for (let y = 0; y < this.size.height; y++) {
            for (let x = 0; x < this.size.width; x++) {
                this.prevBuffer[y][x] = { ...this.buffer[y][x] };
            }
        }
    }
    getSize() {
        return this.size;
    }
}
exports.Buffer = Buffer;
//# sourceMappingURL=Buffer.js.map