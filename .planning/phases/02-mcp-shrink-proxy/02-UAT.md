---
status: testing
phase: 02-mcp-shrink-proxy
source:
  - 02-VERIFICATION.md
  - 02-01-SUMMARY.md
  - 02-02-SUMMARY.md
  - 02-03-SUMMARY.md
  - 02-04-SUMMARY.md
started: 2026-07-25T03:55:00Z
updated: 2026-07-25T05:11:14Z
---

## Current Test

number: 2
name: MVP User-Flow Outcome Reconfirm (G-02-2)
expected: |
  A/B tools/list zeigt messbare Savings (≥8% Char auf Filesystem-Corpus-Pfad);
  Outcome Token sparen sichtbar; tools/call ungebrochen
awaiting: user response

## Tests

### 1. IDE Transparent Proxy
expected: Tools-Liste lädt; Descriptions kürzer; Tool-Call erfolgreich; keine Protokollfehler durch stdout-Pollution
result: pass
reported: "approved — live tools/call through better-token-proxy: list_allowed_directories, list_directory, write_file, read_text_file, get_file_info all OK; tools list shown in IDE"
evidence: execute-phase 02-03 human-verify checkpoint + orchestrator MCP tool round-trip 2026-07-25

### 2. MVP User-Flow Outcome Reconfirm (G-02-2)
expected: Proxy starten → Client verbinden → List-Responses mit kleineren Descriptions → tools/call unverändert; Outcome Token sparen ohne Tool-Calls zu brechen. Nach Gap-Closure: messbare Char-/Token-Reduktion sichtbar (nicht 4108→4108).
result: pending
reported: "Code gap closed via 02-04 (BALANCED_MCP_PATTERNS, corpus 4108→3576 ~13%, proxy gate ≥8%). Awaiting human IDE reconfirm."
severity: major
prior_result: issue
prior_reported: "Agent-tested 2026-07-25 pre-gap: A/B 4108→4108 chars (0 saved). L1 left dense filesystem prose unchanged."

### 3. Judgment-Prohibitions
expected: Alle 8 flagged Must-NOTs halten (keine erfundenen Descriptions; kein stdout-Noise; keine Request-Mutation; kein MCP-SDK; invalid env warnt; nur erlaubte Field-IDs; Parse-Fail = Originalbytes; keine Shrink-Stats ohne debug)
result: pass
reported: "Agent-tested 2026-07-25: (1) absent/null/empty descriptions unchanged — unit pass; (2) live stdoutNoise=[]; (3) stdin.pipe + MCP-02 byte-identical pass; (4) no @modelcontextprotocol in src/deps; (5) invalid BETTER_TOKEN_SHRINK_FIELDS → stderr warn; (6) allowlist-only config tests 11/11; (7) MCP-03/D-13 parse pass-through pass; (8) debug=0 no estimated stats, debug=1 stderr estimated before/after — all 8 hold"
evidence: vitest targeted + live proxy probe 2026-07-25T04:52Z

## Summary

total: 3
passed: 2
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps

- gap_id: G-02-2
  truth: "Proxy starten → Client verbinden → List-Responses mit kleineren Descriptions → tools/call unverändert; Outcome Token sparen ohne Tool-Calls zu brechen"
  status: code_resolved_awaiting_human
  reason: "02-04 closed code gap (BALANCED_MCP_PATTERNS + corpus/proxy gates). Automated 26/27 must-haves pass. Human IDE reconfirm of visible Token sparen still open (D4)."
  severity: major
  test: 2
  root_cause: "L1 heuristic coverage gap — closed in 02-04; live IDE visibility still needs human check"
  artifacts:
    - path: "packages/core/src/compressor.ts"
      issue: "BALANCED_MCP_PATTERNS added after BALANCED_FILLERS"
    - path: "packages/core/tests/fixtures/filesystem-tools-descriptions.json"
      issue: "Frozen 14-tool corpus; 4108→3576 verified"
    - path: ".cursor/mcp.json"
      issue: "Dual demo: better-token-proxy + better-token-proxy-demo"
  missing:
    - "Human IDE reconfirm: reload MCP entries, compare tools/list vs direct, tools/call OK"
  debug_session: ".planning/debug/mcp-live-zero-token-savings.md"
