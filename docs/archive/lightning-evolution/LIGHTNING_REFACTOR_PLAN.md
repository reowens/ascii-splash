# Lightning Pattern Refactor Plan

## Executive Summary

**Problem**: Pattern 10 (Lightning) crashes terminals due to **excessive buffer writes** (up to 13.5 million writes/second vs. target of <300K).

**Root Cause**: Combination of:
1. Recursive branching creating 200+ segments per bolt
2. Thickness multiplier (25x writes for thickness=3)
3. bresenhamLine generating 30-150 points per segment
4. Up to 8 simultaneous bolts

**Solution**: Complete architectural refactor from recursive segments to sparse point-based rendering.

---

## Current vs. Target Performance

| Metric | Current (Worst Case) | Target | Reduction |
|--------|---------------------|--------|-----------|
| Writes/frame | 225,000 | 1,500 | 99.3% |
| Writes/second (60 FPS) | 13.5M | 90K | 99.3% |
| Segments/bolt | 200 | N/A | Eliminate |
| Buffer size | 225KB/frame | 1.5KB/frame | 99.3% |

---

## Architecture Change: Segment-Based → Point-Based

### Current Architecture (BROKEN)
```
Bolt → Segments[] → bresenhamLine(segment) → Points[] → Thickness Loop → Buffer Writes
  ↓
Recursive branches create exponential growth
Each segment = 30-150 points × 1-25 writes = 30-3750 writes
5 bolts × 200 segments = 1000 segments = 30K-3.75M writes
```

### New Architecture (PROPOSED)
```
Bolt → Sparse Points[] → Direct Buffer Write (single pass)
  ↓
Fixed point budget per bolt (~30-50 points)
Each bolt = 30-50 points × 1 write = 30-50 writes
5 bolts × 50 points = 250 writes ← 150,000X reduction
```

---

## Detailed Refactor Strategy

### Phase 1: Simplify Data Model

**REMOVE**:
- `Segment` interface (lines 22-28)
- `generateBolt()` recursive function (lines 116-185)
- `drawLine()` with bresenhamLine (lines 198-238)
- `getLineChar()` angle-based character selection (lines 240-255)

**ADD**:
```typescript
interface LightningPoint {
  x: number;
  y: number;
  intensity: number;  // 0-1 for fade
}

interface LightningBolt {
  points: LightningPoint[];  // Fixed size array (30-50 points)
  age: number;
  maxAge: number;
  mainPath: Point[];         // Pre-calculated main bolt path
}
```

### Phase 2: Replace Bolt Generation Algorithm

**New Algorithm**: Direct path generation without recursion

```typescript
private createBolt(start: Point, end: Point): LightningBolt {
  const mainPath: Point[] = [];
  const points: LightningPoint[] = [];
  
  // 1. Generate main path with jaggedness (10-20 points)
  const numPoints = 15;
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const x = start.x + (end.x - start.x) * t;
    const y = start.y + (end.y - start.y) * t;
    
    // Add jaggedness perpendicular to path
    const perpX = -(end.y - start.y);
    const perpY = (end.x - start.x);
    const length = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
    const offset = (Math.random() - 0.5) * 10;
    
    mainPath.push({
      x: x + (perpX / length) * offset,
      y: y + (perpY / length) * offset
    });
  }
  
  // 2. Add main path points (15 points)
  for (const p of mainPath) {
    points.push({ x: p.x, y: p.y, intensity: 1.0 });
  }
  
  // 3. Add sparse branch points (10-20 points total)
  const numBranches = Math.floor(this.config.branchProbability * 30);
  for (let i = 0; i < numBranches; i++) {
    const parentIdx = Math.floor(Math.random() * mainPath.length);
    const parent = mainPath[parentIdx];
    
    // Branch out 5-15 pixels
    const angle = Math.random() * Math.PI * 2;
    const distance = 5 + Math.random() * 10;
    
    points.push({
      x: parent.x + Math.cos(angle) * distance,
      y: parent.y + Math.sin(angle) * distance,
      intensity: 0.7
    });
  }
  
  // 4. Cap at 50 points maximum
  if (points.length > 50) {
    points.length = 50;
  }
  
  return {
    points,
    mainPath,
    age: 0,
    maxAge: this.config.fadeTime
  };
}
```

**Result**: Each bolt = exactly 30-50 points (vs. 200-3000 buffer writes)

### Phase 3: Simplify Rendering

**Remove Complex drawLine()**:
```typescript
// OLD (lines 198-238): 40 lines, nested loops, bresenhamLine
private drawLine(buffer, x1, y1, x2, y2, char, intensity, size) {
  const points = bresenhamLine(x1, y1, x2, y2);  // 30-150 points
  for (const point of points) {
    for (let tx = -thickness; tx < thickness; tx++) {  // 5x5 = 25 writes
      for (let ty = -thickness; ty < thickness; ty++) {
        buffer[ny][nx] = { char, color };
      }
    }
  }
}
```

