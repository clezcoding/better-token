---
phase: 02-mcp-shrink-proxy
verified: 2026-07-25T03:54:58Z
status: human_needed
score: 22/22 must-haves verified
behavior_unverified: 0
overrides_applied: 0
mvp_note: "ROADMAP goal is mode:mvp but not user-story format; PLAN objective is valid user story — used for User Flow Coverage. Recommend /gsd mvp-phase 02 to align ROADMAP."
prohibitions_flagged: 8
prohibitions_note: "All PLAN prohibitions are judgment-tier (flagged:true). LLM-judge: satisfied by code evidence — non-authoritative; human review recommended."
human_verification:
  - test: "IDE: better-token proxy vor Upstream eintragen, MCP neu laden, Tools-Liste prüfen, einen tools/call ausführen"
    expected: "Tools-Liste lädt; Descriptions kürzer; Tool-Call erfolgreich; keine Protokollfehler durch stdout-Pollution"
    why_human: "Echte IDE-stdio-MCP-Verbindung ist in CI nicht voll automatisierbar (02-03 PLAN human-check)"
  - test: "User-Flow (MVP): Proxy starten → Client verbinden → List-Responses mit kleineren Descriptions → tools/call unverändert"
    expected: "Outcome aus User Story: Token sparen ohne Tool-Calls zu brechen"
    why_human: "MVP User-Flow-Walkthrough erfordert menschliche Bestätigung der sichtbaren Outcome-Klausel"
  - test: "Judgment-Prohibitions prüfen (8× flagged): keine erfundenen Descriptions; kein stdout-Noise; keine Request-Mutation; kein MCP-SDK; invalid env warnt; nur erlaubte Field-IDs; Parse-Fail = Originalbytes; keine Shrink-Stats ohne debug"
    expected: "Alle Must-NOTs halten unter manueller/Code-Review-Bestätigung"
    why_human: "judgment-tier prohibitions — autonomer LLM-Judge nicht autoritativ (ADR-550)"
---

# Phase 2: MCP Shrink Proxy — Verification Report

**Phase Goal:** Users can route any MCP server through `better-token` and get smaller tool/prompt/resource descriptions without breaking tool calls

**PLAN User Story (für MVP Flow):** As a developer using an MCP-capable IDE, I want to route any MCP server through `better-token` and get smaller tool/prompt/resource descriptions, so that I save tokens without breaking tool calls.

**Verified:** 2026-07-25T03:54:58Z  
**Status:** human_needed  
**Re-verification:** No — initial verification

> **MVP-Hinweis:** ROADMAP-Ziel hat `mode: mvp`, ist aber kein User-Story-Format (`user-story.validate` → `false`). PLAN-Objective ist gültige User Story — User Flow Coverage basiert darauf. ROADMAP angleichen mit `/gsd mvp-phase 02`.

## User Flow Coverage

User story: «As a developer using an MCP-capable IDE, I want to route any MCP server through `better-token` and get smaller tool/prompt/resource descriptions, so that I save tokens without breaking tool calls.»

