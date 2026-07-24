---
phase: 01-l1-compression-engine-validator
fixed_at: 2026-07-24T06:00:30Z
review_path: .planning/phases/01-l1-compression-engine-validator/01-REVIEW.md
iteration: 1
findings_in_scope: 10
fixed: 10
skipped: 0
status: all_fixed
---

# Phase 01: Code Review Fix Report

**Fixed at:** 2026-07-24T06:00:30Z
**Source review:** `.planning/phases/01-l1-compression-engine-validator/01-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 10
- Fixed: 10
- Skipped: 0

## Fixed Issues

### CR-01: Sidecar never-overwrite is TOCTOU (no exclusive create)

**Files modified:** `packages/core/src/backup.ts`
**Commit:** `bed0bb0`
**Applied fix:** `createSidecarIfMissing` now uses exclusive `writeFile` with `flag: "wx"` and treats `EEXIST` as already-backed-up (`false`). Optional `content` parameter added for in-memory original.

### CR-02: Sidecar re-reads target instead of backing up known original

**Files modified:** `packages/core/src/compressor.ts`
**Commit:** `7f8cced`
**Applied fix:** `compressFile` passes the already-loaded `original` into `createSidecarIfMissing(path, original)` so the sidecar never re-reads disk for the first backup.

### CR-03: Validator reorder bypass for URLs, paths, and inline code

**Files modified:** `packages/core/src/validator.ts`
**Commit:** `6568b1f`
**Applied fix:** Removed `.sort()` on inline codes, URLs, and paths — compare positional sequences via `JSON.stringify` like headings/code blocks.

### CR-04: Placeholder collision corrupts content; validator may still pass

**Files modified:** `packages/core/src/tokenizer.ts`, `packages/core/src/carveouts.ts`, `packages/core/src/compressor.ts`, `packages/core/tests/unit/tokenizer.test.ts`
**Commit:** `7f04e7c` (+ follow-up `b3fce0c`)
**Applied fix:** Per-run 16-hex nonce in all placeholders; longest-first exact-match detokenize; tokenize→detokenize identity gate before accepting compression. Follow-up widened `PLACEHOLDER_REGEX` to match lowercase nonce hex so aggressive merge still sees tokens.
**Status:** fixed: requires human verification

### WR-01: Symlink hardening only realpaths the parent directory

**Files modified:** `packages/core/src/backup.ts`, `packages/core/src/cli.ts`
**Commit:** `985f284`
**Applied fix:** `lstat` + reject symbolic links in CLI `hardenPath` and backup read/write/sidecar paths.

### WR-02: 10 MiB cap applied inconsistently

**Files modified:** `packages/core/src/backup.ts`, `packages/core/src/compressor.ts`, `packages/core/src/cli.ts`
**Commit:** `fe33c51`
**Applied fix:** Exported `readFileWithCap` and used it for compressFile, CLI dry-run, and validate reads (including sidecar).

### WR-03: `BETTER_TOKEN_TEST_TTY` changes production CLI control flow

**Files modified:** `packages/core/src/cli.ts`
**Commit:** `a95eb67`
**Applied fix:** Test TTY hook only active when `VITEST` is set or `NODE_ENV=test`.

### WR-04: Invalid `--mode` throws unhandled Zod error

**Files modified:** `packages/core/src/cli.ts`
**Commit:** `a65d15a`
**Applied fix:** `OptionsSchema.safeParse` with clear stderr message and `process.exit(1)`.

### WR-05: Identical code fences only first occurrence tokenized

**Files modified:** `packages/core/src/tokenizer.ts`
**Commit:** `0a0e9ff`
**Applied fix:** Offset-walking replacement so each identical fence gets its own placeholder.

### WR-06: Unclosed code fences are not protected

**Files modified:** `packages/core/src/tokenizer.ts`
**Commit:** `e36b62f`
**Applied fix:** Unclosed fences treated as protected regions through EOF (fail closed).

## Skipped Issues

None — all findings were fixed.

## Test results

`npm test -- --run` in `packages/core`: **65/65 passed** (6 files).

---

_Fixed: 2026-07-24T06:00:30Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
