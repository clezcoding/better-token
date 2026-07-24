---
phase: 01-l1-compression-engine-validator
reviewed: 2026-07-24T06:11:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - packages/core/src/backup.ts
  - packages/core/src/carveouts.ts
  - packages/core/src/cli.ts
  - packages/core/src/compressor.ts
  - packages/core/src/index.ts
  - packages/core/src/tokenizer.ts
  - packages/core/src/validator.ts
  - packages/core/tests/integration/cli.test.ts
  - packages/core/tests/unit/backup.test.ts
  - packages/core/tests/unit/carveouts.test.ts
  - packages/core/tests/unit/compressor.test.ts
  - packages/core/tests/unit/tokenizer.test.ts
  - packages/core/tests/unit/validator.test.ts
findings:
  critical: 2
  warning: 6
  info: 3
  total: 11
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-07-24T06:11:00Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Reviewed L1 core engine (tokenizer, carve-outs, compressor, validator, backup, CLI) plus unit/integration tests. Compress path mostly fail-closes on validator mismatch, and symlink guards exist on read/write. Two critical defects remain: `extractCarveOuts` double-wraps section bodies (public API cannot round-trip; validator carve-out lists contain nested placeholder garbage), and sidecar creation is non-atomic so a crashed first write can permanently pin a corrupt `.original`. Additional warnings cover dead section protection during tokenize, filler whitespace residue, irreversible substring over-match, inline-code extraction inside fences, and CLI rollback/path hardening gaps.

## Critical Issues

### CR-01: `extractCarveOuts` double-wraps section bodies (broken round-trip)

**File:** `packages/core/src/carveouts.ts:112-132`
**Issue:** Regex carve-outs run first, then `protectSectionBody` re-tokenizes every line under `## Security` / `## Pull Request`, including lines that are already placeholders. Single-pass `detokenizeMarkdown` cannot unwrap nesting, so standalone `extractCarveOuts` fails identity on any doc with those sections. Proven: `detokenize(extractCarveOuts(body)) !== body` for the sample fixture body. `extractCarveoutStrings` (used by the validator) therefore stores nested placeholder strings as "carve-out values" (e.g. security category contains `__CARVEOUT_ERROR_*__` / `__CARVEOUT_STEP_*__`), so the gate is comparing corrupted structures. In `tokenizeMarkdown`, headings are already replaced with `__HEADING_*__` before carve-outs run, so `protectSectionBody` never matches — section protection is dead on the compress path and only "works" indirectly when the validator re-parses raw markdown.
**Fix:** Run section-body protection before line/regex carve-outs, or skip lines that already look like placeholders inside `protectSectionBody`. Prefer protecting the whole section body as one token (or line tokens) once:

```typescript
// Option A: section pass first, then line regexes on remaining prose only
text = protectSectionBody(text, /^##\s+(Security|Security Warning|Warnung)\s*$/i, "security", tokens, counters, nonce);
text = protectSectionBody(text, /^##\s+(Pull Request|PR)\s*$/i, "commit", tokens, counters, nonce);
for (const { category, regex } of CATEGORY_PATTERNS) {
  regex.lastIndex = 0;
  text = protectRegexMatches(text, regex, category, tokens, counters, nonce);
}

// Option B: inside protectSectionBody, do not re-wrap existing placeholders
if (/^__CARVEOUT_[A-Z0-9_]+__$/.test(bodyLine) || /^__[A-Z][A-Za-f0-9]*(?:_[A-Za-f0-9]+)*__$/.test(bodyLine)) {
  output.push(bodyLine);
  i += 1;
  continue;
}
```

Also add a round-trip unit test for docs containing `## Security` / `## Pull Request` bodies.

### CR-02: Sidecar create is not atomic — corrupt `.original` can be permanently pinned

**File:** `packages/core/src/backup.ts:85-102`
**Issue:** `createSidecarIfMissing` writes the sidecar with a single `writeFile(..., { flag: "wx" })` (no temp + rename). If the process crashes mid-write, a partial `.original` remains. Because existing sidecars are never overwritten (`EEXIST` → `false`), every later `compressFile` / mode-switch / rollback treats that truncated content as immutable truth. That is a data-loss / backup-integrity failure on the safety path the phase advertises.
**Fix:** Write to a unique temp file in the real parent dir, then publish with an exclusive create (e.g. `link`/`copyFile` + `wx`, or write temp then `rename` only when sidecar is absent, re-checking with `wx` open). On any failure, delete the temp; never leave a partial final sidecar:

```typescript
export async function createSidecarIfMissing(path: string, content?: string): Promise<boolean> {
  const sidecar = sidecarPathFor(path);
  await assertNotSymlink(path);
  await assertNotSymlink(sidecar);
  const bytes = content ?? (await readFileWithCap(path));
  const parent = await resolveSafeParentDir(path);
  const tempPath = join(parent, `.${basename(sidecar)}.${randomBytes(8).toString("hex")}.tmp`);
  try {
    await writeFile(tempPath, bytes, "utf-8");
    try {
      await writeFile(sidecar, await readFile(tempPath), { encoding: "utf-8", flag: "wx" });
      // or: fs.promises.link(tempPath, sidecar) where supported
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "EEXIST") return false;
      throw err;
    }
    return true;
  } finally {
    await unlink(tempPath).catch(() => {});
  }
}
```

Better: `open(sidecar, "wx")` then write the full buffer to that fd, and `unlink` the sidecar if the write fails partway.

