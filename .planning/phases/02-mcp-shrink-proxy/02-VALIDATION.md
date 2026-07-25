---
phase: 02
slug: mcp-shrink-proxy
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-25
validated: 2026-07-25
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest `^4.x` |
| **Config file** | `packages/shrink-mcp/vitest.config.ts`, `packages/core/vitest.config.ts` |
| **Quick run command** | `npm run build --workspace=@better-token/core && npm test --workspace=@better-token/shrink-mcp` |
| **Full suite command** | `npm test` (root workspaces) |
| **Estimated runtime** | ~15–30 seconds |

> **Note:** `@better-token/shrink-mcp` imports `@better-token/core` from built `dist/`. Rebuild core before shrink-mcp unit tests that exercise L1 patterns (e.g. G-02-2).

---

## Sampling Rate

- **After every task commit:** `npm run build --workspace=@better-token/core && npm test --workspace=@better-token/shrink-mcp`
- **After every plan wave:** `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | MCP-01, MCP-02 | T-02-01..05 | Scaffold + RED integration harness | integration | `npm test --workspace=@better-token/shrink-mcp -- -t "MCP-01"` | ✅ | ✅ green |
| 02-01-02 | 01 | 1 | MCP-01, MCP-02, D-07 | T-02-01, T-02-02, T-02-03 | Framing + shrink + raw stdin pipe + stderr-only | unit+integration | `npm test --workspace=@better-token/shrink-mcp -- -t "MCP-01\|MCP-02\|D-07"` | ✅ | ✅ green |
| 02-02-01 | 02 | 2 | MCP-04, D-12 | T-02-06 | RED config allowlist tests | unit | `npm test --workspace=@better-token/shrink-mcp -- -t "MCP-04"` | ✅ | ✅ green |
| 02-02-02 | 02 | 2 | MCP-04, D-12, D-06 | T-02-06, T-02-07 | parseShrinkFields + parseProxyConfig GREEN | unit+integration | `npm test --workspace=@better-token/shrink-mcp -- -t "MCP-04\|D-12"` | ✅ | ✅ green |
| 02-03-01 | 03 | 3 | MCP-03, D-13, D-14, D-15 | T-02-02, T-02-09, T-02-10 | Parse pass-through + exit propagate + framing edges | integration | `npm test --workspace=@better-token/shrink-mcp -- -t "MCP-03\|D-15\|D-14"` | ✅ | ✅ green |
| 02-03-02 | 03 | 3 | MCP-01 | — | IDE transparent proxy (human) | manual / UAT | UAT Test 1 — passed 2026-07-25 | ✅ UAT | ✅ green |
| 02-04-01 | 04 | 4 | MCP-01 / G-02-2 | T-02-11 | Frozen filesystem corpus fixture + RED corpus gate | unit | `npm test --workspace=@better-token/core -- tests/unit/mcp-descriptions.test.ts` | ✅ | ✅ green |
| 02-04-02 | 04 | 4 | MCP-01 / G-02-2 | T-02-11 | BALANCED_MCP_PATTERNS + validation.ok | unit | `npm test --workspace=@better-token/core -- tests/unit/mcp-descriptions.test.ts` | ✅ | ✅ green |
| 02-04-03 | 04 | 4 | MCP-01, MCP-02 / G-02-2 | T-02-11, T-02-12 | Proxy corpus ≥8% + dual mcp.json | unit+integration | `npm test --workspace=@better-token/shrink-mcp -- -t "G-02-2\|MCP-02"` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

### Requirement Coverage (audit 2026-07-25)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| MCP-01 | COVERED | `proxy.test.ts` MCP-01; `shrink.test.ts` MCP-01; `mcp-descriptions.test.ts` G-02-2; proxy G-02-2 ≥8% |
| MCP-02 | COVERED | `proxy.test.ts` MCP-02 byte-identical tools/call |
| MCP-03 | COVERED | `proxy.test.ts` MCP-03 + D-13 parse pass-through |
| MCP-04 | COVERED | `config.test.ts` + `proxy.test.ts` MCP-04 allowlist |
| D-07 | COVERED | `shrink.test.ts` D-07 validator-fail keeps original |
| D-12 | COVERED | `config.test.ts` D-12 fallback cases |
| D-14 | COVERED | `proxy.test.ts` D-14 debug stats gated |
| D-15 | COVERED | `proxy.test.ts` D-15 exit propagation |
| G-02-2 | COVERED | corpus unit + shrink unit + proxy integration (after core rebuild) |

**Suite re-run:** shrink-mcp 37/37 pass; mcp-descriptions 1/1 pass (2026-07-25T05:51Z).

---

## Wave 0 Requirements

- [x] `packages/shrink-mcp/package.json` — workspace package scaffold
- [x] `packages/shrink-mcp/vitest.config.ts` — test runner config
- [x] `packages/shrink-mcp/tests/fixtures/mock-upstream.ts` — stdio mock MCP server
- [x] `packages/shrink-mcp/tests/fixtures/mock-upstream-filesystem.ts` — filesystem corpus mock
- [x] `packages/shrink-mcp/tests/unit/framing.test.ts` — NDJSON buffer edge cases
- [x] `packages/shrink-mcp/tests/unit/shrink.test.ts` — MCP-01, D-07, G-02-2
- [x] `packages/shrink-mcp/tests/unit/config.test.ts` — MCP-04, D-12, D-06
- [x] `packages/shrink-mcp/tests/integration/proxy.test.ts` — MCP-01..04, D-13..15, G-02-2
- [x] `packages/core/tests/unit/mcp-descriptions.test.ts` — G-02-2 corpus gate
- [x] `packages/core/src/cli.ts` — `proxy` subcommand wire-up

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Status |
|----------|-------------|------------|-------------------|--------|
| IDE connects through proxy transparently | MCP-01 (UX) | Live Cursor MCP panel | Point `.cursor/mcp.json` at `better-token proxy -- <upstream>`; confirm tools list + tools/call | ✅ UAT Test 1 + 2 passed 2026-07-25 (4108→3576) |

*All requirement IDs MCP-01..04 have automated verification. IDE path is supplemental UX confirmation (UAT complete).*

---

## Validation Audit 2026-07-25

| Metric | Count |
|--------|-------|
| Gaps found | 0 (stale-dist false positive on G-02-2 unit — fixed by core rebuild) |
| Resolved | 0 new tests needed |
| Escalated | 0 |
| Requirements COVERED | MCP-01, MCP-02, MCP-03, MCP-04 (+ D-07/12/14/15, G-02-2) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-25
