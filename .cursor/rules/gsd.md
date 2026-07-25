<!-- gsd-project-start source:PROJECT.md -->

## Project

**better-token**

better-token is a cross-IDE framework that reliably saves LLM tokens for AI coding agents (Claude Code, Cursor, and later Codex, Gemini CLI, Windsurf, Cline, and any MCP-capable tool). It treats **deterministic context/input compression** as the product core — measurable, reproducible, byte-validated — with output-style terseness as a supporting layer that is enforced and verified, not hoped for via a one-shot style prompt.

Working name was Tokenwise; renamed to **better-token** after availability/brand checks (npm `tokenwise`, GitHub `@tokenwise`, and TokenwiseHQ LLM-cost product all collide).

**Core Value:** Deterministic, byte-verified input/context compression that cuts tokens without substance loss — every time, not only when the model cooperates.

### Constraints

- **Tech — L1 engine**: Rule/heuristic compression only in v1 — no LLM calls for compress; fully offline
- **Tech — safety invariant**: Byte validator is a hard gate; on failure keep original; `.original` backup + rollback
- **Tech — MCP shrink**: Touch only `description` fields in list responses; never mutate `tools/call` payloads/responses in v1
- **Platform priority**: Depth first — Claude Code + Cursor before breadth
- **License**: MIT
- **Docs language**: English only
- **Privacy**: No network calls after install in OSS core; symlink-safe, size-capped config/flags; hardened against injection into model context
- **Naming**: Package/CLI `better-token`; profile/config may use `better-token` identifiers throughout
- **Distribution**: npm package + GitHub; one-command installer with auto-detect

<!-- gsd-project-end -->

<!-- gsd-stack-start source:research/STACK.md -->

## Technology Stack

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **TypeScript** | `^5.5.0` | Language & Type Safety | Provides compile-time safety and robust type inference across the compiler, MCP proxy, and adapters. Essential for maintaining the canonical profile schema. |
| **Node.js** | `^20.11.0` (LTS) | Runtime Environment | The standard execution environment for IDE extensions, CLI tools, and MCP servers. Node 20+ supports modern ESM, native fetch, and high-performance string manipulation. |
| **ESBuild** | `^0.25.0` | Bundler & Compiler | Compiles and bundles the CLI, MCP server, and adapters into single-file, highly optimized, portable executable scripts. Crucial for fast CLI startup times (< 50ms). |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **`@modelcontextprotocol/sdk`** | `^1.29.0` | MCP Server Protocol | Used to build the L1 MCP shrink proxy server. The `1.x` branch remains the stable, widely supported production SDK for integrating with Cursor, Claude Code, and other IDEs. |
| **`bpe-lite`** | `^0.5.2` | Offline Token Counting | Used in L3 for local, zero-dependency token estimation across OpenAI (`cl100k_base`, `o200k_base`), Anthropic, and Gemini models. Pure JS, works flawlessly in edge and serverless runtimes without Rust/WASM compilation issues. |
| **`@anthropic-ai/sdk`** | `^0.114.0` | Ground-Truth Token Counting | Used in L3 to fetch exact token usage metrics from Anthropic's official `messages.countTokens` API when online. |
| **`zod`** | `^4.4.3` | Schema Validation | Used in L4 for parsing the canonical profile YAML/JSON and validating tool inputs in the MCP proxy. Fully integrated with standard schema validation. |
| **`commander`** | `^15.0.0` | CLI Parsing | Used to build the `better-token` CLI installer and manager. Zero-dependency, lightweight, and highly performant. |
| **`unified`** | `^11.0.0` | Markdown AST Parsing | Core engine for L1 deterministic markdown compression. Parses Markdown into an Abstract Syntax Tree (AST) to safely strip comments and whitespace without breaking code blocks or URLs. |
| **`remark-parse`** | `^11.0.0` | Markdown Parser | Unified plugin to parse raw markdown text into an mdast (Markdown Abstract Syntax Tree). |
| **`remark-stringify`** | `^11.0.0` | Markdown Compiler | Unified plugin to serialize the modified mdast back into deterministic, compressed markdown text. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **`tsx`** | TypeScript Execution | Enables direct execution of TypeScript files during development without a manual compilation step. |
| **`vitest`** | Unit & Integration Testing | High-performance test runner with native TypeScript support, crucial for executing the byte-exact validation gate tests. |

