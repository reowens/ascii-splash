# Testing Instructions - Terminal Crash Fix

## What Was Fixed
The terminal crash that occurred when pressing `n` after the Tunnel pattern has been fixed with a three-layer protection system:
1. ✅ Proper terminal style resets
2. ✅ Pattern switch mutex to prevent race conditions
3. ✅ Try-catch safeguard for edge cases

## Quick Start Testing
```bash
cd /Users/reoiv/Development/projects/splash
npm start
```

## Test Scenarios

### Test 1: Basic Pattern Cycling (2 minutes)
**Purpose**: Verify no crashes during normal pattern switching

1. Press `1` (Wave), wait 2 seconds
2. Press `2` (Matrix), wait 2 seconds
3. Press `3` (Rain), wait 2 seconds
4. Continue through patterns `4-9` using number keys
5. Press `n` to continue through remaining patterns

**Expected**: 
- ✅ Each pattern name appears in banner for 2 seconds
- ✅ Banner at bottom of screen
- ✅ No flickering
- ✅ No crashes

**Pass/Fail**: _____

---

### Test 2: Tunnel → Lightning Crash Test (1 minute)
**Purpose**: Test the specific crash scenario reported

1. Press `8` to switch to Tunnel pattern
2. Wait 3 seconds for pattern to stabilize
3. Press `n` key 10 times rapidly
4. Pattern should cycle: Tunnel → Lightning → Fireworks → Maze → Life...

**Expected**:
- ✅ No terminal crash
- ✅ Smooth pattern transitions
- ✅ Banner appears each time

**Pass/Fail**: _____

---

### Test 3: Rapid Pattern Switching (30 seconds)
**Purpose**: Stress test pattern switching

1. Press `n` key rapidly 20 times (fast as you can)
2. Patterns should cycle through quickly

**Expected**:
- ✅ No crashes
- ✅ All patterns render correctly
- ✅ Banners may appear briefly or be skipped (OK)
- ✅ No visual corruption

**Pass/Fail**: _____

---

### Test 4: Hold Key Test (30 seconds)
**Purpose**: Test extreme rapid switching

1. **Hold down** the `n` key for 5 seconds
2. Patterns should cycle very rapidly
3. Release and let pattern stabilize

**Expected**:
- ✅ No terminal crash
- ✅ Terminal remains responsive
- ✅ Pattern displays correctly after release

**Pass/Fail**: _____

---

### Test 5: Full Cycle Test (3 minutes)
**Purpose**: Test all 17 patterns

1. Start at pattern 1 (Wave)
2. Press `n` to cycle through ALL patterns 3 times
3. Count: 17 patterns × 3 cycles = 51 pattern switches

**Expected**:
- ✅ No crashes at any point
- ✅ Consistent banner behavior
- ✅ All patterns display correctly

**Pass/Fail**: _____

---

### Test 6: Banner Visibility Test (2 minutes)
**Purpose**: Verify banner doesn't flicker or interfere with patterns

1. Press `5` (Quicksilver - busiest pattern)
2. Watch for 30 seconds
3. Press `n` to show banner, watch banner disappear
4. Repeat 5 times

**Expected**:
- ✅ Banner appears at BOTTOM for 2 seconds
- ✅ No flickering during banner display
- ✅ Pattern continues smoothly behind banner
- ✅ No extra blank lines

**Pass/Fail**: _____

---

### Test 7: Overlay Priority Test (1 minute)
**Purpose**: Verify overlays don't conflict

1. Press `1` to show Wave pattern (banner appears)
2. While banner is showing, press `c` (command mode)
3. Command prompt should replace banner immediately
4. Press ESC to exit command mode
5. Press `p` (pattern selection)
6. Pattern prompt should appear
7. Press ESC

**Expected**:
- ✅ Command prompt replaces banner instantly
- ✅ Pattern prompt replaces banner instantly
- ✅ No flicker or overlap between overlays

**Pass/Fail**: _____

---

### Test 8: Debug Mode Test (1 minute)
**Purpose**: Verify debug overlay doesn't interfere

1. Press `d` to enable debug mode
2. Press `n` to cycle through 5 patterns
3. Press `d` to disable debug mode

**Expected**:
- ✅ Debug info appears at top
- ✅ Banner still appears at bottom
- ✅ No crashes or visual corruption

**Pass/Fail**: _____

---

## Summary

**Total Tests**: 8  
**Tests Passed**: _____  
**Tests Failed**: _____

### If All Tests Pass ✅
The terminal crash fix is successful! The issue is **RESOLVED**.

### If Any Test Fails ❌
Please note which test(s) failed and describe the behavior:

**Failed Test(s)**:

**What Happened**:

**Terminal Emulator**: (e.g., iTerm2, Terminal.app, etc.)

---

## Technical Notes

**What Changed**:
- Added `term.styleReset()` calls after all terminal style operations
- Added mutex flag to prevent overlay rendering during pattern switches
- Wrapped overlay function in try-catch for safety

**Files Modified**:
- `src/main.ts` (lines 340, 383-395, 583-645)

**Performance Impact**: None (style resets are trivial operations)

---

**Next Steps After Testing**:
1. Report results (Pass/Fail for each test)
2. If passed → Ready to commit fix
3. If failed → Investigate specific failure scenario

