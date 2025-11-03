# Pattern 7 (Spiral) & Pattern 9 (Tunnel) - No Visible Output

**Status**: ✅ FIXED  
**Severity**: Critical  
**Reported**: 2025-11-02  
**Resolved**: 2025-11-02  
**Commits**: 3fd6d8d, TBD

## Symptom

Patterns 7 (Spiral) and 9 (Tunnel) appeared completely blank when running the app, despite working correctly in isolation.

## Root Cause Analysis

### Root Cause #1 - Pattern Density

**Issue**: Patterns were rendering too few cells to be visible:
- Spiral: Only 25-30 cells (1.3-1.5% fill rate)
- Tunnel: Only 182 cells (9.5% fill rate)

**Fix** (commit 3fd6d8d):
- **Spiral**: Increased density (30→100), points per arm (×3), arms (5→8)
  - Result: 174 cells (9.06% fill rate)
- **Tunnel**: Doubled rings (20→40), tighter spacing (1.0→0.5), larger radius (0.6→0.8)
  - Result: 397 cells (20.68% fill rate)

### Root Cause #2 - Buffer State Bug (CRITICAL)

**Issue**: The real issue was in `AnimationEngine.setPattern()`. When switching patterns:

1. Current buffer was cleared to spaces
2. Previous buffer retained OLD pattern data
3. On next frame, `getChanges()` compared NEW pattern vs OLD pattern
4. For sparse patterns, most cells were spaces in both → few changes detected
5. Result: Most cells never rendered to terminal

**Fix** (commit TBD):

Added `buffer.swap()` call to sync previous buffer with cleared state:

```typescript
// src/engine/AnimationEngine.ts:90-98
setPattern(pattern: Pattern): void {
  this.pattern.reset();
  this.pattern = pattern;
  const buffer = this.renderer.getBuffer();
  buffer.clear();
  buffer.swap(); // ← CRITICAL: Sync previous buffer with cleared state
}
```

## Impact

This bug affected **ALL patterns** on first render after switching, but was only visible on sparse patterns (Spiral, Tunnel). Dense patterns had enough overlap with previous patterns to mask the issue.

## Verification

- ✅ Patterns render correctly in isolation (diagnostic.mjs)
- ✅ After fix, both current AND previous buffers are cleared
- ✅ getChanges() now compares against clean slate
- ✅ All patterns now render correctly when switching

## Lessons Learned

1. **Double-buffering requires careful state management** - Both buffers must be synchronized when clearing
2. **Sparse patterns reveal edge cases** - Low fill-rate patterns are excellent test cases
3. **Isolation testing is insufficient** - Must test pattern switching to catch buffer state bugs

## Related Files

- `src/engine/AnimationEngine.ts` - Pattern switching logic
- `src/renderer/Buffer.ts` - Buffer management and swap operation
- `src/patterns/SpiralPattern.ts` - Sparse pattern example
- `src/patterns/TunnelPattern.ts` - Sparse pattern example

---

**Last Updated**: November 2, 2025
