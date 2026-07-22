---
type: doc
status: reference
---

# Documentation Index

> **📦 Released: v0.5.0 — Shareable Scenes** ✅
> **🚧 Active: workspace visualization Phase A visual-quality gate**
>
> 23 procedural patterns, 138 procedural presets, 18 photo presets, seeded share
> codes, and **2390 tests** passing with 94.56% statement coverage.

Welcome to **ascii-splash** documentation. Choose your path based on your role:

---

## Quick Navigation

### For Everyone

- 📊 **[Project Status](PROJECT_STATUS.md)** - Current metrics, features, and statistics
- 👤 **[User Guide](../README.md)** - Installation, features, usage, controls

### For Developers

- 🏗️ **[Architecture Guide](ARCHITECTURE.md)** - System design, technical deep dive, patterns interface
- 📚 **[Core Documentation](core/)** - Developer essentials
  - **[Quick Start](core/QUICK_START.md)** - Get running in 5 minutes
  - **[Contributing Guide](core/CONTRIBUTING.md)** - Pattern development, contribution guidelines
- 📖 **[Implementation Guides](guides/)** - How-to and reference
  - **[Testing Guide](guides/TESTING.md)** - Test strategy, test suite organization
  - **[Release Process](guides/RELEASE.md)** - How to create a release
  - **[Configuration Guide](guides/CONFIGURATION.md)** - All configuration options

### For Maintainers

- 🔧 **[Issue Tracking](issues/README.md)** - Bug reports, testing checklists, issue organization
- 📈 **[Planning & Roadmap](planning/)** - Enhancement proposals, future features
  - **[Enhancement Proposals](planning/enhancement-proposals/)** - Fireworks, visual media, etc.
  - **[Roadmap](planning/README.md)** - Current and released plans

### Historical Reference

- 📦 **[Archive](archive/)** - Previous work, completed enhancements, session notes
  - **[Lightning Enhancement](archive/lightning-evolution/)** - V1 & V2 refactoring
  - **[Crash Analysis](archive/crash-analysis/)** - Terminal issue investigations
  - **[Session Reports](archive/sessions/)** - ESM migration, audit reports, completed phases

---

## Getting Started by Role

