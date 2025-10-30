import { Pattern, Cell, Size, Point, Theme } from '../types';
interface PlasmaConfig {
    frequency: number;
    speed: number;
    complexity: number;
}
export declare class PlasmaPattern implements Pattern {
    name: string;
    private config;
    private theme;
    private plasmaChars;
    constructor(theme: Theme, config?: Partial<PlasmaConfig>);
    reset(): void;
    render(buffer: Cell[][], time: number, size: Size, _mousePos?: Point): void;
    onMouseMove(_pos: Point): void;
    onMouseClick(_pos: Point): void;
    getMetrics(): Record<string, number>;
}
export {};
//# sourceMappingURL=PlasmaPattern.d.ts.map