---
phase: 02-mcp-shrink-proxy
plan: 03
subsystem: api
tags: [mcp, proxy, ndjson, resilience, vitest, diagnostics]

requires:
  - phase: 02-mcp-shrink-proxy
    plan: 01
    provides: runProxy, NdjsonReadBuffer, shrinkListResponse, CLI proxy subcommand
  - phase: 02-mcp-shrink-proxy
    plan: 02
    provides: parseProxyConfig with BETTER_TOKEN_DEBUG and env merge
provides:
  - "MCP-03 parse-error pass-through with always-on stderr notice (D-13)"
  - "D-15 upstream exit-code propagation with stderr reason"
  - "D-14 debug-gated estimated token stats on stderr only (D-16)"
  - "Batch JSON-RPC array pass-through and partial-line flush on upstream close"
  - "Human-verified transparent IDE proxy via better-token-proxy MCP config"
affects: [phase 3 adapters, MCP config examples]

tech-stack:
  added: []
  patterns:
    - "Parse failure → original line bytes to stdout + single stderr diagnostic (D-13)"
    - "Array.isArray(msg) → pass-through without shrink attempt (A2)"
    - "NdjsonReadBuffer.flush on upstream close for trailing partial lines"
    - "estimateTokenCount exported from core for D-14 shrink stats"

key-files:
  created:
    - packages/shrink-mcp/tests/fixtures/mock-upstream-bad-line.ts
    - packages/shrink-mcp/tests/fixtures/mock-upstream-batch.ts
    - packages/shrink-mcp/tests/fixtures/mock-upstream-exit7.ts
    - packages/shrink-mcp/tests/fixtures/mock-upstream-paginated.ts
    - packages/shrink-mcp/tests/fixtures/mock-upstream-partial-close.ts
  modified:
    - packages/shrink-mcp/src/proxy.ts
    - packages/shrink-mcp/tests/integration/proxy.test.ts
    - packages/shrink-mcp/tests/unit/framing.test.ts
    - packages/core/src/index.ts

key-decisions:
  - "Parse-error stderr fires even when debug=false (D-13 always-on for pass-through notice)"
  - "Shrink success token stats only emitted when BETTER_TOKEN_DEBUG=1 (D-14/D-16)"
  - "Upstream non-zero exit code propagated via process.exit with short stderr (D-15)"
  - "nextCursor on paginated tools/list preserved while descriptions still shrink"

patterns-established:
  - "Pattern: handleUpstreamLine catch JSON.parse → stderr once + write original bytes"
  - "Pattern: batch JSON-RPC arrays pass through unchanged in v1 (A2)"
  - "Pattern: flush remainder on upstream close — no silent drop of partial NDJSON lines"

requirements-completed: [MCP-03]

coverage:
  - id: D1
    description: "Invalid upstream JSON line passes through unchanged with stderr notice; subsequent valid list still shrinks"
    requirement: MCP-03
    verification:
      - kind: integration
        ref: "packages/shrink-mcp/tests/integration/proxy.test.ts#MCP-03"
        status: pass
      - kind: integration
        ref: "packages/shrink-mcp/tests/integration/proxy.test.ts#D-13"
        status: pass
    human_judgment: false
  - id: D2
    description: "Debug-gated estimated before/after token stats on stderr only; no stats when debug off"
    requirement: MCP-03
    verification:
      - kind: integration
        ref: "packages/shrink-mcp/tests/integration/proxy.test.ts#D-14"
        status: pass
    human_judgment: false
  - id: D3
    description: "Upstream non-zero exit code propagates to proxy with stderr reason"
    requirement: MCP-03
    verification:
      - kind: integration
        ref: "packages/shrink-mcp/tests/integration/proxy.test.ts#D-15"
        status: pass
    human_judgment: false
  - id: D4
    description: "Batch JSON-RPC arrays and partial-line flush pass through without shrink or data loss"
    requirement: MCP-03
    verification:
      - kind: integration
        ref: "packages/shrink-mcp/tests/integration/proxy.test.ts#batch pass-through"
        status: pass
      - kind: unit
        ref: "packages/shrink-mcp/tests/unit/framing.test.ts#partial-chunk flush"
        status: pass
    human_judgment: false
  - id: D5
    description: "IDE connects through better-token proxy transparently — tools list loads and tools/call round-trip succeeds"
    requirement: MCP-03
    verification:
      - kind: manual_procedural
        ref: "Cursor mcp.json → project-0-better-token-better-token-proxy; live tools/call through filesystem MCP"
        status: pass
    human_judgment: true
    rationale: "Real IDE stdio MCP connection cannot be fully automated in CI; human checkpoint confirms transparent proxy path per 02-VALIDATION.md"

