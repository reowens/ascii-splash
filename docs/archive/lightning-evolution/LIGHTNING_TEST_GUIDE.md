# 🧪 Lightning Pattern Visual Test - Quick Guide

## 🚀 Quick Start

```bash
npm run build && npm start
```

Then press `n` repeatedly until you reach **Pattern 10: Lightning**

---

## ✅ Testing Checklist

### 1. Visual Rendering ⚡
- [ ] Lightning bolts are visible and clearly defined
- [ ] Bolts have bright cores (`*`) and dimmer edges (`.`)
- [ ] Bolts fade out smoothly after appearing
- [ ] No flickering or artifacts

### 2. Preset Cycling (Press `.` to advance) 🔄
- [ ] **Preset 1 - Cloud Strike**: Natural forking, moderate branching
- [ ] **Preset 2 - Tesla Coil**: Erratic, highly branched
- [ ] **Preset 3 - Ball Lightning**: Spherical formation
- [ ] **Preset 4 - Fork Lightning**: Multi-branch strikes
- [ ] **Preset 5 - Chain Lightning**: Fast, minimal fade
- [ ] **Preset 6 - Spider Lightning**: Sprawling branches
- [ ] Pressing `,` cycles backward correctly

### 3. Mouse Interaction 🖱️
- [ ] Move mouse → charge particles (`.`) appear around cursor
- [ ] Click mouse → lightning bolt spawns at cursor location
- [ ] Clicked bolts originate from top, strike at cursor
- [ ] Max 3 bolts visible at once (older ones fade)

### 4. Auto-Strike Behavior ⏱️
- [ ] Bolts auto-strike at intervals (varies by preset)
- [ ] Chain Lightning (Preset 5) strikes most frequently
- [ ] Spider Lightning (Preset 6) has longer intervals
- [ ] Auto-strikes continue while mouse is still

### 5. Debug Overlay (Press `d`) 📊
- [ ] Shows "Active Bolts: 0-3"
- [ ] Shows "Total Points: 25-105" (varies by bolt count)
- [ ] Shows "Charge Particles: 0-15" (when mouse moves)
- [ ] Metrics update in real-time

### 6. Stability & Performance 🔥
- [ ] No terminal crashes after 5+ minutes
- [ ] CPU usage <5% (check Activity Monitor / `top`)
- [ ] Pattern switches smoothly to/from other patterns
- [ ] No memory leaks (memory stays ~40-50MB)

---

## 🎮 Key Controls

| Key | Action |
|-----|--------|
| `n` | Next pattern (use to reach Pattern 10) |
| `.` | Next preset (1→2→3→4→5→6→1) |
| `,` | Previous preset (6→5→4→3→2→1→6) |
| `d` | Toggle debug overlay |
| `q` | Quit application |
| Mouse Move | Create charge particles |
| Mouse Click | Spawn lightning bolt |

---

## 📊 Expected Metrics

### Normal Operation
- **Active Bolts**: 1-3 (depending on timing)
- **Total Points**: 25-35 per bolt
- **Charge Particles**: 0-15 (appears with mouse movement)
- **FPS**: ~60 (check debug overlay)
- **CPU**: <5%

### Preset Differences
| Preset | Branch Prob | Strike Interval | Visual Style |
|--------|-------------|-----------------|--------------|
| 1 - Cloud Strike | 0.25 | 2000ms | Natural |
| 2 - Tesla Coil | 0.45 | 1500ms | Erratic |
| 3 - Ball Lightning | 0.35 | 1800ms | Spherical |
| 4 - Fork Lightning | 0.40 | 1500ms | Multi-fork |
| 5 - Chain Lightning | 0.15 | 800ms | Fast strikes |
| 6 - Spider Lightning | 0.50 | 2500ms | Sprawling |

---

## ❌ Known Good Behavior

These are **expected and normal**:

✅ **Bolts are sparse** (not filling entire screen)  
✅ **Only 3 bolts max at once** (prevents overload)  
✅ **Charge particles disappear** when mouse stops moving  
✅ **Bolts fade quickly** on Preset 5 (Chain Lightning)  
✅ **Different terminals** may show slight color variations

---

## 🚨 What to Report

### If Something Looks Wrong

**Bolts not visible?**
- Check your terminal supports RGB colors
- Try switching themes (press `t`)
- Check if debug overlay shows "Active Bolts: 1-3"

**Terminal crashes?**
- Note which preset was active
- Note if mouse was being used
- Report the crash scenario immediately

**Performance issues?**
- Press `d` to see FPS
- Check CPU usage in system monitor
- Note how many bolts were visible

**Visual glitches?**
- Describe what looks wrong
- Note which preset (1-6)
- Try cycling to different preset and back

---

## ✅ Success Criteria

Test is **PASSED** if:
1. ✅ All 6 presets render visible lightning
2. ✅ Mouse interaction works (particles + click spawning)
3. ✅ No crashes after 5+ minutes
4. ✅ CPU <5% and FPS ~60
5. ✅ Debug metrics show reasonable values

Test **NEEDS INVESTIGATION** if:
- ❌ Bolts are invisible on any preset
- ❌ Terminal crashes at any point
- ❌ CPU >10% or FPS <30
- ❌ Mouse interaction doesn't work
- ❌ Pattern switching causes issues

---

## 🎬 After Testing

### Report Results
Reply with:
```
Lightning Pattern Test Results:
✅ Visual rendering: [PASS/FAIL - description]
✅ All 6 presets: [PASS/FAIL - which failed?]
✅ Mouse interaction: [PASS/FAIL - description]
✅ Stability: [PASS/FAIL - crashed after X minutes]
✅ Performance: [CPU: X%, FPS: Y]

Overall: [PASS/FAIL]
```

### If All Pass
Great! The refactor is complete and ready for commit.

### If Any Fail
Share details and we'll investigate further.

---

**Good luck testing! ⚡✨**
