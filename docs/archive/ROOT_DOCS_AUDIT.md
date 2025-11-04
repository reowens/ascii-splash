# Root Level Documentation Audit

**Date**: November 3, 2025  
**Goal**: Consolidate and organize 21 root-level markdown files

## Current File Inventory (21 files)

### 🟢 ACTIVE - User Facing (2 files)
These are accessed by end users and should remain at root:

1. **README.md** (555 lines)
   - Primary user guide
   - Installation, features, controls, config
   - Should stay at root ✅

2. **CHANGELOG.md** (403 lines)
   - Version history and release notes
   - Standard practice to keep at root ✅

### 🔵 AI ASSISTANT CONTEXT (3 files - Symlinks)
These provide context for AI assistants:

1. **CLAUDE.md** (357 lines)
   - Primary AI context file
   - Symlinked as AGENTS.md and WARP.md

2. **AGENTS.md** (357 lines)
   - ⚠️ SYMLINK to CLAUDE.md

3. **WARP.md** (357 lines)
   - ⚠️ SYMLINK to CLAUDE.md

**Action**: Keep as is (symlinks working) ✅

### 🟡 LIGHTNING PATTERN - Multiple Versions (7 files)
Duplicate/overlapping documentation from Lightning refactor iterations:

1. **LIGHTNING_FIX.md** (242 lines)
   - Status: "COMPLETE ✅"
   - Likely ARCHIVE

2. **LIGHTNING_READY_FOR_TESTING.md** (247 lines)
   - Status: "READY FOR MANUAL VERIFICATION"
   - Likely ARCHIVE

3. **LIGHTNING_REFACTOR_PLAN.md** (510 lines)
   - Detailed refactor plan from earlier iteration
   - Likely ARCHIVE (superseded by V2)

4. **LIGHTNING_TEST_GUIDE.md** (170 lines)
   - Visual test guide for refactor
   - Likely ARCHIVE (superseded by V2)

5. **LIGHTNING_V2_PLAN.md** (537 lines)
   - Current enhancement plan
   - Status: Phase 1 Complete
   - Action: CONSOLIDATE into one active file

6. **LIGHTNING_V2_PROGRESS.md** (142 lines)
   - Phase 1 progress report
   - Likely temporary
   - Action: CONSOLIDATE

7. **LIGHTNING_V2_COMPLETE.md** (152 lines)
   - Phase 1 completion summary
   - Status: Current
   - Action: CONSOLIDATE

8. **IMPLEMENTATION_COMPLETE.md** (256 lines)
   - Status: "Lightning Pattern Refactor - IMPLEMENTATION COMPLETE"
   - Likely ARCHIVE (old refactor, predates V2)

### 🟠 GENERAL PLANS & ANALYSIS (5 files)
Various development plans and issue analysis:

1. **CRASH_ANALYSIS.md** (265 lines)
   - Terminal crash analysis (specific issue)
   - Status: Appears resolved
   - Action: ARCHIVE to docs/issues/

2. **BANNER_DEBUG_RESUME.md** (510 lines)
   - Banner flickering debug session notes
   - Status: Appears resolved (old debug session)
   - Action: ARCHIVE to docs/issues/

3. **REFACTOR_PLAN.md** (759 lines)
   - Critical issues refactoring plan
   - Status: "COMPLETE ✅"
   - Action: ARCHIVE to docs/

4. **PATTERN_ENHANCEMENT_PLAN.md** (396 lines)
   - General pattern enhancement plan
   - Status: Mixed with Lightning V2
   - Action: ARCHIVE or consolidate

5. **PHASE_3_PLAN.md** (499 lines)
   - Visual enhancements phase plan
   - Status: Not started (future work)
   - Action: Move to docs/ or archive

### 🔴 OBSOLETE/REDIRECTS (2 files)
Files that have been superseded:

1. **ISSUES.md** (33 lines)
   - Redirect: "Issue tracking has been moved to docs/issues/"
   - Status: Placeholder
   - Action: DELETE (already redirects to docs/)

2. **TESTING_INSTRUCTIONS.md** (193 lines)
   - Status: "Testing Instructions - Terminal Crash Fix"
   - Appears to be old crash fix testing
   - Action: ARCHIVE to docs/issues/

---

## Proposed Organization

### Keep at Root (5 files)
Essential user/project files:
- ✅ README.md
- ✅ CHANGELOG.md
- ✅ CLAUDE.md
- ✅ AGENTS.md (symlink)
- ✅ WARP.md (symlink)

### Move to docs/ (1 consolidated Lightning file)
- 📄 docs/LIGHTNING_ENHANCEMENT.md (consolidated from V2 files)

### Archive to docs/archive/ (12 files)
- LIGHTNING_REFACTOR_PLAN.md
- LIGHTNING_FIX.md
- LIGHTNING_READY_FOR_TESTING.md
- LIGHTNING_TEST_GUIDE.md
- IMPLEMENTATION_COMPLETE.md
- CRASH_ANALYSIS.md
- BANNER_DEBUG_RESUME.md
- TERMINAL_CRASH_FIX_SUMMARY.md
- TESTING_INSTRUCTIONS.md
- REFACTOR_PLAN.md
- PATTERN_ENHANCEMENT_PLAN.md
- PHASE_3_PLAN.md

### Delete (1 file)
- ISSUES.md (already has redirect, replaced by docs/issues/)

---

## Summary Statistics

| Category | Before | After | Reduction |
|----------|--------|-------|-----------|
| Root files | 21 | 5 | -76% |
| Docs files | ~5 | ~18 | +260% |
| Active reference | Mixed | Clear | ✅ |

---

## Benefits of Consolidation

1. **Clarity**: Users see only essential files at root
2. **Maintainability**: Single source of truth per topic
3. **Navigation**: docs/ becomes proper archive/reference
4. **Version Control**: Cleaner git history
5. **Onboarding**: New contributors see organized structure

---

## Next Steps

1. Create docs/archive/ directory
2. Create consolidated docs/LIGHTNING_ENHANCEMENT.md
3. Move files to archive
4. Delete ISSUES.md
5. Update any cross-references
6. Commit cleanup

---

**Recommendation**: Proceed with consolidation ✅
