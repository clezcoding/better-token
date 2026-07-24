---
phase: 01-l1-compression-engine-validator
plan: 02
subsystem: api
tags: [typescript, sidecar-backup, atomic-write, idempotency, commander, vitest, fs-promises]

requires:
  - phase: 01-01
    provides: compressMarkdownWithValidation, byte-exact validator gate, dry-run CLI skeleton
provides:
  - compressFile write path with validator gate and atomic rename
  - .original sidecar backup (create-if-missing, never-overwrite)
  - fixed-point idempotency (re-run no-op)
  - mode-switch recompress from sidecar original (D-13)
  - rollback CLI restoring from sidecar
affects: [01-03-PLAN, phase-2-mcp, phase-3-adapters]

tech-stack:
  added: []
  patterns: [sidecar backup beside source, temp-file atomic write, fixed-point idempotency without in-file markers]

key-files:
  created:
    - packages/core/src/backup.ts
    - packages/core/tests/unit/backup.test.ts
  modified:
    - packages/core/src/compressor.ts
    - packages/core/src/cli.ts
    - packages/core/src/index.ts
    - packages/core/tests/integration/cli.test.ts

key-decisions:
  - "Sidecar path is <file>.original suffix beside source (D-05)"
  - "Mode switch reads original from existing sidecar, never stacks compression (D-13)"
  - "SAFE-01 write-path gate tested via in-process compressFile spy (CLI subprocess cannot mock validator)"

patterns-established:
  - "Sidecar lifecycle: create on first compress, consume on rollback, re-create on next compress"
  - "compressFile: validate → fixed-point check → createSidecarIfMissing → atomicWriteFile"

requirements-completed: [COMP-04, COMP-05]

coverage:
  - id: D1
    description: "compress writes after validator pass; failure leaves original unchanged"
    requirement: COMP-05
    verification:
      - kind: integration
        ref: "packages/core/tests/integration/cli.test.ts#SAFE-01: validator failure on compressFile keeps original"
        status: pass
    human_judgment: false
  - id: D2
    description: "Re-run compress on already-compressed file is fixed-point no-op"
    requirement: COMP-04
    verification:
      - kind: integration
        ref: "packages/core/tests/integration/cli.test.ts#COMP-04: re-run on already-compressed file is no-op"
        status: pass
    human_judgment: false
  - id: D3
    description: "Sidecar .original created on first compress, never overwritten"
    requirement: COMP-05
    verification:
      - kind: unit
        ref: "packages/core/tests/unit/backup.test.ts#createSidecarIfMissing does not overwrite existing sidecar"
        status: pass
      - kind: integration
        ref: "packages/core/tests/integration/cli.test.ts#COMP-05: compress creates sidecar; rollback restores"
        status: pass
    human_judgment: false
  - id: D4
    description: "rollback restores from sidecar and removes sidecar"
    requirement: COMP-05
    verification:
      - kind: integration
        ref: "packages/core/tests/integration/cli.test.ts#COMP-05: rollback recovers deleted target from sidecar"
        status: pass
    human_judgment: false
  - id: D5
    description: "Mode switch recompresses from sidecar original, not stacked compression"
    requirement: COMP-04
    verification:
      - kind: integration
        ref: "packages/core/tests/integration/cli.test.ts#D-13: mode switch recompresses from sidecar original"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-07-24
status: complete
---

# Phase 01 Plan 02: Safe Write Path Summary

**Validator-gated compress write with `.original` sidecar backup, fixed-point idempotency, mode-switch-from-sidecar, and rollback CLI**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-24T05:36:48Z
- **Completed:** 2026-07-24T05:40:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- `compressFile` write path: validator gate, atomic temp+rename, sidecar create-if-missing
- Fixed-point idempotency: re-run prints `already compressed — no changes`, exit 0
- D-13 mode switch: recompress from sidecar original, never stack on compressed content
- `rollback <path>` restores file, unlinks sidecar; recovers deleted targets
- `--force` rejected; dry-run never creates sidecar; no in-file idempotency markers

## Task Commits

Each task committed atomically:

1. **Task 1: Real write path with sidecar + fixed-point idempotency** — `bc35837` (test RED), `6cba747` (feat GREEN)
2. **Task 2: rollback command + sidecar lifecycle** — `1e374b6` (test coverage)

## Files Created/Modified

- `packages/core/src/backup.ts` — Sidecar API, atomic writes, MissingSidecarError, 10 MiB cap, realpath hardening
- `packages/core/src/compressor.ts` — `compressFile` with D-13 sidecar-aware original resolution
- `packages/core/src/cli.ts` — Write path on compress; rollback command
- `packages/core/src/index.ts` — Public exports for backup + compressFile
- `packages/core/tests/unit/backup.test.ts` — Sidecar unit tests
- `packages/core/tests/integration/cli.test.ts` — COMP-04/05, D-13/15/06, SAFE-01, lifecycle tests

## Decisions Made

- Sidecar suffix `<path>.original` beside source file (D-05)
- SAFE-01 write-path gate verified in-process via compressFile + vi.spyOn (subprocess CLI cannot mock)
- Rollback command implemented in Task 1 feat commit since COMP-05 integration tests require it

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] SAFE-01 integration test uses in-process compressFile instead of CLI spawn**
- **Found during:** Task 1 verification
- **Issue:** vi.spyOn on validator has no effect in tsx subprocess spawned by CLI integration helper
- **Fix:** Test compressFile directly with mocked validate; CLI path still covered by validator: fail stats line via other flows
- **Files modified:** packages/core/tests/integration/cli.test.ts
- **Committed in:** 6cba747

None otherwise — plan executed as written.

---

**Total deviations:** 1 auto-fixed (1 missing critical test approach)
**Impact on plan:** Test coverage preserved; no behavior change.

## Issues Encountered

None blocking.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 01-03 can extend safe/aggressive modes and interactive prompts on top of durable write/rollback
- Public API exports compressFile + backup helpers for adapters and MCP proxy

---
*Phase: 01-l1-compression-engine-validator*
*Completed: 2026-07-24*

## Self-Check: PASSED

- FOUND: .planning/phases/01-l1-compression-engine-validator/01-02-SUMMARY.md
- FOUND: commit bc35837
- FOUND: commit 6cba747
- FOUND: commit 1e374b6
