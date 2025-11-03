# Environment Testing Checklist

**Last Updated**: November 2, 2025

## Overview

This checklist tracks testing across different operating systems, terminals, and installation methods.

## Test Criteria

For each environment, verify:
- ✅ Installation completes without errors
- ✅ Application launches successfully
- ✅ Patterns render correctly (all 17)
- ✅ Mouse support works (if available)
- ✅ Keyboard controls respond
- ✅ Colors display correctly
- ✅ No crashes or hangs during 5-minute run
- ✅ Clean exit with `q` or Ctrl+C

## Testing Status

### macOS

| Terminal | Status | Version | Tester | Notes |
|----------|--------|---------|--------|-------|
| iTerm2 | ⚠️ TODO | - | - | Primary development terminal |
| Terminal.app | ⚠️ TODO | - | - | Default macOS terminal |
| Warp | ⚠️ TODO | - | - | Modern terminal with AI features |

### Linux

| Terminal | Status | Version | Tester | Notes |
|----------|--------|---------|--------|-------|
| GNOME Terminal | ⚠️ TODO | - | - | Default Ubuntu/Fedora terminal |
| Konsole | ⚠️ TODO | - | - | Default KDE terminal |
| Alacritty | ⚠️ TODO | - | - | GPU-accelerated terminal |

### Windows

| Terminal | Status | Version | Tester | Notes |
|----------|--------|---------|--------|-------|
| Windows Terminal | ⚠️ TODO | - | - | Modern Windows terminal |
| PowerShell | ⚠️ TODO | - | - | Default Windows shell |
| Git Bash | ⚠️ TODO | - | - | MinGW-based terminal |

### Installation Methods

| Method | Status | Version Tested | Notes |
|--------|--------|----------------|-------|
| npx (run without install) | ⚠️ TODO | - | `npx ascii-splash` |
| Global npm install | ⚠️ TODO | - | `npm install -g ascii-splash` |
| Local development build | ✅ PASS | v0.1.0 | `npm run build` + `npm start` |

## Known Issues

### Terminal Compatibility

- **Mouse support**: Not all terminals support mouse events
- **RGB colors**: Some terminals only support 256-color or 16-color mode
- **Small terminals**: Width < 20 columns may have rendering issues
- **TTY requirement**: Will not work in pipes/redirects (by design)

## Summary

- **Total Environments**: 9
- **Tested**: 1 (11%) - Local development only
- **Passing**: 1
- **Failing**: 0
- **Status**: ⚠️ Limited testing - expanded testing needed

## Priority Testing

**High Priority** (before next release):
1. iTerm2 (macOS) - Primary development terminal
2. Windows Terminal - Large Windows user base
3. npx installation - Common usage pattern
4. Global npm installation - Primary install method

**Medium Priority**:
1. Terminal.app (macOS) - Default macOS terminal
2. GNOME Terminal (Linux) - Default Ubuntu terminal
3. Alacritty - Popular among developers

**Low Priority**:
1. Warp - Niche terminal
2. Konsole - KDE-specific
3. Git Bash - Windows edge case

## Test Procedure

1. **Installation Test**
   ```bash
   # For npx
   npx ascii-splash --version
   npx ascii-splash --help
   npx ascii-splash
   
   # For global install
   npm install -g ascii-splash
   splash --version
   splash
   ```

2. **Pattern Test**
   - Launch application
   - Cycle through all 17 patterns (keys 1-9, then n)
   - Verify each pattern renders correctly

3. **Interaction Test**
   - Test mouse movement (if supported)
   - Test mouse clicks (if supported)
   - Test keyboard shortcuts (space, t, +/-, [/])
   - Test command mode (c)
   - Test pattern mode (p)

4. **Stability Test**
   - Run for 5 minutes
   - Monitor CPU/memory usage
   - Verify no crashes or hangs
   - Test clean exit (q, ESC, Ctrl+C)

5. **Color Test**
   - Cycle through all 5 themes (t key)
   - Verify colors display correctly
   - Check for color banding or artifacts

---

**Status**: ⚠️ TODO - Comprehensive environment testing required