| Step | Expected | Evidence | Status |
|------|----------|----------|--------|
| Proxy starten | `better-token proxy -- <upstream>` startet Stdio-Proxy | `packages/core/src/cli.ts:471-499` → `parseProxyConfig` → `runProxy` | ✓ |
| Client verbinden | Downstream-Client spricht transparent mit Upstream über Proxy | Integration: `proxy.test.ts` spawn CLI + mock upstream; `process.stdin.pipe(upstream.stdin)` | ✓ (Protokoll); IDE → Human |
| List-Responses | `tools/list` / `prompts/list` / `resources/list` mit kompakteren `description` | `shrink.ts` + MCP-01 Integrationstest (grün) | ✓ |
| Tool-Call | `tools/call` Request/Response unberührt | MCP-02 Integrationstest (grün); raw stdin pipe | ✓ |
| Outcome | Token sparen ohne Tool-Calls zu brechen | SC2+SC3 Tests + Config MCP-04 | ✓ Code; Outcome-Gefühl → Human |

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | ------- | ---------- | -------------- |
| 1 | SC1: User startet `better-token` als Stdio-Proxy vor Upstream; Downstream-Client verbindet transparent | ✓ VERIFIED | CLI `proxy` wired; `runProxy` spawn+pipe; Integration MCP-01/02 grün |
| 2 | SC2: `tools/list`, `prompts/list`, `resources/list` — `description` komprimiert; übrige Felder unverändert | ✓ VERIFIED | Integration MCP-01: name/inputSchema/uri erhalten, description kürzer; nextCursor-Test |
| 3 | SC3: `tools/call` Request/Response byte-identisch — keine Mutation | ✓ VERIFIED | `stdin.pipe`; Non-List-Pfad schreibt Original-`line`; Test MCP-02 grün |
| 4 | SC4: Parse-Error → Pass-through; Felder via Env konfigurierbar | ✓ VERIFIED | MCP-03 + D-13 Tests; MCP-04 Config+Integration Tests |
| 5 | D-02: Upstream-argv nach `--`; `env: process.env` | ✓ VERIFIED | `cli.ts` `extractUpstreamFromArgv`; `proxy.ts:62-66` |
| 6 | Default-Mode ohne CLI/Env = `balanced` | ✓ VERIFIED | `config.ts` `resolveMode`; Unit-Test „default: balanced mode…“ |
| 7 | Client→Upstream Requests nie geparst/re-serialisiert | ✓ VERIFIED | `process.stdin.pipe(upstream.stdin!)` — kein JSON-Parse auf Requests |
| 8 | D-07: `validation.ok === false` behält Original-Description | ✓ VERIFIED | Unit-Test D-07 mit Spy |
| 9 | D-08: `< 48` unverändert; fehlende/null Descriptions nicht erfunden | ✓ VERIFIED | `MIN_DESCRIPTION_LENGTH`; Unit-Test absent/null/empty |
| 10 | Boundary length === 48: Compression wird versucht | ✓ VERIFIED | Code `length < 48` skip; Unit-Test exact 48 |
| 11 | Listen-Item-Reihenfolge bleibt erhalten | ✓ VERIFIED | In-place Mutation in `shrinkItemDescriptions`; D-07 prüft Index 0/1 |
| 12 | MCP-04: `BETTER_TOKEN_SHRINK_FIELDS` Allowlist wirkt pro List-Typ | ✓ VERIFIED | Unit + Integration MCP-04 |
| 13 | Unset Fields → D-09 Defaults (alle drei) | ✓ VERIFIED | `parseShrinkFields(undefined)`; Default-Unit-Test |
| 14 | D-12: invalid/mixed → eine stderr-Warnung + volle Defaults | ✓ VERIFIED | Mehrere D-12 Unit-Tests |
| 15 | D-06: CLI `--mode` schlägt `BETTER_TOKEN_MODE` | ✓ VERIFIED | Unit D-06/A3 |
| 16 | Alle Proxy-Env-Vars nutzen `BETTER_TOKEN_*` | ✓ VERIFIED | `BETTER_TOKEN_SHRINK_FIELDS`, `_MODE`, `_DEBUG` in `config.ts` |
| 17 | Leeres/whitespace `BETTER_TOKEN_SHRINK_FIELDS` → D-12 | ✓ VERIFIED | Unit empty/whitespace Tests |
| 18 | MCP-03/D-13: Parse-Fail → Originalzeile + stderr (auch ohne debug) | ✓ VERIFIED | Integration MCP-03 + D-13 |
| 19 | D-14/D-16: Shrink-Stats nur bei debug; nie auf stdout | ✓ VERIFIED | D-14 Integration Tests |
| 20 | D-15: Upstream non-zero Exit → Proxy gleicher Code + stderr | ✓ VERIFIED | D-15 Integration (exit 7) |
| 21 | JSON-RPC Batch-Arrays pass-through unverändert | ✓ VERIFIED | Batch Integrationstest |
| 22 | Partial trailing / mid-line Flush ohne stilles Droppen | ✓ VERIFIED | Framing Unit-Tests + partial-close Integration |

