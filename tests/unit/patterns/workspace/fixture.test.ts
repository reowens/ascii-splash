import { describe, expect, test } from '@jest/globals';
import {
  MAX_FIXTURE_FILES,
  MAX_WORKSPACE_PATH_DEPTH,
  MAX_WORKSPACE_PATH_LENGTH,
  parseWorkspaceFixture,
  WorkspaceFixtureError,
} from '../../../../src/patterns/workspace/fixture.js';

const valid = (files: unknown[] = [{ path: 'src/main.ts' }]) => ({
  schema: 1,
  kind: 'splash-workspace-fixture',
  name: 'fixture',
  files,
});

describe('parseWorkspaceFixture', () => {
  test('accepts valid schema and optional fields', () => {
    expect(
      parseWorkspaceFixture(valid([{ path: 'src/main.ts', bytes: 4, heat: 2 }, { path: 'README' }]))
    ).toEqual({
      schema: 1,
      name: 'fixture',
      files: [
        { path: 'src/main.ts', bytes: 4, heat: 2 },
        { path: 'README', bytes: undefined, heat: undefined },
      ],
    });
  });

  test.each([null, [], 'x', 1])('rejects non-object root %#', root => {
    expect(() => parseWorkspaceFixture(root)).toThrow(WorkspaceFixtureError);
  });

  test.each([
    [{ ...valid(), kind: 'wrong' }, /kind/],
    [{ ...valid(), schema: '1' }, /numeric/],
    [{ ...valid(), schema: 2 }, /not supported/],
    [{ ...valid(), name: 3 }, /name/],
    [{ ...valid(), files: [] }, /non-empty/],
    [{ ...valid(), files: 'x' }, /non-empty/],
    [{ ...valid(), files: [null] }, /must be an object/],
    [{ ...valid(), files: [{}] }, /string "path"/],
  ])('rejects malformed fixture shape %#', (input, message) => {
    expect(() => parseWorkspaceFixture(input)).toThrow(message as RegExp);
  });

  test('rejects duplicate paths', () => {
    expect(() => parseWorkspaceFixture(valid([{ path: 'a.ts' }, { path: 'a.ts' }]))).toThrow(
      /duplicate/
    );
  });

  test.each(['', '/abs.ts', 'C:/abs.ts', 'a\\b.ts', './a.ts', '../a.ts', 'a/../b', 'a//b'])(
    'rejects unsafe path %j',
    path => expect(() => parseWorkspaceFixture(valid([{ path }]))).toThrow(WorkspaceFixtureError)
  );

  test.each([
    [{ path: 'a', bytes: -1 }, /bytes/],
    [{ path: 'a', bytes: Infinity }, /bytes/],
    [{ path: 'a', bytes: '1' }, /bytes/],
    [{ path: 'a', heat: -1 }, /heat/],
    [{ path: 'a', heat: NaN }, /heat/],
  ])('rejects invalid numeric fields %#', (file, message) => {
    expect(() => parseWorkspaceFixture(valid([file]))).toThrow(message as RegExp);
  });

  test('enforces file-count cap before mapping entries', () => {
    expect(() =>
      parseWorkspaceFixture({ ...valid(), files: new Array(MAX_FIXTURE_FILES + 1) })
    ).toThrow(/hard cap/);
  });

  test('enforces path length and depth limits', () => {
    expect(() =>
      parseWorkspaceFixture(valid([{ path: 'a'.repeat(MAX_WORKSPACE_PATH_LENGTH + 1) }]))
    ).toThrow(/characters/);
    expect(() =>
      parseWorkspaceFixture(
        valid([{ path: new Array(MAX_WORKSPACE_PATH_DEPTH + 1).fill('a').join('/') }])
      )
    ).toThrow(/segments/);
  });
});
