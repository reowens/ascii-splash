# Text Overlay Display Issues

**Status**: 🟡 Investigating  
**Severity**: Medium  
**Reported**: 2025-11-02  
**Assignee**: TBD

## Description

Text overlays (pattern name, messages, debug info, command mode) do not display correctly on some patterns.

## Reproduction Steps

1. Run `splash`
2. Switch patterns with number keys
3. Observe text overlays appearing incorrectly or not at all

## Affected Components

- Pattern name display (top-left, 2-second timeout)
- Status messages (speed, quality, theme changes)
- Debug overlay (press `d`)
- Command mode prompt (press `c`)
- Pattern mode prompt (press `p`)
- Help overlay (press `?`)

## Possible Causes

- [ ] Text rendering at wrong terminal coordinates (1-based vs 0-based)
- [ ] Buffer overwriting text cells immediately
- [ ] `term.eraseLine()` not working correctly
- [ ] Z-ordering issue (pattern rendering on top of text)
- [ ] Terminal color/style reset not working
- [ ] Cursor positioning with `term.moveTo()` incorrect

## Technical Details

### Terminal Coordinate System

- Terminal-kit uses **1-based** coordinates `(1,1)` for top-left
- Internal buffer uses **0-based** coordinates `(0,0)` for top-left
- Conversion happening at `src/main.ts:923-924` for mouse events

### Investigation Areas

| Function | Location | Purpose |
|----------|----------|---------|
| `showPatternName()` | `src/main.ts:408-418` | Pattern name display |
| `toggleHelp()` | `src/main.ts:421-457` | Help overlay toggle |
| `toggleDebug()` | `src/main.ts:459-468` | Debug overlay toggle |
| `renderDebugOverlay()` | `src/main.ts:470-536` | Debug info rendering |
| `renderCommandOverlay()` | `src/main.ts:538-561` | Command mode prompt |
| `renderPatternOverlay()` | `src/main.ts:563-580` | Pattern selection prompt |

## Next Steps

- [ ] Test text overlays in isolation (no pattern rendering)
- [ ] Verify terminal-kit coordinate system usage
- [ ] Check if double-buffering is clearing text areas
- [ ] Test across different terminal emulators
- [ ] Add bounds checking for text rendering

## Related Issues

- None

## Notes

*Add investigation notes here*

---

**Last Updated**: November 2, 2025
