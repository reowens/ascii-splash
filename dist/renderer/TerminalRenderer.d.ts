import { Buffer } from './Buffer';
import { Size } from '../types';
export declare class TerminalRenderer {
    private buffer;
    private size;
    private mouseEnabled;
    constructor(mouseEnabled?: boolean);
    private handleResize;
    getSize(): Size;
    getBuffer(): Buffer;
    clear(): void;
    render(): number;
    cleanup(): void;
}
//# sourceMappingURL=TerminalRenderer.d.ts.map