---
phase: 02-mcp-shrink-proxy
plan: 02
subsystem: api
tags: [mcp, config, env, allowlist, vitest, shrink-proxy]

requires:
  - phase: 02-mcp-shrink-proxy
    plan: 01
    provides: runProxy, parseProxyConfig stub, shrinkListResponse wired to shrinkFields
provides:
  - "parseShrinkFields with D-12 allowlist fallback and stderr warning"
  - "Full parseProxyConfig env merge for BETTER_TOKEN_SHRINK_FIELDS/MODE/DEBUG"
  - "MCP-04 unit + integration tests for field allowlist"
affects: [02-mcp-shrink-proxy plan 03 diagnostics, phase 3 adapters]

tech-stack:
  added: []
  patterns:
    - "BETTER_TOKEN_* env prefix for all proxy config (D-11)"
    - "Invalid shrink field CSV → one stderr warning + full D-09 defaults (D-12 literally)"
    - "CLI --mode overrides BETTER_TOKEN_MODE (A3)"

key-files:
  created:
    - packages/shrink-mcp/tests/unit/config.test.ts
  modified:
    - packages/shrink-mcp/src/config.ts
    - packages/shrink-mcp/src/index.ts
    - packages/shrink-mcp/tests/integration/proxy.test.ts

key-decisions:
  - "D-12 mixed valid+invalid CSV falls back to full D-09 defaults, not valid-only subset"
  - "Unset BETTER_TOKEN_SHRINK_FIELDS uses D-09 defaults silently; empty/whitespace warns then defaults"
  - "Invalid compression mode warns to stderr and falls back to balanced"

patterns-established:
  - "Pattern: parseShrinkFields allowlist gate before shrinkListResponse mutation"
  - "Pattern: stderr-only config warnings; stdout remains MCP NDJSON"

requirements-completed: [MCP-04]

coverage:
  - id: D1
    description: "BETTER_TOKEN_SHRINK_FIELDS allowlist controls which list types shrink"
    requirement: MCP-04
    verification:
      - kind: unit
        ref: "packages/shrink-mcp/tests/unit/config.test.ts#MCP-04"
        status: pass
      - kind: integration
        ref: "packages/shrink-mcp/tests/integration/proxy.test.ts#MCP-04"
        status: pass
    human_judgment: false
  - id: D2
    description: "Invalid shrink field config warns once and uses D-09 defaults"
    requirement: MCP-04
    verification:
      - kind: unit
        ref: "packages/shrink-mcp/tests/unit/config.test.ts#D-12"
        status: pass
    human_judgment: false
  - id: D3
    description: "CLI --mode overrides BETTER_TOKEN_MODE when both set"
    requirement: MCP-04
    verification:
      - kind: unit
        ref: "packages/shrink-mcp/tests/unit/config.test.ts#D-06/A3"
        status: pass
    human_judgment: false

duration: 2min
completed: 2026-07-25
status: complete
---

# Phase 02 Plan 02: Configurable Shrink Fields Summary

**BETTER_TOKEN_* env vars + CLI --mode control MCP shrink allowlist with D-12 safe fallback**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-25T03:37:38Z
- **Completed:** 2026-07-25T03:39:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `parseShrinkFields` and full `parseProxyConfig` read `BETTER_TOKEN_SHRINK_FIELDS`, `BETTER_TOKEN_MODE`, `BETTER_TOKEN_DEBUG`
- MCP-04: `tools.description` only env leaves prompts/resources descriptions byte-identical in integration test
- D-12: invalid, empty, mixed CSV all warn once on stderr and fall back to full D-09 defaults
- CLI `--mode` wins over `BETTER_TOKEN_MODE` (A3); invalid mode strings warn and use balanced

## Task Commits

Each task was committed atomically:

1. **Task 1: Failing config tests for MCP-04 field allowlist and D-12 invalid fallback** - `631ddee` (test)
2. **Task 2: Implement parseShrinkFields + full parseProxyConfig env/CLI merge (GREEN)** - `4e0a655` (feat)

## Files Created/Modified

- `packages/shrink-mcp/src/config.ts` - parseShrinkFields, env merge, DEFAULT_SHRINK_FIELDS export
- `packages/shrink-mcp/src/index.ts` - barrel exports for parseShrinkFields
- `packages/shrink-mcp/tests/unit/config.test.ts` - MCP-04, D-12, D-06/A3 unit coverage
- `packages/shrink-mcp/tests/integration/proxy.test.ts` - MCP-04 selective shrink integration case

## Decisions Made

- D-12 literally: any unknown token in CSV → full defaults (not valid-only subset)
- Unset env = silent D-09 defaults; empty/whitespace-only = warn + defaults
- No new dependencies; mode validation via Set (zod lives in core CLI only)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 03 can add always-on stderr diagnostics (D-13 full) and exit-code polish
- MCP config examples can document `BETTER_TOKEN_SHRINK_FIELDS` and `BETTER_TOKEN_MODE`

## Self-Check: PASSED

- FOUND: packages/shrink-mcp/src/config.ts
- FOUND: packages/shrink-mcp/tests/unit/config.test.ts
- FOUND: packages/shrink-mcp/tests/integration/proxy.test.ts
- FOUND: commit 631ddee
- FOUND: commit 4e0a655

---
*Phase: 02-mcp-shrink-proxy*
*Completed: 2026-07-25*
