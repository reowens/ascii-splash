# Quick Release Guide

## Create a New Release

```bash
# 1. Update version
npm version patch  # or: minor, major

# 2. Update CHANGELOG.md
# Add section: ## [X.Y.Z] - YYYY-MM-DD

# 3. Commit and push
git add package.json CHANGELOG.md
git commit -m "chore: bump version to X.Y.Z"
git push origin main

# 4. Create and push tag
git tag -a vX.Y.Z -m "Release version X.Y.Z"
git push origin vX.Y.Z

# Done! GitHub Actions will automatically:
# - Run tests
# - Publish to npm
# - Create GitHub Release
```

## Prerequisites (One-Time)

1. **Add NPM_TOKEN to GitHub Secrets**
   - Generate token: https://www.npmjs.com/settings/tokens
   - Add to: Repository Settings → Secrets → Actions
   - Name: `NPM_TOKEN`

2. **Verify GitHub Actions enabled**
   - Repository Settings → Actions → General
   - Allow all actions

## Verify Release

```bash
npm view ascii-splash version
npm install -g ascii-splash@latest
splash --version
```

## Troubleshooting

- **Version mismatch**: Tag `v1.2.3` must match `package.json` version `1.2.3`
- **Auth error**: Check NPM_TOKEN is correct in GitHub Secrets
- **Tests fail**: Run `npm test` locally first

See [RELEASE_PROCESS.md](RELEASE_PROCESS.md) for detailed documentation.
