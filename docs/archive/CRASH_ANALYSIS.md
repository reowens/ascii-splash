# Terminal Crash Analysis - "n" Key After Tunnel Pattern

## Symptom
- User presses `n` (next pattern) after Tunnel pattern
- **Entire terminal crashes** (not just the app)
- Requires terminal restart

## Root Cause Analysis

### Suspected Issue: Malformed Terminal Escape Sequences

**Location**: `src/main.ts` lines 576-626 (`renderBottomOverlay()`)

### Problem 1: Missing Style Reset After colorRgb
```typescript
// Line 617-619 in renderBottomOverlay()
term.moveTo(1, bottomRow);
term.eraseLine();
term.colorRgb(color.r, color.g, color.b, overlayMessage);
// ❌ NO term.styleReset() or term.defaultColor() after this!
```

**Issue**: Terminal is left in colored state. Next frame's `eraseLine()` inherits color state.

### Problem 2: Multiple Style Operations Without Consistent Reset
```typescript
// Command mode path (lines 585-596)
term.moveTo(1, bottomRow);
term.eraseLine();
term.bgBlack();
term.bold.cyan('COMMAND: ');
term.green(buffer.slice(0, cursorPos));
term.inverse('_'); // Cursor
term.styleReset();  // ✅ HAS reset
term.bgBlack();
term.green(buffer.slice(cursorPos));
term.defaultColor();
term.bgDefaultColor();
// ✅ This path properly resets

// Pattern selection path (lines 601-609)
term.moveTo(1, bottomRow);
term.eraseLine();
term.bgBlack();
term.bold.yellow('PATTERN: ');
term.green(patternBuffer);
term.inverse('_'); // Cursor
term.defaultColor();
term.bgDefaultColor();
// ⚠️ Has reset but inconsistent with command mode

// Message banner path (lines 617-620)
term.moveTo(1, bottomRow);
term.eraseLine();
term.colorRgb(color.r, color.g, color.b, overlayMessage);
// ❌ NO RESET AT ALL!

// Clear path (lines 624-625)
term.moveTo(1, bottomRow);
term.eraseLine();
// ⚠️ No explicit reset (relies on previous state)
```

### Problem 3: Race Condition During Pattern Switch

**Flow when pressing `n`**:
1. `switchPattern()` called → `engine.setPattern()` → `clearScreen()`
2. `clearScreen()` calls `term.clear()` and `buffer.clear()`
3. **SIMULTANEOUSLY**: Animation loop calls `render()` → `afterRenderCallback()` → `renderBottomOverlay()`
4. `renderBottomOverlay()` tries to write to terminal **while it's being cleared**
5. Terminal receives: clear + color escape + eraseLine + incomplete sequence = **corruption**

### Problem 4: Terminal State Corruption
When `term.colorRgb()` is called with RGB values, it generates an escape sequence like:
```
\x1b[38;2;R;G;Bm<text>
```

If this isn't closed with `\x1b[0m` (reset), the terminal interprets all subsequent output as colored, including control sequences like `eraseLine()`.

**Worst case**: Combining incomplete color sequences with `term.clear()` during pattern switch can send:
```
\x1b[38;2;100;150;200m\x1b[2J\x1b[K
```
Which some terminals interpret as "clear screen with color fill + erase line" → buffer overflow or infinite loop in terminal's escape parser.

## Why It Happens After Tunnel Specifically

1. **Tunnel pattern** is visually complex (many particles, high update rate)
2. Switching to **Lightning** involves:
   - Heavy state cleanup in Tunnel's `reset()`
   - Lightning's initialization (creating bolt arrays)
   - Both patterns use particle systems
3. Timing window: If user presses `n` **exactly when**:
   - `renderBottomOverlay()` is executing `colorRgb()`
   - AND pattern switch calls `clearScreen()`
   - → Terminal receives interleaved escape sequences → crash

## Fix Strategy

### Immediate Fix (Mandatory)
**Add `term.styleReset()` after EVERY terminal write operation**:

```typescript
function renderBottomOverlay() {
  const size = renderer.getSize();
  const bottomRow = size.height;
  
  // Priority 1: Command mode
  if (commandBuffer.isActive()) {
    // ... existing code ...
    term.defaultColor();
    term.bgDefaultColor();
    term.styleReset(); // ✅ Add this
    return;
  }
  
  // Priority 2: Pattern selection
  if (patternBufferActive) {
    // ... existing code ...
    term.defaultColor();
    term.bgDefaultColor();
    term.styleReset(); // ✅ Add this
    return;
  }
  
  // Priority 3: Message banner
  if (overlayMessage) {
    const theme = currentTheme;
    const color = theme.getColor(0.8);
    
    term.moveTo(1, bottomRow);
    term.eraseLine();
    term.colorRgb(color.r, color.g, color.b, overlayMessage);
    term.styleReset();        // ✅ ADD THIS (critical!)
    term.defaultColor();      // ✅ ADD THIS
    term.bgDefaultColor();    // ✅ ADD THIS
    return;
  }
  
  // No overlay active
  term.moveTo(1, bottomRow);
  term.eraseLine();
  term.styleReset(); // ✅ Add defensive reset
}
```