**Score:** 22/22 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | ----------- | ------ | ------- |
| `packages/shrink-mcp/package.json` | Workspace-Paket | ✓ VERIFIED | `@better-token/shrink-mcp`, dep auf core |
| `packages/shrink-mcp/src/framing.ts` | NdjsonReadBuffer + writeNdjsonLine | ✓ VERIFIED | Substantiv; Unit-Tests |
| `packages/shrink-mcp/src/shrink.ts` | compressDescription + shrinkListResponse | ✓ VERIFIED | Wired zu core validator |
| `packages/shrink-mcp/src/proxy.ts` | runProxy | ✓ VERIFIED | Spawn, pipe, shrink, pass-through |
| `packages/shrink-mcp/src/config.ts` | ProxyConfig + parseProxyConfig | ✓ VERIFIED | Full env merge (nicht Stub) |
| `packages/core/src/cli.ts` | `proxy` Subcommand | ✓ VERIFIED | Import runProxy/parseProxyConfig |
| `packages/shrink-mcp/tests/fixtures/mock-upstream.ts` | Mock Upstream | ✓ VERIFIED | + bad-line/batch/exit/partial/paginated |
| `packages/shrink-mcp/tests/integration/proxy.test.ts` | MCP-01..04 Coverage | ✓ VERIFIED | 35/35 Suite grün |
| `packages/shrink-mcp/tests/unit/config.test.ts` | MCP-04 Coverage | ✓ VERIFIED | D-12/D-06 grün |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `cli.ts` proxy action | `runProxy` | `parseProxyConfig → runProxy` | ✓ WIRED | `cli.ts:17,492-499` |
| `shrinkListResponse` | `compressMarkdownWithValidation` | `compressDescription` | ✓ WIRED | `shrink.ts:16` |
| `runProxy` | `upstream.stdout` | Single `NdjsonReadBuffer` data handler | ✓ WIRED | Ein Listener, kein paralleles pipe→stdout |
| `BETTER_TOKEN_SHRINK_FIELDS` | `shrinkListResponse` fields Set | `parseProxyConfig → config.shrinkFields` | ✓ WIRED | `config.ts:103` → `proxy.ts:44-50` |
| CLI `--mode` | `config.mode` | overrides `BETTER_TOKEN_MODE` | ✓ WIRED | `resolveMode` CLI first |
| JSON.parse failure | stdout Originalzeile | `writeNdjsonLine` + stderr once | ✓ WIRED | `proxy.ts:30-33` |
| Upstream exit code | `process.exit(code)` | D-15 via CLI | ✓ WIRED | `runProxy` resolve → `cli.ts:499` |

> gsd-tools `verify.key-links` meldete false (from-Pfade keine Dateipfade) — manuell verifiziert.

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `proxy.ts` handleUpstreamLine | `parsed` / `line` | Upstream stdout NDJSON | Ja — echte Upstream-Bytes | ✓ FLOWING |
| `shrinkListResponse` | `record.description` | List-Item aus Upstream JSON | Ja — komprimiert via core | ✓ FLOWING |
| `parseProxyConfig` | `shrinkFields` / `mode` | Env + CLI | Ja — echte Env-Werte | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Full shrink-mcp suite | `npx vitest run` in `packages/shrink-mcp` | 35/35 passed, exit 0 | ✓ PASS |
| MCP-02 named | `vitest run -t "MCP-02: tools/call…"` | passed | ✓ PASS |
| Default balanced | `vitest run -t "default: balanced mode"` | passed | ✓ PASS |
| CLI proxy help | `node packages/core/dist/cli.js proxy --help` | Usage + --mode/--debug | ✓ PASS |

### Probe Execution

