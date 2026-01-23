# Release Process

This document describes how to create and publish a new release of ascii-splash.

## Quick Start

Create a new release in 5 simple steps:

```bash
# 1. Update version
npm version patch  # or: minor, major

# 2. Update CHANGELOG.md
# Add section: ## [X.Y.Z] - YYYY-MM-DD

# 3. Commit and push
git add package.json CHANGELOG.md
git commit -m "chore: bump version to X.Y.Z"
git push origin main

# 4. Publish to npm (manual - requires authentication)
npm publish

# 5. Create and push tag (triggers GitHub Release)
git tag -a vX.Y.Z -m "Release version X.Y.Z"
git push origin vX.Y.Z
```

**Verify the release:**

```bash
npm view ascii-splash version
npm install -g ascii-splash@latest
splash --version
```

---

## Detailed Release Workflow

### Prerequisites

1. **npm Account & Authentication**
   - Create an account at [npmjs.com](https://www.npmjs.com)
   - Log in locally: `npm login`
   - Verify login: `npm whoami`

2. **GitHub Permissions**
   - Ensure you have write access to the repository

### 1. Update Version and Changelog

```bash
# Update version in package.json (choose one):
npm version patch  # Bug fixes (0.1.0 → 0.1.1)
npm version minor  # New features (0.1.0 → 0.2.0)
npm version major  # Breaking changes (0.1.0 → 1.0.0)

# Or manually edit package.json and update:
# "version": "0.1.1"
```

### 2. Update CHANGELOG.md

Add a new section at the top of `CHANGELOG.md`:

```markdown
## [0.1.1] - 2025-11-02

### Added

- New feature description

### Changed

- Changes to existing functionality

### Fixed

- Bug fixes

### Removed

- Removed features
```

### 3. Commit Changes

```bash
git add package.json CHANGELOG.md
git commit -m "chore: bump version to 0.1.1"
git push origin main
```

### 4. Publish to npm

**Important**: npm publishing is done manually from your local machine.

```bash
# Ensure you're logged in
npm whoami

# Build and test first
npm run build
npm test

# Publish to npm
npm publish
```

The `prepublishOnly` script in package.json will automatically run `npm run build && npm test` before publishing.

**Note**: If you have 2FA enabled with passkey authentication, npm will prompt you to authenticate in your browser during publish.

### 5. Create and Push Tag

After successful npm publish, create the git tag to trigger the GitHub Release:

```bash
# Create annotated tag
git tag -a v0.1.1 -m "Release version 0.1.1"

# Push tag to trigger GitHub Release workflow
git push origin v0.1.1
```

**This will automatically trigger the release workflow** which will:

1. ✅ Create GitHub Release with changelog notes

### 6. Verify Release

After workflow completes:

```bash
# Check npm
npm view ascii-splash version
npm view ascii-splash

# Test installation
npm install -g ascii-splash@latest
splash --version
```

## Continuous Integration (CI)

The CI workflow runs automatically on:

- Every push to `main` or `develop` branches
- Every pull request to `main` or `develop`

CI checks:

- ✅ Tests on Node 20
- ✅ TypeScript compilation
- ✅ Build verification

## Troubleshooting

### npm Publish Fails

**Problem**: Authentication error

- **Solution**: Run `npm login` and verify with `npm whoami`

**Problem**: Version already exists

- **Solution**: Increment the version number and try again

**Problem**: 2FA prompt

- **Solution**: If using passkey auth, complete the browser authentication prompt

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

For testing releases before publishing to `latest` tag:

```bash
# Update to pre-release version
npm version 0.2.0-beta.1

# Publish with beta tag
npm publish --tag beta

# Create and push tag
git tag -a v0.2.0-beta.1 -m "Beta release 0.2.0-beta.1"
git push origin v0.2.0-beta.1
```

Users can then install with:

```bash
npm install ascii-splash@beta
```

## Release Checklist

Before creating a release:

- [ ] All tests pass locally: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Version updated in `package.json`
- [ ] `CHANGELOG.md` updated with changes
- [ ] Changes committed and pushed to `main`
- [ ] **npm publish completed**: `npm publish`
- [ ] Tag created with correct version: `git tag -a v0.1.1 -m "..."`
- [ ] Tag pushed: `git push origin v0.1.1`
- [ ] GitHub Release created (automatic from tag push)
- [ ] npm package visible: `npm view ascii-splash`

## Workflow Files

### `.github/workflows/ci.yml`

Runs on every push and PR to ensure code quality:

- TypeScript compilation checks
- Test execution
- Build verification

### `.github/workflows/release.yml`

Runs on tag push (`v*.*.*`) to create GitHub Release:

- Extracts changelog for the version
- Creates GitHub Release with notes

**Note**: npm publishing is NOT automated. Always publish manually with `npm publish`.

## Best Practices

1. **Always test locally before publishing**

   ```bash
   npm run build && npm test
   ```

2. **Use semantic versioning**
   - `MAJOR.MINOR.PATCH` (e.g., `1.2.3`)
   - MAJOR: Breaking changes
   - MINOR: New features (backward compatible)
   - PATCH: Bug fixes

3. **Write meaningful changelog entries**
   - Focus on user-facing changes
   - Group by: Added, Changed, Fixed, Removed
   - Include issue/PR references when relevant

4. **Create annotated tags**

   ```bash
   # Good: Annotated tag with message
   git tag -a v0.1.1 -m "Release 0.1.1: Fix text overlay display"

   # Avoid: Lightweight tag
   git tag v0.1.1
   ```

5. **Publish to npm BEFORE pushing tag**
   - This ensures the npm package exists before the GitHub Release is created
   - If npm publish fails, you haven't created a tag for a non-existent release

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

**Last Updated**: January 22, 2026