| I want to...               | Start here                                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Use the app**            | [User Guide](../README.md) → [Configuration Guide](guides/CONFIGURATION.md)                                                           |
| **Understand the project** | [Project Status](PROJECT_STATUS.md) → [Architecture Guide](ARCHITECTURE.md)                                                           |
| **Start developing**       | [Quick Start](core/QUICK_START.md) → [Contributing Guide](core/CONTRIBUTING.md)                                                       |
| **Add a new pattern**      | [Contributing: Pattern Development](core/CONTRIBUTING.md#pattern-development-most-common-contribution) → [Examples](../src/patterns/) |
| **Write tests**            | [Testing Guide](guides/TESTING.md) → [Examples](../tests/unit/)                                                                       |
| **Report/track issues**    | [Issue Tracking](issues/README.md)                                                                                                    |
| **See what's planned**     | [Planning & Roadmap](planning/README.md)                                                                                              |

---

## Documentation Structure

### Root Level (3 essential files)

**Primary entry points for all audiences**

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical architecture, system design, deep dive
- **[PROJECT_STATUS.md](PROJECT_STATUS.md)** - Current metrics, status, quick reference
- **[README.md](README.md)** - This index and navigation

### Core Documentation (`core/`)

**For developers getting started**

- **[QUICK_START.md](core/QUICK_START.md)** - 5-minute dev setup
- **[CONTRIBUTING.md](core/CONTRIBUTING.md)** - Pattern development, contribution guidelines

### Implementation Guides (`guides/`)

**How-to and operational reference**

- **[TESTING.md](guides/TESTING.md)** - Test strategy, coverage targets, manual testing
- **[RELEASE.md](guides/RELEASE.md)** - Release procedures, publishing to npm
- **[CONFIGURATION.md](guides/CONFIGURATION.md)** - All config options, examples, per-pattern settings

### Planning (`planning/`)

**Enhancement proposals and roadmap**

- **[README.md](planning/README.md)** - Overview of active proposals and future features
- **[enhancement-proposals/](planning/enhancement-proposals/)** - Fireworks, visual media, pattern audit
- **[roadmap/](planning/roadmap/)** - v0.3.0+ planned features

### Status Reports (`status/`)

**Project metrics and version snapshots**

- **[reports/](status/reports/)** - Versioned reports (e.g., ESM migration, audit findings)

### Issue Tracking (`issues/`)

**Bug tracking, testing checklists, maintainer reference**

- **[README.md](issues/README.md)** - Issue organization overview
- **[checklists/](issues/checklists/)** - Testing and verification checklists
- **[completed/](issues/completed/)** - Resolved issues for reference

### Archive (`archive/`)

**Historical documentation and completed work**

- **[README.md](archive/README.md)** - Archive index and organization
- **[lightning-evolution/](archive/lightning-evolution/)** - Lightning pattern V1 & V2 refactoring
- **[crash-analysis/](archive/crash-analysis/)** - Terminal crash investigations and fixes
- **[sessions/](archive/sessions/)** - Session notes, audit reports, completed phases

---

## Key Documentation Files

| File                                               | Purpose                        | Audience           |
| -------------------------------------------------- | ------------------------------ | ------------------ |
| [../README.md](../README.md)                       | User guide & features          | End users          |
| [PROJECT_STATUS.md](PROJECT_STATUS.md)             | Current metrics & status       | Everyone           |
| [ARCHITECTURE.md](ARCHITECTURE.md)                 | System design & internals      | Developers         |
| [core/QUICK_START.md](core/QUICK_START.md)         | Dev setup & first contribution | New developers     |
| [core/CONTRIBUTING.md](core/CONTRIBUTING.md)       | Pattern development guide      | Contributors       |
| [guides/TESTING.md](guides/TESTING.md)             | Test strategy & coverage       | Developers & QA    |
| [guides/RELEASE.md](guides/RELEASE.md)             | Release procedures             | Release manager    |
| [guides/CONFIGURATION.md](guides/CONFIGURATION.md) | Config reference               | Users & developers |
| [planning/README.md](planning/README.md)           | Enhancement roadmap            | Everyone           |
| [issues/README.md](issues/README.md)               | Issue tracking & testing       | Maintainers        |

---

## Additional Resources

- **[../examples/.splashrc.example](../examples/.splashrc.example)** - Configuration file example
- **[../src/types/index.ts](../src/types/index.ts)** - TypeScript interface definitions
- **[../src/patterns/](../src/patterns/)** - Pattern implementations (23 files)
- **[../tests/unit/](../tests/unit/)** - Test suite and examples

---

## Quick References

### Development Commands

```bash
npm install        # Install dependencies
npm run build      # Build TypeScript
npm run dev        # Watch mode
npm start          # Run the app
npm test           # Run tests
npm run test:coverage  # Coverage report
```

### Key Patterns

- Wave, Starfield, Matrix, Rain - Core patterns
- Lightning, Fireworks, Plasma - Visual effects
- Life, Maze, DNA - Algorithmic
- Quicksilver, Particle, Metaball - Interactive
- LavaLamp, Smoke, Snow - Ambient
- Ocean Beach, Campfire, Aquarium, Night Sky, Snowfall Park - Scene-based (v0.3.0)
- Photo - Half-block, braille, and symbol modes (opt-in via `--photo PATH`)
- Workspace - Fixture-driven Phase A view via `splash watch --fixture PATH`

### Commands (in-app)

- `cp#` - Switch pattern (1-9, then n)
- `ct#` - Switch theme (1-5)
- `c*` - Random preset
- `c**` - Random everything
- `r` - Quick random (alias)
- `d` - Debug overlay

---

## Navigation Tips

- **New to the project?** Start with [Project Status](PROJECT_STATUS.md)
- **Setting up to develop?** Read [Quick Start](core/QUICK_START.md)
- **Want to contribute?** See [Contributing Guide](core/CONTRIBUTING.md)
- **Need to configure something?** Check [Configuration Guide](guides/CONFIGURATION.md)
- **Looking for old docs?** Check [Archive](archive/)
- **Using the app?** See [User Guide](../README.md)

---

## Document Organization (Nov 4, 2025)

✅ **Reorganized** - Documentation structure optimized for clarity:

- Separated active docs from proposals
- Moved completed work to archive with context folders
- Created core guides for developers
- Clearer navigation for different audiences

**Results**:

- Reduced cognitive load: 10 files → organized structure with clear sections
- Better discovery: Planning section showcases upcoming features
- Easier maintenance: Historical content clearly separated
- Scalable: Room for new guides and proposals

---

**Last Updated**: July 11, 2026 (v0.5.0 released; workspace Phase A tested)
**Organization Status**: ✅ Consolidated, Reorganized, and Ready
