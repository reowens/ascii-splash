# Fireworks Pattern Enhancement Plan

**Created**: November 3, 2025  
**Updated**: November 3, 2025  
**Status**: Phase 1 Complete ✅ | Phase 2 Complete ✅

---

## Overview

The Fireworks pattern is identified as the top candidate for visual enhancement, similar to the successful Lightning pattern enhancement. This document outlines a two-phase enhancement plan to add multi-stage explosions and advanced effects.

### Current State

**Strengths**:
- Launch phase with upward rocket
- Burst particles in radial pattern
- Rainbow hue effect (per particle)
- Particle trails (configurable length 3-12 points)
- Gravity and air resistance physics
- Mouse crosshair and click explosions

**Limitations**:
- Single-stage explosions only (burst once, fade out)
- All particles behave identically
- No secondary effects (sparkles, crackles)
- No shape-based bursts

### Enhancement Goals

**Visual Impact**: Transform from simple burst → multi-stage spectacular explosions  
**Performance Target**: <1000 writes/frame (similar to Lightning's safety margin)  
**Inspiration**: Real fireworks with secondary bursts, sparkles, and shaped explosions

---

## Enhancement Phases

### Phase 1: Multi-Stage Explosions ✅ COMPLETE

**Objective**: Add recursive particle explosions similar to Lightning's branching  
**Status**: Implemented and tested with particle cap enforcement

#### Changes Required

**1. Interface Updates**
```typescript
interface FireworkConfig {
  // ... existing fields ...
  maxBurstDepth: number;     // 1-3 (like Lightning's maxBranchDepth)
  secondaryBurstSize: number; // 8-20 particles per secondary burst
  sparkleChance: number;      // 0-0.3 (probability of spawning sparkles)
}

interface Particle {
  // ... existing fields ...
  depth: number;              // 0=primary, 1=secondary, 2=tertiary
  canExplode: boolean;        // Some particles spawn sub-bursts
  burstTimer: number;         // Time until secondary explosion (if canExplode)
}
```

**2. Algorithm Changes**

**Primary Burst** (depth 0):
- Existing burst logic
- Mark 10-30% of particles as `canExplode: true`
- Set `burstTimer` randomly (200-500ms)
- Set `depth: 0`

**Secondary Burst** (depth 1):
- When `burstTimer` expires, spawn smaller radial burst from that particle
- Use scaled parameters:
  - Size: `secondaryBurstSize` (8-20 particles, vs 25-100 primary)
  - Speed: 0.6x of primary burst
  - Life: 0.7x of primary burst
  - Trail: 0.5x length
  - Intensity: -0.2 dimmer
- Mark 5-15% of secondary particles as `canExplode: true`
- Set `depth: 1`

**Tertiary Burst** (depth 2):
- Same logic, further scaled:
  - Size: 4-8 particles
  - Speed: 0.4x of primary
  - Life: 0.5x of primary
  - Trail: 2-3 points
  - Intensity: -0.4 dimmer
  - No further explosions (depth limit)
- Set `depth: 2`

**3. Performance Safety**

**Particle Limit Strategy**:
- Primary burst: 25-100 particles (current)
- Total particle cap: 500 (similar to Lightning's point cap)
- If total exceeds 500, stop creating secondary bursts
- Depth cap: 3 levels max (0/1/2)

**Expected Performance**:
```
Preset 1 (Sparklers):
  - Primary: 40 particles
  - Secondary (30%): ~12 particles × 10 = 120
  - Tertiary (10%): ~12 particles × 4 = 48
  - Total: ~208 particles
  - With trails (8 points): ~208 × 8 = 1664 writes MAX
  - Actual: Much lower (fading, off-screen, culling)
  
Preset 2 (Grand Finale):
  - Primary: 100 particles
  - Secondary (30%): ~30 × 12 = 360
  - Hit 500 cap, stop
  - With trails (6 points): ~500 × 6 = 3000 writes MAX
  - Actual: ~800-1200 writes (fading, off-screen)
```

**Safety Mechanisms**:
1. Hard cap at 500 total particles per firework
2. Skip secondary bursts if over limit
3. Early depth termination (max 3 levels)
4. Aggressive particle cleanup (remove off-screen immediately)

**4. Rendering Changes**

**Character Selection by Depth**:
```typescript
// Depth 0 (primary):
if (p.life > 0.7) char = ['●', '◉', '★', '✦'][...]
else if (p.life > 0.4) char = ['○', '◎', '*', '✧'][...]
else char = ['·', '∙', '.'][...]

// Depth 1 (secondary):
if (p.life > 0.7) char = ['○', '◎', '*'][...]
else if (p.life > 0.4) char = ['∙', '·'][...]
else char = ['.'][...]

// Depth 2 (tertiary):
char = ['·', '∙', '.'][...]
```

**5. Preset Configuration**

Update all 6 presets with `maxBurstDepth` and `secondaryBurstSize`:

| Preset | maxBurstDepth | secondaryBurstSize | sparkleChance |
|--------|---------------|-------------------|---------------|
| Sparklers | 2 | 10 | 0.2 |
| Grand Finale | 3 | 20 | 0.3 |
| Fountain | 2 | 12 | 0.15 |
| Roman Candle | 1 | 8 | 0.1 |
| Chrysanthemum | 3 | 15 | 0.25 |
| Strobe | 1 | 6 | 0.05 |

---

#### Phase 1 Results

**Implementation**:
- ✅ Multi-stage recursive explosions (depth 0-3)
- ✅ Secondary burst timers (200-500ms delay)
- ✅ Depth-based scaling (speed, life, trails, intensity)
- ✅ Character differentiation by depth
- ✅ Particle cap enforcement (400 buffer → <500 total)
- ✅ Enhanced metrics with depth tracking

**Performance** (all presets under 500 particles):
- Sparklers: 300 particles, 187 writes/frame (81% margin)
- Grand Finale: 488 particles, 370 writes/frame (63% margin)
- Fountain: 447 particles, 290 writes/frame (71% margin)
- Roman Candle: 71 particles, 117 writes/frame (88% margin)
- Chrysanthemum: 473 particles, 371 writes/frame (63% margin)
- Strobe: 54 particles, 50 writes/frame (95% margin)

**Visual Impact**: Multi-stage explosions create cascading bursts with depth differentiation ✨

---

### Phase 2: Sparkles & Shape Bursts ✅ COMPLETE

**Objective**: Add sparkle particles and shape-based explosion patterns  
**Status**: Implemented and tested successfully

#### Changes Required

**1. Sparkle Particles**

**New Particle Type**:
```typescript
interface Particle {
  // ... existing fields ...
  type: 'normal' | 'sparkle';  // Different behavior
}
```

**Sparkle Behavior**:
- Spawn from primary/secondary particles randomly (based on `sparkleChance`)
- Very fast, short-lived (100-200ms life)
- High initial velocity (2-3x faster than parent)
- Random direction (not radial)
- Bright white/yellow color (override rainbow hue)
- Characters: `✧`, `✦`, `*`, `·` (bright set)
- No trails
- No secondary explosions

**Spawning Logic**:
```typescript
// In particle update loop
if (Math.random() < config.sparkleChance && p.life > 0.5) {
  // Spawn 1-3 sparkles
  for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) {
    particles.push(createSparkle(p));
  }
}
```

**2. Shape-Based Bursts**

**New Config Field**:
```typescript
interface FireworkConfig {
  // ... existing fields ...
  burstShape: 'circle' | 'ring' | 'heart' | 'star' | 'random';
}
```

**Shape Algorithms**:

**Circle** (default):
- Current radial burst (evenly distributed angles)

**Ring**:
- Hollow circle (skip center angles)
- Particles concentrated at edge
- 0.7-1.0 radius only (no center)

**Heart**:
- Parametric heart equation
- Two lobes at top, point at bottom
- ~40-60 particles in heart shape

**Star**:
- 5-pointed star shape
- Concentrated at points
- 8-10 particles per point

**Random**:
- Each firework randomly picks a shape

**3. Preset Updates**

Add `burstShape` to presets:

| Preset | burstShape | Description |
|--------|-----------|-------------|
| Sparklers | circle | Traditional radial |
| Grand Finale | random | Every burst different |
| Fountain | ring | Hollow cascading |
| Roman Candle | circle | Tight clusters |
| Chrysanthemum | star | Star-shaped burst |
| Strobe | circle | Rapid circles |

---

#### Phase 2 Results

**Implementation**:
- ✅ Sparkle particles (type: 'normal' | 'sparkle')
- ✅ Fast, bright sparkles (3-7 units/frame, 0.15-0.3s life)
- ✅ White/yellow color override for sparkles
- ✅ 5 burst shapes (circle, ring, heart, star, random)
- ✅ Shape-based explosion geometry
- ✅ Particle cap enforcement (450 sparkle cap)
- ✅ Enhanced metrics (normal vs sparkle counts)

**Performance** (all presets under 500 particles, <1000 writes/frame):
- Sparklers (circle, 20% sparkles): 463 particles, 235 writes/frame (76% margin)
- Grand Finale (random, 30% sparkles): 488 particles, 411 writes/frame (59% margin)
- Fountain (ring, 15% sparkles): 464 particles, 335 writes/frame (67% margin)
- Roman Candle (circle, 10% sparkles): 150 particles, 139 writes/frame (86% margin)
- Chrysanthemum (star, 25% sparkles): 477 particles, 398 writes/frame (60% margin)
- Strobe (circle, 5% sparkles): 65 particles, 61 writes/frame (94% margin)

**Visual Impact**: Sparkles add bright white flashes, shaped bursts create distinct patterns (hearts, stars, rings) ✨

---

## Implementation Steps

### Phase 1: Multi-Stage Explosions

1. ✅ **Backup current FireworksPattern.ts**
   ```bash
   cp src/patterns/FireworksPattern.ts src/patterns/FireworksPattern.ts.backup
   ```

2. ✅ **Update interfaces** (add depth, maxBurstDepth, etc.)

3. ✅ **Implement secondary burst logic**
   - Add `burstTimer` tracking
   - Create `createSecondaryBurst()` method
   - Update particle physics to check `burstTimer`

4. ✅ **Add performance safety**
   - 500 particle cap
   - Depth limit checks
   - Early termination logic

5. ✅ **Update presets** with new parameters

6. ✅ **Test visually**
   - Create `test-fireworks-phase1.mjs`
   - Cycle through all presets
   - Verify depth distribution
   - Check performance

### Phase 2: Sparkles & Shapes

7. ✅ **Implement sparkle particles**
   - Add `type` field
   - Create `createSparkle()` method
   - Update rendering for sparkles

8. ✅ **Implement shape algorithms**
   - Add `getShapedBurstAngles()` method
   - Implement heart, star, ring shapes
   - Update `explode()` to use shapes

9. ✅ **Update presets** with shapes

10. ✅ **Final testing**
    - Visual verification
    - Performance profiling
    - All tests passing

---

## Expected Results

### Visual Impact

**Before**:
```
         ○
      ○  ○  ○
    ○    ●    ○     (Single burst, fades)
      ○  ○  ○
         ○
```

**After (Phase 1)**:
```
         ○                    · ·
      ○  ○  ○        →     ○  ·  ○    (Secondary bursts!)
    ○    ●    ○    →     ·    ●    ·
      ○  ○  ○        →     ○  ·  ○
         ○                    · ·
```

**After (Phase 2)**:
```
    ✧                        · ·
      ○  ✦             →   ○  ·  ○  ✧  (Sparkles + shapes!)
    ○  ★  ●  ○       →  ·    ●    ·
      ○     ○          →   ○  ·  ○
         ○                    · ·
```

### Performance Estimates

| Phase | Particles | Trails | Writes/Frame | Status |
|-------|-----------|--------|--------------|--------|
| Current | 25-100 | 3-12 | 75-1200 | ✅ Good |
| Phase 1 | 100-500 | 2-12 | 300-3000 | ⚠️ Needs safety |
| Phase 1 (capped) | 100-500 | 2-12 | 300-1500 | ✅ Safe |
| Phase 2 | 100-600 | 0-12 | 300-1800 | ✅ Safe |

**Safety margin**: ~40-70% below 1000 writes/frame target (similar to Lightning)

---

## Testing Strategy

### 1. Unit Tests
- Test secondary burst creation
- Verify depth limits
- Check particle cap enforcement
- Test shape algorithms

### 2. Visual Tests
```bash
# Phase 1
node test-fireworks-phase1.mjs

# Phase 2
node test-fireworks-phase2.mjs
```

### 3. Interactive Testing
```bash
npm start -- --pattern fireworks
# Press c01-c06 to cycle presets
# Press d to see debug metrics
# Click to spawn explosions
```

### 4. Performance Profiling
- Monitor FPS (should stay 60)
- Check CPU usage (should stay <6%)
- Verify particle counts in debug overlay
- Test on small terminal sizes (stress test)

---

## Risk Assessment

### High Risk
- **Particle explosion**: Without caps, could easily hit 1000+ particles
  - **Mitigation**: Hard 500 particle cap, depth limit 3, aggressive cleanup

### Medium Risk
- **Performance on small terminals**: Many particles in small space
  - **Mitigation**: Particle density culling, off-screen cleanup

### Low Risk
- **Visual quality**: Secondary bursts might not be visible enough
  - **Mitigation**: Good intensity/character differentiation by depth

---

## Success Criteria

### Must Have (Phase 1)
- ✅ Multi-stage explosions (2-3 levels)
- ✅ Particles spawn sub-bursts after delay
- ✅ Visual distinction by depth (brightness, size)
- ✅ Performance <1500 writes/frame
- ✅ All tests passing

### Nice to Have (Phase 2) ✅ COMPLETE
- ✅ Sparkle particles (bright white/yellow, fast, short-lived)
- ✅ Shape-based bursts (circle, ring, heart, star, random)
- ✅ Per-preset shape configuration
- ✅ All 6 presets updated with shapes and sparkle chances

### Stretch Goals (Future)
- Sound effect triggers (emit event for external audio)
- Color presets (red/white/blue, purple/gold, etc.)
- Delayed fuse (firework waits at peak before exploding)
- Smoke trails (persistent dim particles)

---

## Timeline

**Phase 1**: 2-3 hours
- Interface updates: 20 min
- Secondary burst logic: 60 min
- Performance safety: 30 min
- Preset updates: 20 min
- Testing: 30 min

**Phase 2**: 2-3 hours
- Sparkle particles: 60 min
- Shape algorithms: 90 min
- Preset updates: 20 min
- Testing: 30 min

**Total**: 4-6 hours (similar to Lightning enhancement)

---

## References

- Lightning enhancement: `docs/LIGHTNING_ENHANCEMENT.md`
- Pattern audit: `docs/PATTERN_AUDIT.md`
- Current implementation: `src/patterns/FireworksPattern.ts`

---

**Ready to proceed with Phase 1?**

Next steps:
1. Backup current FireworksPattern.ts
2. Begin interface updates
3. Implement secondary burst logic

---

**Status**: ✅ Enhancement Complete - Both Phases Successful

**Final Summary**:
- Phase 1: Multi-stage recursive explosions (3 depth levels)
- Phase 2: Sparkle particles + 5 burst shapes
- Performance: All presets under 500 particles, <1000 writes/frame
- Visual quality: Significantly enhanced with cascading bursts, sparkles, and shaped explosions
- Similar complexity to Lightning pattern enhancement
