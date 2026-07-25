# Phase 2: MCP Shrink Proxy - Context

**Gathered:** 2026-07-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can run `better-token` as a stdio MCP shrink proxy in front of a single upstream MCP server so any MCP-capable IDE gets smaller `description` fields on `tools/list`, `prompts/list`, and `resources/list` without breaking tool calls. `tools/call` request/response payloads stay byte-identical; parse errors fall back to pass-through; compressible fields are configured via `BETTER_TOKEN_*` environment variables. This phase delivers `packages/shrink-mcp` plus a `proxy` CLI subcommand on the existing `better-token` bin — not adapters (Phase 3), L3 stats package (Phase 4), or installer/profile compiler (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### Proxy-Start / CLI-Einstieg
- **D-01:** CLI surface is `better-token proxy -- <upstream-cmd …>` — one subcommand on the existing `better-token` bin; upstream runs as a child process after `--`.
- **D-02:** Upstream args are everything after `--`; upstream inherits the proxy process environment (standard `mcp.json` `command`/`args` pattern).
- **D-03:** Strictly one upstream MCP server per proxy process. Multiple servers = multiple `better-token proxy -- …` entries in `mcp.json`. No multi-upstream hub in v1.
- **D-04:** Package split: `proxy` subcommand registered on `@better-token/core`'s existing bin; proxy transport/JSON-RPC logic lives in `packages/shrink-mcp`.

### Description-Compress-Mode
- **D-05:** MCP `description` compression reuses L1 modes `safe` / `balanced` / `aggressive` from `@better-token/core`; default `balanced` (same as Phase 1 D-11).
- **D-06:** Mode is set via env `BETTER_TOKEN_MODE=safe|balanced|aggressive` and optionally CLI `--mode` on the `proxy` subcommand.
- **D-07:** Each description goes through the core compressor **and** byte-exact validator. On validation failure, keep the **original description** for that field; do not discard the rest of the list response.
- **D-08:** Descriptions below a minimum length threshold are left unchanged (threshold exact value = research/planner discretion). Missing/`null` descriptions are never invented.

### Env-Feld-Konfiguration
- **D-09:** Default: compress `description` on **tools**, **prompts**, and **resources** list responses (all three on).
- **D-10:** Field selection via allowlist env `BETTER_TOKEN_SHRINK_FIELDS` with entries like `tools.description,prompts.description,resources.description`.
- **D-11:** All proxy-related env vars use the `BETTER_TOKEN_*` prefix (consistent with `BETTER_TOKEN_MODE`).
- **D-12:** Invalid or unknown field config → one stderr warning + fall back to safe defaults (D-09). Proxy still starts.

### Proxy-Feedback bei Fehlern/Debug
- **D-13:** On JSON-RPC parse errors: pass-through original bytes on stdout; emit a single stderr line (e.g. `pass-through: parse error`). Stdout stays pure MCP traffic.
- **D-14:** Successful shrink diagnostics (estimated tokens before/after per list response) only when debug is enabled — never noisy by default. Full L3 stats remain Phase 4.
- **D-15:** When the upstream process exits non-zero (or crashes): proxy exits with the **same exit code** and a short stderr message.
- **D-16:** Debug enabled by `--debug` **OR** `BETTER_TOKEN_DEBUG=1` (either is enough).

### Claude's Discretion
- Exact minimum-length threshold for skipping short descriptions (D-08).
- Exact stderr message wording and debug log line format.
- Internal JSON-RPC framing/buffering implementation (must avoid stream-draining pitfalls noted in research).
- Exact default string value for `BETTER_TOKEN_SHRINK_FIELDS` when unset (must equal D-09 semantics).
- Whether `--mode` overrides env or vice versa when both set (recommend: CLI flag wins — document in plan).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product & requirements
- `.planning/PROJECT.md` — MCP shrink constraint: description fields only; never mutate `tools/call`; privacy/offline
- `.planning/REQUIREMENTS.md` — MCP-01..MCP-04 (Phase 2 traceability)
- `.planning/ROADMAP.md` — Phase 2 goal, success criteria, dependency on Phase 1
- `.planning/STATE.md` — current position; stream-buffering research flag for Phase 2
- `better-token-prd.md` — FR-1.3 MCP-Shrink-Proxy intent; pass-through on parse errors; prior art `caveman-shrink`

### Prior phase locks
- `.planning/phases/01-l1-compression-engine-validator/01-CONTEXT.md` — L1 modes D-01..D-03, default balanced D-11, validator hard gate; library-first core API for Phase 2 import

### Research (implementation guidance, not user locks)
- `.planning/research/SUMMARY.md` — `packages/shrink-mcp` as Phase 2 deliverable; stream-consuming proxy pitfall
- `.planning/research/ARCHITECTURE.md` — subprocess stdio interceptor pattern; monorepo layout `packages/shrink-mcp`
- `.planning/research/FEATURES.md` — MCP Shrink Proxy (descriptions only) feature framing
- `.planning/research/PITFALLS.md` — stream-draining / auth-blocking middleware risks (if present)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `@better-token/core` (`packages/core`): `compress` / validator / tokenizer / modes — import for description shrinking; existing `better-token` bin via Commander for registering `proxy` subcommand.
- Phase 1 CLI already ships `compress` / `rollback` / `validate` — extend same bin, do not invent a second primary binary.

### Established Patterns
- Deterministic heuristics only (no LLM); offline; validator as hard gate on protected regions.
- Monorepo workspaces `packages/*`; research names Phase 2 package `shrink-mcp`.
- No `.planning/codebase/*.md` maps yet — scout from live `packages/core` sources.

### Integration Points
- New package `packages/shrink-mcp` imported by core CLI (or thin CLI wrapper) for stdio proxy loop.
- IDE config: user points `mcp.json` `command`/`args` at `better-token proxy -- <upstream…>` with optional `env` for `BETTER_TOKEN_*`.
- Phase 3 Cursor adapter and Phase 5 installer will generate these proxy entries — keep CLI contract stable.

</code_context>

<specifics>
## Specific Ideas

- User needed an explicit mental model of “proxy”: IDE ↔ better-token ↔ upstream over stdio; only list-response `description` fields mutate; tool names/schemas/calls untouched.
- Multi-upstream hub deferred after tradeoff discussion (isolation + mcp.json fit vs hub complexity).
- Debug dual-path (`--debug` OR env) chosen after resolving conflict between “debug-only shrink logs” and “flag-only debug”.

</specifics>

<deferred>
## Deferred Ideas

- **Multi-upstream hub** — one process multiplexing many MCP servers. Out of Phase 2 scope; revisit if Phase 5 installer/config duplication becomes painful.
- **Persistent/aggregated shrink stats UI** — Phase 4 (STAT-*). Phase 2 only allows optional debug stderr lines.
- **Auto-install of proxy entries into IDE configs** — Phase 5 (INST-*).

</deferred>

---

*Phase: 2-MCP Shrink Proxy*
*Context gathered: 2026-07-25*
