# Documentation Index

> **📦 Version v0.2.0 - ESM Migration Complete, Ready for npm Publication** ✅
>
> The project has completed ESM migration with conf v15.0.2, all 1505 tests passing (92.35% coverage), and is ready for npm publication. See [PROJECT_STATUS.md](PROJECT_STATUS.md) for details.

Welcome to the **ascii-splash** documentation. Choose your path based on your role:

## Primary Documentation

| Document | Audience | Contents |
|----------|----------|----------|
| **[../README.md](../README.md)** | 👤 Users | Installation, features, usage guide, controls, configuration |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | 👨‍💻 Developers | Technical architecture, system design, contribution guidelines |
| **[PROJECT_STATUS.md](PROJECT_STATUS.md)** | 📊 Everyone | Current status, statistics, quick reference |
| **[TESTING_PLAN.md](TESTING_PLAN.md)** | 🧪 Testers | Test strategy, coverage, test suite organization |
| **[issues/README.md](issues/README.md)** | 🐛 Maintainers | Issue tracking, bug reports, testing checklists |

---

## Quick Start by Role

| I want to... | Start here |
|--------------|-----------|
| **Use the app** | [../README.md](../README.md) → [examples/.splashrc.example](../examples/.splashrc.example) |
| **Understand the project** | [PROJECT_STATUS.md](PROJECT_STATUS.md) → [ARCHITECTURE.md](ARCHITECTURE.md) |
| **Add a new pattern** | [ARCHITECTURE.md](ARCHITECTURE.md#contribution-points) → [../src/patterns/](../src/patterns/) |
| **Write tests** | [TESTING_PLAN.md](TESTING_PLAN.md) → [../tests/unit/](../tests/unit/) |
| **Report/track issues** | [issues/README.md](issues/README.md) → [issues/active/](issues/active/) |

---

## Document Organization

### Root Level (5 files - Essential)
Keep at project root for easy access:
- **README.md** - User guide and getting started
- **CHANGELOG.md** - Release history and version notes
- **CLAUDE.md** - AI assistant project context
- **AGENTS.md** - Symlink to CLAUDE.md
- **WARP.md** - Symlink to CLAUDE.md

### Docs Directory (5 files - Active Reference)
Developer and contributor documentation:
- **ARCHITECTURE.md** - System design and technical details
- **PROJECT_STATUS.md** - Project status and metrics
- **TESTING_PLAN.md** - Test strategy and coverage
- **RELEASE_PROCESS.md** - Release procedures (includes Quick Start)
- **README.md** - This index file

### Issues Directory
Organized issue tracking and testing:
- **README.md** - Issue organization overview
- **active/** - Currently tracked issues
- **completed/** - Resolved issues for reference
- **checklists/** - Testing and verification checklists

### Archive Directory (19 files - Historical Reference)
Previous iterations and completed work:
- Lightning refactor documents (V1, V2 planning)
- Pattern enhancement plans
- Terminal crash analysis and fixes
- Previous refactoring plans
- Session notes and audit reports (Nov 2025)
- See [archive/README.md](archive/README.md) for full index

---

## Additional Resources

- **[../examples/.splashrc.example](../examples/.splashrc.example)** - Configuration examples
- **[../src/types/index.ts](../src/types/index.ts)** - TypeScript interface definitions
- **[../src/patterns/](../src/patterns/)** - Pattern implementations
- **[../tests/unit/](../tests/unit/)** - Test suite examples
- **[archive/](archive/)** - Historical documentation and previous plans

---

## Navigation Tips

- **New to the project?** Start with [PROJECT_STATUS.md](PROJECT_STATUS.md)
- **Need to contribute?** Read [ARCHITECTURE.md](ARCHITECTURE.md)
- **Looking for old docs?** Check [archive/](archive/) (includes Lightning enhancement docs)
- **Using the app?** See [../README.md](../README.md)

---

**For current project statistics**, see [PROJECT_STATUS.md](PROJECT_STATUS.md)  
**Last Updated:** November 4, 2025 (v0.2.0 ESM Migration Complete)  
**Organization Status:** ✅ Consolidation Complete (Phases 1, 2 & 3)

---

## Documentation Quality

The ascii-splash documentation has been consolidated and optimized:

**✅ Completed**:
- **Phase 1**: Removed redundant release & Lightning docs
- **Phase 1b**: Cleaned root directory (5 markdown files per guidelines)
- **Phase 2**: Reduced core concept duplication (config, themes, performance)
- Cross-references added for better navigation
- Single source of truth established for metrics

**📊 Results**:
- Duplication reduced from ~25% to <5%
- ~1,280+ lines of redundancy eliminated
- Clear navigation paths for all audiences

