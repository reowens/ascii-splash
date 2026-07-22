import { describe, expect, it } from '@jest/globals';
import { AnimationClock, type TimeSource } from '../../../src/engine/AnimationClock.js';

class ManualTimeSource implements TimeSource {
  constructor(private value: number) {}

  now(): number {
    return this.value;
  }

  advance(milliseconds: number): void {
    this.value += milliseconds;
  }
}

describe('AnimationClock', () => {
  it('produces identical relative times from different source origins', () => {
    const sourceA = new ManualTimeSource(1000);
    const sourceB = new ManualTimeSource(900000);
    const clockA = new AnimationClock(sourceA);
    const clockB = new AnimationClock(sourceB);
    clockA.start();
    clockB.start();

    for (const delta of [16, 17, 33, 50]) {
      sourceA.advance(delta);
      sourceB.advance(delta);
      expect(clockA.frame()).toEqual(clockB.frame());
    }
  });

  it('excludes paused time from scene, app, and delta time', () => {
    const source = new ManualTimeSource(500);
    const clock = new AnimationClock(source);
    clock.start();
    source.advance(40);
    expect(clock.frame()).toEqual({ sceneTime: 40, appTime: 40, deltaTime: 40 });

    clock.pause();
    source.advance(5000);
    clock.resume();
    source.advance(20);

    expect(clock.frame()).toEqual({ sceneTime: 60, appTime: 60, deltaTime: 20 });
  });

  it('resets scene time without moving application time backward', () => {
    const source = new ManualTimeSource(100);
    const clock = new AnimationClock(source);
    clock.start();
    source.advance(75);
    expect(clock.frame().appTime).toBe(75);

    clock.resetScene();
    source.advance(25);

    expect(clock.frame()).toEqual({ sceneTime: 25, appTime: 100, deltaTime: 25 });
  });

  it('excludes stopped time when restarted', () => {
    const source = new ManualTimeSource(100);
    const clock = new AnimationClock(source);
    clock.start();
    source.advance(30);
    clock.stop();
    source.advance(1000);
    clock.start();
    source.advance(10);

    expect(clock.frame()).toEqual({ sceneTime: 40, appTime: 40, deltaTime: 40 });
  });

  it('clamps a backward source adjustment instead of emitting negative time', () => {
    const source = new ManualTimeSource(100);
    const clock = new AnimationClock(source);
    clock.start();
    source.advance(-20);

    expect(clock.frame()).toEqual({ sceneTime: 0, appTime: 0, deltaTime: 0 });
  });
});
