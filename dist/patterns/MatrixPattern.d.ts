import { Pattern, Cell, Size, Point } from '../types';
interface MatrixConfig {
    density: number;
    speed: number;
    charset: 'katakana' | 'numbers' | 'mixed';
}
export declare class MatrixPattern implements Pattern {
    name: string;
    private config;
    private columns;
    private charSets;
    private distortions;
    constructor(config?: Partial<MatrixConfig>);
    private initColumns;
    private createColumn;
    private getRandomChar;
    render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void;
    onMouseMove(pos: Point): void;
    onMouseClick(pos: Point): void;
    reset(): void;
    getMetrics(): Record<string, number>;
}
export {};
//# sourceMappingURL=MatrixPattern.d.ts.map