**NEW**: Direct point rendering
```typescript
// NEW: 8 lines, single write per point
private renderBolt(buffer: Cell[][], bolt: LightningBolt, size: Size): void {
  const flashIntensity = bolt.age < 3 ? 1.0 : 
                         1.0 - (bolt.age - 3) / (bolt.maxAge - 3);
  
  for (const point of bolt.points) {
    const x = Math.floor(point.x);
    const y = Math.floor(point.y);
    
    if (x >= 0 && x < size.width && y >= 0 && y < size.height) {
      const intensity = point.intensity * flashIntensity;
      const char = intensity > 0.7 ? '*' : intensity > 0.4 ? '+' : '.';
      buffer[y][x] = {
        char,
        color: this.theme.getColor(intensity)
      };
    }
  }
}
```

**Result**: 1 write per point, no nested loops

### Phase 4: Fix Mouse Click Explosion

**OLD (lines 371-393)**: Spawns 3-4 bolts instantly
```typescript
onMouseClick(pos: Point): void {
  const numBolts = 3 + Math.floor(Math.random() * 2);  // 3-4 bolts
  for (let i = 0; i < numBolts; i++) {
    this.bolts.push(this.createBolt(...));  // 200+ segments each
  }
}
```

**NEW**: Single bolt with spread
```typescript
onMouseClick(pos: Point): void {
  // Create ONE bolt from top to click position
  const startX = pos.x + (Math.random() - 0.5) * 20;
  this.bolts.push(this.createBolt(
    { x: startX, y: 0 },
    { x: pos.x, y: pos.y }
  ));
  
  // Limit total bolts
  if (this.bolts.length > 3) {  // Reduce from 8 to 3
    this.bolts.shift();
  }
  
  this.lastStrike = this.currentTime;
}
```

**Result**: 1 bolt per click (50 points) instead of 3-4 bolts (600-800 segments)

### Phase 5: Reduce Active Bolt Limit

**Current**: Up to 8 bolts (line 388)
**New**: Maximum 3 bolts

```typescript
// In render() method, line 275-278
if (this.bolts.length > 3) {  // Change from 5 to 3
  this.bolts.shift();
}
```

---

## Character Simplification

**OLD**: Angle-based characters (lines 240-255)
- Requires Math.atan2() and angle calculations
- 4 different characters based on direction

**NEW**: Intensity-based characters
- `*` for high intensity (core)
- `+` for medium intensity (branches)
- `.` for low intensity (fade)
- No angle calculations needed

---

## Configuration Adjustments

### Update Config Validation (lines 98-106)

**REMOVE** (no longer used):
- `boltDensity` (used for subdivisions)
- `maxBranches` (no recursion)
- `thickness` (no thickness loop)

**KEEP**:
- `branchProbability` → controls number of branch points (0-30)
- `fadeTime` → controls bolt lifetime
- `strikeInterval` → controls auto-strike frequency
- `branchAngle` → can be repurposed for branch spread

**ADD**:
```typescript
interface LightningConfig {
  branchProbability: number;  // 0-1, now controls branch point count
  fadeTime: number;
  strikeInterval: number;
  branchSpread: number;       // How far branches extend (5-15 pixels)
  mainPathJaggedness: number; // Perpendicular offset (5-15 pixels)
}
```

### Update Presets (lines 45-82)

Simplify all 6 presets to use new config:

```typescript
{
  id: 1,
  name: 'Cloud Strike',
  description: 'Natural cloud-to-ground lightning',
  config: { 
    branchProbability: 0.25,  // Few branches
    fadeTime: 25,
    strikeInterval: 2000,
    branchSpread: 8,
    mainPathJaggedness: 10
  }
},
{
  id: 2,
  name: 'Tesla Coil',
  description: 'Erratic, highly branched arcs',
  config: {
    branchProbability: 0.6,   // Many branches
    fadeTime: 20,
    strikeInterval: 800,
    branchSpread: 12,
    mainPathJaggedness: 15
  }
}
// ... etc
```

---

## Render Budget Enforcement

### Keep Frame Budget (line 283)

```typescript
// In render() method
const maxSegmentsPerFrame = 300;  // Keep but won't be reached
let totalPointsRendered = 0;
const maxPointsPerFrame = 200;    // NEW: Hard cap on points

for (const bolt of this.bolts) {
  if (totalPointsRendered >= maxPointsPerFrame) {
    break;
  }
  
  // Render bolt points
  for (const point of bolt.points) {
    if (totalPointsRendered >= maxPointsPerFrame) {
      break;
    }
    // ... render point
    totalPointsRendered++;
  }
}
```

---

## Expected Performance After Refactor

### Buffer Writes Per Frame

| Scenario | Bolts | Points/Bolt | Total Writes | Current |
|----------|-------|-------------|--------------|---------|
| Idle | 0 | 0 | 0 | 0 |
| Single strike | 1 | 50 | 50 | 3,000-75,000 |
| 3 simultaneous | 3 | 50 | 150 | 9,000-225,000 |
| Mouse click | 1 | 50 | 50 | 400-1,600 |

