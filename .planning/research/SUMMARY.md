# Project Research Summary

**Project:** better-token
**Domain:** Cross-IDE LLM Token-Savings and Context-Compression Framework
**Researched:** 2026-07-24
**Confidence:** HIGH

## Executive Summary

`better-token` is a cross-IDE token-savings and context-compression framework designed to optimize LLM input/output token usage for AI coding agents (Claude Code, Cursor, and later others). Unlike output-style-only solutions that suffer from conversational drift and negative net savings, `better-token` prioritizes deterministic, byte-verified context/input compression (L1) as its product core, with output-style terseness (L2) as a supporting, actively enforced layer. It addresses the massive input token overhead of rule/memory files and verbose tool schemas by compressing them locally and offline with zero semantic loss.

Experts build such tools using a deterministic, AST-aware Markdown parser to protect technical syntax (code blocks, URLs, file paths) during compression, paired with a byte-exact validation gate that rolls back any changes if even a single character of technical syntax is corrupted. Dynamic schema compression is handled via a lightweight stdio-based MCP proxy that trims only description fields, ensuring universal compatibility across any MCP-capable IDE. Output style is reinforced through per-turn hook injection (e.g., Claude Code's `UserPromptSubmit`) to eliminate attention decay, coupled with post-generation verbosity scoring to block or re-compress verbose responses.

The primary risks include semantic-breaking compression of rule files, governance decay during agent context auto-compaction, and negative net savings where the framework's overhead exceeds its savings. These are mitigated by the byte-exact validation gate, constraint pinning in persistent rule files, strict untrusted input boundaries to prevent role confusion, and keeping style prompts extremely brief (<150 tokens) with active net-savings measurement in a local SQLite-backed stats CLI.

## Key Findings

### Recommended Stack

The recommended technology stack is prescriptive, based on the Node.js/TypeScript ecosystem, and optimized for low latency, zero runtime dependencies, cross-platform compatibility, and strict deterministic validation in restricted IDE environments.

**Core technologies:**
- **TypeScript (`^5.5.0`)**: Language & Type Safety — Provides compile-time safety and robust type inference across the compiler, MCP proxy, and adapters. Essential for maintaining the canonical profile schema.
- **Node.js (`^20.11.0` LTS)**: Runtime Environment — Standard execution environment for IDE extensions, CLI tools, and MCP servers. Supports modern ESM, native fetch, and high-performance string manipulation.
- **ESBuild (`^0.25.0`)**: Bundler & Compiler — Compiles the CLI, MCP server, and adapters into single-file, highly optimized, portable executable scripts for fast CLI startup times (< 50ms).
- **`@modelcontextprotocol/sdk` (`^1.29.0`)**: MCP Server Protocol — Used to build the L1 MCP shrink proxy server using the stable, widely supported `1.x` branch.
- **`bpe-lite` (`^0.5.2`)**: Offline Token Counting — Used for local, zero-dependency token estimation across OpenAI, Anthropic, and Gemini models without Rust/WASM compilation issues.
- **`unified` / `remark` (`^11.0.0`)**: Markdown AST Parsing — Core engine for L1 deterministic markdown compression, parsing markdown into an AST to safely strip comments and whitespace without breaking code blocks or URLs.
- **`@anthropic-ai/sdk` (`^0.114.0`)**: Ground-Truth Token Counting — Used to fetch exact token usage metrics from Anthropic's official `messages.countTokens` API when online.
- **`zod` (`^4.4.3`)**: Schema Validation — Used for parsing the canonical profile YAML/JSON and validating tool inputs in the MCP proxy.
- **`commander` (`^15.0.0`)**: CLI Parsing — Used to build the zero-dependency, lightweight CLI installer and manager.

### Expected Features

The feature landscape separates table stakes from differentiators and explicitly defines anti-features to maintain product focus.

**Must have (table stakes):**
- **Deterministic L1 Rule/Memory Compression** — Compresses rule files (`CLAUDE.md`, `.cursorrules`) once to target 40-60% input token reduction.
- **Byte-exact Validation Gate** — Runs a validator after compression to check that code blocks, inline code, URLs, paths, and headings remain 100% identical; discards compressed version on failure.
- **Multi-IDE Adapter Support** — Compiles canonical profile into target formats (Claude Code hooks, Cursor MDC rules).
- **Offline-first / Zero-telemetry Privacy** — Fully local execution, MIT license, no network calls after installation.
- **Honest Stats & Measurement (L3)** — Measures actual input/output tokens and reports input/output savings, framework overhead, and net savings.
- **One-Command Installer with Auto-detect** — Automatically detects installed agents (Claude Code, Cursor), installs adapters, and supports dry-runs/uninstallation.

**Should have (competitive):**
- **Switchable L1 Heuristic Aggression Modes (`safe`, `balanced`, `aggressive`)** — Allows users to fine-tune compression levels while keeping the validation gate active.
- **MCP Shrink Proxy (Descriptions Only)** — Trims verbose tool, prompt, and resource descriptions in `tools/list` etc. to save input tokens without breaking tool schemas.
- **Per-Turn Style Injection (L2)** — Re-injects the terse rule on every single turn (UserPromptSubmit) to prevent model drift.
- **Canonical Profile Compiler (L4)** — Single source of truth (YAML/Markdown) compiling into all target IDE formats automatically.
- **Strict Safety Carve-outs** — Built-in rules to never compress code, exact errors, security warnings, or irreversible confirmations.

**Defer (v2+):**
- **LLM-based Rewrite for L1 Compression** — Too slow, expensive, non-deterministic, and violates offline-first privacy.
- **Own Coding Agent** — High complexity and competes with established tools; focus instead on lightweight utilities.
- **Telemetry / Hosted Backend / Cloud Dashboard** — Violates developer privacy; local stats CLI is preferred.
- **Translating User Content** — High risk of semantic distortion; preserve language and compress only.
- **Mutating Tool Call Payloads/Responses** — Risks breaking downstream parsing; mutate only description fields in list responses.
- **Broad IDE Coverage Before Depth** — Focus first on making Claude Code and Cursor rock-solid before expanding.

### Architecture Approach

The architecture is structured as a monorepo containing distinct packages (`core`, `shrink-mcp`, `compiler`, `stats`) to ensure reusability across CLI, MCP proxy, and hooks without bundling unnecessary dependencies. Platform-specific adapters are separated to allow clean addition of new IDE targets, and a central YAML profile serves as the single source of truth.

**Major components:**
1. **`packages/core` (L1 Engine)** — Markdown parsing, heuristic compression (`safe`/`balanced`/`aggressive`), and byte-exact validation. Pure TypeScript, fully offline.
2. **`packages/shrink-mcp` (L1 MCP Proxy)** — Universal stdio proxy that intercepts JSON-RPC messages to compress tool/prompt/resource descriptions.
3. **`packages/stats` (L3 Stats)** — SQLite-backed database or local JSON store that measures token counts, calculates verbosity scores, and logs session metrics.
4. **`packages/compiler` (L4 Compiler)** — Compiles the canonical YAML profile into target-specific formats (Claude Code hooks, Cursor MDC).
5. **`adapters/` (L2 Adapters)** — Platform-specific integrations (Claude Code hooks for `SessionStart`, `UserPromptSubmit`, `Stop`; Cursor always-apply `.cursor/rules/better-token.mdc`).
6. **`bin/install` (Installer)** — Node.js CLI script that scans system paths, registers hooks/rules, and backs up original files.

### Critical Pitfalls

The top critical pitfalls identified during research are mapped directly to prevention strategies in the implementation.

1. **Semantic-Breaking Rule Compression** — Naive regex or text compactors delete or mangle load-bearing syntax (code blocks, URLs, relative paths). Avoid by using an AST-aware Markdown tokenizer and a byte-exact validation gate that rolls back compression on failure.
2. **Governance Decay under Auto-Compaction** — Agent context auto-compaction summarizes and discards soft, deployment-specific policies. Avoid by "Constraint Pinning" (persistent rule files re-read on every turn) and copying mid-session rules into system-message buffers.
3. **Stream-Consuming & Auth-Blocking MCP Proxy Middleware** — Proxy drains request streams before streaming handlers can read them, or blocks health checks. Avoid by cloning/buffering streams, positioning unauthenticated health check routes early, and preserving session headers.
4. **Negative Net Savings from Adapter Prompt Inflation** — Verbose style prompts injected on every turn exceed the tokens saved. Avoid by keeping style rules extremely brief (<150 tokens), implementing an activation threshold, and logging honest net stats.
5. **Role Confusion & CoT Forgery via Per-Turn Style Injection** — Attacker injects formatting instructions into files that hijack the agent's style or CoT. Avoid by applying strict "untrusted input boundaries" (XML-like delimiters) and stripping CoT-like prefixes from inputs.
6. **Caveman-Style Style-Prompt Drift** — Model drifts back to verbose responses mid-conversation due to attention decay. Avoid by injecting L2 style rules per-turn at the end of the user prompt and grading responses using a real-time Verbosity Score.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Core L1 Compression Engine & Validator (`packages/core`)
**Rationale:** This is the foundation of the entire framework. All other components depend on deterministic, validated compression. Building this first ensures that AST safety and byte-exact validation are fully established before integrating with IDEs.
**Delivers:** Markdown tokenizer (protected token pattern), heuristic compression rules (`safe`, `balanced`, `aggressive`), and the byte-exact validation gate.
**Addresses:** Deterministic L1 Rule/Memory Compression, Byte-exact Validation Gate, Switchable L1 Heuristic Aggression Modes, Strict Safety Carve-outs.
**Avoids:** Semantic-Breaking Rule Compression (Pitfall 1).

### Phase 2: MCP Shrink Proxy (`packages/shrink-mcp`)
**Rationale:** Provides immediate, universal Tier C token savings across all IDEs with MCP support (Cursor, Claude Code, Cline, Windsurf) by dynamically compressing tool/prompt/resource descriptions.
**Delivers:** stdio-based JSON-RPC proxy middleware that intercepts list responses and compresses description fields.
**Uses:** `packages/core` compression engine.
**Implements:** `packages/shrink-mcp` component.
**Avoids:** Stream-Consuming & Auth-Blocking MCP Proxy Middleware (Pitfall 3).

### Phase 3: Claude Code & Cursor Adapters (`adapters/`)
**Rationale:** Establishes deep Tier A and Tier B integrations, enabling per-turn style injection and output terseness. This is where output-style enforcement is implemented to prevent drift.
**Delivers:** Claude Code hooks (`SessionStart`, `UserPromptSubmit`, `Stop`) and Cursor always-apply MDC rules.
**Addresses:** Claude Code Adapter (Tier A Hooks), Cursor Adapter (Tier B Rules + MDC), Per-Turn Style Injection (L2).
**Avoids:** Caveman-Style Style-Prompt Drift (Pitfall 6), Governance Decay under Auto-Compaction (Pitfall 2).

### Phase 4: Stats & Measurement (`packages/stats`)
**Rationale:** Enables honest, data-driven reporting of net token savings. It must be built after adapters are in place so it can receive real-time prompt and response metrics from platform hooks.
**Delivers:** SQLite-backed database schema, heuristic verbosity scorer, and the `better-token stats` CLI.
**Addresses:** Honest Stats & Measurement (L3).
**Avoids:** Negative Net Savings from Adapter Prompt Inflation (Pitfall 4).

### Phase 5: Compiler & Installer (`packages/compiler`, `bin/install`)
**Rationale:** Ties all components together into a polished, user-friendly product. It requires all adapters and packages to be complete so it can compile the canonical profile and install them automatically.
**Delivers:** YAML profile compiler and the one-command auto-detecting installer/uninstaller.
**Addresses:** Canonical Profile Compiler (L4), One-Command Installer with Auto-detect.
**Avoids:** Role Confusion & CoT Forgery via Per-Turn Style Injection (Pitfall 5) by compiling strict untrusted input boundaries into all compiled adapters.

### Phase Ordering Rationale

- **Dependency-Driven:** The core compression engine (`packages/core`) must be built first because the MCP proxy, adapters, and compiler all depend on it.
- **Architecture-Aligned:** Separating the core engine, proxy, and stats into independent packages in a monorepo allows parallel development and testing before wrapping them in platform-specific adapters.
- **Pitfall-Averse:** Building the byte-exact validator in Phase 1 immediately eliminates the risk of semantic corruption. Building the stats engine in Phase 4 ensures that we can measure and optimize adapter prompt overhead before releasing the installer in Phase 5.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Adapters):** Claude Code's hook API is highly interactive but undocumented in some parts. Needs deep research into hook lifecycle payloads and how `hookSpecificOutput` behaves during compaction.
- **Phase 2 (MCP Proxy):** Streaming JSON-RPC over stdio can be fragile. Needs research into buffering and stream cloning in Node.js to prevent stream-draining issues.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Core Engine):** Markdown AST parsing and regex-based token protection are highly established patterns with robust libraries (`unified`, `remark`).
- **Phase 4 (Stats):** Local SQLite logging and basic BPE token counting (`bpe-lite`) are standard, well-documented patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified versions and compatibility for all core packages (`@modelcontextprotocol/sdk`, `bpe-lite`, `unified`, `remark`). Pure JS alternatives like `bpe-lite` avoid WASM compilation issues. |
| Features | HIGH | Clear differentiation from competitors (caveman, headroom) established. Core MVP features are well-defined and mapped to priorities. |
| Architecture | HIGH | Detailed monorepo layout, protected token pattern, and stdio proxy interceptor pattern are fully specified with code examples. |
| Pitfalls | HIGH | Comprehensive list of critical pitfalls (semantic corruption, stream draining, prompt inflation, style drift) identified with concrete prevention strategies. |

