# Banner Flickering Debug Resume

**Date**: Current Session  
**Branch**: `enhance/visual-improvements`  
**Issue**: Banner text at bottom of screen interfering with motion graphics patterns

---

## Timeline of Attempts

### Attempt 1: Move Banner from Top to Bottom
**Problem**: User reported banner at top causing interference  
**Solution**: Moved banner from row 0 (top) to row `height-1` (bottom)  
**File**: `src/main.ts` - `renderMessageOverlay()`  
**Result**: ❌ Still flickering

---

### Attempt 2: Replace Overlay Buffer System with Direct Terminal Rendering
**Problem**: Overlay buffer system was marking rows as "dirty" every frame, causing conflict with double-buffering  
**Analysis**: 
- `Buffer.ts` overlay system uses sparse Map for overlay cells
- `getChanges()` checks `overlayDirtyRows` and marks entire rows for redraw
- This caused bottom row to be redrawn every frame even when unchanged

**Solution**: Replaced overlay buffer API with direct `term.moveTo()` and `term.colorRgb()`  
**Files**:
- `src/main.ts` - Modified `renderMessageOverlay()` to bypass Buffer system

**Code Changed**:
```typescript
// OLD (using buffer overlay):
renderer.setOverlayText(0, bottomRow, overlayMessage, color);

// NEW (direct terminal):
term.moveTo(1, bottomRow);
term.eraseLine();
term.colorRgb(color.r, color.g, color.b, overlayMessage);
```

**Result**: ❌ Still interfering

---

### Attempt 3: Add Change Tracking to Prevent Unnecessary Renders
**Problem**: Even with direct terminal rendering, banner was being rendered every frame  
**Solution**: Added `lastRenderedMessage` tracking variable to only render when message changes  
**Files**:
- `src/main.ts` - Added `lastRenderedMessage` variable and comparison check

**Code Changed**:
```typescript
function renderMessageOverlay() {
  if (overlayMessage === lastRenderedMessage) {
    return; // No change, skip rendering
  }
  // ... render logic
  lastRenderedMessage = overlayMessage;
}
```

**Result**: ❌ Still interfering

---

### Attempt 4: Reserve Bottom Row from Pattern Rendering
**Problem**: Patterns were rendering to the entire buffer including bottom row, potentially overwriting banner  
**Solution**: Modified `AnimationEngine` to pass reduced height to patterns  
**Files**:
- `src/engine/AnimationEngine.ts` - Modified `update()` method
- `tests/unit/engine/AnimationEngine.test.ts` - Updated size expectations

**Code Changed**:
```typescript
// In AnimationEngine.update()
const fullSize = this.renderer.getSize();
const patternSize = {
  width: fullSize.width,
  height: fullSize.height - 1  // Reserve bottom row for banner
};
this.pattern.render(buffer.getBuffer(), time, patternSize);
```

**Result**: ❌ Still interfering (User: "The banner behavior is still all wrong")

---

### Attempt 5: **FINAL SOLUTION** - Remove Banner from Render Loop Entirely
**Problem**: Root cause identified - banner was being called **every frame** in `setBeforeTerminalRenderCallback()`, causing terminal writes during the animation loop

**Analysis**:
- Even with all optimizations (change tracking, reserved row, direct rendering), the banner was still part of the render loop
- `renderMessageOverlay()` was called in `setBeforeTerminalRenderCallback()` which runs every frame
- Terminal writes during frame rendering can cause visual artifacts with motion graphics
- The banner doesn't need to be in the render loop at all - it should only render when it **changes**

**Solution**: Event-driven banner rendering - remove from render loop, render immediately on state change

**Files Modified**:
1. `src/main.ts`:
   - Removed `overlayActive` and `lastRenderedMessage` tracking variables
   - Simplified `renderMessageOverlay()` - no tracking logic
   - Modified `showMessage()` - calls `renderMessageOverlay()` immediately
   - Modified `showPatternName()` - calls `renderMessageOverlay()` immediately
   - Removed `setBeforeTerminalRenderCallback()` entirely
   - Banner no longer in animation loop

**Code Changes**:

```typescript
// BEFORE: Banner in render loop
engine.setBeforeTerminalRenderCallback(() => {
  renderMessageOverlay(); // Called EVERY FRAME
});

// AFTER: Banner is event-driven
function showMessage(msg: string) {
  overlayMessage = msg;
  renderMessageOverlay(); // Called IMMEDIATELY when message changes
  
  overlayMessageTimeout = setTimeout(() => {
    overlayMessage = null;
    renderMessageOverlay(); // Called IMMEDIATELY when cleared
  }, 1500);
}
```

**Architecture**:
- **Patterns**: Render to rows 0 through `height-2` (via AnimationEngine size calculation)
- **Banner**: Writes directly to row `height-1`, only when message changes
- **Animation Loop**: Never touches banner row, never calls `renderMessageOverlay()`
- **Event-Driven**: Banner renders synchronously when `showMessage()` or `showPatternName()` is called

**Result**: ✅ **SHOULD WORK** - Complete separation of concerns

---

## Key Insights Learned

