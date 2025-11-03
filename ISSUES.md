# Known Issues

> **Note**: This file tracks known issues during development. For public bug reports, please use [GitHub Issues](https://github.com/reowens/ascii-splash/issues).

## Active Issues

### 🟡 Text Overlay Display Issues
**Status**: Investigating  
**Severity**: Medium  
**Reported**: 2025-11-02

**Description**:
Text overlays (pattern name, messages, debug info, command mode) do not display correctly on some patterns.

**Reproduction**:
1. Run `splash`
2. Switch patterns with number keys
3. Observe text overlays appearing incorrectly or not at all

**Affected Components**:
- Pattern name display (top-left, 2-second timeout)
- Status messages (speed, quality, theme changes)
- Debug overlay (press `d`)
- Command mode prompt (press `c`)
- Pattern mode prompt (press `p`)
- Help overlay (press `?`)

**Possible Causes**:
- [ ] Text rendering at wrong terminal coordinates (1-based vs 0-based)
- [ ] Buffer overwriting text cells immediately
- [ ] `term.eraseLine()` not working correctly
- [ ] Z-ordering issue (pattern rendering on top of text)
- [ ] Terminal color/style reset not working
- [ ] Cursor positioning with `term.moveTo()` incorrect

**Terminal Specifics**:
- Terminal-kit uses **1-based** coordinates `(1,1)` for top-left
- Internal buffer uses **0-based** coordinates `(0,0)` for top-left
- Conversion happening at `src/main.ts:923-924` for mouse events

**Investigation Areas**:
- `src/main.ts:408-418` - `showPatternName()` function
- `src/main.ts:421-457` - `toggleHelp()` function
- `src/main.ts:459-468` - `toggleDebug()` function
- `src/main.ts:470-536` - `renderDebugOverlay()` function
- `src/main.ts:538-561` - `renderCommandOverlay()` function
- `src/main.ts:563-580` - `renderPatternOverlay()` function

**Next Steps**:
- Test text overlays in isolation (no pattern rendering)
- Verify terminal-kit coordinate system usage
- Check if double-buffering is clearing text areas
- Test across different terminal emulators
- Add bounds checking for text rendering

---

## Resolved Issues

### ✅ Pattern 7 (Spiral) - No visible output
**Status**: FIXED (commit 3fd6d8d)
**Severity**: High  
**Reported**: 2025-11-02  
**Resolved**: 2025-11-02

**Root Cause**:
Pattern was rendering far too few cells to be visible - only 25-30 cells out of 1920 total (1.3-1.5% fill rate). With such sparse rendering spread across the entire terminal, the pattern was effectively invisible.

**Solution**:
- Increased default density from 30 to 100 (3.3x more)
- Increased point count per arm from `density * 10` to `density * 30`
- Increased arm count from 5 to 8
- Adjusted expansion rate for tighter, more visible spirals
- Updated all 6 presets with higher density values (3-4x increases)

**After Fix**:
- Default: 174 cells (9.06% fill rate) - CLEARLY VISIBLE
- Presets: 64-159 cells (3.3-8.3% fill rate)

---

### ✅ Pattern 9 (Tunnel) - No visible output
**Status**: FIXED (commit 3fd6d8d)
**Severity**: High  
**Reported**: 2025-11-02  
**Resolved**: 2025-11-02

**Root Cause**:
Pattern had too few rings with too much spacing - only 20 rings with 1.0 spacing rendered ~182 cells (9.5%), which was marginally visible but very sparse and hard to perceive as a tunnel.

**Solution**:
- Doubled ring count from 20 to 40
- Halved ring spacing from 1.0 to 0.5 (denser packing)
- Increased ring radius from 0.6 to 0.8 (larger, more visible rings)
- Updated all 6 presets with higher ring counts and tighter spacing

**After Fix**:
- Default: 397 cells (20.68% fill rate) - VERY VISIBLE
- Presets: 200-495 cells (10-25% fill rate)

---

## Testing Checklist

### Pattern Testing
- [x] Pattern 1 - Waves
- [x] Pattern 2 - Starfield
- [x] Pattern 3 - Matrix
- [x] Pattern 4 - Rain
- [x] Pattern 5 - Quicksilver
- [x] Pattern 6 - Particles
- [x] **Pattern 7 - Spiral** ✅ FIXED
- [x] Pattern 8 - Plasma
- [x] **Pattern 9 - Tunnel** ✅ FIXED
- [x] Pattern 10 - Lightning
- [x] Pattern 11 - Fireworks
- [x] Pattern 12 - Life
- [x] Pattern 13 - Maze
- [x] Pattern 14 - DNA
- [x] Pattern 15 - Lava Lamp
- [x] Pattern 16 - Smoke
- [x] Pattern 17 - Snow

### Text Overlay Testing
- [ ] Pattern name display (2s timeout)
- [ ] Debug overlay (`d` key)
- [ ] Help overlay (`?` key)
- [ ] Command mode (`c` key)
- [ ] Pattern mode (`p` key)
- [ ] Status messages (speed, quality, theme)
- [ ] Command results (success/error messages)

### Environment Testing
- [ ] macOS - iTerm2
- [ ] macOS - Terminal.app
- [ ] macOS - Warp
- [ ] Linux - GNOME Terminal
- [ ] Linux - Konsole
- [ ] Windows - Windows Terminal
- [ ] npx installation
- [ ] Global npm installation
- [ ] Local development build

---

## Performance Metrics

**Target Performance**:
- LOW mode: 15 FPS, <3% CPU
- MEDIUM mode: 30 FPS, <5% CPU
- HIGH mode: 60 FPS, <6% CPU
- Memory: ~40-50MB RSS

**Known Performance Issues**:
- None currently

---

## Issue Reporting

For public bug reports, please use our [GitHub Issues](https://github.com/reowens/ascii-splash/issues) page with the bug report template.

**Bug Report Template**: `.github/ISSUE_TEMPLATE/bug_report.md`  
**Feature Request Template**: `.github/ISSUE_TEMPLATE/feature_request.md`
