# Release Process

This document describes how to create and publish a new release of ascii-splash.

## Prerequisites

### One-Time Setup

1. **npm Account & Authentication**
   - Create an account at [npmjs.com](https://www.npmjs.com)
   - Generate an automation token: Account Settings → Access Tokens → Generate New Token → Automation
   - Add the token to GitHub repository secrets:
     - Go to: Repository Settings → Secrets and variables → Actions
     - Create new secret: `NPM_TOKEN` = your npm automation token

2. **GitHub Permissions**
   - Ensure you have write access to the repository
   - The `GITHUB_TOKEN` is automatically provided by GitHub Actions

3. **Codecov (Optional)**
   - Sign up at [codecov.io](https://codecov.io) with your GitHub account
   - Add repository to Codecov
   - Copy the upload token
   - Add to GitHub secrets: `CODECOV_TOKEN` = your codecov token

## Release Workflow

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

### 4. Create and Push Tag

```bash
# Create annotated tag
git tag -a v0.1.1 -m "Release version 0.1.1"

# Push tag to trigger release workflow
git push origin v0.1.1
```

**This will automatically trigger the release workflow** which will:
1. ✅ Run all tests on Node 20.x
2. ✅ Build TypeScript
3. ✅ Verify package version matches tag
4. ✅ Publish to npm
5. ✅ Create GitHub Release with changelog notes

### 5. Monitor Release

1. Go to: Repository → Actions
2. Click on the "Release & Publish" workflow run
3. Monitor the jobs:
   - **Run Tests**: Ensures all tests pass
   - **Publish to npm**: Publishes package to npm registry
   - **Create GitHub Release**: Creates release on GitHub

### 6. Verify Release

After workflow completes:

```bash
# Check npm (may take a few minutes to appear)
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
- ✅ Tests on Node 16, 18, 20, 22
- ✅ TypeScript compilation
- ✅ Build verification
- ✅ Package validation
- ✅ Coverage upload (Node 20 only)

## Troubleshooting

### Release Workflow Fails

**Problem**: "Version mismatch" error
- **Solution**: Ensure `package.json` version matches the git tag (without the `v` prefix)
  - Tag: `v0.1.1` → package.json: `"version": "0.1.1"`

**Problem**: npm publish fails with authentication error
- **Solution**: Verify `NPM_TOKEN` secret is set correctly in GitHub repository settings

**Problem**: Tests fail in release workflow
- **Solution**: Run tests locally first: `npm test`
- Fix any failing tests before creating the tag

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

# Create and push tag
git tag -a v0.2.0-beta.1 -m "Beta release 0.2.0-beta.1"
git push origin v0.2.0-beta.1
```

**Manual npm publish with beta tag:**
```bash
npm publish --tag beta
```

Users can then install with:
```bash
npm install ascii-splash@beta
```

## Release Checklist

Before creating a release tag:

- [ ] All tests pass locally: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Version updated in `package.json`
- [ ] `CHANGELOG.md` updated with changes
- [ ] Changes committed and pushed to `main`
- [ ] Tag created with correct version: `git tag -a v0.1.1 -m "..."`
- [ ] Tag pushed: `git push origin v0.1.1`
- [ ] CI workflow passes (check Actions tab)
- [ ] Release workflow completes successfully
- [ ] npm package visible: `npm view ascii-splash`
- [ ] GitHub Release created with notes

## Workflow Files

### `.github/workflows/ci.yml`
Runs on every push and PR to ensure code quality:
- Multi-version Node.js testing (16, 18, 20, 22)
- TypeScript compilation checks
- Test execution
- Coverage reporting
- Package validation

### `.github/workflows/release.yml`
Runs on tag push (`v*.*.*`) to publish release:
- Tests on Node 20
- Version verification
- npm publish
- GitHub Release creation

### `.github/workflows/dependency-review.yml`
Runs on PRs to main branch:
- Reviews dependency changes
- Checks for known vulnerabilities
- Comments summary on PR

## Best Practices

1. **Always test locally before tagging**
   ```bash
   npm run build && npm test && npm run prepublishOnly
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

5. **Test the published package**
   ```bash
   # In a temporary directory
   npm install -g ascii-splash@latest
   splash
   ```

## Support

If you encounter issues with the release process:
1. Check the Actions tab for detailed logs
2. Review this document for troubleshooting steps
3. Open an issue in the repository

---

**Last Updated**: November 2, 2025