## Installation

# Core Dependencies

# Supporting SDKs (for online validation)

# Dev Dependencies

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative | Why Not Recommended for `better-token` |
|-------------|-------------|-------------------------|----------------------------------------|
| **`bpe-lite`** | `js-tiktoken` / `tiktoken` | If only targeting OpenAI models and exact local token counts are required. | `tiktoken` requires Rust/WASM native bindings which frequently break in restricted IDE environments or edge runtimes. It also lacks support for Anthropic and Gemini vocabularies, leading to severe token-counting drift. |
| **`bpe-lite`** | `@anthropic-ai/tokenizer` | Never. | This official package is deprecated and highly inaccurate for Claude 3 and newer models (e.g., Claude 3.5 Sonnet, Claude 4). |
| **`unified` / `remark`** | Regex Heuristics | For ultra-lightweight scripts where bundle size is the only constraint and markdown structure is extremely simple. | Regex-based markdown stripping is highly fragile and prone to breaking code blocks, URLs, and inline code, which violates the core safety invariant of 0% substance loss. |
| **`@modelcontextprotocol/sdk`** | `@modelcontextprotocol/server` (v2) | If building an ESM-only, greenfield application targeting Node.js 20+ exclusively, and adopting the 2026-07-28 spec candidate. | The v2 SDK is currently in beta. For a cross-IDE tool that must run reliably inside existing user environments (including older IDE versions), the stable `1.x` branch of `@modelcontextprotocol/sdk` offers maximum compatibility. |
| **`commander`** | `yargs` | For massive, enterprise-grade CLIs with nested subcommand files and complex option-grouping. | `yargs` pulls in multiple transitive dependencies, increasing the installation footprint and CLI startup latency. `commander` is zero-dependency and faster. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **`@anthropic-ai/tokenizer`** | Deprecated and highly inaccurate for Claude 3, 3.5, and newer models. | `bpe-lite` (for offline estimation) or `@anthropic-ai/sdk` (for online API-based counting). |
| **Regex-only Minifiers** | Fragile and prone to stripping critical code blocks, URLs, or path structures, violating the 0% substance loss invariant. | `unified` + `remark-parse` + `remark-stringify` AST-based compression. |
| **`tiktoken` (WASM)** | WASM compilation and loading overhead can cause memory leaks (OOM after ~10M calls) and load failures in restricted IDE plugin environments. | `js-tiktoken` (pure JS) or `bpe-lite` (pure JS, multi-provider). |
| **LLMs for L1 Compression** | Introducing LLM rewrites for L1 compression in v1 adds massive token overhead, non-deterministic outputs, latency, and requires online API keys. | Deterministic AST-based rule engines with `safe`, `balanced`, and `aggressive` modes. |

## Stack Patterns by Variant

