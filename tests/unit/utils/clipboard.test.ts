import { EventEmitter } from 'events';
import { Writable } from 'stream';
import {
  candidatesFor,
  copyToClipboard,
  ClipboardError,
  type ClipboardCommand,
  type SpawnFn,
} from '../../../src/utils/clipboard.js';

/**
 * Minimal mock child process: ChildProcess-compatible enough that
 * runOnce's listener pattern works (`on('error'|'close')`, `.stdin.end()`).
 */
class MockChild extends EventEmitter {
  stdin: Writable;
  constructor(public behavior: 'success' | 'enoent' | 'nonzero') {
    super();
    const chunks: Buffer[] = [];
    this.stdin = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(Buffer.from(chunk));
        cb();
      },
    });
    // Drive the lifecycle on the next tick so the listener registration
    // in runOnce() has a chance to attach.
    process.nextTick(() => {
      if (behavior === 'enoent') {
        const err = new Error('spawn ENOENT') as NodeJS.ErrnoException;
        err.code = 'ENOENT';
        this.emit('error', err);
      } else if (behavior === 'nonzero') {
        this.emit('close', 1);
      } else {
        this.emit('close', 0);
      }
    });
  }
}

function mockSpawn(plan: ('success' | 'enoent' | 'nonzero')[]): {
  spawnFn: SpawnFn;
  calls: { cmd: string; args: readonly string[] }[];
} {
  const calls: { cmd: string; args: readonly string[] }[] = [];
  let i = 0;
  const spawnFn: SpawnFn = (cmd, args) => {
    calls.push({ cmd, args });
    const behavior = plan[i++] ?? 'success';
    return new MockChild(behavior) as unknown as ReturnType<SpawnFn>;
  };
  return { spawnFn, calls };
}

describe('candidatesFor()', () => {
  it('returns pbcopy for macOS', () => {
    expect(candidatesFor('darwin')).toEqual([['pbcopy']]);
  });

  it('returns clip for Windows', () => {
    expect(candidatesFor('win32')).toEqual([['clip']]);
  });

  it('returns wl-copy → xclip → xsel for Linux', () => {
    const cmds = candidatesFor('linux');
    expect(cmds[0]).toEqual(['wl-copy']);
    expect(cmds[1]).toEqual(['xclip', '-selection', 'clipboard']);
    expect(cmds[2]).toEqual(['xsel', '--clipboard', '--input']);
  });

  it('defaults non-darwin non-win32 to the Linux candidate list', () => {
    // Any unknown platform falls through to the Linux list; this matches
    // what we'd want on freeBSD, etc.
    const cmds = candidatesFor('freebsd');
    expect(cmds.length).toBeGreaterThan(0);
    expect(cmds[0]).toEqual(['wl-copy']);
  });
});

describe('copyToClipboard()', () => {
  it('resolves when the first candidate exits 0', async () => {
    const { spawnFn, calls } = mockSpawn(['success']);
    await copyToClipboard('hello', { commands: [['pbcopy']], spawnFn });
    expect(calls).toHaveLength(1);
    expect(calls[0].cmd).toBe('pbcopy');
  });

  it('falls through to the next candidate on ENOENT', async () => {
    const { spawnFn, calls } = mockSpawn(['enoent', 'success']);
    const cmds: ClipboardCommand[] = [['wl-copy'], ['xclip', '-selection', 'clipboard']];
    await copyToClipboard('hello', { commands: cmds, spawnFn });
    expect(calls.map(c => c.cmd)).toEqual(['wl-copy', 'xclip']);
  });

  it('falls through on non-zero exit code', async () => {
    const { spawnFn, calls } = mockSpawn(['nonzero', 'success']);
    const cmds: ClipboardCommand[] = [['wl-copy'], ['xclip', '-selection', 'clipboard']];
    await copyToClipboard('hello', { commands: cmds, spawnFn });
    expect(calls.map(c => c.cmd)).toEqual(['wl-copy', 'xclip']);
  });

  it('throws ClipboardError when every candidate fails', async () => {
    const { spawnFn } = mockSpawn(['enoent', 'enoent']);
    const cmds: ClipboardCommand[] = [['wl-copy'], ['xclip']];
    await expect(copyToClipboard('hello', { commands: cmds, spawnFn })).rejects.toBeInstanceOf(
      ClipboardError
    );
  });

  it('ClipboardError message lists the tools attempted', async () => {
    const { spawnFn } = mockSpawn(['enoent', 'enoent']);
    const cmds: ClipboardCommand[] = [['wl-copy'], ['xsel']];
    try {
      await copyToClipboard('x', { commands: cmds, spawnFn });
      fail('expected ClipboardError');
    } catch (e) {
      expect(e).toBeInstanceOf(ClipboardError);
      expect((e as Error).message).toContain('wl-copy');
      expect((e as Error).message).toContain('xsel');
    }
  });

  it('uses platform default when commands not supplied', async () => {
    const { spawnFn, calls } = mockSpawn(['success']);
    await copyToClipboard('hello', { platform: 'darwin', spawnFn });
    expect(calls[0].cmd).toBe('pbcopy');
  });
});
