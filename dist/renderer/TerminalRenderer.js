"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalRenderer = void 0;
const terminal_kit_1 = __importDefault(require("terminal-kit"));
const Buffer_1 = require("./Buffer");
const term = terminal_kit_1.default.terminal;
class TerminalRenderer {
    constructor() {
        this.size = { width: term.width, height: term.height };
        this.buffer = new Buffer_1.Buffer(this.size);
        // Setup terminal
        term.clear();
        term.hideCursor();
        term.grabInput({ mouse: 'motion' });
        // Handle resize
        term.on('resize', (width, height) => {
            this.handleResize(width, height);
        });
    }
    handleResize(width, height) {
        this.size = { width, height };
        this.buffer.resize(this.size);
        term.clear();
    }
    getSize() {
        return this.size;
    }
    getBuffer() {
        return this.buffer;
    }
    clear() {
        this.buffer.clear();
    }
    render() {
        const changes = this.buffer.getChanges();
        // Only render changed cells for performance
        for (const change of changes) {
            term.moveTo(change.x + 1, change.y + 1); // terminal-kit uses 1-based indexing
            if (change.cell.color) {
                term.colorRgb(change.cell.color.r, change.cell.color.g, change.cell.color.b);
            }
            else {
                term.defaultColor();
            }
            term(change.cell.char);
        }
        // Swap buffers
        this.buffer.swap();
        return changes.length;
    }
    cleanup() {
        term.clear();
        term.hideCursor(false);
        term.grabInput(false);
        term.processExit(0);
    }
}
exports.TerminalRenderer = TerminalRenderer;
//# sourceMappingURL=TerminalRenderer.js.map