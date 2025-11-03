# NPM Token Setup Guide

This guide explains how to set up the `NPM_TOKEN` secret for automated npm publishing via GitHub Actions.

## What is NPM_TOKEN?

The `NPM_TOKEN` is a secret authentication token that allows GitHub Actions to publish packages to npm on your behalf. This is required for the automated release workflow to publish new versions of ascii-splash to npm.

## Prerequisites

- An npm account (create one at [npmjs.com](https://www.npmjs.com) if you don't have one)
- Write/Admin access to the ascii-splash GitHub repository

## Setup Steps

### 1. Generate NPM Automation Token

1. **Log in to npm**
   - Go to [npmjs.com](https://www.npmjs.com)
   - Log in with your account

2. **Navigate to Access Tokens**
   - Click your profile icon (top right)
   - Select "Account Settings"
   - Click "Access Tokens" in the left sidebar

3. **Generate New Token**
   - Click "Generate New Token" button
   - Select token type: **"Automation"** (recommended)
     - Automation tokens can publish without 2FA
     - Classic tokens work but may require 2FA setup
   - Give it a descriptive name: `ascii-splash GitHub Actions`
   - Click "Generate Token"

4. **Copy the Token**
   - ⚠️ **IMPORTANT**: Copy the token immediately!
   - You won't be able to see it again after leaving the page
   - It looks like: `npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 2. Add Token to GitHub Secrets

1. **Open Repository Settings**
   - Go to: https://github.com/reowens/ascii-splash
   - Click "Settings" tab (top right)

2. **Navigate to Secrets**
   - In left sidebar: "Secrets and variables" → "Actions"

3. **Add New Secret**
   - Click "New repository secret" button
   - **Name**: `NPM_TOKEN` (must be exact)
   - **Secret**: Paste your npm token
   - Click "Add secret"

### 3. Verify Setup

You can verify the token is set correctly by:

1. **Check Secret Exists**
   - Go to: Repository Settings → Secrets → Actions
   - You should see `NPM_TOKEN` listed (value is hidden)

2. **Test the Release Workflow** (optional)
   - The next release will verify the token works
   - If there's an issue, the workflow will fail with authentication errors

## Token Permissions

The NPM automation token allows:
- ✅ Publishing new versions of packages you own
- ✅ Bypassing 2FA for automated publishing
- ❌ Cannot delete packages or change ownership

## Security Best Practices

1. **Never commit tokens** to the repository
2. **Use Automation tokens** for CI/CD (not Classic tokens)
3. **Rotate tokens periodically** (generate new, update secret, delete old)
4. **Limit token scope** to only what's needed
5. **Monitor npm activity** for unauthorized publishes

## Troubleshooting

### "401 Unauthorized" during npm publish

**Cause**: Token is invalid, expired, or not set correctly

**Solution**:
1. Generate a new token on npmjs.com
2. Update the `NPM_TOKEN` secret in GitHub
3. Re-run the workflow

### "403 Forbidden" during npm publish

**Cause**: Token doesn't have permission to publish this package

**Solution**:
1. Verify you're a maintainer of the package on npm
2. Check the package name in package.json matches the npm package
3. Ensure the token is for the correct npm account

### Token not found in workflow

**Cause**: Secret name doesn't match exactly

**Solution**:
1. Verify the secret is named `NPM_TOKEN` (case-sensitive)
2. Check the workflow file references `secrets.NPM_TOKEN`

## Related Documentation

- [Full Release Process](./RELEASE_PROCESS.md) - Complete release workflow
- [Quick Release Guide](./QUICK_RELEASE.md) - Quick reference for releases
- [GitHub Actions Docs](./GITHUB_ACTIONS.md) - CI/CD workflow details
- [npm Token Documentation](https://docs.npmjs.com/about-access-tokens) - Official npm docs

## Next Steps

After setting up the NPM_TOKEN:

1. ✅ Token is configured
2. ✅ Ready for automated releases
3. 📦 Next release will publish to npm automatically
4. 🔄 Remember to rotate token every 6-12 months

## Questions?

If you encounter issues:
1. Check the GitHub Actions logs for error messages
2. Review npm token permissions on npmjs.com
3. Verify secret name matches exactly: `NPM_TOKEN`
4. Try regenerating the token and updating the secret
