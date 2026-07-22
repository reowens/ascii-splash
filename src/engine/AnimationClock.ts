import type { FrameTime } from '../types/index.js';

/** Injectable monotonic time source used by the animation clock. */
export interface TimeSource {
  now(): number;
}

const defaultTimeSource: TimeSource = {
  now: () => performance.now(),
};

/**
 * Relative animation clock with separate application and scene lifetimes.
 * Stopped and paused intervals are excluded from both clocks.
 */
export class AnimationClock {
  private running = false;
  private paused = false;
  private sourceTime = 0;
  private appTime = 0;
  private sceneEpoch = 0;
  private previousFrameTime = 0;

  constructor(private readonly source: TimeSource = defaultTimeSource) {}

  /** Raw monotonic time for frame scheduling only. */
  now(): number {
    return this.source.now();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.sourceTime = this.source.now();
  }

  stop(): void {
    if (!this.running) return;
    this.accumulate();
    this.running = false;
  }

  pause(): void {
    if (this.paused) return;
    this.accumulate();
    this.paused = true;
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.sourceTime = this.source.now();
  }

  /** Reset only the active scene; application time remains continuous. */
  resetScene(): void {
    this.accumulate();
    this.sceneEpoch = this.appTime;
    this.previousFrameTime = this.appTime;
  }

  /** Capture the time values for one rendered frame. */
  frame(): FrameTime {
    this.accumulate();
    const deltaTime = Math.max(0, this.appTime - this.previousFrameTime);
    this.previousFrameTime = this.appTime;
    return {
      sceneTime: Math.max(0, this.appTime - this.sceneEpoch),
      appTime: this.appTime,
      deltaTime,
    };
  }

  private accumulate(): void {
    if (!this.running || this.paused) return;
    const current = this.source.now();
    this.appTime += Math.max(0, current - this.sourceTime);
    this.sourceTime = current;
  }
}
