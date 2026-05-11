# Release Process

This document describes how to create and publish a new release of ascii-splash.

## TL;DR — One Command

Releases are fully automated. After updating `CHANGELOG.md` with the new version section:

```bash
npm version minor  # or: patch, major
```

That single command runs `preversion` (test + typecheck), bumps `package.json` + `package-lock.json`, commits, and runs `postversion` (push main → push tag → watch CI → reinstall global).

Pushing the tag triggers `.github/workflows/release.yml`, which:

1. Verifies the tag commit is on `main` and that the tag matches `package.json` version
2. Installs deps, typechecks, builds, runs the full test suite
3. Audits the npm tarball for unexpected files (source leak protection)
4. Publishes to npm with `--provenance`
5. Creates the GitHub Release with notes extracted from `CHANGELOG.md`

No manual `npm publish` is needed.

## Prerequisites (one-time setup)

### `NPM_TOKEN` GitHub repo secret

The CI workflow publishes to npm using a token. Create one and add it as a repo secret:

1. **Create an npm Automation token**
   - Go to <https://www.npmjs.com/> → your avatar → **Access Tokens** → **Generate New Token** → **Classic Token** → **Automation**
   - Copy the token (starts with `npm_…`)

2. **Add it to the repo secrets**

   ```bash
   gh secret set NPM_TOKEN
   # Paste the token when prompted
   ```

   Or via the GitHub UI: **Settings → Secrets and variables → Actions → New repository secret**, name `NPM_TOKEN`.

3. **Verify**

   ```bash
   gh secret list
   # Should show NPM_TOKEN
   ```

### `gh` CLI authenticated

The `postversion` script uses `gh run watch` to follow the release workflow. Make sure `gh auth status` shows you're logged in.

## Step-by-step

Create a new release:

```bash
# 1. Update CHANGELOG.md — add `## [X.Y.Z] - YYYY-MM-DD` section above [Unreleased]
#    (or convert [Unreleased] → the dated section)
# 2. Commit the CHANGELOG update on main
git add CHANGELOG.md && git commit -m "docs: changelog for X.Y.Z" && git push

# 3. Bump version — triggers the entire pipeline
npm version minor  # or: patch, major
```

**Verify the release:**

```bash
npm view ascii-splash version
npm install -g ascii-splash@latest
splash --version
```

---

## What the CI release workflow does

`.github/workflows/release.yml` triggers on any `v*.*.*` tag push and runs these steps in order. If any step fails, the release aborts before publishing — nothing partial reaches the registry.

1. **Verify tag commit is on `main`** — refuses to publish from arbitrary branches.
2. **Verify tag matches `package.json` version** — refuses if `v0.4.0` tag points at a commit whose `package.json` says `0.3.1`. Catches forgotten version bumps.
3. **`npm ci`** with frozen lockfile.
4. **`npx tsc --noEmit`** — type check.
5. **`npm run build`** — compile to `dist/`.
6. **`npm test`** — full Jest suite (2244 tests).
7. **Tarball audit** — verifies only whitelisted paths (`dist/`, `examples/`, `package.json`, `README.md`, `LICENSE`, `CHANGELOG.md`) end up in the published tarball. Source-leak protection.
8. **`npm publish --access public --provenance`** — uses `NPM_TOKEN` secret; publishes with provenance attestation.
9. **Extract changelog section** for this version and create the GitHub Release with those notes.

## Continuous Integration (CI)

The CI workflow (`.github/workflows/ci.yml`) runs automatically on every push and PR:

- ✅ Tests on Node 20
- ✅ TypeScript compilation
- ✅ Build verification

## Troubleshooting

### CI release workflow fails

**Problem**: `Refusing to publish: tag commit is not on main`

- **Cause**: Tag points at a commit that isn't an ancestor of `origin/main`.
- **Solution**: Delete the tag (`git tag -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z`), get the right commit onto `main`, then re-tag.

**Problem**: `Tag vX.Y.Z does not match package.json version vA.B.C`

- **Cause**: Forgot to bump `package.json` before tagging.
- **Solution**: Delete the tag (see above), run `npm version <bump>` to bump + commit + push + re-tag in one shot.

**Problem**: `Tarball audit` fails with unexpected files

- **Cause**: A new path landed in the npm tarball that isn't in the whitelist (the `case` pattern in `release.yml`).
- **Solution**: Either trim `package.json`'s `files` field to exclude it, or add it to both `files` and the workflow's `case` pattern.

**Problem**: `npm publish` step fails with 401/403

- **Cause**: `NPM_TOKEN` repo secret is missing, expired, or scoped incorrectly.
- **Solution**: Generate a fresh **Automation** token at npmjs.com and `gh secret set NPM_TOKEN` again. Verify with `gh secret list`.

### Rollback a Release

If you need to unpublish a version (within 72 hours):

```bash
# Unpublish specific version (use sparingly)
npm unpublish ascii-splash@0.1.1

