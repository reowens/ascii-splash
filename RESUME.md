# Project Resume - ascii-splash

**Last Updated:** November 3, 2025  
**Current Version:** v0.1.1  
**Status:** Published & Production Ready (with minor overlay rendering bug)

---

## 📋 Quick Project Summary

**ascii-splash** is a terminal ASCII animation app with 17 interactive patterns, 102 presets, and 5 color themes. Published to npm and fully functional with one known rendering issue.

- **npm**: https://www.npmjs.com/package/ascii-splash
- **GitHub**: https://github.com/reowens/ascii-splash
- **Installation**: `npm install -g ascii-splash` or `npx ascii-splash`

### Key Stats
- 17 patterns × 6 presets each = 102 total presets
- 5 color themes with full pattern integration
- 40+ multi-key commands
- 817 tests, 82.34% coverage
- <5% CPU, ~40-50MB RAM

---

## 🚨 Current Issue (Active Work)

### Text Overlay Rendering Bug

**Problem:** Text overlays (pattern names, messages) show garbled/extra lines at top of terminal when switching patterns or displaying messages.

**Status:** WIP - Attempted buffer-based solution (commit `374fe6c`), still has issues.

**Root Cause:** Conflict between double-buffered dirty-tracking system and text overlay rendering:
1. Pattern renders to buffer (rows 0 to height-1)
2. Overlay attempts to write to same location
3. Next frame's dirty-tracking detects changes and overwrites overlay with pattern data
4. Result: Garbled text or extra lines

**Attempted Solutions:**
- ✗ Write overlay to terminal after dirty-tracking (gets overwritten next frame)
- ✗ Write overlay to buffer before dirty-tracking (commit `374fe6c` - causes extra line)

**Next Steps:**
1. Research proper architectural pattern for overlays in double-buffered terminal apps
2. Consider using Perplexity/Claude with this prompt:
   > "What is the standard/best practice pattern for rendering persistent text overlays on top of a double-buffered, dirty-tracked terminal animation system?"
3. Likely solutions to explore:
   - Reserve top row for overlays (patterns render from row 1+)
   - Separate overlay buffer that persists across frames
   - Re-render overlay directly to terminal every frame after dirty-tracking

**Files Involved:**
- `src/engine/AnimationEngine.ts` - Added `beforeTerminalRenderCallback`
- `src/main.ts` - Overlay rendering logic (lines 597-613)
- `src/renderer/TerminalRenderer.ts` - Added `clearScreen()` method

---

## 📦 Project Structure

```
ascii-splash/
├── src/
│   ├── config/          # Configuration system (defaults, themes, loader)
│   ├── engine/          # Animation loop, command system, performance
│   ├── patterns/        # 17 pattern implementations
│   ├── renderer/        # Terminal rendering & double-buffering
│   ├── types/           # TypeScript interfaces
│   └── main.ts          # Entry point, input handling
├── tests/
│   ├── unit/            # 817 unit tests (patterns, engine, config)
│   └── manual/          # Manual testing scripts
├── docs/                # Architecture, testing, release docs
└── examples/            # Sample configuration file
```

---

## 🛠️ Development Workflow

### Quick Commands
```bash
# Install & build
npm install
npm run build

# Run application
npm start

# Run tests
npm test                 # All tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report

# Development
npm run dev             # Watch mode (auto-rebuild)
```

### Build Output
- Source: `src/**/*.ts`
- Compiled: `dist/**/*.js` (CommonJS, ES2020)
- Entry: `dist/main.js`

---

## 🎯 Architecture Highlights

### 3-Layer Design
1. **Renderer Layer** (`TerminalRenderer` + `Buffer`)
   - Double-buffering with dirty cell tracking
   - Terminal setup, input handling, resize management
   
2. **Engine Layer** (`AnimationEngine` + `PerformanceMonitor`)
   - Main animation loop (update → render cycle)
   - Pattern switching and lifecycle management
   - FPS monitoring and performance tracking
   
3. **Pattern Layer** (17 pattern implementations)
   - Implements `Pattern` interface
   - Theme-aware rendering
   - Preset system (6 per pattern)
   - Mouse interaction support

### Key Systems
- **Command System**: Multi-key commands (prefix with `c`, e.g., `c01` for preset 1)
- **Theme System**: 5 themes with color interpolation
- **Configuration**: 3-tier priority (CLI args > config file > defaults)
- **Config File**: `~/.config/ascii-splash/.splashrc.json`

---

## 📊 Test Coverage

**Current:** 82.34% statements, 817 tests, all passing ✅

**Coverage by Component:**
- CommandParser: 100%
- Buffer: 100%
- ConfigLoader: 100%
- PerformanceMonitor: 100%
- Theme: 100%
- AnimationEngine: 98%
- Patterns: 95-100%

