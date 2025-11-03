# Documentation Index

This directory contains comprehensive project documentation for **ascii-splash**.

## Quick Links

- **[../README.md](../README.md)** - 👤 User guide and features (for end users)
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - 👨‍💻 Technical architecture (for developers)
- **[PLAN.md](PLAN.md)** - 🗺️ Project roadmap and specifications
- **[PROJECT_STATUS.md](PROJECT_STATUS.md)** - 📊 Current status and statistics
- **[TESTING_PLAN.md](TESTING_PLAN.md)** - 🧪 Testing strategy and coverage

## Document Overview

### 👨‍💻 [ARCHITECTURE.md](ARCHITECTURE.md)

**Purpose:** Deep technical documentation for developers
**Best for:** Understanding system design, contributing code, performance optimization

**Contents:**
- 3-layer architecture (Renderer, Engine, Pattern)
- Data flow and system interactions
- Key architectural patterns (double buffering, performance monitoring)
- Configuration system implementation
- Theme system implementation
- Command system architecture
- Performance strategy and optimization
- Contribution guidelines for new patterns

**When to read:**
- Contributing new code or patterns
- Understanding technical implementation
- Optimizing performance
- Learning system design principles
- Debugging complex issues

---

### 📊 [PROJECT_STATUS.md](PROJECT_STATUS.md)

**Purpose:** High-level project overview and current status  
**Best for:** Quick reference, status checks, feature summaries

**Contents:**
- Current phase completion status
- Project statistics (patterns, presets, tests, coverage)
- Feature summary with implementation status
- Test coverage breakdown
- Performance metrics
- Architecture overview
- Quick start guide
- Command reference

**When to read:**
- Starting work on the project
- Need quick project status
- Looking for project statistics
- Want a high-level architecture overview

---

### 🗺️ [PLAN.md](PLAN.md)

**Purpose:** Complete project roadmap with detailed specifications  
**Best for:** Understanding project structure, phases, and detailed requirements

**Contents:**
- Tech stack and dependencies
- Complete project structure
- 6 development phases with detailed checklists
- Pattern system architecture
- Command system specification
- Configuration system design
- Theme system implementation
- Testing achievements summary
- Usage examples
- Performance strategy

**When to read:**
- Planning new features
- Understanding project architecture
- Learning about implemented systems
- Reviewing phase completion status
- Understanding design decisions

---

### 🧪 [TESTING_PLAN.md](TESTING_PLAN.md)

**Purpose:** Testing strategy, coverage, and implementation details  
**Best for:** Understanding test suite, coverage targets, testing approach

**Contents:**
- Testing strategy and philosophy
- Priority-based test plan
- Component-by-component coverage breakdown
- Test utilities and helpers
- Coverage targets and achievements
- Testing milestones
- Future testing priorities

**When to read:**
- Writing new tests
- Understanding test coverage
- Looking for test utilities
- Reviewing testing priorities
- Checking coverage gaps

---

## Documentation by Use Case

### 🆕 **I'm new to the project**
1. Start with [PROJECT_STATUS.md](PROJECT_STATUS.md) - Get the big picture
2. Read [../README.md](../README.md) - Learn how to use the app
3. Skim [PLAN.md](PLAN.md) - Understand the architecture

### 🔧 **I want to develop a new feature**
1. Check [PLAN.md](PLAN.md) - See what's planned and how things fit together
2. Review [TESTING_PLAN.md](TESTING_PLAN.md) - Understand testing requirements
3. Check [PROJECT_STATUS.md](PROJECT_STATUS.md) - See what's already implemented

### 🧪 **I want to improve test coverage**
1. Read [TESTING_PLAN.md](TESTING_PLAN.md) - See priorities and gaps
2. Check [PROJECT_STATUS.md](PROJECT_STATUS.md) - Review current coverage
3. Look at `../tests/` directory - See existing test patterns

### 📝 **I want to add a new pattern**
1. Read [PLAN.md](PLAN.md) Phase 2 & 3.4 - See pattern requirements
2. Look at [../src/patterns/](../src/patterns/) - Study existing patterns
3. Check [TESTING_PLAN.md](TESTING_PLAN.md) - Understand testing expectations

### 🎨 **I want to customize the app**
1. Read [../README.md](../README.md) - Configuration options
2. Check [../examples/.splashrc.example](../examples/.splashrc.example) - Config examples
3. Review [PLAN.md](PLAN.md) Section 6 - Configuration system details

---

## Related Documentation

### Root Directory Docs
- **[../README.md](../README.md)** - User-facing documentation and usage guide
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical architecture and implementation details (primary reference)
- **[../CLAUDE.md](../CLAUDE.md)** - AI assistant project context and navigation
- **[../examples/.splashrc.example](../examples/.splashrc.example)** - Configuration reference

### Code Documentation
- Source code is well-commented with inline documentation
- TypeScript interfaces defined in `src/types/index.ts`
- Configuration defaults in `src/config/defaults.ts`

---

## Documentation Maintenance

### When to Update These Docs

**PROJECT_STATUS.md:**
- After completing a phase
- After major feature additions
- When test coverage changes significantly
- When updating project statistics

**PLAN.md:**
- When planning new phases
- When updating phase completion status
- When revising architecture decisions
- When adding new features to the roadmap

**TESTING_PLAN.md:**
- After adding new test suites
- When coverage targets change
- When testing priorities shift
- After completing testing milestones

---

## Quick Reference

### Project Statistics (as of Nov 2, 2025)
- **Patterns:** 17 (with 102 presets)
- **Themes:** 5
- **Commands:** 40+
- **Tests:** 817
- **Coverage:** 82.34%
- **Phases Complete:** 6/6 ✅

### Key Metrics
- **Target CPU:** <5% idle
- **Target RAM:** <50MB
- **Target FPS:** 30 (adjustable 10-60)
- **Test Coverage Goal:** >80% ✅

### Development Status
- ✅ Phase 1: Core MVP
- ✅ Phase 2: Patterns & Performance
- ✅ Phase 3: Configuration & Extensibility
- ✅ Phase 4: Command System & Presets
- ✅ Phase 5: New Patterns
- ✅ Phase 6: Polish & Distribution (v0.1.0 Released)

---

**Last Updated:** November 2, 2025  
**Document Version:** 1.1 (v0.1.0 Release)
