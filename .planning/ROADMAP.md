# Roadmap: better-token

**Source PRD:** [`better-token-prd.md`](../better-token-prd.md) (repo root, gitignored)

## Overview

`better-token` ships as a depth-first, vertical MVP: each phase delivers an end-to-end, user-observable capability rather than a horizontal layer. Phase 1 builds the deterministic L1 compression engine with its byte-exact validation gate — the product core. Phase 2 wraps that engine in a universal MCP shrink proxy for Tier C savings across any MCP-capable IDE. Phase 3 installs deep Tier A (Claude Code) and Tier B (Cursor) adapters with per-turn L2 style re-injection. Phase 4 closes the loop with honest L3 stats and verbosity verification. Phase 5 ties everything together via a canonical L4 profile compiler and a one-command auto-detecting installer, with privacy enforced throughout. Every v1 requirement maps to exactly one phase; coverage is 26/26.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: L1 Compression Engine & Validator** - Deterministic rule/memory file compression with byte-exact validation gate and rollback (completed 2026-07-24)
- [ ] **Phase 2: MCP Shrink Proxy** - Universal stdio proxy that compresses tool/prompt/resource descriptions across any MCP-capable IDE
- [ ] **Phase 3: Claude Code & Cursor Adapters** - Deep Tier A hooks and Tier B rules with per-turn L2 style re-injection and carve-out resume
- [ ] **Phase 4: Honest Stats & Verification** - L3 measurement of input/output savings, framework overhead, net, and verbosity recompress
- [ ] **Phase 5: Profile Compiler & Installer** - Canonical L4 profile compiled to all targets, one-command auto-detect install, privacy-enforced OSS core

## Phase Details

### Phase 1: L1 Compression Engine & Validator

**Goal**: Users can compress rule/memory files deterministically and trust that no technical syntax was corrupted
**Mode**: mvp
**Depends on**: Nothing (first phase)
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, SAFE-01, SAFE-02, SAFE-03
**Success Criteria** (what must be TRUE):

  1. User can run `better-token compress` on `CLAUDE.md`, `.cursorrules`, `AGENTS.md`, or `GEMINI.md` and get a smaller file with no LLM calls
  2. User can switch between `safe`, `balanced`, and `aggressive` modes (default `balanced`) and the validator stays on in every mode
  3. User can run with `--dry-run` to see the token delta without any file being written
  4. After any compression, code blocks, inline code, URLs, paths, and headings are byte-identical to the original — and on any mismatch the compressed version is discarded and the original kept
  5. User can roll back to the `.original` backup, and re-running compression on an already-compressed file makes no further change

**Plans**: 3/3 plans executed

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Walking Skeleton: scaffold + `compress --dry-run` end-to-end with real tokenizer + balanced-mode heuristic + byte-exact validator gate

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Real write path with `.original` sidecar + fixed-point idempotency + `rollback` command

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03-PLAN.md — `safe` / `aggressive` modes + interactive TTY prompt + `--yes` non-TTY + standalone `validate` command + path validation

**Cross-cutting constraints:**

- Default mode with no `--mode` flag is `balanced` (D-11).

### Phase 2: MCP Shrink Proxy

**Goal**: Users can route any MCP server through `better-token` and get smaller tool/prompt/resource descriptions without breaking tool calls
**Mode**: mvp
**Depends on**: Phase 1
**Requirements**: MCP-01, MCP-02, MCP-03, MCP-04
**Success Criteria** (what must be TRUE):

  1. User can start `better-token` as a stdio proxy in front of an upstream MCP server and have a downstream IDE connect to it transparently
  2. `tools/list`, `prompts/list`, and `resources/list` responses reach the IDE with `description` fields compressed; all other fields are untouched
  3. `tools/call` request payloads and responses pass through byte-identical — no mutation, no data loss
  4. When the proxy hits a parse error it falls back to pass-through, and the user can configure which fields are compressed via environment variables

**Plans**: 3 plans

Plans:
**Wave 1**

- [ ] 02-01-PLAN.md — Transparent stdio proxy + list-description shrink (MCP-01, MCP-02)

**Wave 2** *(blocked on Wave 1)*

- [ ] 02-02-PLAN.md — BETTER_TOKEN_* field/mode config allowlist (MCP-04)

**Wave 3** *(blocked on Wave 2)*

- [ ] 02-03-PLAN.md — Parse-error pass-through + exit/debug hardening + IDE verify (MCP-03)

### Phase 3: Claude Code & Cursor Adapters

**Goal**: Users can install adapters in Claude Code and Cursor that enforce terse output and re-inject the rule every turn without drifting
**Mode**: mvp
**Depends on**: Phase 1, Phase 2
**Requirements**: ADAPT-01, ADAPT-02, ADAPT-03, ADAPT-04, ADAPT-05
**Success Criteria** (what must be TRUE):

  1. User can install the Claude Code adapter and see `SessionStart`, `UserPromptSubmit`, and `Stop` hooks registered and firing
  2. User can install the Cursor adapter and see an always-apply `.mdc` rule plus MCP shrink integration active
  3. On Claude Code, the full active terse rule is re-injected on every `UserPromptSubmit` — not only at session start — so style does not drift mid-conversation
  4. User can toggle output style with `/better-token off|lite|full|ultra` or natural language ("normal mode") and the choice persists across sessions via a flag file
  5. After a carve-out response (code, exact errors, security warnings, irreversible confirmations), terse mode resumes automatically on the next turn

**Plans**: TBD
**UI hint**: yes

### Phase 4: Honest Stats & Verification

**Goal**: Users can see exactly what `better-token` saved and cost, and re-compress verbose responses when warranted
**Mode**: mvp
**Depends on**: Phase 3
**Requirements**: STAT-01, STAT-02, STAT-03, STAT-04
**Success Criteria** (what must be TRUE):

  1. `better-token stats` reports input savings (L1), output savings (L2), framework overhead, and net savings — and shows a negative net honestly when overhead exceeds savings
  2. Every figure is labeled as measured (provider usage where available) or estimated (tokenizer), so the user never confuses the two
  3. The system computes a verbosity score per response relative to task type and surfaces it to the user
  4. When verbosity exceeds threshold, the user can opt in to a recompress pass of the last response — and it never auto-triggers for code or security content

**Plans**: TBD

### Phase 5: Profile Compiler & Installer

**Goal**: Users can install `better-token` into all their agents with one command and trust the OSS core is private and offline
**Mode**: mvp
**Depends on**: Phase 4
**Requirements**: PROF-01, PROF-02, INST-01, INST-02, PRIV-01
**Success Criteria** (what must be TRUE):

  1. A single canonical YAML profile defines rules, L1 modes, L2 levels, and carve-outs — and the user edits only this file
  2. The compiler turns that profile into Claude Code plugin/hooks, Cursor `.mdc`, and MCP server config with no hand-duplicated agent configs
  3. One command detects installed agents (Claude Code, Cursor) and installs the matching adapters; re-running it is safe and idempotent
  4. The installer supports `--dry-run`, `--only <agent>`, and `--uninstall`
  5. After install, the OSS core makes zero network calls and sends zero telemetry — verifiable by the user

**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. L1 Compression Engine & Validator | 3/3 | Complete    | 2026-07-24 |
| 2. MCP Shrink Proxy | 0/TBD | Not started | - |
| 3. Claude Code & Cursor Adapters | 0/TBD | Not started | - |
| 4. Honest Stats & Verification | 0/TBD | Not started | - |
| 5. Profile Compiler & Installer | 0/TBD | Not started | - |
