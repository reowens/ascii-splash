# GitHub Actions Workflows

This document provides an overview of the automated CI/CD workflows for ascii-splash.

## Workflow Files

### 1. **CI Workflow** (`.github/workflows/ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Jobs:**

#### `test` (Matrix Build)
- **Purpose**: Run tests across multiple Node.js versions
- **Matrix**: Node.js 20.x, 22.x
- **Steps**:
  1. Checkout code
  2. Setup Node.js with cache
  3. Install dependencies (`npm ci`)
  4. Build TypeScript (`npm run build`)
  5. Run tests (`npm test`)
  6. Upload coverage to Codecov (Node 20 only)

#### `build-check`
- **Purpose**: Verify TypeScript compilation and build artifacts
- **Node Version**: 20.x
- **Steps**:
  1. Checkout code
  2. Setup Node.js with cache
  3. Install dependencies
  4. TypeScript type-check (`tsc --noEmit`)
  5. Build project
  6. Verify dist directory and main.js exist

#### `validate-package`
- **Purpose**: Ensure package is ready for publishing
- **Node Version**: 20.x
- **Steps**:
  1. Checkout code
  2. Setup Node.js with cache
  3. Install dependencies
  4. Build project
  5. Validate package contents (`npm pack --dry-run`)
  6. Test prepublishOnly script

**Duration**: ~2-4 minutes

---

### 2. **Release Workflow** (`.github/workflows/release.yml`)

**Triggers:**
- Push of tags matching `v*.*.*` (e.g., `v0.1.1`, `v1.2.3`)

**Permissions:**
- `contents: write` - Create GitHub releases

**Jobs:**

#### `test`
- **Purpose**: Run full test suite before publishing
- **Node Version**: 20.x
- **Steps**:
  1. Checkout code
  2. Setup Node.js with cache
  3. Install dependencies
  4. Build TypeScript
  5. Run tests
  6. Generate coverage report

#### `publish-npm` (depends on: test)
- **Purpose**: Publish package to npm registry
- **Node Version**: 20.x
- **Required Secret**: `NPM_TOKEN`
- **Steps**:
  1. Checkout code
  2. Setup Node.js with npm registry
  3. Install dependencies
  4. Build project
  5. Verify version matches tag
  6. Publish to npm

**Version Verification:**
```bash
TAG: v0.1.1 → Must match package.json: "0.1.1"
```

#### `create-github-release` (depends on: test, publish-npm)
- **Purpose**: Create GitHub release with changelog
- **Required Secret**: `GITHUB_TOKEN` (auto-provided)
- **Steps**:
  1. Checkout code with full history
  2. Extract version from tag
  3. Extract changelog section for version
  4. Create GitHub Release

**Duration**: ~3-5 minutes

---

### 3. **Dependency Review** (`.github/workflows/dependency-review.yml`)

**Triggers:**
- Pull requests to `main` branch

**Permissions:**
- `contents: read`
- `pull-requests: write`

**Jobs:**

#### `dependency-review`
- **Purpose**: Review dependency changes for security issues
- **Steps**:
  1. Checkout code
  2. Run dependency review action
  3. Comment summary on PR

**Settings:**
- Fail on: `moderate` or higher severity
- Auto-comment: Always

**Duration**: ~30 seconds

---

## Required Secrets

Add these to: **Repository Settings → Secrets and variables → Actions**

| Secret | Required For | How to Get |
|--------|-------------|------------|
| `NPM_TOKEN` | Release workflow | [npmjs.com](https://www.npmjs.com/settings/tokens) → Generate New Token → Automation |
| `CODECOV_TOKEN` | CI workflow (optional) | [codecov.io](https://codecov.io) → Repository Settings → Copy token |
| `GITHUB_TOKEN` | Release workflow | Auto-provided by GitHub Actions |

---

## Workflow Triggers Summary

| Event | Workflow | Jobs | Duration |
|-------|----------|------|----------|
| Push to `main`/`develop` | CI | 3 | ~2-4 min |
| PR to `main`/`develop` | CI + Dependency Review | 4 | ~2-4 min |
| Tag push `v*.*.*` | Release | 3 | ~3-5 min |

---

## Testing Workflows Locally

### Test Build
```bash
npm run lint      # TypeScript type-check
npm run build     # Build project
npm test          # Run tests
npm run test:coverage  # Generate coverage
```

### Test Package
```bash
npm pack --dry-run     # Validate package contents
npm run prepublishOnly # Run pre-publish checks
```

### Simulate Release
```bash
# 1. Update version
npm version patch

# 2. Create tag (don't push yet)
git tag -a v0.1.1 -m "Test release"

# 3. Test locally
npm run prepublishOnly

# 4. Push when ready
git push origin main
git push origin v0.1.1
```

---

## Monitoring Workflows

1. Go to: **Repository → Actions**
2. Select workflow run
3. View job logs
4. Check for errors

### CI Status Badge

Add to README.md:
```markdown
![CI](https://github.com/reowens/ascii-splash/workflows/CI/badge.svg)
```

### Common Issues

**Problem**: Workflow doesn't trigger
- **Solution**: Check `.github/workflows/` directory exists
- Verify workflow files have `.yml` extension
- Ensure Actions are enabled in repository settings

**Problem**: npm publish fails
- **Solution**: Check `NPM_TOKEN` is valid
- Verify you have publish permissions for package
- Check package name isn't already taken

**Problem**: Tests fail in CI but pass locally
- **Solution**: Check Node.js version matches
- Ensure `npm ci` is used (not `npm install`)
- Verify all dependencies in package.json

---

## Workflow Optimization

### Cache Strategy
All workflows use npm cache via `actions/setup-node@v4`:
```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'npm'
```

This caches `node_modules` between runs for faster installs.

### Matrix Strategy
CI runs on multiple Node.js versions to ensure compatibility:
- **16.x**: Minimum supported version
- **18.x**: LTS version
- **20.x**: Current LTS (primary)
- **22.x**: Latest stable

### Job Dependencies
Release workflow uses job dependencies for safety:
```
test → publish-npm → create-github-release
```

This ensures:
1. Tests pass before publishing
2. Package publishes before release
3. GitHub release only if npm publish succeeds

---

## Maintenance

### Updating Actions Versions

Periodically update action versions:
```yaml
# Check for updates
actions/checkout@v4 → v5
actions/setup-node@v4 → v5
```

### Adding New Checks

To add a new CI check:
1. Add job to `ci.yml`
2. Test locally first
3. Commit and push
4. Verify in Actions tab

---

**Last Updated**: November 2, 2025