**Test Organization:**
- `tests/unit/patterns/` - 17 pattern test files
- `tests/unit/engine/` - Engine component tests
- `tests/unit/config/` - Configuration tests
- `tests/unit/renderer/` - Renderer & buffer tests

---

## 🚀 Release Process

### Published Versions
- **v0.1.0** (Nov 2, 2025) - Initial release
- **v0.1.1** (Nov 2, 2025) - Current, with overlay bug

### Release Workflow
See `docs/QUICK_RELEASE.md` for step-by-step guide.

**Quick checklist:**
1. Run tests: `npm test`
2. Update version: `npm version patch/minor/major`
3. Update CHANGELOG.md
4. Build: `npm run build`
5. Commit & push with tags: `git push && git push --tags`
6. GitHub Actions handles npm publish automatically

---

## 📚 Documentation Index

**Essential Reading:**
- `README.md` - User guide, features, installation, controls
- `CLAUDE.md` - AI assistant context (project overview for AI)
- `docs/ARCHITECTURE.md` - Technical architecture deep-dive
- `docs/PROJECT_STATUS.md` - Detailed status and metrics
- `docs/TESTING_PLAN.md` - Test strategy and coverage

**Operations:**
- `docs/QUICK_RELEASE.md` - Release process
- `docs/GITHUB_ACTIONS.md` - CI/CD setup
- `docs/NPM_TOKEN_SETUP.md` - NPM publishing setup

**Development:**
- `examples/.splashrc.example` - Sample config file
- `ISSUES.md` - Issue tracking
- `CHANGELOG.md` - Version history

---

## 🎨 Pattern Quick Reference

| # | Pattern | Description |
|---|---------|-------------|
| 1 | Waves | Sine waves with ripple effects |
| 2 | Starfield | 3D starfield with depth |
| 3 | Matrix | Falling code rain |
| 4 | Rain | Water droplets with splashes |
| 5 | Quicksilver | Fluid metallic metaballs |
| 6 | Particles | Physics-based particle system |
| 7 | Spiral | Rotating spiral arms |
| 8 | Plasma | Organic blob patterns |
| 9 | Tunnel | 3D perspective tunnel |
| n | Lightning | Electric arcs |
| n | Fireworks | Exploding particles |
| n | Life | Conway's Game of Life |
| n | Maze | Recursive backtracker |
| n | DNA | Double helix |
| n | Lava Lamp | Floating blobs |
| n | Smoke | Rising plumes |
| n | Snow | Falling snowflakes |

---

## 🔑 Control Reference

**Pattern Navigation:**
- `1-9, n` - Switch patterns
- `b` - Previous pattern
- `r` - Random (pattern + preset + theme)

**Presets:**
- `. / ,` - Cycle presets
- `c01-c99` - Apply specific preset

**Themes:**
- `t` - Cycle themes
- `ct1-ct5` - Switch to specific theme

**Other:**
- `?` - Help
- `d` - Debug overlay
- `p` - Pause
- `q` - Quit
- `s` - Save config

---

## 🐛 Known Issues

1. **Text Overlay Rendering** (Active - commit `374fe6c`)
   - Garbled text when switching patterns
   - Extra line at top of terminal
   - Needs architectural fix

2. **No Production Issues** - Application is stable and functional besides overlay bug

---

## 🎯 Future Enhancements

**Potential additions** (not committed, just ideas):
- Additional patterns (Constellation, Ripple Grid, Waveform, Mandelbrot)
- Demo GIFs/videos for README
- Performance profiling tools
- More themes
- Pattern transition effects

---

## 🤝 Contributing

**Pattern Development:**
- Implement `Pattern` interface from `src/types/index.ts`
- 6 presets per pattern (required)
- Theme-aware color selection
- Mouse interaction (optional)
- Add tests in `tests/unit/patterns/`

**Testing:**
- Run `npm test` before committing
- Add tests for new features
- Maintain >80% coverage

---

## 📞 Getting Help

**Documentation:**
- Check `README.md` for usage
- Check `docs/ARCHITECTURE.md` for technical details
- Check this file (RESUME.md) for current status

**Issues:**
- GitHub Issues: https://github.com/reowens/ascii-splash/issues
- Use templates in `.github/ISSUE_TEMPLATE/`

---

## ⚡ Quick Session Restart Checklist

When resuming work on this project:

- [ ] Read this RESUME.md
- [ ] Check git status: `git status`
- [ ] Review recent commits: `git log --oneline -5`
- [ ] Run tests: `npm test`
- [ ] Build: `npm run build`
- [ ] Check current issue status above (Text Overlay Rendering)
- [ ] Review `ISSUES.md` for tracked items

---

**Last Session Notes:**
- Attempted buffer-based overlay fix (commit `374fe6c`)
- Still has rendering issues - extra line at top
- Need architectural research on proper overlay pattern
- Consider Perplexity query for best practices
