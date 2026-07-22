/**
 * Minimal cross-platform clipboard helper for share codes (v0.5.0).
 *
 * Spawns the platform's native clipboard tool and pipes `text` to its
 * stdin. No third-party dependency — keeps the install footprint small
 * for a feature that only writes ~12 bytes at a time.
 *
 * Supported tools:
 *   - macOS:   pbcopy
 *   - Windows: clip
 *   - Linux:   wl-copy (Wayland), xclip (X11), xsel (X11 fallback)
 *
 * If none of the candidates for the current platform succeed, throws
 * {@link ClipboardError}. Callers should catch and surface a friendly
 * "couldn't copy — here's the code: …" message so the user can copy it
 * manually.
 */

import { spawn, type ChildProcess, type SpawnOptions } from 'child_process';

export class ClipboardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClipboardError';
  }
}

/**
 * Argv shape for a clipboard tool: `[cmd, ...args]`. Exposed for testing
 * (the {@link copyToClipboard} default is platform-derived).
 */
export type ClipboardCommand = readonly [string, ...string[]];

/**
 * Minimal spawn signature consumed by {@link runOnce}. Narrower than
 * `typeof spawn` (whose overloads don't compose well as a generic
 * function type) — we only need `(cmd, args, options?) => ChildProcess`.
 */
export type SpawnFn = (
  command: string,
  args: readonly string[],
  options?: SpawnOptions
) => ChildProcess;

/**
 * Resolve the candidate commands to try in priority order for the given
 * platform. Wayland is tried before X11 because most modern Linux setups
 * are Wayland and `xclip` on Wayland silently writes to a clipboard the
 * user can't read.
 */
export function candidatesFor(platform: NodeJS.Platform): ClipboardCommand[] {
  if (platform === 'darwin') return [['pbcopy']];
  if (platform === 'win32') return [['clip']];
  return [['wl-copy'], ['xclip', '-selection', 'clipboard'], ['xsel', '--clipboard', '--input']];
}

/**
 * Try one clipboard command. Resolves on exit code 0; rejects on any
 * spawn error (e.g. `ENOENT` for a missing binary) or non-zero exit.
 */
function runOnce(
  cmd: ClipboardCommand,
  text: string,
  spawnFn: SpawnFn,
  timeoutMs: number
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const proc = spawnFn(cmd[0], cmd.slice(1), {
      stdio: ['pipe', 'ignore', 'ignore'],
    });
    let settled = false;
    const finish = (error?: Error): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      proc.removeListener('error', onError);
      proc.removeListener('close', onClose);
      if (error) reject(error);
      else resolve();
    };
    const onError = (error: Error): void => {
      finish(error);
    };
    const onClose = (code: number | null): void => {
      if (code === 0) finish();
      else finish(new Error(`${cmd[0]} exited with code ${String(code)}`));
    };
    const timeout = setTimeout(() => {
      proc.kill('SIGTERM');
      finish(new Error(`${cmd[0]} timed out after ${String(timeoutMs)}ms`));
    }, timeoutMs);
    proc.on('error', onError);
    proc.on('close', onClose);
    proc.stdin?.end(text);
  });
}

/**
 * Copy `text` to the system clipboard, trying each platform-appropriate
 * tool in order. Throws {@link ClipboardError} if none succeed.
 *
 * @param text - String to copy
 * @param opts - Optional platform, process, command, and timeout overrides
 */
export async function copyToClipboard(
  text: string,
  opts: {
    platform?: NodeJS.Platform;
    spawnFn?: SpawnFn;
    commands?: ClipboardCommand[];
    timeoutMs?: number;
  } = {}
): Promise<void> {
  const platform = opts.platform ?? process.platform;
  // Cast the real `spawn` to our narrower signature — its overload set
  // includes our (cmd, args, options?) shape, but TS can't infer that
  // assignability across the generic alias.
  const spawnFn: SpawnFn = opts.spawnFn ?? (spawn as unknown as SpawnFn);
  const cmds = opts.commands ?? candidatesFor(platform);
  const timeoutMs = opts.timeoutMs ?? 1000;

  const errors: string[] = [];
  for (const cmd of cmds) {
    try {
      await runOnce(cmd, text, spawnFn, timeoutMs);
      return;
    } catch (err) {
      errors.push(`${cmd[0]}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new ClipboardError(
    `Could not copy to clipboard (tried: ${cmds.map(c => c[0]).join(', ')}). ` +
      `Last errors: ${errors.join('; ')}`
  );
}
