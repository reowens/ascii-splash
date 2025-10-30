import { Pattern, Cell, Size, Point } from '../types';
interface WaveConfig {
    speed: number;
    amplitude: number;
    frequency: number;
    layers: number;
}
export declare class WavePattern implements Pattern {
    name: string;
    private config;
    private ripples;
    private waveChars;
    constructor(config?: Partial<WaveConfig>);
    render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void;
    onMouseMove(pos: Point): void;
    onMouseClick(pos: Point): void;
    reset(): void;
    getMetrics(): Record<string, number>;
}
export {};
//# sourceMappingURL=WavePattern.d.ts.map