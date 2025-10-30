import { Pattern, Cell, Size, Point } from '../types';
interface StarConfig {
    starCount: number;
    speed: number;
    mouseRepelRadius: number;
}
export declare class StarfieldPattern implements Pattern {
    name: string;
    private config;
    private stars;
    private starChars;
    private explosions;
    constructor(config?: Partial<StarConfig>);
    private initStars;
    private createStar;
    render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void;
    onMouseMove(pos: Point): void;
    onMouseClick(pos: Point): void;
    reset(): void;
    getMetrics(): Record<string, number>;
}
export {};
//# sourceMappingURL=StarfieldPattern.d.ts.map