**At 60 FPS**:
- Typical: 3,000 writes/sec (vs. 180K-4.5M current)
- Peak: 9,000 writes/sec (vs. 540K-13.5M current)

**Reduction**: 99.5% fewer buffer writes

---

## Implementation Checklist

### Files to Modify

1. **`src/patterns/LightningPattern.ts`** (primary refactor)
   - [ ] Remove `Segment` interface
   - [ ] Add `LightningPoint` interface
   - [ ] Update `LightningBolt` interface
   - [ ] Replace `generateBolt()` with new algorithm
   - [ ] Remove `drawLine()` method
   - [ ] Remove `getLineChar()` method
   - [ ] Add `renderBolt()` method
   - [ ] Update `render()` to use new rendering
   - [ ] Update `onMouseClick()` to spawn 1 bolt
   - [ ] Simplify `LightningConfig` interface
   - [ ] Update all 6 presets
   - [ ] Update config validation in constructor

2. **`tests/unit/patterns/lightning.test.ts`** (if exists)
   - [ ] Update tests for new architecture
   - [ ] Remove segment-based tests
   - [ ] Add point-based tests
   - [ ] Test 50-point budget enforcement

3. **Documentation**
   - [ ] Update pattern description if in docs
   - [ ] Note breaking config changes

### Testing Plan

1. **Build & Basic Functionality**
   ```bash
   npm run build
   npm start
   # Press 'n' to cycle to Lightning (pattern 10)
   ```

2. **Test All Presets**
   - Press `.` and `,` to cycle through all 6 presets
   - Each should render without crashes
   - Visual check: jagged bolts with sparse branches

3. **Stress Testing**
   - Click mouse rapidly 10 times
   - Should NOT crash (creates 10 bolts queued)
   - Terminal should remain responsive

4. **Long-Running Stability**
   - Leave running for 5 minutes
   - Monitor CPU usage (should be <5%)
   - Check for memory leaks (Activity Monitor)

5. **Performance Verification**
   - Press `d` to toggle debug overlay
   - FPS should be solid 60
   - Dropped frames should be <1%

---

## Risk Assessment

### Low Risk
- ✅ Point-based rendering is simpler than segment-based
- ✅ Similar approach works in Starfield, Particles patterns
- ✅ Atomic writes in renderer already implemented
- ✅ Can't make it worse than current (already crashing)

### Medium Risk
- ⚠️ Visual quality may differ (less detailed lightning)
  - **Mitigation**: Adjust jaggedness and branch count in presets
- ⚠️ Users with custom configs will break
  - **Mitigation**: Add config migration or clear error message

### Rollback Plan
If refactor fails, can temporarily:
1. Disable Pattern 10 entirely (remove from pattern array)
2. Keep old file as `LightningPattern.backup.ts`
3. Ship without Lightning pattern, fix later

---

## Alternative Approaches Considered

### 1. Keep Segments, Add More Limits ❌
**Problem**: Still too many nested loops (thickness × bresenhamLine)
**Why rejected**: Reduces but doesn't eliminate root cause

### 2. Pre-render Lightning to Bitmap ❌
**Problem**: Loses dynamic/interactive behavior
**Why rejected**: Against pattern philosophy

### 3. Reduce Recursion Depth Only ❌
**Problem**: Thickness loop still creates 25x multiplier
**Why rejected**: Half-measure, won't fix crashes

### 4. Point-Based Rendering ✅ **SELECTED**
**Advantages**:
- Eliminates nested loops completely
- Fixed, predictable performance
- Still looks like lightning
- Simplifies codebase

---

## Success Criteria

### Must Have (P0)
- ✅ Pattern 10 does NOT crash terminal
- ✅ Renders recognizable lightning bolts
- ✅ All 6 presets work
- ✅ Mouse click spawns lightning
- ✅ Builds without errors

### Should Have (P1)
- ✅ <5% CPU usage at 60 FPS
- ✅ <200 buffer writes per frame
- ✅ Smooth fade animation
- ✅ Branches visible and distinct

### Nice to Have (P2)
- Visual quality matches old implementation
- Presets have distinct personalities
- Performance metrics show improvement in debug mode

---

## Implementation Time Estimate

- **Phase 1** (Data model): 30 minutes
- **Phase 2** (Bolt generation): 1 hour
- **Phase 3** (Rendering): 30 minutes
- **Phase 4** (Mouse click): 15 minutes
- **Phase 5** (Bolt limits): 15 minutes
- **Testing**: 30 minutes
- **Total**: ~3 hours

---

## Next Steps

1. **Get approval** on this refactor plan
2. **Exit plan mode** to begin implementation
3. **Create backup** of current LightningPattern.ts
4. **Implement** Phase 1-5 in order
5. **Test** after each phase
6. **Commit** when all tests pass

---

## Questions for Review

1. Is 50 points per bolt acceptable? (vs. current 200 segments × 30-150 points)
2. Should we keep any segment-based logic for fallback?
3. OK to break custom user configs using old fields?
4. Should Lightning pattern be marked "experimental" after refactor?

---

**END OF REFACTOR PLAN**