| Probe | Command | Result | Status |
| ----- | ------- | ------ | ------ |
| — | — | Keine probe-*.sh in Phase/Repo | SKIPPED |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| MCP-01 | 02-01 | Proxy komprimiert Descriptions in tools/prompts/resources list | ✓ SATISFIED | Integration MCP-01 + shrink.ts |
| MCP-02 | 02-01 | Requests + tools/call Responses unberührt | ✓ SATISFIED | stdin.pipe + MCP-02 Test |
| MCP-03 | 02-03 | Parse-Error → Pass-through | ✓ SATISFIED | MCP-03/D-13 Tests |
| MCP-04 | 02-02 | Felder via Env konfigurierbar | ✓ SATISFIED | Config Unit + MCP-04 Integration |

Keine orphaned Requirements für Phase 2 — alle vier IDs in PLAN-Frontmatter und REQUIREMENTS.md Traceability-Tabelle.

### Prohibitions (judgment-tier, flagged)

| Prohibition | LLM-Judge | Evidence | Flag |
| ----------- | --------- | -------- | ---- |
| Keine erfundenen Descriptions | satisfied | `shrink.ts` skip wenn key fehlt / non-string | unverified-prohibition — human review |
| Kein stdout-Noise | satisfied | Diagnostics nur `process.stderr.write` | unverified-prohibition — human review |
| Keine Request Parse/Reserialize | satisfied | `stdin.pipe` only | unverified-prohibition — human review |
| Kein `@modelcontextprotocol/sdk` | satisfied | Kein Import in shrink-mcp/core runtime | unverified-prohibition — human review |
| Invalid SHRINK_FIELDS nie silent | satisfied | D-12 Warnung + Defaults | unverified-prohibition — human review |
| Nur erlaubte Field-IDs | satisfied | `ALLOWED_SHRINK_FIELDS` Set | unverified-prohibition — human review |
| Parse-Fail: Original bytes only | satisfied | catch → write original line | unverified-prohibition — human review |
| Keine Shrink-Stats ohne debug | satisfied | `emitShrinkStats` gated; D-14 Tests | unverified-prohibition — human review |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | Keine TBD/FIXME/XXX in Phase-Code | — | — |
| `proxy.ts` | 72-74 | UTF-8 Chunk-Grenze ohne StringDecoder | ℹ️ Info | Advisory aus 02-REVIEW WR-01 — kein Must-Have-Fail |
| `proxy.ts` | 61-107 | Kein SIGINT→upstream.kill | ℹ️ Info | Advisory WR-04 — Orphan-Risiko |
| `02-VALIDATION.md` | 43-49 | TBD in Planungsartefakt | ℹ️ Info | Traceability-Tabelle nicht aktualisiert; kein Runtime-Code |

### Human Verification Required

### 1. IDE Transparent Proxy

**Test:** `better-token proxy -- <upstream>` in IDE-mcp.json eintragen, MCP neu laden, Tools-Liste + einen `tools/call` prüfen  
**Expected:** Liste lädt; Descriptions kürzer; Call OK; kein Protokollbruch  
**Why human:** Echte IDE-stdio-MCP-Verbindung nicht in CI automatisierbar (02-03 `<human-check>`)

### 2. MVP User-Flow Outcome

**Test:** End-to-end als Entwickler: Proxy starten → verbinden → kleinere Descriptions sehen → Tool-Call  
**Expected:** Outcome „Token sparen ohne Tool-Calls zu brechen“  
**Why human:** MVP User-Flow-Walkthrough

### 3. Judgment-Prohibitions

**Test:** Acht flagged Must-NOTs gegen Code/Verhalten bestätigen  
**Expected:** Alle halten  
**Why human:** ADR-550 judgment-tier — LLM-Judge nicht autoritativ

### Gaps Summary

Keine technischen Gaps gegen ROADMAP Success Criteria oder PLAN must_haves. Suite 35/35 grün. Status `human_needed` wegen IDE-Checkpoint, MVP User-Flow-Bestätigung und flagged judgment-Prohibitions — nicht wegen fehlender Implementation.

**Empfehlung (nicht blockierend):** ROADMAP-Ziel via `/gsd mvp-phase 02` in User-Story-Format bringen.

---

_Verified: 2026-07-25T03:54:58Z_  
_Verifier: Claude (gsd-verifier)_
