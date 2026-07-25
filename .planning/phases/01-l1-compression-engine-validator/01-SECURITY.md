---
phase: 01
slug: l1-compression-engine-validator
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-24
---

# Phase 01 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| User CLI args → core engine | Untrusted file path / mode | Path strings, mode enum |
| Filesystem → core engine | Untrusted rule/memory file content | Markdown / binary bytes |
| core engine → filesystem (write target) | Compressed output | Validated markdown |
| core engine → filesystem (sidecar) | Original content snapshot | `.original` sidecar bytes |
| TTY stdin → interactive prompt | Untrusted keystrokes | Selection indices only |
| npm registry → node_modules | Package install | Dependency tarballs |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-01-01 | Tampering / Elevation of Privilege | `cli.ts` path handling | high | mitigate | `path.resolve` + parent `realpath`; reject non-`.md`/`.mdc` and binary/NUL; refuse symlink targets; no shell exec | closed |
| T-01-02 | Tampering | `compressFile` / `compressMarkdown` write path | high | mitigate | Byte-exact `validate()` hard pre-write gate; on `ok: false` no write; atomic temp+rename | closed |
| T-01-03 | Tampering / Information Disclosure | Sidecar `<file>.original` | high | mitigate | `createSidecarIfMissing` with `open("wx")`; never overwrite; no sidecar on `--dry-run` | closed |
| T-01-04 | Tampering | Symlink / hostile file size | medium | mitigate | `lstat` refuse symlinks; `realpath` parent; `MAX_FILE_SIZE` 10 MiB read cap | closed |
| T-01-05 | Repudiation / Information Disclosure | CLI token figures | medium | mitigate | All token lines labeled `estimated` (D-09); asserted in `cli.test.ts` | closed |
| T-01-06 | Tampering | Prompt-injection content in rule files | medium | accept | Offline deterministic heuristics; never execute file content | closed |
| T-01-SC | Tampering | npm installs (`typescript`, `vitest`, `tsx` [SUS]) | high | mitigate | Blocking `checkpoint:human-verify` before install; SUMMARY records human approval | closed |
| T-01-07 | Denial of Service | Concurrent `compressFile` same path | medium | mitigate | Atomic rename + fixed-point noop when `compressed === currentContent` | closed |
| T-01-08 | Tampering | `rollback` wrong target | medium | mitigate | Sidecar-derived path only; zod-validated arg; same path hardening as compress | closed |
| T-01-09 | Tampering | `--yes` bulk compress | medium | mitigate | Each file still through `compressFile` (validator + atomic write + sidecar) | closed |
| T-01-10 | Information Disclosure | `validate` with no sidecar | low | accept | Reports internal-only message; no write, no sidecar create, no network egress | closed |
| T-01-11 | Tampering | Interactive prompt path injection | medium | mitigate | Prompt offers only `detectCanonicalFiles` set; never free-form path string | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above `workflow.security_block_on` (`high`) count toward `threats_open`*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01 | T-01-06 | Engine is offline + deterministic; file content never executed. Prompt-injection text treated as opaque prose. | plan disposition (01-01-PLAN) | 2026-07-24 |
| AR-02 | T-01-10 | `validate` without sidecar only runs local internal consistency check; no content leaves process, no writes. | plan disposition (01-03-PLAN) | 2026-07-24 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-24 | 12 | 12 | 0 | gsd-secure-phase (ASVS L1 short-circuit) |

### Evidence (L1 grep-depth)

| Threat | Evidence |
|--------|----------|
| T-01-01 | `packages/core/src/cli.ts` — `realpath`, symlink refuse, `.md`/`.mdc` gate |
| T-01-02 | `packages/core/src/compressor.ts` — `validate` before `atomicWriteFile` |
| T-01-03 | `packages/core/src/backup.ts` — `open(..., "wx")` + EEXIST; unit never-overwrite tests |
| T-01-04 | `backup.ts` / `cli.ts` — `lstat` + `MAX_FILE_SIZE` |
| T-01-05 | `cli.ts` estimated labels; `cli.test.ts` COMP-03 |
| T-01-SC | `01-01-SUMMARY.md` — human approved typescript/vitest/tsx |
| T-01-07 | `compressFile` noop when `compressed === currentContent` |
| T-01-08 | `rollback` + `sidecarPathFor` + path harden (WR-04 fix) |
| T-01-09 | `--yes` → `compressFile` per file |
| T-01-11 | `promptCanonicalSelection(detectCanonicalFiles(...))` |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-24