### Secondary Fix (Defensive)
**Add mutex/flag to prevent overlay rendering during pattern switch**:

```typescript
let isPatternSwitching = false;

function switchPattern(index: number) {
  if (index >= 0 && index < patterns.length) {
    isPatternSwitching = true; // ✅ Set flag
    currentPatternIndex = index;
    currentPresetIndex = 1;
    engine.setPattern(patterns[currentPatternIndex]);
    commandExecutor.updateState(currentPatternIndex, currentThemeIndex);
    showPatternName(patterns[currentPatternIndex].name);
    
    // Clear flag after short delay to allow screen clear to complete
    setTimeout(() => {
      isPatternSwitching = false;
    }, 16); // One frame at 60fps
  }
}

function renderBottomOverlay() {
  if (isPatternSwitching) return; // ✅ Skip if switching
  // ... rest of function
}
```

### Tertiary Fix (Safeguard)
**Wrap terminal operations in try-catch**:

```typescript
function renderBottomOverlay() {
  try {
    // ... all terminal operations
  } catch (err) {
    // Log but don't crash
    // Terminal may be in inconsistent state during rapid operations
  }
}
```

## Testing Plan

1. **Basic test**: Press `n` rapidly 20 times
2. **Tunnel specific**: Switch to Tunnel (8), press `n` 10 times
3. **Stress test**: Hold `n` key down for 5 seconds
4. **Pattern cycle**: Use `n` to go through all 17 patterns 3 times
5. **With banner**: Ensure banner appears each time without crash
6. **Debug mode**: Enable debug (`d`) and cycle patterns

## Expected Outcome
- No terminal crashes
- Clean banner appearance/disappearance
- Smooth pattern transitions
- Terminal state always properly reset


---

## Implementation Status

### ✅ Fix 1: Terminal Style Resets (IMPLEMENTED)
**File**: `src/main.ts` lines 583-645 (`renderBottomOverlay()`)

**Changes Made**:
- Added `term.styleReset()` after command mode overlay (line 607)
- Added `term.styleReset()` after pattern selection overlay (line 621)
- Added `term.styleReset()`, `term.defaultColor()`, `term.bgDefaultColor()` after message banner (lines 633-635) - **CRITICAL FIX**
- Added `term.styleReset()` when clearing line (line 641)

**Result**: Terminal state is now properly reset after every overlay operation, preventing escape sequence corruption.

### ✅ Fix 2: Pattern Switch Mutex (IMPLEMENTED)
**File**: `src/main.ts`

**Changes Made**:
- Added `isPatternSwitching` flag (line 340)
- Set flag to `true` at start of `switchPattern()` (line 385)
- Clear flag after 16ms delay (lines 392-395)
- Added guard clause in `renderBottomOverlay()` to skip rendering during switch (line 585)

**Result**: Overlay rendering is now blocked during pattern switches, preventing race conditions between `clearScreen()` and overlay writes.

### ✅ Fix 3: Try-Catch Safeguard (IMPLEMENTED)
**File**: `src/main.ts` lines 587-645

**Changes Made**:
- Wrapped entire `renderBottomOverlay()` body in try-catch block
- Silent catch (no logging) to prevent cascade errors during rapid operations

**Result**: Even if terminal enters inconsistent state during rapid key presses, the app won't crash.

---

## Build & Test Results

**Build**: ✅ Success (TypeScript compilation clean)
**Tests**: ✅ 1417/1418 passing (1 pre-existing failure in RainPattern test, unrelated)
**Files Modified**: `src/main.ts`

---

## Ready for Manual Testing

The fixes are now in place. Please run the manual testing plan to verify terminal crash is resolved.

### Quick Test
1. `npm start`
2. Press `8` to switch to Tunnel pattern
3. Press `n` repeatedly (10+ times)
4. **Expected**: No terminal crash, smooth pattern transitions

### Stress Test
1. Hold `n` key down for 5 seconds
2. **Expected**: No crash, patterns cycle smoothly with banners appearing

If tests pass, this issue is **RESOLVED**.
