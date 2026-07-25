---
phase: 02-mcp-shrink-proxy
plan: 04
subsystem: testing
tags: [mcp, compression, vitest, filesystem, proxy]

requires:
  - phase: 02-01
    provides: MCP shrink proxy wiring and compressDescription path
  - phase: 02-02
    provides: Proxy integration harness and mock upstream fixtures
  - phase: 02-03
    provides: Parse pass-through and debug stats baseline
provides:
  - Frozen 14-tool filesystem MCP description corpus fixture
  - BALANCED_MCP_PATTERNS in balanced L1 compressor (~13% corpus savings)
  - G-02-2 corpus + proxy integration gates
  - Dual demo mcp.json entries (live filesystem + local mock)
affects: [phase-02-uat, phase-03-adapters]

tech-stack:
  added: []
  patterns:
    - "BALANCED_MCP_PATTERNS applied after BALANCED_FILLERS in compressBalanced (D-05)"
    - "Corpus-level char savings gate reused via sumDescriptionChars helper"

key-files:
  created:
    - packages/core/tests/fixtures/filesystem-tools-descriptions.json
    - packages/core/tests/unit/mcp-descriptions.test.ts
    - packages/shrink-mcp/tests/fixtures/mock-upstream-filesystem.ts
    - .cursor/mcp.json
  modified:
    - packages/core/src/compressor.ts
    - packages/core/tests/unit/compressor.test.ts
    - packages/shrink-mcp/tests/fixtures/mock-upstream.ts
    - packages/shrink-mcp/tests/unit/shrink.test.ts
    - packages/shrink-mcp/tests/integration/proxy.test.ts

key-decisions:
  - "BALANCED_MCP_PATTERNS strip scope suffix, preamble, qualifiers; shorten read/list phrases without new mode"
  - "Dual mcp.json: better-token-proxy (live filesystem) + better-token-proxy-demo (local mock corpus)"

patterns-established:
  - "Real MCP corpus frozen from live @modelcontextprotocol/server-filesystem tools/list capture"
  - "Mock upstream mixes filler regression (echo) + technical prose (read_text_file)"

requirements-completed: [MCP-01]

coverage:
  - id: D1
    description: "Balanced L1 compresses real filesystem MCP descriptions ≥8% with validator pass on all 14 tools"
    requirement: MCP-01
    verification:
      - kind: unit
        ref: "packages/core/tests/unit/mcp-descriptions.test.ts#G-02-2 corpus test"
        status: pass
    human_judgment: false
  - id: D2
    description: "Proxy shrinks filesystem corpus mock upstream ≥8% via tools/list"
    requirement: MCP-01
    verification:
      - kind: integration
        ref: "packages/shrink-mcp/tests/integration/proxy.test.ts#G-02-2 proxy shrinks filesystem corpus mock upstream"
        status: pass
    human_judgment: false
  - id: D3
    description: "tools/call pass-through unchanged after G-02-2 changes"
    verification:
      - kind: integration
        ref: "packages/shrink-mcp/tests/integration/proxy.test.ts#MCP-02"
        status: pass
    human_judgment: false
  - id: D4
    description: "Dual demo mcp.json shows visible savings without breaking tools/call"
    verification: []
    human_judgment: true
    rationale: "IDE MCP panel visual verification of shrink stats requires human judgment"

duration: 2min
completed: 2026-07-25
status: complete
---

# Phase 02 Plan 04: G-02-2 MCP Technical Prose Compression Summary

**Balanced L1 BALANCED_MCP_PATTERNS shrink live filesystem MCP corpus 4108→3576 chars (~13%) with validator pass on all 14 tools**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-25T05:04:30Z
- **Completed:** 2026-07-25T05:06:30Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- Closed G-02-2: balanced mode now shrinks dense MCP technical prose, not only English filler
- Frozen 14-tool filesystem corpus fixture with corpus-level ≥8% savings gate
- Proxy integration proves shrink on filesystem-style mock upstream; MCP-02 pass-through intact
- Dual `.cursor/mcp.json` entries for live filesystem and fast local demo

## Task Commits

1. **Task 1: Freeze filesystem MCP corpus + failing G-02-2 corpus test** - `b8a4964` (test)
2. **Task 2: Extend balanced L1 with MCP technical prose patterns** - `502aeb8` (feat)
3. **Task 3: Realistic mocks, proxy integration gate, dual demo mcp.json** - `585cb54` (feat)

## Files Created/Modified

- `packages/core/tests/fixtures/filesystem-tools-descriptions.json` - 14 live filesystem tool descriptions (4108 chars baseline)
- `packages/core/tests/unit/mcp-descriptions.test.ts` - G-02-2 corpus gate with sumDescriptionChars helper
- `packages/core/src/compressor.ts` - BALANCED_MCP_PATTERNS in compressBalanced
- `packages/shrink-mcp/tests/fixtures/mock-upstream-filesystem.ts` - Full corpus stdio mock upstream
- `.cursor/mcp.json` - better-token-proxy + better-token-proxy-demo entries

## Decisions Made

- BALANCED_MCP_PATTERNS applied after BALANCED_FILLERS + normalizeWhitespace per D-05 (balanced mode, not new mode)
- Demo entry uses repo-local mock-upstream-filesystem.ts to avoid npx cold-start on filesystem package

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- shrink-mcp unit tests import `@better-token/core` from built dist; required `npm run build --workspace=@better-token/core` before G-02-2 unit test passed (dist gitignored, expected workspace behavior)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- G-02-2 closed; UAT Test 2 (filesystem tools/list char reduction) should pass via better-token-proxy
- Phase 3 adapters can rely on MCP description shrink for technical prose

## Self-Check: PASSED

- FOUND: packages/core/tests/fixtures/filesystem-tools-descriptions.json
- FOUND: packages/core/tests/unit/mcp-descriptions.test.ts
- FOUND: packages/shrink-mcp/tests/fixtures/mock-upstream-filesystem.ts
- FOUND: .cursor/mcp.json
- FOUND: b8a4964
- FOUND: 502aeb8
- FOUND: 585cb54

---
*Phase: 02-mcp-shrink-proxy*
*Completed: 2026-07-25*
