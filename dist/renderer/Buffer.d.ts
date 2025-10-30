import { Cell, Size } from '../types';
export declare class Buffer {
    private buffer;
    private prevBuffer;
    private size;
    constructor(size: Size);
    private createEmptyBuffer;
    resize(size: Size): void;
    clear(): void;
    setCell(x: number, y: number, cell: Cell): void;
    getCell(x: number, y: number): Cell | undefined;
    getBuffer(): Cell[][];
    getChanges(): {
        x: number;
        y: number;
        cell: Cell;
    }[];
    swap(): void;
    getSize(): Size;
}
//# sourceMappingURL=Buffer.d.ts.map