---
phase: 01-l1-compression-engine-validator
fixed_at: 2026-07-24T06:20:00Z
review_path: .planning/phases/01-l1-compression-engine-validator/01-REVIEW.md
iteration: 1
findings_in_scope: 11
fixed: 11
skipped: 0
status: all_fixed
---

# Phase 1: Code Review Fix Report

**Fixed at:** 2026-07-24T06:20:00Z
**Source review:** `.planning/phases/01-l1-compression-engine-validator/01-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 11
- Fixed: 11
- Skipped: 0

## Fixed Issues

### CR-01: `extractCarveOuts` double-wraps section bodies (broken round-trip)

**Files modified:** `packages/core/src/carveouts.ts`, `packages/core/tests/unit/carveouts.test.ts`, `packages/core/tests/fixtures/sample-claude.md`
**Commit:** 5958728 (follow-up fixture: 373795a)
**Applied fix:** Run section-body protection before line/regex carve-outs; skip lines that already look like placeholders inside `protectSectionBody`. Added round-trip unit test for `## Security` / `## Pull Request` bodies. Moved irreversible/step fixture lines under `## Workflow` so section-first protection does not absorb all five categories into `security`.

### CR-02: Sidecar create is not atomic — corrupt `.original` can be permanently pinned

**Files modified:** `packages/core/src/backup.ts`
**Commit:** d0d06c4
**Applied fix:** Create sidecar with exclusive `open(..., "wx")`, write full content to the fd, and `unlink` the sidecar if the write fails partway so partial backups are never left as immutable truth.

### WR-01: Filler removal leaves leading / doubled whitespace

**Files modified:** `packages/core/src/compressor.ts`
**Commit:** 7e2b106
**Applied fix:** `normalizeWhitespace` now uses `.trim()` (start + end) after collapsing internal runs.

### WR-02: Irreversible carve-out matches substrings (`confirm` inside `confirmation`)

**Files modified:** `packages/core/src/carveouts.ts`
**Commit:** c784d67
**Applied fix:** Added word boundaries around bare irreversible keywords (`\bconfirm\b`, `\birreversible\b`, etc.).

### WR-03: `extractInlineCodes` still scans fenced code contents

**Files modified:** `packages/core/src/tokenizer.ts`
**Commit:** 33f1768
**Applied fix:** Strip full fenced regions via `extractCodeBlocks` offset walk before matching inline code.

### WR-04: `rollback` skips path hardening used by compress/validate

**Files modified:** `packages/core/src/cli.ts`
**Commit:** 988063d
**Status:** fixed: requires human verification
**Applied fix:** Added `hardenWritablePath` (parent `realpath` + symlink refuse, optional `allowMissing`); `runRollback` uses it with `allowMissing: true` so deleted targets can still restore. Logic path change — confirm restore-of-missing-target still works in practice.

### WR-05: `hasSidecar` treats symlink sidecars as present, then read throws

**Files modified:** `packages/core/src/backup.ts`
**Commit:** 0728e54
**Applied fix:** `sidecarExists` now uses `lstat` and returns `false` when the sidecar path is a symlink (does not follow).

### WR-06: `WARNING:` lines classified as `error` carve-outs, not `security`

**Files modified:** `packages/core/src/carveouts.ts`
**Commit:** 1cb8206
**Applied fix:** Removed `Warning` from `ERROR_LINE_REGEX` so `SECURITY_LINE_REGEX` owns `WARNING` / `WARNING:` lines.

### IN-01: `validate` without sidecar always reports pass

**Files modified:** `packages/core/src/cli.ts`, `packages/core/tests/integration/cli.test.ts`
**Commit:** e13470d
**Applied fix:** Clarified stdout that nothing was compared (self-check only); kept exit code 0. Updated integration test expectation.

### IN-02: `--diff` output is not a real unified diff

**Files modified:** `packages/core/src/cli.ts`
**Commit:** b57ba3e
**Applied fix:** Renamed helper to `lineAlignmentPreview`, documented as not unified/LCS; updated Commander `--diff` help text.

### IN-03: Canonical basename set duplicated

**Files modified:** `packages/core/src/compressor.ts`, `packages/core/src/cli.ts`, `packages/core/src/index.ts`
**Commit:** 4cb4e1a
**Applied fix:** Exported `CANONICAL_BASENAMES` from `compressor.ts` (and re-exported from `index.ts`); CLI imports the shared set.

## Skipped Issues

None — all findings were fixed.

---

_Fixed: 2026-07-24T06:20:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
