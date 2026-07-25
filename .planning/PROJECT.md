# better-token

## What This Is

better-token is a cross-IDE framework that reliably saves LLM tokens for AI coding agents (Claude Code, Cursor, and later Codex, Gemini CLI, Windsurf, Cline, and any MCP-capable tool). It treats **deterministic context/input compression** as the product core — measurable, reproducible, byte-validated — with output-style terseness as a supporting layer that is enforced and verified, not hoped for via a one-shot style prompt.

Working name was Tokenwise; renamed to **better-token** after availability/brand checks (npm `tokenwise`, GitHub `@tokenwise`, and TokenwiseHQ LLM-cost product all collide).

## Core Value

Deterministic, byte-verified input/context compression that cuts tokens without substance loss — every time, not only when the model cooperates.

## Business Context

- **Customer**: Developers who use AI coding IDEs heavily and care about token cost, latency, and context-window headroom
- **Revenue model**: Open-source core (MIT); no paid tier planned for v1
- **Success metric**: Reproducible net token savings (input + output, minus framework overhead) with 0% substance loss on compressed rule files
- **Strategy notes**: Inspired by [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) (MIT); invert caveman’s weighting — L1 deterministic compression first, L2 style second with real enforcement

## Requirements

### Validated

- [x] Deterministic rule/memory file compression with byte-exact validation gate (code, inline code, URLs, paths, headings preserved) — Validated in Phase 1: L1 Compression Engine & Validator
- [x] Switchable L1 aggression modes: `safe` / `balanced` / `aggressive` (default `balanced`); validator always on — Validated in Phase 1: L1 Compression Engine & Validator
- [x] Security carve-outs: never compress code, exact errors, security warnings, irreversible confirmations — Validated in Phase 1: L1 Compression Engine & Validator
- [x] MCP shrink proxy that compresses tool/prompt/resource `description` fields only; pass-through on parse errors; tools/call byte-identical — Validated in Phase 2: MCP Shrink Proxy

### Active

- [ ] Claude Code adapter with per-turn style injection (Tier A hooks) for output terseness
- [ ] Cursor adapter (always-apply rule + MCP) as second depth target
- [ ] Honest stats: measured vs estimated usage; separate input savings, output savings, framework overhead, net (including negative net)
- [ ] One-command install with agent auto-detect; re-run safe; dry-run / uninstall
- [ ] Canonical profile → adapter compiler (single source of truth, no hand-duplicated agent configs)
- [ ] OSS defaults: no backend, no telemetry, offline-capable core; docs in English; MIT license

### Out of Scope

- Own coding agent — not competing with agent runtimes; we save tokens inside existing ones
- Model fine-tuning in v1
- Telemetry / hosted backend in OSS core — privacy by default
- Translating user content — language preserved; compress only
- LLM-based rewrite for L1 compression in v1 — rule/heuristic engines only (modes above); LLM rewrite deferred
- Broad IDE coverage before depth — Gemini/Windsurf/Cline/etc. after Claude Code + Cursor are solid
- Team dashboard / aggregated cloud metrics — v2 outlook

## Context

**Problem:** AI coding agents burn tokens on filler output and large redundant context (rules, tool schemas, file excerpts). caveman cuts ~65% output tokens via a style prompt but drifts mid-conversation, lacks enforcement/verification, and can make net savings negative because the skill itself costs input tokens.

**Opportunity:** Input/context is the controllable lever. It can be compressed deterministically and verified byte-exactly. better-token makes that the product.

**Layer model:**

| Layer | Role |
|-------|------|
| L4 | Canonical profile + adapters (one spec → all IDE formats) |
| L1 | Context/input compression — **product core**, deterministic |
| L2 | Output style — re-injected per turn where platform allows |
| L3 | Verification + measurement — verbosity score, honest stats, optional recompress |

**Support tiers:** A (hooks: Claude Code, Codex, Gemini CLI) → B (rules + MCP: Cursor, Windsurf, Cline, Copilot) → C (MCP proxy everywhere).

**Prior art to reuse/extend from caveman:** compress + validate pipeline ideas; MCP shrink middleware pattern. Reject: prompt-only always-on with session-start-only injection and no post-hoc measurement.

**Source PRD:** [`better-token-prd.md`](../better-token-prd.md) (draft v0.1, 2026-07-24; gitignored) — product intent; name and L1 approach locked in decisions below.

## Constraints

- **Tech — L1 engine**: Rule/heuristic compression only in v1 — no LLM calls for compress; fully offline
- **Tech — safety invariant**: Byte validator is a hard gate; on failure keep original; `.original` backup + rollback
- **Tech — MCP shrink**: Touch only `description` fields in list responses; never mutate `tools/call` payloads/responses in v1
- **Platform priority**: Depth first — Claude Code + Cursor before breadth
- **License**: MIT
- **Docs language**: English only
- **Privacy**: No network calls after install in OSS core; symlink-safe, size-capped config/flags; hardened against injection into model context
- **Naming**: Package/CLI `better-token`; profile/config may use `better-token` identifiers throughout
- **Distribution**: npm package + GitHub; one-command installer with auto-detect

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Rename Tokenwise → better-token | npm/GitHub/domains taken; TokenwiseHQ is LLM cost product (direct collision) | Done — name locked; PRD updated |
| Depth before breadth | Solid L1+L3 on Claude Code + Cursor beats thin support everywhere | — Pending |
| OSS from day one | Public repo, benchmarks, community; not private-first | — Pending |
| L1 = deterministic heuristics, not LLM rewrite | Reliability and offline; aligns with core thesis | Done — Phase 1 |
| L1 modes: safe / balanced / aggressive (default balanced) | User-selectable aggression; validator always on | Done — Phase 1 |
| MIT + English docs | Match caveman/OSS norms; EN for global contributors | — Pending |
| No telemetry/backend in OSS core | Privacy by default | — Pending |
| MCP shrink: description-only + raw stdin pipe | Preserve tools/call byte-identity; stderr-only diagnostics | Done — Phase 2 (`@better-token/shrink-mcp`) |
| BALANCED_MCP_PATTERNS for technical MCP prose | Filler-only L1 left filesystem corpus at 0% savings | Done — Phase 2 (4108→3576 ~13%) |
| Dual demo mcp.json (live FS + mock corpus) | Visible Token sparen without breaking tools/call | Done — Phase 2 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

## Current State

Phase 2 complete — `@better-token/shrink-mcp` + `better-token proxy` shrink list descriptions (MCP-01..04), tools/call pass-through, parse fallback, field allowlist, G-02-2 technical prose (~13% on filesystem corpus). UAT 3/3, SECURITY threats_open:0, Nyquist compliant. Next: Phase 3 Claude Code & Cursor Adapters.

---
*Last updated: 2026-07-25 after Phase 2*
