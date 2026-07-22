/**
 * Workspace fixture parsing — the `splash watch --fixture <file>` format.
 *
 * Fixtures are permanent test/demo infrastructure (locked decision in the
 * proposal), so the format is schema-versioned from day one. This module
 * is pure: it validates already-parsed JSON. File reading stays in
 * main.ts, keeping everything under src/patterns/ free of I/O.
 *
 * Schema v1:
 * ```json
 * {
 *   "schema": 1,
 *   "kind": "splash-workspace-fixture",
 *   "name": "tree-medium",
 *   "files": [
 *     { "path": "src/main.ts", "bytes": 42000, "heat": 2.5 }
 *   ]
 * }
 * ```
 * Directories are derived from file paths. `heat` seeds warmth at load
 * time so a static fixture demos the glow/LOD behavior.
 */

export const WORKSPACE_FIXTURE_SCHEMA_VERSION = 1;
export const WORKSPACE_FIXTURE_KIND = 'splash-workspace-fixture';

/** Hard cap from the proposal's performance budget (100k indexed files). */
export const MAX_FIXTURE_FILES = 100000;
export const MAX_WORKSPACE_PATH_LENGTH = 4096;
export const MAX_WORKSPACE_PATH_DEPTH = 128;

export interface WorkspaceFixtureFile {
  /** Repo-relative POSIX path (`src/main.ts`). */
  path: string;
  /** File size in bytes (drives node weight). */
  bytes?: number;
  /** Initial heat seeded at load time (≥ 0). */
  heat?: number;
}

export interface WorkspaceFixture {
  schema: number;
  name?: string;
  files: WorkspaceFixtureFile[];
}

export class WorkspaceFixtureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkspaceFixtureError';
  }
}

function fail(message: string): never {
  throw new WorkspaceFixtureError(message);
}

/**
 * Validate a repo-relative POSIX path: non-empty, no backslashes, not
 * absolute, no `.`/`..` segments, no empty segments (`a//b`).
 */
function validatePath(path: string, index: number): void {
  if (path.length === 0) fail(`files[${String(index)}]: path is empty`);
  if (path.length > MAX_WORKSPACE_PATH_LENGTH) {
    fail(`files[${String(index)}]: path exceeds ${String(MAX_WORKSPACE_PATH_LENGTH)} characters`);
  }
  if (path.includes('\\')) {
    fail(`files[${String(index)}]: path "${path}" must use POSIX separators`);
  }
  if (path.startsWith('/') || /^[A-Za-z]:\//.test(path)) {
    fail(`files[${String(index)}]: path "${path}" must be relative`);
  }
  const segments = path.split('/');
  if (segments.length > MAX_WORKSPACE_PATH_DEPTH) {
    fail(`files[${String(index)}]: path exceeds ${String(MAX_WORKSPACE_PATH_DEPTH)} segments`);
  }
  for (const segment of segments) {
    if (segment === '' || segment === '.' || segment === '..') {
      fail(`files[${String(index)}]: path "${path}" contains an invalid segment`);
    }
  }
}

/**
 * Parse and validate fixture JSON (already decoded from text). Throws
 * {@link WorkspaceFixtureError} with a pointed message on any shape
 * problem — fixture files are hand-edited, so diagnostics matter.
 */
export function parseWorkspaceFixture(data: unknown): WorkspaceFixture {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    fail('fixture root must be a JSON object');
  }
  const obj = data as Record<string, unknown>;

  if (obj.kind !== undefined && obj.kind !== WORKSPACE_FIXTURE_KIND) {
    fail(
      `unrecognized fixture kind "${JSON.stringify(obj.kind) ?? 'undefined'}" (expected "${WORKSPACE_FIXTURE_KIND}")`
    );
  }
  if (typeof obj.schema !== 'number') {
    fail('fixture is missing the numeric "schema" field');
  }
  if (obj.schema !== WORKSPACE_FIXTURE_SCHEMA_VERSION) {
    fail(
      `fixture schema ${String(obj.schema)} is not supported ` +
        `(this build reads schema ${String(WORKSPACE_FIXTURE_SCHEMA_VERSION)})`
    );
  }
  if (obj.name !== undefined && typeof obj.name !== 'string') {
    fail('fixture "name" must be a string when present');
  }
  if (!Array.isArray(obj.files) || obj.files.length === 0) {
    fail('fixture "files" must be a non-empty array');
  }
  if (obj.files.length > MAX_FIXTURE_FILES) {
    fail(`fixture has ${String(obj.files.length)} files (hard cap: ${String(MAX_FIXTURE_FILES)})`);
  }

  const seen = new Set<string>();
  const files: WorkspaceFixtureFile[] = obj.files.map((entry: unknown, i: number) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      fail(`files[${String(i)}] must be an object`);
    }
    const file = entry as Record<string, unknown>;
    if (typeof file.path !== 'string') {
      fail(`files[${String(i)}] is missing a string "path"`);
    }
    validatePath(file.path, i);
    if (seen.has(file.path)) fail(`files[${String(i)}]: duplicate path "${file.path}"`);
    seen.add(file.path);

    if (
      file.bytes !== undefined &&
      (typeof file.bytes !== 'number' || !Number.isFinite(file.bytes) || file.bytes < 0)
    ) {
      fail(`files[${String(i)}]: "bytes" must be a finite number ≥ 0`);
    }
    if (
      file.heat !== undefined &&
      (typeof file.heat !== 'number' || !Number.isFinite(file.heat) || file.heat < 0)
    ) {
      fail(`files[${String(i)}]: "heat" must be a finite number ≥ 0`);
    }
    return { path: file.path, bytes: file.bytes, heat: file.heat };
  });

  return {
    schema: obj.schema,
    name: typeof obj.name === 'string' ? obj.name : undefined,
    files,
  };
}