- Use `bpe-lite` for token estimation.
- Because it runs fully locally with zero network calls and zero native dependencies, ensuring fast and private token counting.
- Use `@anthropic-ai/sdk`'s `messages.countTokens` endpoint.
- Because local tokenizers for Anthropic are reverse-engineered approximations (e.g., Xenova's vocabulary) and can drift by ±5-12% on complex prompts.
- Use `@modelcontextprotocol/sdk` (v1.x) with standard stdio transport.
- Because stdio is the universal transport supported by Claude Code, Cursor, and other IDEs, avoiding the need for HTTP port management and DNS rebinding vulnerabilities on localhost.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `typescript@^5.5.0` | `zod@^4.4.3` | Zod v4 requires modern TypeScript compiler options for optimal type inference. |
| `@modelcontextprotocol/sdk@^1.29.0` | `zod@^4.4.3` | Zod is used transitively by the MCP SDK for tool input schema validation. |
| `unified@^11.0.0` | `remark-parse@^11.0.0` | Unified v11 and Remark v11 are ESM-only packages and must be compiled together using ESBuild. |

## Sources

- `/dqbd/tiktoken` — Verified pure JS port `js-tiktoken` (v1.0.21) and WASM `tiktoken` (v1.0.22) versions and limitations.
- `/modelcontextprotocol/typescript-sdk` — Verified stable `1.x` branch (`@modelcontextprotocol/sdk@^1.29.0`) vs `v2.0.0-beta` split packages.
- `/anthropics/anthropic-sdk-typescript` — Verified `@anthropic-ai/sdk@^0.114.0` official token counting and usage interfaces.
- `https://www.npmjs.com/package/bpe-lite` — Sourced `bpe-lite` (v0.5.2) multi-provider offline token counting capabilities and accuracy benchmarks.
- `https://code.claude.com/docs/en/hooks.md` — Verified Claude Code lifecycle hooks (`SessionStart`, `UserPromptSubmit`, `Stop`) for per-turn context injection.
- `https://github.com/rehypejs/rehype-minify` — Verified AST-based minification techniques using Unified/Remark/Rehype plugins.

<!-- gsd-stack-end -->

<!-- gsd-conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- gsd-conventions-end -->

<!-- gsd-architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- gsd-architecture-end -->

<!-- gsd-skills-start source:skills/ -->

## Project Skills

| Skill | Description | Path |
|-------|-------------|------|
| cavecrew | > Decision guide for delegating to caveman-style subagents. Tells the main thread WHEN to spawn `cavecrew-investigator` (locate code), `cavecrew-builder` (1-2 file edit), or `cavecrew-reviewer` (diff review) instead of doing the work inline or using vanilla `Explore`. Subagent output is caveman-compressed so the tool-result injected back into main context is ~60% smaller — main context lasts longer across long sessions. Trigger: "delegate to subagent", "use cavecrew", "spawn investigator/builder/reviewer", "save context", "compressed agent output". | `.agents/skills/cavecrew/SKILL.md` |
| caveman | > Ultra-compressed communication mode. Cuts output tokens 65% (measured) by speaking like caveman while keeping full technical accuracy. Supports intensity levels: lite, full (default), ultra, wenyan-lite, wenyan-full, wenyan-ultra. Use when user says "caveman mode", "talk like caveman", "use caveman", "less tokens", "be brief", or invokes /caveman. Also auto-triggers when token efficiency is requested. | `.agents/skills/caveman/SKILL.md` |
| caveman-commit | > Ultra-compressed commit message generator. Cuts noise from commit messages while preserving intent and reasoning. Conventional Commits format. Subject ≤50 chars, body only when "why" isn't obvious. Use when user says "write a commit", "commit message", "generate commit", "/commit", or invokes /caveman-commit. Auto-triggers when staging changes. | `.agents/skills/caveman-commit/SKILL.md` |
| caveman-compress | > Compress natural language memory files (CLAUDE.md, todos, preferences) into caveman format to save input tokens. Preserves all technical substance, code, URLs, and structure. Compressed version overwrites the original file. Human-readable backup saved as FILE.original.md. Trigger: /caveman-compress FILEPATH or "compress memory file" | `.agents/skills/caveman-compress/SKILL.md` |
| caveman-help | > Quick-reference card for all caveman modes, skills, and commands. One-shot display, not a persistent mode. Trigger: /caveman-help, "caveman help", "what caveman commands", "how do I use caveman". | `.agents/skills/caveman-help/SKILL.md` |
| caveman-review | > Ultra-compressed code review comments. Cuts noise from PR feedback while preserving the actionable signal. Each comment is one line: location, problem, fix. Use when user says "review this PR", "code review", "review the diff", "/review", or invokes /caveman-review. Auto-triggers when reviewing pull requests. | `.agents/skills/caveman-review/SKILL.md` |
| caveman-stats | > Show real token usage and estimated savings for the current session. Reads directly from the Claude Code session log — no AI estimation. Triggers on /caveman-stats. Output is injected by the mode-tracker hook; the model itself does not compute the numbers. | `.agents/skills/caveman-stats/SKILL.md` |
<!-- gsd-skills-end -->

<!-- gsd-workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- gsd-workflow-end -->

<!-- gsd-profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- gsd-profile-end -->
