---
phase: 02
slug: mcp-shrink-proxy
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-25
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest `^2.0.0` |
| **Config file** | `packages/shrink-mcp/vitest.config.ts` (new; mirror core) |
| **Quick run command** | `npm test --workspace=@better-token/shrink-mcp` |
| **Full suite command** | `npm test` (root workspaces) |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test --workspace=@better-token/shrink-mcp`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-*-* | TBD | TBD | MCP-01 | — | List responses have compressed `description` | integration | `npm test --workspace=@better-token/shrink-mcp -- -t "MCP-01"` | ❌ W0 | ⬜ pending |
| 02-*-* | TBD | TBD | MCP-02 | — | `tools/call` req/resp byte-identical | integration | `npm test --workspace=@better-token/shrink-mcp -- -t "MCP-02"` | ❌ W0 | ⬜ pending |
| 02-*-* | TBD | TBD | MCP-03 | — | Invalid JSON line pass-through | unit | `npm test --workspace=@better-token/shrink-mcp -- -t "MCP-03"` | ❌ W0 | ⬜ pending |
| 02-*-* | TBD | TBD | MCP-04 | — | `BETTER_TOKEN_SHRINK_FIELDS` toggles fields | unit | `npm test --workspace=@better-token/shrink-mcp -- -t "MCP-04"` | ❌ W0 | ⬜ pending |
| 02-*-* | TBD | TBD | D-07 | — | Validator fail keeps original description | unit | `npm test --workspace=@better-token/shrink-mcp -- -t "D-07"` | ❌ W0 | ⬜ pending |
| 02-*-* | TBD | TBD | D-12 | — | Invalid env warns + defaults | unit | `npm test --workspace=@better-token/shrink-mcp -- -t "D-12"` | ❌ W0 | ⬜ pending |
| 02-*-* | TBD | TBD | D-15 | — | Upstream non-zero exit propagates | integration | `npm test --workspace=@better-token/shrink-mcp -- -t "D-15"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/shrink-mcp/package.json` — workspace package scaffold
- [ ] `packages/shrink-mcp/vitest.config.ts` — test runner config
- [ ] `packages/shrink-mcp/tests/fixtures/mock-upstream.ts` — stdio mock MCP server
- [ ] `packages/shrink-mcp/tests/unit/framing.test.ts` — NDJSON buffer edge cases
- [ ] `packages/shrink-mcp/tests/unit/shrink.test.ts` — MCP-01, D-07, MCP-04
- [ ] `packages/shrink-mcp/tests/integration/proxy.test.ts` — MCP-01, MCP-02, MCP-03, D-15
- [ ] Root `package.json` — add `build`/`test` workspace for shrink-mcp
- [ ] `packages/core/src/cli.ts` — `proxy` subcommand wire-up

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| IDE connects through proxy transparently | MCP-01 | Needs live Claude Code / Cursor MCP config | Point MCP config at `better-token proxy -- <upstream>` and confirm tools list loads |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
