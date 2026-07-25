---
status: diagnosed
phase: 02-mcp-shrink-proxy
source:
  - 02-VERIFICATION.md
  - 02-01-SUMMARY.md
  - 02-02-SUMMARY.md
  - 02-03-SUMMARY.md
started: 2026-07-25T03:55:00Z
updated: 2026-07-25T04:55:00Z
---

## Current Test

[testing complete]

## Tests

### 1. IDE Transparent Proxy
expected: Tools-Liste lädt; Descriptions kürzer; Tool-Call erfolgreich; keine Protokollfehler durch stdout-Pollution
result: pass
reported: "approved — live tools/call through better-token-proxy: list_allowed_directories, list_directory, write_file, read_text_file, get_file_info all OK; tools list shown in IDE"
evidence: execute-phase 02-03 human-verify checkpoint + orchestrator MCP tool round-trip 2026-07-25

### 2. MVP User-Flow Outcome
expected: Proxy starten → Client verbinden → List-Responses mit kleineren Descriptions → tools/call unverändert; Outcome Token sparen ohne Tool-Calls zu brechen
result: issue
reported: "Agent-tested 2026-07-25: proxy+client OK; tools/call OK (list_allowed_directories, read_text_file via better-token-proxy). A/B tools/list vs direct filesystem MCP: 4108→4108 chars (0 saved). L1 balanced/aggressive leaves dense filesystem prose unchanged; only filler mock text shrinks (107→73). Demo mcp.json upstream shows no token savings — outcome 'Token sparen' not visible on real MCP descriptions."
severity: major

### 3. Judgment-Prohibitions
expected: Alle 8 flagged Must-NOTs halten (keine erfundenen Descriptions; kein stdout-Noise; keine Request-Mutation; kein MCP-SDK; invalid env warnt; nur erlaubte Field-IDs; Parse-Fail = Originalbytes; keine Shrink-Stats ohne debug)
result: pass
reported: "Agent-tested 2026-07-25: (1) absent/null/empty descriptions unchanged — unit pass; (2) live stdoutNoise=[]; (3) stdin.pipe + MCP-02 byte-identical pass; (4) no @modelcontextprotocol in src/deps; (5) invalid BETTER_TOKEN_SHRINK_FIELDS → stderr warn; (6) allowlist-only config tests 11/11; (7) MCP-03/D-13 parse pass-through pass; (8) debug=0 no estimated stats, debug=1 stderr estimated before/after — all 8 hold"
evidence: vitest targeted + live proxy probe 2026-07-25T04:52Z

## Summary

total: 3
passed: 2
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-02-2
  truth: "Proxy starten → Client verbinden → List-Responses mit kleineren Descriptions → tools/call unverändert; Outcome Token sparen ohne Tool-Calls zu brechen"
  status: failed
  reason: "User reported: Agent-tested 2026-07-25: proxy+client OK; tools/call OK (list_allowed_directories, read_text_file via better-token-proxy). A/B tools/list vs direct filesystem MCP: 4108→4108 chars (0 saved). L1 balanced/aggressive leaves dense filesystem prose unchanged; only filler mock text shrinks (107→73). Demo mcp.json upstream shows no token savings — outcome 'Token sparen' not visible on real MCP descriptions."
  severity: major
  test: 2
  root_cause: "L1 heuristic coverage gap (primary) + demo-upstream mismatch (secondary) — not a proxy wiring bug. BALANCED_FILLERS only strip fixed English filler; filesystem MCP descriptions are dense technical prose with zero filler hits, so shrink is a byte-identical no-op (4108→4108). Mock fixtures use filler that L1 already knows, giving false confidence."
  artifacts:
    - path: "packages/core/src/compressor.ts"
      issue: "BALANCED_FILLERS / compressAggressive too narrow for technical MCP prose"
    - path: "packages/shrink-mcp/tests/fixtures/mock-upstream.ts"
      issue: "Filler-tuned fixture; false confidence for live savings"
    - path: ".cursor/mcp.json"
      issue: "Filesystem upstream proves protocol, hides token-savings outcome"
  missing:
    - "Extend L1 (or MCP-specific pass) for dense tool-description patterns without semantic loss"
    - "Add fixture from real filesystem MCP descriptions asserting measurable shrink"
    - "Optionally switch/dual demo upstream so MVP Token sparen is visible"
  debug_session: ".planning/debug/mcp-live-zero-token-savings.md"
