# Walking Skeleton — better-token

**Phase:** 1
**Generated:** 2026-07-24

## Capability Proven End-to-End

A developer can run `better-token compress <rule-file.md> --dry-run` and see a real estimated token delta with a byte-exact validation gate that refuses to write any output that corrupts code blocks, inline code, URLs, paths, or headings.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Language | TypeScript ^5.5.0 | Compile-time safety across core engine, CLI, and later MCP proxy / adapters. |
| Runtime | Node.js ^20.11.0 LTS | Standard runtime for IDE CLIs and MCP servers; ESM + native fetch. |
| Repository shape | npm workspaces monorepo, `packages/core` first | Allows `packages/shrink-mcp`, `packages/stats`, `packages/compiler` (later phases) to import `packages/core` without bundling unnecessary deps. |
| Markdown parsing | `unified` ^11 + `remark-parse` ^11 + `remark-stringify` ^11 | AST-aware parsing is the only way to guarantee 0% substance loss on protected regions (regex-only minifiers are fragile). |
| Token estimation | `bpe-lite` ^0.5.2 (offline, multi-provider) | Pure JS, no WASM, works in restricted IDE plugin environments; supports OpenAI/Anthropic/Gemini vocabularies. Phase 1 figures labeled **estimated** per D-09. |
| CLI parsing | `commander` ^15 + `zod` ^4 for option schema | Zero-dependency, fast CLI; zod validates options and (later) canonical profile. |
| Build | `esbuild` ^0.25 (dev dep) | Single-file bundle for <50ms CLI startup. |
| Test runner | `vitest` ^2 (dev dep) | Native TS, fast unit + integration. |
| TS execution | `tsx` ^4 (dev dep) | Direct TS execution during development. |
| Compression approach | Protected-token pattern: extract code/inline-code/URL/path/heading/frontmatter → placeholders → heuristic prose compression → re-hydrate → byte-exact validate | Guarantees technical syntax is never altered; validator is a hard pre-write gate. |
| Backup convention | Sidecar `<file>.original` (suffix), created only when missing, never overwritten, never on `--dry-run` (D-05, D-06) | Preserves the true original across multiple compressions and mode switches. |
| Idempotency | Fixed-point detection (output ≡ input → no-op, exit 0); no in-file marker (D-12, D-14) | Avoids polluting user files with marker comments. |
| Mode switching | Recompress from `.original` sidecar, never stack on already-compressed content (D-13) | Prevents compounding semantic drift across modes. |
| Directory layout | `packages/core/src/{index,cli,tokenizer,compressor,validator,backup}.ts` + `packages/core/tests/{unit,integration}` | Library-first public API so Phase 2+ can import core without the CLI. |

## Stack Touched in Phase 1

- [x] Project scaffold (npm workspaces, tsconfig, vitest, esbuild, lint)
- [x] CLI routing — `compress`, `rollback`, `validate` commands with options
- [x] Real file read AND write (compress writes only after validator passes; rollback restores from sidecar)
- [x] One real end-to-end capability — `compress --dry-run` shows real estimated token delta with byte-exact validation
- [x] Documented local full-stack run command — `npx tsx packages/core/src/cli.ts compress <file> --dry-run`

## Out of Scope (Deferred to Later Slices)

- MCP shrink proxy (Phase 2, `packages/shrink-mcp`)
- Claude Code / Cursor adapters and per-turn style injection (Phase 3, `adapters/`)
- Honest stats CLI, verbosity scoring, SQLite logging (Phase 4, `packages/stats`)
- Canonical YAML profile compiler and one-command installer (Phase 5, `packages/compiler`, `bin/install`)
- LLM-based rewrite for L1 compression (v2, COMP-10)
- Online `@anthropic-ai/sdk` ground-truth token counting (Phase 4)
- `--force` flag (explicitly banned in Phase 1 per D-15)
- In-file idempotency marker comments (banned per D-12)
- Invented abbreviations in `aggressive` mode (banned per D-03)
- Translating user content (banned per SAFE-03 / Out of Scope)

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- **Phase 2:** MCP shrink proxy slice — `better-token` runs as a stdio MCP proxy that compresses `description` fields in `tools/list`, `prompts/list`, `resources/list` using `packages/core`.
- **Phase 3:** Adapter slice — Claude Code hooks (SessionStart / UserPromptSubmit / Stop) and Cursor always-apply `.mdc` rule, with per-turn L2 style re-injection and carve-out resume.
- **Phase 4:** Stats slice — `better-token stats` reports input/output savings, framework overhead, net (including negative), verbosity score, optional recompress.
- **Phase 5:** Compiler + installer slice — canonical YAML profile → all target formats; one-command auto-detect install with `--dry-run` / `--only` / `--uninstall`; privacy-enforced offline OSS core.
