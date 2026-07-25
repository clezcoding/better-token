---
phase: 02-mcp-shrink-proxy
plan: 01
subsystem: api
tags: [mcp, ndjson, stdio, proxy, compression, vitest]

requires:
  - phase: 01-l1-compression-engine-validator
    provides: compressMarkdownWithValidation, CompressionMode, byte-exact validator gate
provides:
  - "@better-token/shrink-mcp workspace package with NDJSON proxy loop"
  - "better-token proxy CLI subcommand (D-01)"
  - "Mock upstream fixture and MCP-01/MCP-02 integration tests"
affects: [02-mcp-shrink-proxy plan 02 config, 02-03 diagnostics, phase 3 adapters]

tech-stack:
  added: ["@better-token/shrink-mcp"]
  patterns:
    - "Raw stdin pipe to upstream (MCP-02 — never parse client requests)"
    - "Single NdjsonReadBuffer consumer on upstream.stdout"
    - "Per-field description shrink with validator fallback (D-07)"

key-files:
  created:
    - packages/shrink-mcp/src/framing.ts
    - packages/shrink-mcp/src/shrink.ts
    - packages/shrink-mcp/src/config.ts
    - packages/shrink-mcp/src/proxy.ts
    - packages/shrink-mcp/tests/fixtures/mock-upstream.ts
    - packages/shrink-mcp/tests/integration/proxy.test.ts
  modified:
    - packages/core/src/cli.ts
    - packages/core/package.json
    - package.json

key-decisions:
  - "Upstream argv parsed from process.argv after `--` because Commander strips separator from command.args"
  - "Workspace link uses file:../core (npm 11 rejected workspace:* protocol in this environment)"
  - "Root test script builds shrink-mcp before core tests so dist/index.js resolves for CLI import"

patterns-established:
  - "Pattern: NdjsonReadBuffer with 4MB cap and pass-through on overflow (T-02-01)"
  - "Pattern: shrinkListResponse mutates only description strings on list arrays"
  - "Pattern: stderr-only diagnostics; stdout carries MCP NDJSON only"

requirements-completed: [MCP-01, MCP-02]

coverage:
  - id: D1
    description: "MCP shrink proxy compresses tools/prompts/resources list descriptions"
    requirement: MCP-01
    verification:
      - kind: integration
        ref: "packages/shrink-mcp/tests/integration/proxy.test.ts#MCP-01"
        status: pass
      - kind: unit
        ref: "packages/shrink-mcp/tests/unit/shrink.test.ts#MCP-01"
        status: pass
    human_judgment: false
  - id: D2
    description: "tools/call request and response pass through byte-identical"
    requirement: MCP-02
    verification:
      - kind: integration
        ref: "packages/shrink-mcp/tests/integration/proxy.test.ts#MCP-02"
        status: pass
    human_judgment: false
  - id: D3
    description: "Validator failure on one description keeps original field (D-07)"
    requirement: MCP-01
    verification:
      - kind: unit
        ref: "packages/shrink-mcp/tests/unit/shrink.test.ts#D-07"
        status: pass
    human_judgment: false
  - id: D4
    description: "proxy CLI requires `--` upstream separator with stderr usage on missing upstream"
    requirement: MCP-01
    verification:
      - kind: manual_procedural
        ref: "npx tsx packages/core/src/cli.ts proxy (exit 1, stderr usage line)"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-25
status: complete
---

# Phase 02 Plan 01: MCP Shrink Proxy Vertical Slice Summary

**Stdio MCP proxy shrinks list descriptions via L1 compression; tools/call traffic stays byte-identical**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-25T03:31:06Z
- **Completed:** 2026-07-25T03:37:00Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments

- `@better-token/shrink-mcp` package with NDJSON framing, selective list shrink, and transparent proxy loop
- `better-token proxy -- <upstream>` CLI entry (D-01) with balanced default mode and D-09 shrink fields
- MCP-01/MCP-02 integration tests green against mock stdio upstream; D-07 per-field validator fallback covered

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold @better-token/shrink-mcp + failing MCP-01/MCP-02 end-to-end tests** - `e8e4fe6` (test)
2. **Task 2: Implement NDJSON framing + list-response shrink + runProxy + CLI proxy subcommand (GREEN)** - `935cce8` (feat)

## Files Created/Modified

- `packages/shrink-mcp/src/framing.ts` - NdjsonReadBuffer + writeNdjsonLine with 4MB cap
- `packages/shrink-mcp/src/shrink.ts` - compressDescription + shrinkListResponse (MIN_DESCRIPTION_LENGTH=48)
- `packages/shrink-mcp/src/config.ts` - ProxyConfig + parseProxyConfig defaults
- `packages/shrink-mcp/src/proxy.ts` - runProxy spawn/pipe loop, single stdout consumer
- `packages/shrink-mcp/tests/fixtures/mock-upstream.ts` - stdio mock MCP server
- `packages/shrink-mcp/tests/integration/proxy.test.ts` - MCP-01/MCP-02 E2E coverage
- `packages/core/src/cli.ts` - proxy subcommand registration
- `package.json` - build/test workspace wiring (shrink-mcp before core)

## Decisions Made

- Upstream command parsed from `process.argv` after `--` (Commander strips `--` from `command.args`)
- Workspace dependency uses `file:../core` / `file:../shrink-mcp` because npm 11 rejected `workspace:*`
- Root `npm test` builds shrink-mcp first so core CLI can resolve `@better-token/shrink-mcp/dist`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] npm workspace:* protocol unsupported**
- **Found during:** Task 1 (npm install)
- **Issue:** `npm install` failed with `EUNSUPPORTEDPROTOCOL` for `workspace:*`
- **Fix:** Changed workspace deps to `file:../core` and `file:../shrink-mcp`
- **Files modified:** packages/shrink-mcp/package.json, packages/core/package.json
- **Verification:** npm install succeeds; tests run
- **Committed in:** e8e4fe6, 935cce8

**2. [Rule 1 - Bug] CLI proxy rejected valid upstream argv**
- **Found during:** Task 2 (integration tests timed out)
- **Issue:** `command.args.indexOf("--")` always -1; Commander strips `--` separator
- **Fix:** Added `extractUpstreamFromArgv()` reading `process.argv` after `--`
- **Files modified:** packages/core/src/cli.ts
- **Verification:** MCP-01/MCP-02 integration tests green
- **Committed in:** 935cce8

**3. [Rule 3 - Blocking] Core tests failed without shrink-mcp dist**
- **Found during:** Task 2 (core integration tests)
- **Issue:** CLI import of `@better-token/shrink-mcp` resolved to missing `dist/index.js`
- **Fix:** Root build/test scripts build shrink-mcp before core tests
- **Files modified:** package.json
- **Verification:** 66/66 core tests + 13/13 shrink-mcp tests pass
- **Committed in:** 935cce8

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All fixes required for correct CLI behavior and testability. No scope creep.

## Issues Encountered

None beyond deviations above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02 can extend `parseProxyConfig` with full `BETTER_TOKEN_SHRINK_FIELDS` parser (D-12)
- Plan 03 can add always-on stderr diagnostics (D-13 full) and exit-code propagation polish
- Phase 3 adapters can reference `better-token proxy --` in MCP config examples

## Self-Check: PASSED

- FOUND: packages/shrink-mcp/src/proxy.ts
- FOUND: packages/shrink-mcp/tests/integration/proxy.test.ts
- FOUND: packages/core/src/cli.ts
- FOUND: commit e8e4fe6
- FOUND: commit 935cce8

---
*Phase: 02-mcp-shrink-proxy*
*Completed: 2026-07-25*
