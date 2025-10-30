import { Pattern, Cell, Size, Point, Theme } from '../types';
interface SpiralConfig {
    spiralCount: number;
    rotationSpeed: number;
    armLength: number;
    density: number;
    expandSpeed: number;
}
export declare class SpiralPattern implements Pattern {
    name: string;
    private config;
    private theme;
    private spiralChars;
    constructor(theme: Theme, config?: Partial<SpiralConfig>);
    reset(): void;
    render(buffer: Cell[][], time: number, size: Size, _mousePos?: Point): void;
    onMouseMove(_pos: Point): void;
    onMouseClick(_pos: Point): void;
    getMetrics(): Record<string, number>;
}
export {};
//# sourceMappingURL=SpiralPattern.d.ts.map