## Warnings

### WR-01: Filler removal leaves leading / doubled whitespace

**File:** `packages/core/src/compressor.ts:65-83`
**Issue:** `applyFillers` deletes phrases like `Please make sure to` without normalizing the hole. `normalizeWhitespace` collapses internal runs and `trimEnd`s but does not `trimStart`, so balanced compress produces lines like `" read docs."`. Wastes tokens and dirties diffs; also shows filler deletion is not cleaned to a stable prose form.
**Fix:** After filler application, normalize each modified line with `.replace(/[ \t]+/g, " ").trim()` (or trimStart+trimEnd), not only `trimEnd`.

### WR-02: Irreversible carve-out matches substrings (`confirm` inside `confirmation`)

**File:** `packages/core/src/carveouts.ts:21-22`
**Issue:** `IRREVERSIBLE_REGEX` uses bare `confirm|irreversible|...` without word boundaries. Input `Ask for confirmation` becomes `Ask for __CARVEOUT_IRREVERSIBLE_0__ation`. Round-trip still works, but protection is semantically wrong and can interact badly with later prose transforms / validator messaging.
**Fix:**

```typescript
const IRREVERSIBLE_REGEX =
  /\bconfirm\b|\birreversible\b|\bdestructive\b|--force|\brm -rf\b|\bDROP TABLE\b|\bDELETE FROM\b|git push --force|git reset --hard/gim;
```

### WR-03: `extractInlineCodes` still scans fenced code contents

**File:** `packages/core/src/tokenizer.ts:88-94`
**Issue:** Fence open/close lines are filtered out, but interior fence lines remain. Backticks inside code blocks are counted as inline code by both tokenizer helpers and the validator. That couples fence contents into the inline-code gate and can cause false mismatches (or mask real inline-code loss) if fence extraction and inline extraction ever diverge.
**Fix:** Strip full fenced regions (same algorithm as `extractCodeBlocks`) before running `INLINE_CODE_REGEX`, or only scan lines not inside an open fence.

### WR-04: `rollback` skips path hardening used by compress/validate

**File:** `packages/core/src/cli.ts:316-329`
**Issue:** `runRollback` only `resolve`s the path and calls `restoreFromSidecar`. It does not use `validateMarkdownInputPath` / `hardenPath` (extension check, nul-byte check, parent `realpath`). Symlink refusal inside backup helps, but rollback accepts any path shape and error messaging is inconsistent with compress/validate. Recovering a deleted target works (covered by tests) — keep that — but still harden parent + refuse symlinks before restore.
**Fix:** Share a `hardenWritablePath(resolved, { allowMissing: true })` helper used by rollback; keep markdown extension warnings optional for rollback if recovery of non-canonical names is desired, but always `realpath` the parent and reject symlink targets.

### WR-05: `hasSidecar` treats symlink sidecars as present, then read throws

**File:** `packages/core/src/backup.ts:57-64`, `packages/core/src/compressor.ts:316-318`
**Issue:** `sidecarExists` uses `access(F_OK)` (symlink path exists → `true`). `compressFile` then calls `readSidecar` → `readFileWithCap` → `assertNotSymlink` throws a generic Error instead of treating the backup as unusable / missing. Compress aborts hard rather than fail closed with a clear backup-integrity error.
**Fix:** Make `sidecarExists` / `hasSidecar` use `lstat` and return `false` (or throw a dedicated `InvalidSidecarError`) when the sidecar path is a symlink; do not follow it.

### WR-06: `WARNING:` lines classified as `error` carve-outs, not `security`

**File:** `packages/core/src/carveouts.ts:13-35`
**Issue:** `ERROR_LINE_REGEX` includes `Warning` and runs before `SECURITY_LINE_REGEX`. A line like `WARNING: never expose API keys` is stored under the `error` category. Security-section tooling and mismatch messages become misleading; category-specific policies later will be wrong.
**Fix:** Remove `Warning` from `ERROR_LINE_REGEX` (keep `Error|TypeError|...`), and let `SECURITY_LINE_REGEX` own `WARNING` / `WARNING:`.

## Info

### IN-01: `validate` without sidecar always reports pass

**File:** `packages/core/src/cli.ts:249-267`
**Issue:** When no `.original` exists, CLI calls `validate(current, current)`, which always succeeds, then prints `no original to compare; internal check passed`. Matches D-10 tests, but operators can mistake this for a real integrity check.
**Fix:** Keep behavior, but make stderr/stdout explicit that nothing was compared (already mostly true). Consider exit code `0` with a distinct machine-readable status later.

### IN-02: `--diff` output is not a real unified diff

**File:** `packages/core/src/cli.ts:72-89`
**Issue:** Line-aligned `-/+/ ` dump without hunk headers or LCS; misleads users expecting `diff -u` semantics when insertions shift later lines.
**Fix:** Document as "line alignment preview" or switch to a small diff library / LCS hunk emitter.

### IN-03: Canonical basename set duplicated

**File:** `packages/core/src/cli.ts:26-33`, `packages/core/src/compressor.ts:29-36`
**Issue:** `CANONICAL_BASENAMES` is copy-pasted in CLI and compressor; drift risk when adding names.
**Fix:** Export one set from `compressor.ts` (or a tiny `canonical.ts`) and import it in the CLI.

---

_Reviewed: 2026-07-24T06:11:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
