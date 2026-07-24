---
phase: 01-l1-compression-engine-validator
reviewed: 2026-07-24T05:47:13Z
depth: standard
files_reviewed: 15
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
  - package.json
  - packages/core/package.json
findings:
  critical: 4
  warning: 6
  info: 3
  total: 13
status: issues
---

# Phase 01: Code Review Report

**Reviewed:** 2026-07-24T05:47:13Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues

## Summary

Phase-01 L1 engine (tokenize → compress → validate → sidecar write/rollback) reviewed with focus on path traversal, sidecar never-overwrite, validator bypass, atomic write races, CLI injection, and deterministic compression. CLI has no shell/exec injection surface. Write path does call the validator before mutate. Several ship-blocking gaps remain: sidecar create is check-then-write without `wx`, sidecar content is re-read from disk instead of the already-loaded original, and the validator treats URL/path/inline-code as sorted multisets (reorder bypasses SAFE-01). Placeholder collision in `detokenizeMarkdown` can silently corrupt prose while still passing validation.

## Critical Issues

### CR-01: Sidecar never-overwrite is TOCTOU (no exclusive create)

**File:** `packages/core/src/backup.ts:67-75`
**Issue:** `createSidecarIfMissing` checks existence then `writeFile` with default flags (`w`). Concurrent `compress` on the same path can both observe “missing” and the second write overwrites the first sidecar. That violates COMP-05 / D-05 never-overwrite and can replace a true original with a later (possibly already compressed) snapshot.
**Fix:**
```typescript
export async function createSidecarIfMissing(
  path: string,
  content?: string,
): Promise<boolean> {
  const sidecar = sidecarPathFor(path);
  const bytes = content ?? (await readFileWithCap(path));
  try {
    await writeFile(sidecar, bytes, { encoding: "utf-8", flag: "wx" });
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw err;
  }
}
```

### CR-02: Sidecar re-reads target instead of backing up known original

**File:** `packages/core/src/backup.ts:72-74` / `packages/core/src/compressor.ts:300-347`
**Issue:** `compressFile` already holds the correct `original` bytes, but `createSidecarIfMissing` calls `readFileWithCap(path)` again. Any intervening writer (second CLI, editor, partial tool) can cause the sidecar to store compressed or unrelated content while the never-overwrite check still passes on later runs — permanent loss of the true original.
**Fix:** Pass the in-memory original into sidecar creation and never re-read for the first backup:
```typescript
// compressor.ts
await createSidecarIfMissing(path, original);
await atomicWriteFile(path, compressed);
```

### CR-03: Validator reorder bypass for URLs, paths, and inline code

**File:** `packages/core/src/validator.ts:32-48`
**Issue:** Inline codes, URLs, and paths are compared after `.sort()`. A compressor bug (or future mode) that swaps two distinct protected tokens keeps the sorted multiset equal and returns `ok: true`. That is a SAFE-01 gate bypass relative to “byte-exact” / order-preserving protection (headings and code blocks correctly keep order).
**Fix:**
```typescript
// Compare positional sequences — do not sort
const origUrls = extractUrls(origBody);
const compUrls = extractUrls(compBody);
if (JSON.stringify(origUrls) !== JSON.stringify(compUrls)) {
  errors.push(/* ... */);
}
// same for paths and inline codes
```

### CR-04: Placeholder collision corrupts content; validator may still pass

**File:** `packages/core/src/tokenizer.ts:158-163`
**Issue:** `detokenizeMarkdown` does global `split(placeholder).join(original)` over the whole document. If user prose or a restored region already contains a string equal to another placeholder (e.g. literal `__URL_0__` while a real URL mapped to `__URL_0__`), every occurrence is replaced. Prose corruption is invisible to the validator (it only checks extracted protected multisets/sequences, not full round-trip equality of non-carve-out text).
**Fix:** Use collision-resistant placeholders (e.g. NUL-delimited or random nonce per run) and/or replace only at known token spans; after detokenize, assert `tokenize`→`detokenize` identity on the candidate before accepting validation.

## Warnings

### WR-01: Symlink hardening only realpaths the parent directory

