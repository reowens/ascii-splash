import { Pattern, Cell, Size, Point } from '../types';
interface RainConfig {
    density: number;
    speed: number;
    characters: string[];
}
export declare class RainPattern implements Pattern {
    name: string;
    private config;
    private drops;
    private splashes;
    constructor(config?: Partial<RainConfig>);
    private initDrops;
    private createDrop;
    render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void;
    onMouseMove(pos: Point): void;
    onMouseClick(pos: Point): void;
    reset(): void;
    getMetrics(): Record<string, number>;
}
export {};
//# sourceMappingURL=RainPattern.d.ts.map