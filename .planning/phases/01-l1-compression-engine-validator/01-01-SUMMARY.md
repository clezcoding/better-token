---
phase: 01-l1-compression-engine-validator
plan: 01
subsystem: api
tags: [typescript, vitest, bpe-lite, commander, zod, esbuild, regex-tokenizer, byte-exact-validator]

requires: []
provides:
  - npm workspaces monorepo with @better-token/core package
  - compress --dry-run CLI with estimated token stats
  - protected-token tokenizer (syntax + SAFE-02 carve-outs)
  - balanced-mode deterministic compressor
  - byte-exact validator gate
affects: [01-02-PLAN, 01-03-PLAN, phase-2-mcp, phase-3-adapters]

tech-stack:
  added: [bpe-lite, commander, zod, vitest, tsx, esbuild, typescript]
  patterns: [regex protected-token placeholders, validator-before-output, offline bpe-lite estimation]

key-files:
  created:
    - packages/core/src/cli.ts
    - packages/core/src/tokenizer.ts
    - packages/core/src/compressor.ts
    - packages/core/src/validator.ts
    - packages/core/src/carveouts.ts
    - packages/core/tests/integration/cli.test.ts
    - packages/core/tests/unit/*.test.ts
  modified:
    - package.json
    - tsconfig.json
    - .gitignore

key-decisions:
  - "T-01-SC packages approved by human: typescript, vitest, tsx"
  - "Regex protected-token pattern over remark/unified (CONTEXT discretion)"
  - "compressMarkdownWithValidation exposes validation result to CLI without bypassing gate"
  - "WARNING lines classify as error carve-out first (plan category order)"

patterns-established:
  - "Protected-token pipeline: tokenize → compressProse → detokenize → validate"
  - "Carve-out placeholders __CARVEOUT_<CATEGORY>_<N>__ applied after syntax protection"
  - "CLI labels all token figures estimated (D-09)"

requirements-completed: [COMP-01, COMP-03, SAFE-01, SAFE-02, SAFE-03]

coverage:
  - id: D1
    description: "compress --dry-run prints estimated before/after/delta with validator pass and no file write"
    requirement: COMP-03
    verification:
      - kind: integration
        ref: "packages/core/tests/integration/cli.test.ts#COMP-03"
        status: pass
    human_judgment: false
  - id: D2
    description: "Deterministic balanced compression with non-zero delta on fixture"
    requirement: COMP-01
    verification:
      - kind: unit
        ref: "packages/core/tests/unit/compressor.test.ts#COMP-01"
        status: pass
      - kind: integration
        ref: "packages/core/tests/integration/cli.test.ts#COMP-01"
        status: pass
    human_judgment: false
  - id: D3
    description: "Byte-exact validator rejects corrupted syntax and carve-out regions"
    requirement: SAFE-01
    verification:
      - kind: unit
        ref: "packages/core/tests/unit/validator.test.ts#SAFE-01"
        status: pass
    human_judgment: false
  - id: D4
    description: "Syntax and semantic carve-outs protected and round-trip byte-identical"
    requirement: SAFE-02
    verification:
      - kind: unit
        ref: "packages/core/tests/unit/tokenizer.test.ts#SAFE-02"
        status: pass
      - kind: unit
        ref: "packages/core/tests/unit/carveouts.test.ts"
        status: pass
    human_judgment: false
  - id: D5
    description: "Non-English content compressed without translation"
    requirement: SAFE-03
    verification:
      - kind: unit
        ref: "packages/core/tests/unit/compressor.test.ts#SAFE-03"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-07-24
status: complete
---

# Phase 01 Plan 01: Walking Skeleton Summary

**Offline `compress --dry-run` with bpe-lite estimated token delta, regex protected-token tokenizer, and byte-exact validator covering SAFE-02 syntax + semantic carve-outs**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-24T05:32:47Z
- **Completed:** 2026-07-24T05:40:00Z
- **Tasks:** 4 (Task 1 human-approved, Tasks 2–4 implemented)
- **Files modified:** 22

## Accomplishments

- npm workspaces monorepo with `@better-token/core` and `better-token` CLI entry
- End-to-end `compress [path] --dry-run` with `estimated` token stats, default `balanced` mode, validator gate
- Protected-token tokenizer for frontmatter, code, URLs, paths, headings
- Five SAFE-02 semantic carve-out categories with placeholder protection and validation
- 24 green unit + integration tests covering COMP-01/03, SAFE-01/02/03

## Task Commits

Each implementation task committed atomically:

1. **Task 1: Approve npm packages (T-01-SC)** — human `approved` (typescript, vitest, tsx); no code commit
2. **Task 2: Scaffold monorepo + dry-run skeleton** — `4be0a54` (feat)
3. **Task 3: Tokenizer + compressor + validator** — `78ed308` (feat)
4. **Task 4: SAFE-02 semantic carve-outs** — `11ef108` (feat)

## Files Created/Modified

- `packages/core/src/cli.ts` — Commander CLI with zod validation, dry-run stats line
- `packages/core/src/tokenizer.ts` — Frontmatter split, syntax placeholders, carve-out integration
- `packages/core/src/compressor.ts` — Balanced prose heuristics + validation wrapper
- `packages/core/src/validator.ts` — Byte-exact gate over syntax + carve-out regions
- `packages/core/src/carveouts.ts` — Five semantic carve-out detectors
- `packages/core/tests/**` — Unit + integration test suite

## Decisions Made

- Human verified [SUS] packages per T-01-SC before `npm install`
- Exported `compressMarkdownWithValidation` so CLI reports `validator: fail` without bypassing gate
- WARNING lines match error category first (plan-fixed category order)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added compressMarkdownWithValidation for CLI validation reporting**
- **Found during:** Task 3
- **Issue:** compressMarkdown returned original on failure, hiding validator: fail from CLI
- **Fix:** Exposed validation result alongside output; CLI uses wrapper for stats line
- **Files modified:** packages/core/src/compressor.ts, packages/core/src/cli.ts
- **Committed in:** 78ed308

**2. [Rule 1 - Bug] Frontmatter body retains leading newline after split**
- **Found during:** Task 3 unit tests
- **Issue:** splitFrontmatter body includes `\n` after closing `---` (matches Python prior-art)
- **Fix:** Tests/assertions aligned to actual byte-preserving behavior
- **Committed in:** 78ed308

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug alignment)
**Impact on plan:** No scope creep; correctness preserved.

## Issues Encountered

None blocking. Task 1 resumed after human package approval checkpoint.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 01-02 can add write/backup/rollback on top of validator-gated compress path
- Plan 01-03 can extend safe/aggressive modes and interactive prompts
- Public library API exported from `packages/core/src/index.ts`

---
*Phase: 01-l1-compression-engine-validator*
*Completed: 2026-07-24*

## Self-Check: PASSED

- FOUND: .planning/phases/01-l1-compression-engine-validator/01-01-SUMMARY.md
- FOUND: commit 4be0a54
- FOUND: commit 78ed308
- FOUND: commit 11ef108