**File:** `packages/core/src/cli.ts:95-98` / `packages/core/src/backup.ts:27-30`
**Issue:** PROJECT constraint is symlink-safe. Code `realpath`s the parent only. `readFile` / `open` follow a symlink target (content can be copied into `.original`); `rename` replaces the symlink node rather than writing through it. Behavior is partially safe but not a clear refuse-or-realpath-file policy.
**Fix:** `lstat` the path; reject `isSymbolicLink()`, or `realpath` the file and require the resolved path to stay under the intended root before read/write/sidecar.

### WR-02: 10 MiB cap applied inconsistently

**File:** `packages/core/src/compressor.ts:300` / `packages/core/src/cli.ts:166-167` / `packages/core/src/backup.ts:32-37`
**Issue:** Sidecar reads enforce `MAX_FILE_SIZE`, but `compressFile` and CLI dry-run/validate use uncapped `readFile`. Large inputs can OOM or throw late only when creating a sidecar.
**Fix:** Share `readFileWithCap` (or equivalent) for all user-file reads on compress/validate/rollback paths.

### WR-03: `BETTER_TOKEN_TEST_TTY` changes production CLI control flow

**File:** `packages/core/src/cli.ts:36-38`
**Issue:** Any environment with `BETTER_TOKEN_TEST_TTY=1` forces interactive selection even when stdin is not a TTY, which can hang automation or surprise users.
**Fix:** Gate the hook on `NODE_ENV=test` / `process.env.VITEST`, or inject an explicit test-only seam without an env kill-switch in release builds.

### WR-04: Invalid `--mode` throws unhandled Zod error

**File:** `packages/core/src/cli.ts:338-343`
**Issue:** `OptionsSchema.parse` throws on illegal mode values; Commander action does not catch, so users get a stack trace instead of exit code 1 + clear message.
**Fix:**
```typescript
const parsed = OptionsSchema.safeParse({ ... });
if (!parsed.success) {
  console.error(parsed.error.issues[0]?.message ?? "invalid options");
  process.exit(1);
}
```

### WR-05: Identical code fences only first occurrence tokenized

**File:** `packages/core/src/tokenizer.ts:105-114`
**Issue:** `result.replace(block, placeholder)` replaces a single occurrence. Duplicate identical fenced blocks leave the second unprotected; later URL/path/inline passes can mutate inside that fence. Validator may then fail (safe abort) or, with unlucky mutations, behave inconsistently — breaks deterministic “protect all code” intent.
**Fix:** Replace by index/walk of `extractCodeBlocks` spans, or use `replaceAll` only when spans are unique and verified by offset.

### WR-06: Unclosed code fences are not protected

**File:** `packages/core/src/tokenizer.ts:25-58`
**Issue:** `extractCodeBlocks` only returns closed fences. Unclosed ``` regions remain prose and can be altered by fillers / whitespace / aggressive merge while still looking like code to readers.
**Fix:** Treat EOF-unclosed fence as a protected region through end-of-body (fail closed), or fail validation if an opening fence has no close.

## Info

### IN-01: Irreversible carve-out matches bare substrings

**File:** `packages/core/src/carveouts.ts:21-22`
**Issue:** `IRREVERSIBLE_REGEX` matches `confirm` inside words like “confirmation”, over-protecting unrelated prose.
**Fix:** Use word boundaries / line-anchored patterns consistent with other carve-out categories.

### IN-02: `rollback` skips markdown path validation

**File:** `packages/core/src/cli.ts:307-320`
**Issue:** Rollback only `resolve`s the path — no extension/NUL/canonical checks. Likely intentional for deleted-target recovery, but diverges from compress/validate hardening.
**Fix:** Document intentional asymmetry; still apply parent `realpath` + symlink policy shared with backup.

### IN-03: `resolveSafeParentDir` result discarded on sidecar create

**File:** `packages/core/src/backup.ts:72`
**Issue:** Parent realpath is awaited for side effect only; sidecar path is still derived from the unresolved user path. Weakens the hardening story versus `atomicWriteFile`, which writes the temp into the realpathed parent.
**Fix:** Build sidecar path from `join(await resolveSafeParentDir(path), basename(path) + ".original")` after resolving the file identity policy from WR-01.

---

_Reviewed: 2026-07-24T05:47:13Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
