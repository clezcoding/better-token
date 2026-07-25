---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 2
current_phase_name: MCP Shrink Proxy
status: shipped
stopped_at: "Phase 01 shipped — PR #1"
last_updated: "2026-07-24T22:53:30.147Z"
last_activity: 2026-07-24
progress:
  total_phases: 1
  completed_phases: 1
  total_plans: 3
  completed_plans: 3
last_activity_desc: Phase 01 shipped — PR #1
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-24)

**Core value:** Deterministic, byte-verified input/context compression that cuts tokens without substance loss — every time, not only when the model cooperates.
**Current focus:** Phase 2 — MCP Shrink Proxy

## Current Position

Phase: 2 — MCP Shrink Proxy
Plan: Not started
Status: Phase 01 shipped — PR #1 (rebase onto main)
Last activity: 2026-07-25 - Completed quick task 260725-a9t: CodeQL ReDoS fixes

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**

- Total plans completed: 3
- Average duration: — min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. L1 Compression Engine & Validator | 0 | — | — |
| 2. MCP Shrink Proxy | 0 | — | — |
| 3. Claude Code & Cursor Adapters | 0 | — | — |
| 4. Honest Stats & Verification | 0 | — | — |
| 5. Profile Compiler & Installer | 0 | — | — |
| 01 | 3 | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01-l1-compression-engine-validator P01 | 8 | 4 tasks | 22 files |
| Phase 01-l1-compression-engine-validator P02 | 4 | 2 tasks | 6 files |
| Phase 01-l1-compression-engine-validator P03 | 4 | 2 tasks | 5 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Init]: L1 = deterministic heuristics (no LLM rewrite in v1); validator is hard gate with `.original` rollback
- [Init]: Depth-first — Claude Code + Cursor before breadth
- [Init]: Package/CLI named `better-token`; OSS core, MIT, no telemetry, English docs
- [Phase ?]: T-01-SC: human approved typescript, vitest, tsx before npm install
- [Phase ?]: compressMarkdownWithValidation exposes validation to CLI without bypassing gate
- [Phase ?]: Sidecar path is file.original suffix beside source (D-05)
- [Phase ?]: Mode switch reads original from sidecar, never stacks compression (D-13)
- [Phase ?]: Aggressive merge skips __CARVEOUT_ blocks to preserve byte-exact carve-out boundaries
- [Phase ?]: BETTER_TOKEN_TEST_TTY=1 hook enables D-17 subprocess integration tests

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 3 will need deeper research into Claude Code hook payloads and `hookSpecificOutput` behavior during compaction (flagged in research/SUMMARY.md)
- Phase 2 will need research into stdio JSON-RPC stream buffering to avoid stream-draining regressions

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260725-1my | Fix .gitignore + GitHub CI/automation stack + verify GSD Cursor config | 2026-07-25 | 22a9bdc | [260725-1my-task-1-fix-gitignore-so-only-relevant-fi](./quick/260725-1my-task-1-fix-gitignore-so-only-relevant-fi/) |
| 260725-1x5 | Branch protection on main via gh CLI + land prior CI on main | 2026-07-25 | 91a24ae | [260725-1x5-set-up-github-branch-protection-on-main-](./quick/260725-1x5-set-up-github-branch-protection-on-main-/) |
| 260725-a0s | PR: labels+automerge+CI + fix all Dependabot security alerts (vitest 4.1.10) | 2026-07-25 | a5b05f5 | [260725-a0s-push-labels-automerge-ci-branch-as-pr-th](./quick/260725-a0s-push-labels-automerge-ci-branch-as-pr-th/) |
| 260725-a9t | Fix CodeQL polynomial ReDoS (#1-6) + local tree integrity audit | 2026-07-25 | b20b5b5 | [260725-a9t-fix-all-code-scanning-security-issues-th](./quick/260725-a9t-fix-all-code-scanning-security-issues-th/) |

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-07-25
Stopped at: Phase 01 PR #1 rebased onto main (awaiting merge)
Resume file: .planning/.continue-here.md
PR: https://github.com/clezcoding/better-token/pull/1
