# Requirements: better-token

**Defined:** 2026-07-24
**Core Value:** Deterministic, byte-verified input/context compression that cuts tokens without substance loss — every time, not only when the model cooperates.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### L1 Compression

- [ ] **COMP-01**: User can compress rule/memory files (`CLAUDE.md`, `.cursorrules`, `AGENTS.md`, `GEMINI.md`, and equivalents) with a deterministic heuristic engine (no LLM rewrite)
- [ ] **COMP-02**: User can select L1 aggression mode `safe`, `balanced`, or `aggressive` (default `balanced`); validator remains on in every mode
- [ ] **COMP-03**: User can run compression with `--dry-run` to see token delta without writing files
- [ ] **COMP-04**: Repeated compression is idempotent (already-compressed files detected; no further change)
- [ ] **COMP-05**: Original file is saved as `.original` (or equivalent) and user can roll back to it

### Safety & Validation

- [ ] **SAFE-01**: After every compression, a byte-exact validator asserts code blocks, inline code, URLs, paths, and headings are identical; on failure compression is discarded and original kept
- [ ] **SAFE-02**: System never compresses: code blocks, inline code, exact error strings, commit/PR messages, security warnings, irreversible-action confirmations, or multi-step sequences where order risk is high
- [ ] **SAFE-03**: User language is preserved — compression never translates content

### MCP Shrink Proxy

- [ ] **MCP-01**: User can run `better-token` MCP shrink proxy that wraps an upstream MCP server and compresses `description` fields in `tools/list`, `prompts/list`, and `resources/list`
- [ ] **MCP-02**: Proxy leaves request payloads and `tools/call` responses untouched
- [ ] **MCP-03**: On parse errors, proxy falls back to pass-through (no data loss)
- [ ] **MCP-04**: User can configure which fields are compressed via environment variables

### Adapters & L2 Style

- [ ] **ADAPT-01**: User can install Claude Code adapter with SessionStart, UserPromptSubmit, and Stop hooks
- [ ] **ADAPT-02**: User can install Cursor adapter with always-apply rule (`.mdc`) and MCP shrink integration
- [ ] **ADAPT-03**: On Tier A (Claude Code), the full active terse rule is re-injected on every user turn (UserPromptSubmit), not only at session start
- [ ] **ADAPT-04**: User can set output style level `lite` / `full` / `ultra` and turn framework off via `/better-token off|lite|full|ultra` or natural language ("normal mode"); mode persists via flag file
- [ ] **ADAPT-05**: After carve-out responses (code/security/etc.), terse mode resumes automatically

### L3 Stats & Verification

- [ ] **STAT-01**: `better-token stats` reports input savings (L1), output savings (L2), framework overhead, and net savings — including when net is negative
- [ ] **STAT-02**: Stats label figures as measured (provider usage where available) vs estimated (tokenizer)
- [ ] **STAT-03**: System computes a verbosity score for responses relative to task type
- [ ] **STAT-04**: When verbosity exceeds threshold, user can opt in to a recompress pass of the last response (never automatic for code/security)

### L4 Profile, Compiler & Installer

- [ ] **PROF-01**: A single canonical profile (YAML) defines rules, L1 modes, L2 levels, and carve-outs
- [ ] **PROF-02**: Compiler builds the profile into each supported target format (Claude Code plugin/hooks, Cursor `.mdc`, MCP server config) without hand-maintained duplicates
- [ ] **INST-01**: One command detects installed agents and installs the matching adapters; re-run safe
- [ ] **INST-02**: Installer supports `--dry-run`, `--only <agent>`, and `--uninstall`
- [ ] **PRIV-01**: OSS core makes no network calls after install and sends no telemetry

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Broader IDE Support

- **ADAPT-10**: Codex adapter (Tier A hooks)
- **ADAPT-11**: Gemini CLI adapter
- **ADAPT-12**: Windsurf / Cline / Copilot adapters (Tier B)

### Advanced Measurement

- **STAT-10**: Team dashboard with verified aggregated metrics (opt-in, separate from OSS core)
- **STAT-11**: Activation threshold that skips L2 injection on tiny workloads to avoid negative net

### Compression Evolution

- **COMP-10**: Optional LLM-assisted rewrite mode (explicit opt-in, never default; offline heuristics remain default)
- **COMP-11**: Optional retrieval/file-context trimming beyond rule files

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Own coding agent | Dilutes focus; compete as utility inside existing agents |
| Model fine-tuning | Out of v1 scope; heuristics + enforcement instead |
| Telemetry / hosted backend in OSS core | Privacy by default |
| Translating user content | Semantic risk; language preserved |
| Mutating `tools/call` payloads/responses | Downstream parse risk |
| Broad IDE coverage before Claude Code + Cursor depth | Depth-first strategy |
| Shipping under name Tokenwise | npm/GitHub/domain/brand collisions (TokenwiseHQ) |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| COMP-01 | — | Pending |
| COMP-02 | — | Pending |
| COMP-03 | — | Pending |
| COMP-04 | — | Pending |
| COMP-05 | — | Pending |
| SAFE-01 | — | Pending |
| SAFE-02 | — | Pending |
| SAFE-03 | — | Pending |
| MCP-01 | — | Pending |
| MCP-02 | — | Pending |
| MCP-03 | — | Pending |
| MCP-04 | — | Pending |
| ADAPT-01 | — | Pending |
| ADAPT-02 | — | Pending |
| ADAPT-03 | — | Pending |
| ADAPT-04 | — | Pending |
| ADAPT-05 | — | Pending |
| STAT-01 | — | Pending |
| STAT-02 | — | Pending |
| STAT-03 | — | Pending |
| STAT-04 | — | Pending |
| PROF-01 | — | Pending |
| PROF-02 | — | Pending |
| INST-01 | — | Pending |
| INST-02 | — | Pending |
| PRIV-01 | — | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 0
- Unmapped: 26 ⚠️ (filled by roadmap)

---
*Requirements defined: 2026-07-24*
*Last updated: 2026-07-24 after initial definition*
