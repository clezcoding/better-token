---
phase: 02
slug: mcp-shrink-proxy
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-25
verified: 2026-07-25
---

# Phase 02 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| IDE/client → proxy stdin | Untrusted JSON-RPC bytes from local IDE | NDJSON MCP messages |
| Proxy → upstream child stdin/stdout | Local subprocess; inherits env (D-02) | Raw bytes / MCP frames |
| Upstream stdout → proxy → client stdout | Selective mutation only on list-response descriptions | MCP list responses |
| Proxy stderr | Human diagnostics only — never mixed into MCP stdout | Warnings, debug stats, exit reasons |
| mcp.json / process env → parseProxyConfig | Operator-controlled local config | Mode, shrink fields, debug flag |
| Frozen fixture → L1 compressor | Untrusted-length prose input | Tool description strings |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-02-01 | Denial of Service | NdjsonReadBuffer | medium | mitigate | Cap buffer at 4MB; exceed → flush pass-through + stderr warn (`framing.ts` `MAX_BUFFER_BYTES`) | closed |
| T-02-02 | Tampering | proxy stdout | high | mitigate | Diagnostics only on stderr; stdout carries MCP NDJSON (`proxy.ts` D-13/D-14) | closed |
| T-02-03 | Tampering | client→upstream pipe | high | mitigate | Never parse stdin; `process.stdin.pipe(upstream.stdin)` (`proxy.ts` MCP-02) | closed |
| T-02-04 | Information Disclosure | debug logs | low | accept | Debug optional; local stderr only; no network/telemetry in OSS core | closed |
| T-02-05 | Elevation of Privilege | child_process.spawn | medium | mitigate | `shell: false`; upstream cmd/args from CLI after `--` only (`proxy.ts:65`) | closed |
| T-02-06 | Tampering | BETTER_TOKEN_SHRINK_FIELDS | medium | mitigate | Allowlist-only tokens; unknown → warn + D-09 defaults (`config.ts` `parseShrinkFields` D-12) | closed |
| T-02-07 | Elevation of Privilege | BETTER_TOKEN_MODE | low | mitigate | Enum parse; invalid → balanced default (`config.ts`) | closed |
| T-02-08 | Information Disclosure | stderr warnings | low | accept | Local stderr only; no secrets in field names | closed |
| T-02-09 | Denial of Service | partial-line buffer | medium | mitigate | Same 4MB cap; flush on close; no unbounded retry (`framing.ts` + `proxy.ts`) | closed |
| T-02-10 | Repudiation | exit codes | low | mitigate | Propagate upstream exit code + stderr reason (`proxy.ts` D-15) | closed |
| T-02-11 | Tampering | BALANCED_MCP_PATTERNS | medium | mitigate | `compressMarkdownWithValidation` + per-field rollback D-07 (`shrink.ts`, corpus tests) | closed |
| T-02-12 | Information Disclosure | mcp.json demo paths | low | accept | Demo uses repo-local mock fixture; filesystem entry unchanged | closed |
| T-02-SC | Tampering | npm installs | low | accept | No new external production packages this phase — workspace link only | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above `workflow.security_block_on` (high) count toward `threats_open`*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-02-01 | T-02-04 | Debug optional; local stderr only; OSS core has no network/telemetry | plan accept (02-01) | 2026-07-25 |
| AR-02-02 | T-02-08 | Field-name warnings on local stderr; no secrets in allowlist tokens | plan accept (02-02) | 2026-07-25 |
| AR-02-03 | T-02-12 | Demo mcp.json paths are repo-local mock / explicit workspace root | plan accept (02-04) | 2026-07-25 |
| AR-02-04 | T-02-SC | No new external production packages; workspace `file:` deps only | plan accept (02-01..04) | 2026-07-25 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-25 | 13 | 13 | 0 | gsd-secure-phase (ASVS L1 grep-depth; register authored at plan time) |

### Evidence (L1)

| Threat | Evidence |
|--------|----------|
| T-02-01 / T-02-09 | `packages/shrink-mcp/src/framing.ts:1` `MAX_BUFFER_BYTES = 4 * 1024 * 1024` + overflow stderr + pass-through flush |
| T-02-02 | `packages/shrink-mcp/src/proxy.ts` — parse/debug/exit messages via `process.stderr.write`; stdout = MCP lines only |
| T-02-03 | `packages/shrink-mcp/src/proxy.ts:68` `process.stdin.pipe(upstream.stdin!)` |
| T-02-05 | `packages/shrink-mcp/src/proxy.ts:65` `shell: false` |
| T-02-06 / T-02-07 | `packages/shrink-mcp/src/config.ts` `parseShrinkFields` + mode enum + stderr warnings |
| T-02-10 | `packages/shrink-mcp/src/proxy.ts:93-100` upstream exit code propagate |
| T-02-11 | `packages/shrink-mcp/src/shrink.ts:16-17` validation.ok gate; corpus tests assert 14/14 ok |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-25
