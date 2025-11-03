# Text Overlay Testing Checklist

**Last Updated**: November 2, 2025

## Overview

This checklist tracks manual testing of all text overlay features to ensure they display correctly across all patterns.

## Test Criteria

For each overlay type, verify:
- Overlay renders at correct screen position
- Text is readable and not corrupted by pattern
- Overlay disappears after timeout (if applicable)
- Overlay clears completely when dismissed
- No visual artifacts remain after overlay closes

## Overlay Status

| Component | Status | Priority | Notes |
|-----------|--------|----------|-------|
| Pattern name display (2s timeout) | ⚠️ TODO | High | Top-left display, 2-second auto-hide |
| Debug overlay (`d` key) | ⚠️ TODO | High | FPS, frame timing, pattern metrics |
| Help overlay (`?` key) | ⚠️ TODO | High | Full-screen keyboard shortcuts |
| Command mode (`c` key) | ⚠️ TODO | High | Command buffer input prompt |
| Pattern mode (`p` key) | ⚠️ TODO | High | Pattern selection prompt |
| Status messages | ⚠️ TODO | Medium | Speed, quality, theme changes |
| Command results | ⚠️ TODO | Medium | Success/error messages |

## Test Plan

### 1. Pattern Name Display
- [ ] Test on all 17 patterns
- [ ] Verify 2-second timeout
- [ ] Check positioning (top-left)
- [ ] Verify no corruption from pattern rendering

### 2. Debug Overlay
- [ ] Toggle on/off with `d` key
- [ ] Verify FPS counter updates
- [ ] Check frame timing display
- [ ] Verify pattern metrics (if available)
- [ ] Test on multiple patterns

### 3. Help Overlay
- [ ] Toggle on/off with `?` key
- [ ] Verify all shortcuts are listed
- [ ] Check overlay covers entire screen
- [ ] Test ESC to close

### 4. Command Mode
- [ ] Open with `c` key
- [ ] Type command and verify display
- [ ] Test 10-second timeout
- [ ] Verify ESC cancels
- [ ] Test with multiple command types

### 5. Pattern Mode
- [ ] Open with `p` key
- [ ] Type pattern number/name
- [ ] Test 5-second timeout
- [ ] Verify ESC cancels
- [ ] Test partial name matching

### 6. Status Messages
- [ ] Speed change messages (`+`/`-`)
- [ ] Quality mode changes (`[`/`]`)
- [ ] Theme change messages (`t`)
- [ ] Verify message timeout

### 7. Command Results
- [ ] Success messages (preset applied, saved, etc.)
- [ ] Error messages (invalid command, etc.)
- [ ] Verify message positioning
- [ ] Check message timeout

## Known Issues

- See: [Text Overlay Display Issues](../active/text-overlay-display.md)

## Summary

- **Total Overlays**: 7
- **Tested**: 0 (0%)
- **Passing**: 0
- **Failing**: 0
- **Status**: ⚠️ Not yet tested

## Test Environment

- **OS**: TBD
- **Terminal**: TBD
- **Node Version**: 16+
- **Build**: TBD

---

**Status**: ⚠️ TODO - Testing required before v0.2.0
