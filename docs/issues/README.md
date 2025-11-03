# Issue Tracking

> **Note**: This directory tracks known issues during development. For public bug reports, please use [GitHub Issues](https://github.com/reowens/ascii-splash/issues).

## Overview

This directory contains detailed documentation of issues, bugs, and testing checklists for ascii-splash development.

## Structure

- **[active/](active/)** - Currently open issues under investigation
- **[completed/](completed/)** - Resolved issues with fix documentation
- **[checklists/](checklists/)** - Testing checklists and verification tasks

## Active Issues

| Issue | Severity | Status | Reported |
|-------|----------|--------|----------|
| [Text Overlay Display Issues](active/text-overlay-display.md) | Medium | Investigating | 2025-11-02 |

## Recently Completed

| Issue | Severity | Resolved | Commits |
|-------|----------|----------|---------|
| [Spiral & Tunnel Pattern Visibility](completed/spiral-tunnel-visibility.md) | Critical | 2025-11-02 | 3fd6d8d, TBD |

## Performance Metrics

**Target Performance**:
- LOW mode: 15 FPS, <3% CPU
- MEDIUM mode: 30 FPS, <5% CPU
- HIGH mode: 60 FPS, <6% CPU
- Memory: ~40-50MB RSS

**Known Performance Issues**:
- None currently

## Testing Status

- ✅ **Pattern Testing**: [17/17 complete](checklists/pattern-testing.md)
- ⚠️ **Text Overlay Testing**: [0/7 complete](checklists/text-overlay-testing.md)
- ⚠️ **Environment Testing**: [0/9 complete](checklists/environment-testing.md)

## Issue Reporting

For public bug reports, please use our [GitHub Issues](https://github.com/reowens/ascii-splash/issues) page with the bug report template.

- **Bug Report Template**: `.github/ISSUE_TEMPLATE/bug_report.md`
- **Feature Request Template**: `.github/ISSUE_TEMPLATE/feature_request.md`

---

**Last Updated**: November 2, 2025
