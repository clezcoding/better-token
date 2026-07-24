# Phase 1: L1 Compression Engine & Validator - Context

**Gathered:** 2026-07-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can compress rule/memory files deterministically (no LLM), switch `safe` / `balanced` / `aggressive` modes (default `balanced`), preview token delta with `--dry-run`, and trust a byte-exact validation gate that discards bad output and keeps the original. Rollback restores from a sidecar backup. This phase delivers `packages/core` + CLI surface for compress/validate/rollback only — not MCP proxy, adapters, L3 stats package, or installer.

</domain>

<decisions>
## Implementation Decisions

### Heuristik-Stufen pro Mode
- **D-01:** `safe` may change whitespace and obvious filler phrases only — nothing semantic.
- **D-02:** `balanced` (default) additionally shortens inflation (repetition, courtesy fluff, meta-explanations) while leaving rules/constraints unchanged.
- **D-03:** `aggressive` may densify structure (merge paragraphs, reduce bullet noise) but must not invent abbreviations (`invented_abbreviations` banned per PRD).
- **D-04:** Heading text is never altered; only surrounding prose may be compressed. Heading structure remains a validator-protected region.

### Backup- & Rollback-Konvention
- **D-05:** Sidecar naming uses suffix `.original` beside the source (e.g. `CLAUDE.md.original`).
- **D-06:** Create sidecar only when missing, before the first successful write; never overwrite an existing sidecar; never write sidecar on `--dry-run`.
- **D-07:** Rollback CLI: `better-token rollback <file>` restores from the sidecar.

### Dry-run- & CLI-Feedback
- **D-08:** `--dry-run` prints short stats (tokens before/after/delta/%, mode, validator pass/fail) plus optional `--diff` for unified diff.
- **D-09:** Phase-1 token figures use a local offline tokenizer and are labeled **estimated** (aligns with later STAT-02 measured vs estimated).
- **D-10:** Phase-1 commands: `compress`, `rollback`, `validate` (standalone validator on a file).
- **D-11:** Default mode without flag: `balanced`.

### Idempotenz-Erkennung
- **D-12:** Detect already-compressed via fixed-point: run compress; if output ≡ input → no-op. No in-file marker comment.
- **D-13:** Mode switches recompress from the `.original` sidecar (never stack compress on already-compressed content).
- **D-14:** On idempotency hit: message `already compressed — no changes`, exit 0.
- **D-15:** No `--force` flag in Phase 1.

### Datei-Scope in Phase 1
- **D-16:** First-class targets: `CLAUDE.md`, `.cursorrules`, `AGENTS.md`, `GEMINI.md` plus common equivalents (`.cursor/rules/*.mdc`, `CLAUDE.local.md`, `AGENT.md`). Engine accepts any markdown path; docs list the canonicals.
- **D-17:** No path argument + TTY: always interactive prompt which files to compress.
- **D-18:** No path argument + non-TTY: error unless path given or `--yes` (compress all detected canonicals).
- **D-19:** Explicit non-canonical `.md` paths allowed with a warning; non-markdown/binary → hard reject with clear error.

### Claude's Discretion
- Exact filler-phrase lists and synonym tables per mode (within D-01–D-03 bounds).
- Which offline tokenizer library/package to use (must be local, offline, labeled estimated).
- Internal library API shape of `packages/core` (CLI contracts above are locked).
- Parser implementation (regex protected-token vs remark/unified AST) — research/planner choose for safety; user locked outcomes not stack.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product & requirements
- `.planning/PROJECT.md` — core value, L1=heuristics, constraints, key decisions
- `.planning/REQUIREMENTS.md` — COMP-01..05, SAFE-01..03 (Phase 1 traceability)
- `.planning/ROADMAP.md` — Phase 1 goal, success criteria, requirement mapping
- `.planning/STATE.md` — current position and init decisions
- `Tokenwise-PRD.md` — FR-1.x compression/idempotency/backup intent; `invented_abbreviations` ban; prior art notes

### Research (implementation guidance, not user locks)
- `.planning/research/SUMMARY.md` — Phase 1 delivers tokenizer + heuristics + validator in `packages/core`
- `.planning/research/ARCHITECTURE.md` — protected-token pattern, proposed `packages/core` layout
- `.planning/research/STACK.md` — TypeScript; unified/remark candidate vs regex tradeoff
- `.planning/research/FEATURES.md` — feature framing for L1
- `.planning/research/PITFALLS.md` — known risks for compression/validation

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None in-repo yet — greenfield. Prior art external: JuliusBrussee/caveman (`caveman-compress` validate pipeline ideas) referenced in PROJECT.md / PRD.

### Established Patterns
- Research proposes monorepo `packages/core` with `tokenizer` / `compressor` / `validator` modules; CLI wraps core.
- Safety invariant: byte-exact check on protected regions; on failure discard compressed output and keep original.

### Integration Points
- Phase 2 (`packages/shrink-mcp`) and later adapters will import `packages/core` — keep public compress/validate API library-first.
- No existing routes/UI; Phase 1 is CLI + library only.

</code_context>

<specifics>
## Specific Ideas

- User chose sidecar `CLAUDE.md.original` (suffix) over PRD's `.original.md` spelling — follow discussion lock (D-05).
- Interactive-first when no path (D-17) with strict non-TTY escape hatch via path or `--yes` (D-18).
- Explicit ban on invented abbreviations in `aggressive` (D-03), echoing PRD never_compress / anti-patterns list.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. MCP proxy, adapters, L3 stats package, installer, and LLM rewrite remain later phases / out of scope per ROADMAP.

</deferred>

---

*Phase: 1-L1 Compression Engine & Validator*
*Context gathered: 2026-07-24*
