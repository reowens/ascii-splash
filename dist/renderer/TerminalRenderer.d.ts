import { Buffer } from './Buffer';
import { Size } from '../types';
export declare class TerminalRenderer {
    private buffer;
    private size;
    constructor();
    private handleResize;
    getSize(): Size;
    getBuffer(): Buffer;
    clear(): void;
    render(): number;
    cleanup(): void;
}
//# sourceMappingURL=TerminalRenderer.d.ts.map