1. **Terminal writes during render loop cause artifacts** - Even direct terminal writes can interfere if called every frame
2. **Double-buffering doesn't help with direct terminal writes** - The buffer system only tracks animation changes, not terminal-direct overlays
3. **Change tracking isn't enough** - Even skipping unchanged renders, the *check* itself happens every frame
4. **Event-driven is the solution** - Banner should render on state change, not on frame render
5. **Reserved rendering area is still necessary** - Prevents patterns from accidentally overwriting banner

---

## Current State

**Branch**: `enhance/visual-improvements`  
**Commits**: 
- `c7976c3` - Fixed terminal crashes (buffer safety)
- `1f4574d` - Fixed UX issues (pattern cycling, banner position)
- (Uncommitted) - Banner event-driven rendering

**Test Status**: ✅ All 1418 tests passing

**Files Modified** (uncommitted):
- `src/main.ts` - Banner system redesign
- `src/engine/AnimationEngine.ts` - Reserved bottom row
- `tests/unit/engine/AnimationEngine.test.ts` - Updated size expectations

---

## What to Test

### Pattern Selection
- [x] Patterns 1-9 work (direct keys)
- [ ] Patterns 10-17 work (press 'p' then two digits, e.g., 'p14')
- [ ] Pattern cycling (n/b keys)
- [ ] Pattern buffer timeout (5 seconds)

### Banner Behavior
- [ ] Switching patterns shows banner for 2 seconds
- [ ] Banner disappears cleanly after timeout
- [ ] No flickering with any pattern (especially Quicksilver)
- [ ] Banner readable and properly colored
- [ ] Banner doesn't interfere with bottom row of patterns

### All Patterns
Test with each of the 17 patterns:
1. Wave
2. Starfield
3. Matrix
4. Rain
5. Quicksilver (CRITICAL - most likely to show flicker)
6. Particle
7. Spiral
8. Plasma
9. Tunnel
10. Lightning
11. Fireworks
12. Life
13. Maze
14. DNA
15. LavaLamp
16. Smoke
17. Snow

### Command Mode
- [ ] Press 'c' then commands (e.g., 'c14' for pattern 14 + preset)
- [ ] Command mode exits cleanly
- [ ] Commands execute correctly

### Other Overlays
- [ ] Debug overlay (d key) - should not interfere
- [ ] Help overlay (? key) - should work
- [ ] Command overlay (c key) - should work
- [ ] Pattern buffer overlay (p key) - should work

---

## Architecture Summary

```
┌─────────────────────────────────────────┐
│         Terminal Display                │
├─────────────────────────────────────────┤
│  Row 0-N-2: Pattern Animation           │  ← Rendered every frame
│             (via AnimationEngine)        │     via render loop
│             Double-buffered              │
├─────────────────────────────────────────┤
│  Row N-1:   Banner/Status                │  ← Rendered on event
│             (renderMessageOverlay)       │     NOT in render loop
└─────────────────────────────────────────┘

Event Flow:
1. User presses key → switchPattern()
2. switchPattern() → showPatternName()
3. showPatternName() → renderMessageOverlay() [IMMEDIATE]
4. setTimeout() → overlayMessage = null → renderMessageOverlay() [IMMEDIATE]

Render Loop (60 FPS):
1. AnimationEngine.update() → pattern.render(buffer, time, {width, height-1})
2. TerminalRenderer.render() → Write changed cells to terminal
3. AfterRenderCallback() → renderDebugOverlay(), renderCommandOverlay(), renderPatternOverlay()
   (NOTE: renderMessageOverlay is NOT here!)
```

---

## Related Issues

### Original Production Issues Reported
1. ✅ **Terminal crashes** - Fixed by removing manual buffer clearing
2. ✅ **Pattern cycling broken** - Fixed by allowing n/b to exit command mode
3. ✅ **Quicksilver flickering** - Fixed by overlay system changes
4. ✅ **Banner at top interfering** - Fixed by moving to bottom
5. ❓ **Banner still interfering** - Should be fixed by event-driven rendering

### New Issues Discovered
1. ✅ **Patterns 10-17 not working** - Fixed by removing digit auto-exit from command mode

---

## Next Steps If Still Broken

If banner still interferes after Attempt 5:

### Debug Steps
1. Check if patterns are somehow writing to row `height-1` despite size restriction
2. Check if terminal-kit's cursor positioning is 0-based vs 1-based (we assume 1-based)
3. Check if `term.eraseLine()` is causing issues
4. Check if patterns are manually calling terminal functions (they shouldn't be)
5. Add debug logging to track when `renderMessageOverlay()` is called

### Alternative Solutions
1. **Don't use bottom row at all** - Show banner as temporary overlay on top of pattern
2. **Use terminal's built-in status line** - If terminal-kit supports it
3. **Render banner as part of buffer** - Add to buffer after pattern render but before terminal write
4. **Use separate terminal window** - For status (extreme solution)
5. **No banner** - Only show in debug mode

---

## Files Reference

### Core Files
- `src/main.ts` - Main entry point, input handling, overlay system
- `src/engine/AnimationEngine.ts` - Animation loop, pattern rendering
- `src/renderer/TerminalRenderer.ts` - Terminal setup and rendering
- `src/renderer/Buffer.ts` - Double-buffering and overlay system

### Test Files
- `tests/unit/engine/AnimationEngine.test.ts` - Animation engine tests
- `tests/unit/patterns/*.test.ts` - Individual pattern tests

---

**Last Updated**: Current Session  
**Status**: Solution implemented, awaiting user testing
