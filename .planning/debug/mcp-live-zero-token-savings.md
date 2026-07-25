---
status: diagnosed
trigger: "G-02-2 — Phase 02 MCP shrink proxy: tools/call works but live filesystem MCP tool descriptions save 0 tokens — MVP outcome Token sparen ohne Tool-Calls zu brechen not visible with demo upstream."
created: 2026-07-25T04:52:00Z
updated: 2026-07-25T04:54:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: L1 heuristic coverage gap — BALANCED_FILLERS/aggressive structure ops never match dense filesystem MCP prose; demo upstream choice amplifies invisibility
test: Direct compressMarkdownWithValidation on live tools/list descriptions (bypass proxy)
expecting: 4108→4108 (0 saved); mock filler 107→73; hasFiller=false on all 14 tools
next_action: return ROOT CAUSE FOUND (diagnose-only)

reasoning_checkpoint:
  hypothesis: "Zero live savings because L1 only strips fixed English filler phrases + whitespace/structure densify; filesystem MCP descriptions contain none of those patterns — not because proxy skips shrink."
  confirming_evidence:
    - "Direct L1 on 14 live FS descriptions: before=4108 afterBal=4108 afterAgg=4108 toolsChanged=0; validation.ok=true (no validator rollback)"
    - "Same L1 on mock LONG_DESCRIPTION: 107→73 (matches UAT); mock text is exact BALANCED_FILLERS[0] phrase"
    - "All 14 FS samples hasFiller=false; descriptions are dense single-paragraph technical prose"
  falsification_test: "If proxy wiring were broken, direct L1 call would still shrink FS text — it does not. If validator blocked shrink, validation.ok would be false — it is true with identical content."
  fix_rationale: "N/A diagnose-only — gap closure needs L1 heuristics for technical MCP prose and/or demo upstream with compressible fluff"
  blind_spots: "Did not re-run full proxy stdio A/B this session (UAT already did 4108→4108); assumed default balanced mode from mcp.json (no BETTER_TOKEN_MODE)"

## Symptoms

expected: Proxy starten → Client verbinden → List-Responses mit kleineren Descriptions → tools/call unverändert; Outcome Token sparen ohne Tool-Calls zu brechen
actual: Agent-tested 2026-07-25: proxy+client OK; tools/call OK (list_allowed_directories, read_text_file via better-token-proxy). A/B tools/list vs direct filesystem MCP: 4108→4108 chars (0 saved). L1 balanced/aggressive leaves dense filesystem prose unchanged; only filler mock text shrinks (107→73). Demo mcp.json upstream shows no token savings — outcome 'Token sparen' not visible on real MCP descriptions.
errors: None reported (no crash; silent no-op shrink)
reproduction: Test 2 in UAT (.planning/phases/02-mcp-shrink-proxy/02-UAT.md)
started: Discovered during UAT 2026-07-25

## Eliminated

- hypothesis: Proxy wiring bug — shrinkListResponse never applied to live tools/list
  evidence: Proxy path calls shrinkListResponse for shrinkable list responses (proxy.ts:41-54). tools/call works through proxy. Direct L1 (no proxy) also yields 0 savings on same 4108-char corpus — wiring cannot explain zero delta.
  timestamp: 2026-07-25T04:53:30Z

- hypothesis: Validator rejects compressed FS descriptions and rolls back to original
  evidence: compressMarkdownWithValidation returns validation.ok=true for all 14 tools with content === original (noop compress, not failed validation)
  timestamp: 2026-07-25T04:53:30Z

- hypothesis: Descriptions below MIN_DESCRIPTION_LENGTH (48) skipped
  evidence: Live lengths 85–457; all ≥48; compressDescription gate not the blocker
  timestamp: 2026-07-25T04:53:30Z

## Evidence

- timestamp: 2026-07-25T04:52:30Z
  checked: packages/core/src/compressor.ts BALANCED_FILLERS + compressAggressive
  found: L1 balanced only removes 7 filler regexes (I would be happy..., In order to, Please make sure to, As you can see, Note that, Basically, Actually) + whitespace normalize. Aggressive adds adjacent-bullet merge + consecutive-paragraph merge.
  implication: Only text containing those fillers or multi-bullet/multi-paragraph structure shrinks.

- timestamp: 2026-07-25T04:52:45Z
  checked: packages/shrink-mcp/tests/fixtures/mock-upstream.ts + shrink.test.ts
  found: LONG_DESCRIPTION is exactly "I would be happy to help you with this tool..." — first BALANCED_FILLERS pattern. 02-PATTERNS.md explicitly says use filler matching BALANCED_FILLERS.
  implication: Tests prove proxy shrink works on filler-tuned text; do not prove savings on real MCP servers.

- timestamp: 2026-07-25T04:53:00Z
  checked: .cursor/mcp.json demo upstream
  found: Upstream is @modelcontextprotocol/server-filesystem — dense technical descriptions, no courtesy fluff.
  implication: Demo chosen for protocol/tools/call proof, not for visible token savings under current L1.

- timestamp: 2026-07-25T04:53:20Z
  checked: Live A/B via npx tsx — fetch tools/list from filesystem MCP, compress each description balanced+aggressive
  found: toolCount=14 before=4108 afterBal=4108 afterAgg=4108 saved=0 toolsChanged=0; mock 107→73; every sample hasFiller=false
  implication: Root cause is L1 coverage gap on technical MCP prose; demo upstream makes gap visible as 0% MVP outcome.

- timestamp: 2026-07-25T04:53:40Z
  checked: packages/shrink-mcp/src/proxy.ts emitShrinkStats
  found: Stats only emitted when beforeJson !== afterJson and debug=1
  implication: Silent no-op also explains why BETTER_TOKEN_DEBUG=1 shows no shrink stats on filesystem demo.

## Resolution

root_cause: "L1 heuristic coverage gap (primary) + demo-upstream mismatch (secondary). BALANCED_FILLERS and aggressive structure densify never match dense @modelcontextprotocol/server-filesystem tool descriptions, so shrink runs as byte-identical no-op (4108→4108). Proxy wiring is healthy; unit/mock tests only exercise filler phrases that L1 already knows. Not a proxy bug."
fix: "(diagnose-only — not applied)"
verification: "(diagnose-only)"
files_changed: []
