export interface Point {
    x: number;
    y: number;
}
export interface Size {
    width: number;
    height: number;
}
export interface Color {
    r: number;
    g: number;
    b: number;
}
export interface Cell {
    char: string;
    color?: Color;
}
export interface Pattern {
    name: string;
    render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void;
    onMouseMove?(pos: Point): void;
    onMouseClick?(pos: Point): void;
    reset(): void;
    getMetrics?(): Record<string, number>;
}
export interface AppState {
    running: boolean;
    paused: boolean;
    currentPattern: Pattern;
    fps: number;
    size: Size;
    mousePos?: Point;
}
//# sourceMappingURL=index.d.ts.map