duration: 10min
completed: 2026-07-25
status: complete
---

# Phase 02 Plan 03: MCP Proxy Resilience Summary

**Parse-error pass-through, exit-code propagation, debug-gated shrink stats — human-verified transparent IDE proxy**

## Performance

- **Duration:** 10 min
- **Started:** 2026-07-25T03:40:52Z
- **Completed:** 2026-07-25T03:50:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- MCP-03: non-JSON upstream lines pass through byte-identical with always-on stderr notice (D-13); valid subsequent list responses still shrink
- D-15: upstream `exit(7)` propagates to proxy exit code 7 with stderr reason
- D-14/D-16: estimated before/after token stats on stderr only when `BETTER_TOKEN_DEBUG=1`
- Batch JSON-RPC arrays and partial-line flush on upstream close pass through without data loss
- Human verified: Cursor IDE connects via `better-token-proxy`; tools list + live `tools/call` (list_allowed_directories, list_directory, write_file, read_text_file, get_file_info) all OK with no protocol errors

## Task Commits

Each task was committed atomically:

1. **Task 1: MCP-03 parse pass-through + D-15 exit propagation + framing edge tests (RED then GREEN)** - `f1f4306` (test), `e3fe8e1` (feat)
2. **Task 2: Human verify IDE connects through proxy transparently** - no code commit (human-verify checkpoint; user approved)

## Files Created/Modified

- `packages/shrink-mcp/src/proxy.ts` - parse-error pass-through, batch pass-through, flush on close, D-14/D-15 handlers
- `packages/core/src/index.ts` - export `estimateTokenCount` for D-14 diagnostics
- `packages/shrink-mcp/tests/integration/proxy.test.ts` - MCP-03, D-13, D-14, D-15, batch, partial-close, paginated nextCursor coverage
- `packages/shrink-mcp/tests/unit/framing.test.ts` - partial-chunk buffer and flush edge tests
- `packages/shrink-mcp/tests/fixtures/mock-upstream-*.ts` - bad-line, batch, exit7, paginated, partial-close mock upstreams

## Decisions Made

- Parse-error stderr always-on regardless of debug flag (D-13); shrink success stats gated on debug (D-14/D-16)
- Batch arrays pass through unchanged without shrink attempt (A2 from research)
- Partial trailing data without newline flushed as pass-through on upstream close (A-edge-MCP-03-unclassified)
- `nextCursor` preserved on paginated tools/list while descriptions shrink

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Human Verification (Task 2)

**Approved by user** after live IDE test through `project-0-better-token-better-token-proxy`:

| Tool | Result |
|------|--------|
| list_allowed_directories | OK |
| list_directory | OK |
| write_file | OK |
| read_text_file | OK |
| get_file_info | OK |

No MCP protocol errors; MCP-02 tools/call round-trip confirmed.

## Next Phase Readiness

- Phase 2 MCP shrink proxy complete (MCP-01..MCP-04 + MCP-03 resilience)
- Phase 3 adapters can reference `better-token proxy --` in Claude Code / Cursor MCP config examples
- Document `BETTER_TOKEN_DEBUG=1` for operator shrink stats in adapter install guides

## Self-Check: PASSED

- FOUND: packages/shrink-mcp/src/proxy.ts
- FOUND: packages/shrink-mcp/tests/integration/proxy.test.ts
- FOUND: packages/core/src/index.ts
- FOUND: commit f1f4306
- FOUND: commit e3fe8e1

---
*Phase: 02-mcp-shrink-proxy*
*Completed: 2026-07-25*