# Or deprecate (recommended)
npm deprecate ascii-splash@0.1.1 "This version has critical bugs, please upgrade"
```

**Note**: npm doesn't allow unpublishing after 72 hours. Use deprecation instead.

### Delete a Tag

If you created a tag by mistake:

```bash
# Delete local tag
git tag -d v0.1.1

# Delete remote tag
git push origin :refs/tags/v0.1.1
```

## Pre-Release / Beta Versions

For testing releases before publishing to the `latest` dist-tag:

```bash
# Bump to a pre-release version (fires the same preversion/postversion pipeline)
npm version 0.5.0-beta.1
```

The CI workflow detects the `-beta.` suffix in the tag and publishes to npm. To install:

```bash
npm install ascii-splash@0.5.0-beta.1
```

Note: by default, `npm publish` from the workflow uses the implicit `latest` tag. To publish a beta without bumping `latest`, you'd need to add `--tag beta` to the publish step in `release.yml` conditionally — currently this isn't wired up. Open an issue if you need it.

## Release Checklist

Before creating a release:

- [ ] `CHANGELOG.md` has a section for the new version (or `[Unreleased]` is converted to a dated section)
- [ ] `NPM_TOKEN` repo secret exists (`gh secret list`)
- [ ] `gh auth status` is logged in (`postversion` uses `gh run watch`)
- [ ] On `main`, working tree clean, in sync with `origin/main`
- [ ] Run `npm version <bump>` — that's it

After release:

- [ ] CI run on the tag is green (`gh run list --workflow=release.yml --branch vX.Y.Z`)
- [ ] `npm view ascii-splash version` shows the new version
- [ ] GitHub Release page shows the changelog notes
- [ ] `splash --version` on a fresh global install matches

## Workflow Files

### `.github/workflows/ci.yml`

Runs on every push and PR — typecheck, tests, build.

### `.github/workflows/release.yml`

Runs on tag push (`v*.*.*`). Does the full publish + GitHub Release. See [What the CI release workflow does](#what-the-ci-release-workflow-does) above.

## Best Practices

1. **One source of truth for version**: never edit `package.json`'s `version` field by hand — always go through `npm version <bump>`. Manual edits skip `preversion` (tests) and won't trigger `postversion` (push + tag).

2. **Use semantic versioning**
   - `MAJOR.MINOR.PATCH` (e.g., `1.2.3`)
   - MAJOR: Breaking changes
   - MINOR: New features (backward compatible)
   - PATCH: Bug fixes

3. **Write meaningful changelog entries**
   - Focus on user-facing changes
   - Group by: Added, Changed, Fixed, Removed
   - Include issue/PR references when relevant

4. **Let `npm version` create the tag**

   `npm version <bump>` automatically creates an annotated tag — no need to `git tag` by hand. The tag message is whatever you set in your git config (`commit.template`) or defaults to `v$version`.

5. **Atomic releases**: `npm version` bumps + commits + tags + (via postversion) pushes + watches CI. If any step in the CI workflow fails, nothing reaches the npm registry — the publish step runs _after_ the audit and verification gates.

6. **Test the published package**
   ```bash
   # In a temporary directory
   npm install -g ascii-splash@latest
   splash
   ```

## Support

If you encounter issues with the release process:

1. Check the Actions tab for CI/Release logs
2. Review this document for troubleshooting steps
3. Open an issue in the repository

---

**Last Updated**: 2026-05-10
