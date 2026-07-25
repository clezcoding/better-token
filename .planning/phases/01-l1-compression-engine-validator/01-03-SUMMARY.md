---
phase: 01-l1-compression-engine-validator
plan: 03
subsystem: api
tags: [typescript, vitest, commander, readline, compression-modes, validate-cli, canonical-detection]

requires:
  - phase: 01-01
    provides: balanced compressor, byte-exact validator gate, dry-run CLI
  - phase: 01-02
    provides: compressFile write path, sidecar backup, rollback CLI
provides:
  - safe / balanced / aggressive compression modes with validator always on
  - detectCanonicalFiles helper for D-16 canonical rule file set
  - validate command with sidecar compare or internal consistency check
  - interactive TTY multi-select compress over detected canonicals
  - non-TTY --yes bulk compress and path validation (D-18, D-19)
affects: [phase-2-mcp, phase-3-adapters]

tech-stack:
  added: []
  patterns: [three-tier heuristic dispatch, carve-out-aware paragraph merge, readline interactive canonical picker]

key-files:
  created: []
  modified:
    - packages/core/src/compressor.ts
    - packages/core/src/cli.ts
    - packages/core/src/index.ts
    - packages/core/tests/unit/compressor.test.ts
    - packages/core/tests/integration/cli.test.ts

key-decisions:
  - "Aggressive paragraph merge skips blocks containing __CARVEOUT_ placeholders to preserve byte-exact carve-out boundaries"
  - "BETTER_TOKEN_TEST_TTY=1 test hook simulates TTY for D-17 subprocess integration tests"
  - "Default mode remains balanced when --mode omitted (D-11)"

patterns-established:
  - "compressProse dispatches compressSafe → compressBalanced → compressAggressive with shared validator gate"
  - "CLI path hardening: realpath parent, NUL-byte binary rejection, canonical warning for non-canonical .md"

requirements-completed: [COMP-02, SAFE-01]

coverage:
  - id: D1
    description: "All three compression modes deterministic with validator gate and unchanged headings"
    requirement: COMP-02
    verification:
      - kind: unit
        ref: "packages/core/tests/unit/compressor.test.ts#COMP-02"
        status: pass
      - kind: integration
        ref: "packages/core/tests/integration/cli.test.ts#COMP-02"
        status: pass
    human_judgment: false
  - id: D2
    description: "Aggressive mode introduces no new tokens outside protected regions"
    requirement: COMP-02
    verification:
      - kind: unit
        ref: "packages/core/tests/unit/compressor.test.ts#COMP-02: aggressive does not invent new tokens"
        status: pass
    human_judgment: false
  - id: D3
    description: "Validator failure returns original unchanged in every mode (SAFE-01)"
    requirement: SAFE-01
    verification:
      - kind: unit
        ref: "packages/core/tests/unit/compressor.test.ts#SAFE-01"
        status: pass
    human_judgment: false
  - id: D4
    description: "Standalone validate command passes/fails with sidecar or internal check"
    requirement: COMP-02
    verification:
      - kind: integration
        ref: "packages/core/tests/integration/cli.test.ts#D-10"
        status: pass
    human_judgment: false
  - id: D5
    description: "Interactive TTY prompt selects canonical files; non-TTY requires --yes"
    verification:
      - kind: integration
        ref: "packages/core/tests/integration/cli.test.ts#D-17"
        status: pass
      - kind: integration
        ref: "packages/core/tests/integration/cli.test.ts#D-18"
        status: pass
    human_judgment: false
  - id: D6
    description: "Non-canonical .md warns; binary and directory paths hard-rejected"
    verification:
      - kind: integration
        ref: "packages/core/tests/integration/cli.test.ts#D-19"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-07-24
status: complete
---

# Phase 01 Plan 03: Phase 1 CLI Surface Summary

**Three compression modes (safe/balanced/aggressive) with always-on validator, plus validate command, TTY interactive canonical picker, and path validation**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-24T05:40:33Z
- **Completed:** 2026-07-24T05:44:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- `compressSafe`, `compressBalanced`, `compressAggressive` with monotonic compression and no invented tokens
- `better-token validate <path>` with sidecar compare or internal consistency report
- `better-token compress` with no path: TTY multi-select (D-17), non-TTY `--yes` bulk (D-18)
- Path validation: canonical warning for arbitrary `.md`, hard reject for binary/directory (D-19)
- 65 green unit + integration tests; Phase 1 CLI contract complete

## Task Commits

Each task committed atomically:

1. **Task 1: safe and aggressive heuristic sets** — `2bd6ccc` (test), `4fa8d92` (feat)
2. **Task 2: validate command + interactive CLI** — `abc8d5e` (feat)

## Files Created/Modified

- `packages/core/src/compressor.ts` — Mode dispatch, aggressive densification, detectCanonicalFiles
- `packages/core/src/cli.ts` — validate command, TTY prompt, --yes, path validation
- `packages/core/src/index.ts` — Export detectCanonicalFiles
- `packages/core/tests/unit/compressor.test.ts` — COMP-02, SAFE-01/03 per mode
- `packages/core/tests/integration/cli.test.ts` — COMP-02, D-10, D-17, D-18, D-19

## Decisions Made

- Aggressive merge skips blocks with carve-out placeholders to preserve byte-exact boundaries
- BETTER_TOKEN_TEST_TTY env hook for subprocess D-17 tests (readline requires TTY semantics)
- Canonical file list sorted alphabetically in interactive prompt (AGENTS before CLAUDE)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Aggressive merge corrupted error carve-out leading newline**
- **Found during:** Task 1 verification
- **Issue:** mergeConsecutiveParagraphs merged prose into carve-out blocks, changing `\nError:` prefix
- **Fix:** Treat blocks containing `__CARVEOUT_` or any placeholder line as non-mergeable
- **Files modified:** packages/core/src/compressor.ts
- **Committed in:** 4fa8d92

**2. [Rule 1 - Bug] countTokens removed from cli.ts during TTY helper add**
- **Found during:** Task 2 CLI integration tests
- **Issue:** ReferenceError in runCompress dry-run path
- **Fix:** Restored countTokens function after isInteractiveTTY helper
- **Files modified:** packages/core/src/cli.ts
- **Committed in:** abc8d5e

**3. [Rule 2 - Missing Critical] BETTER_TOKEN_TEST_TTY test hook for D-17**
- **Found during:** Task 2 verification
- **Issue:** Subprocess CLI cannot set process.stdin.isTTY true for readline prompt
- **Fix:** isInteractiveTTY() also checks BETTER_TOKEN_TEST_TTY=1 in test env
- **Files modified:** packages/core/src/cli.ts
- **Committed in:** abc8d5e

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 testability hook)
**Impact on plan:** No scope creep; correctness and test coverage preserved.

## Issues Encountered

None blocking.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 1 complete: compress, rollback, validate with all modes and path handling
- Phase 2 MCP proxy can consume compressFile + detectCanonicalFiles
- Phase 3 adapters can hook canonical detection and validate command

---
*Phase: 01-l1-compression-engine-validator*
*Completed: 2026-07-24*

## Self-Check: PASSED

- FOUND: .planning/phases/01-l1-compression-engine-validator/01-03-SUMMARY.md
- FOUND: commit 2bd6ccc
- FOUND: commit 4fa8d92
- FOUND: commit abc8d5e