**Overall confidence:** HIGH

### Gaps to Address

- **Claude Code Hook Documentation:** Official documentation on Claude Code hooks is sparse. We must validate hook payloads and execution order during Phase 3 planning.
- **WASM tiktoken vs bpe-lite Accuracy:** While `bpe-lite` avoids WASM build issues, we need to verify its token-counting accuracy on Anthropic Claude 3.5 prompts compared to the official `messages.countTokens` API.

## Sources

### Primary (HIGH confidence)
- `/modelcontextprotocol/typescript-sdk` — Verified stable `1.x` branch (`@modelcontextprotocol/sdk@^1.29.0`) vs `v2.0.0-beta` split packages.
- `/anthropics/anthropic-sdk-typescript` — Verified `@anthropic-ai/sdk@^0.114.0` official token counting and usage interfaces.
- `https://www.npmjs.com/package/bpe-lite` — Sourced `bpe-lite` (v0.5.2) multi-provider offline token counting capabilities and accuracy benchmarks.
- `https://code.claude.com/docs/en/hooks.md` — Verified Claude Code lifecycle hooks (`SessionStart`, `UserPromptSubmit`, `Stop`) for per-turn context injection.

### Secondary (MEDIUM confidence)
- **JuliusBrussee/caveman** — Analyzed codebase structure (`skills/caveman`, `src/hooks/caveman-activate.js`, `caveman-mode-tracker.js`, `validate.py`, `caveman-shrink` MCP server).
- **chopratejas/headroom** — Analyzed core features (v0.25.0, AST-aware compression, SmartCrusher, CCR mechanism, proxy/MCP integration, cross-agent memory).
- **Governance Decay in Long-Horizon LLM Agents** (arXiv:2606.22528) — Documented how context compaction erases soft, deployment-specific constraints.
- **Prompt Injection as Role Confusion** (arXiv:2603.12277) — Showed that LLMs map style and roles onto the same features, making them vulnerable to "CoT Forgery."
- **mcp-proxy Issue #61** (GitHub) — Regression in `mcp-proxy` 6.x where `onUnhandledRequest` consumed the stream body before MCP stream handlers could read it.

---
*Research completed: 2026-07-24*
*Ready for roadmap: yes*
