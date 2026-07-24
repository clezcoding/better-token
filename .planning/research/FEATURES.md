# Feature Research

**Domain:** Cross-IDE LLM Token-Savings and Context-Compression Framework
**Researched:** Friday, July 24, 2026
**Confidence:** MEDIUM

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Deterministic Rule/Memory File Compression (L1)** | Memory and rule files (`CLAUDE.md`, `.cursorrules`) are loaded on every turn, consuming massive input tokens. Users expect these to be compressed to save cost and extend context headroom. | MEDIUM | Compress rule files once so subsequent turns load them smaller. Target 40–60% input token reduction. |
| **Byte-exact Validation Gate** | Users cannot afford semantic loss in their rules or code. If compression breaks a URL, path, heading, or code snippet, the agent will fail. | MEDIUM | Run a validator after compression to check that code blocks, inline code, URLs, paths, and headings remain identical. If validation fails, discard the compressed version and keep the original. |
| **Multi-IDE Adapter Support (L4)** | Developers use different IDEs (Claude Code, Cursor). They expect the same rules and compression to apply across their toolchain. | HIGH | Compile the canonical spec into target formats (Claude Code plugins/hooks, Cursor `.mdc` files, etc.). |
| **Offline-first / Zero-telemetry Privacy** | Professional developers work with proprietary codebases and cannot have their rules or code sent to a third-party cloud. | LOW | MIT license, fully local execution, no network calls after installation. |
| **Honest Stats & Measurement (L3)** | Users need to know if the tool is actually saving them money. | MEDIUM | Measure actual input/output tokens (using stop hooks where available or local tokenizers) and report input savings, output savings, framework overhead, and net savings. |
| **One-Command Installer with Auto-detect** | Developers want a seamless setup that automatically configures their environment. | MEDIUM | Detect installed agents (Claude Code, Cursor), install the appropriate adapters, and support dry-runs and uninstallation. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Switchable L1 Heuristic Aggression Modes (`safe`, `balanced`, `aggressive`)** | Allows users to fine-tune the compression level based on their tolerance for brevity vs. detail, while keeping the validation gate always active. | MEDIUM | Heuristically strip whitespace, redundant words, pleasantries, and comments depending on the selected mode. |
| **MCP Shrink Proxy (Descriptions Only)** | Trims verbose tool, prompt, and resource descriptions in `tools/list` etc. to save input tokens on every tool-discovery call, without breaking tool call schemas. | MEDIUM | Expose as a lightweight MCP proxy that wraps upstream servers and mutates only `description` fields. |
| **Per-Turn Style Injection (L2)** | Prevents model drift by re-injecting the terse rule on *every single turn* (UserPromptSubmit) rather than just once at session startup, which is where prompt-only tools fail. | HIGH | Use Tier A hooks (Claude Code) to inject rules per turn. For Tier B (Cursor), use MDC rules. |
| **Canonical Profile Compiler (L4)** | Single source of truth (YAML/Markdown) for rules, levels, and carve-outs, compiling into all target IDE formats automatically. No manual duplication. | MEDIUM | Build a compiler that parses the profile and outputs target adapter files. |
| **Strict Safety Carve-outs** | Built-in rules to never compress code, exact errors, security warnings, or irreversible confirmations, ensuring the agent remains safe and accurate. | LOW | Hard-code safety rules that bypass compression when specific markers or content types are detected. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **LLM-based Rewrite for L1 Compression (in v1)** | Users might think an LLM can compress rules more intelligently. | Slow, expensive, non-deterministic, requires internet/API keys, and violates the offline-first privacy guarantee. | Deterministic heuristic rule engines with switchable aggression modes and a byte-exact validator. |
| **Own Coding Agent** | To have full control over the agent loop and compression. | Extremely high complexity, directly competes with established tools (Claude Code, Cursor), and dilutes the focus on being a lightweight utility. | Build adapters and hooks for existing popular agents. |
| **Telemetry / Hosted Backend / Cloud Dashboard** | To see aggregated team metrics and cloud dashboards. | Violates developer privacy, introduces security concerns, and adds latency/overhead to local runs. | Fully local stats CLI (`better-token stats`) stored in size-capped local files. |
| **Translating User Content** | To compress content by translating it to a more compact language. | High risk of semantic distortion, translation errors, and increased latency. | Preserve the user's language and compress only structural/filler elements. |
| **Mutating Tool Call Payloads/Responses** | To compress tool arguments or return values. | High risk of breaking JSON parsing or tool execution in downstream agents. | Compress only `description` fields in list responses; leave actual tool payloads untouched. |
| **Broad IDE Coverage Before Depth** | Support all IDEs (Windsurf, Cline, Gemini, Copilot) immediately. | Spreads development thin, resulting in buggy or incomplete support across all platforms. | Focus first on Claude Code (Tier A) and Cursor (Tier B) to make them rock-solid before expanding. |

## Feature Dependencies

```
[Per-Turn Style Injection (L2)]
    └──requires──> [Canonical Profile Compiler (L4)]

[Deterministic Rule/Memory File Compression (L1)]
    └──requires──> [Byte-exact Validation Gate]

[Switchable L1 Heuristic Aggression Modes] ──enhances──> [Deterministic Rule/Memory File Compression (L1)]

[MCP Shrink Proxy (Descriptions Only)] ──enhances──> [Deterministic Rule/Memory File Compression (L1)]

[Honest Stats & Measurement (L3)] ──enhances──> [Per-Turn Style Injection (L2)]

[LLM-based Rewrite for L1 Compression] ──conflicts──> [Offline-first / Zero-telemetry Privacy]

[Mutating Tool Call Payloads/Responses] ──conflicts──> [Byte-exact Validation Gate]
```

### Dependency Notes

- **[Per-Turn Style Injection (L2)] requires [Canonical Profile Compiler (L4)]:** The per-turn style injection needs the compiled format of the canonical profile matching the target IDE's hooks or rule files.
- **[Deterministic Rule/Memory File Compression (L1)] requires [Byte-exact Validation Gate]:** Compression must never be applied to disk without first passing the byte-exact validation gate to guarantee 0% substance loss.
- **[Switchable L1 Heuristic Aggression Modes] enhances [Deterministic Rule/Memory File Compression (L1)]:** Allows users to choose safe, balanced, or aggressive compression levels for their rule/memory files.
- **[MCP Shrink Proxy (Descriptions Only)] enhances [Deterministic Rule/Memory File Compression (L1)]:** Adds dynamic context compression for tool schemas on top of static file compression.
- **[Honest Stats & Measurement (L3)] enhances [Per-Turn Style Injection (L2)]:** Measures the verbosity score of responses to evaluate style drift and suggest recompress passes.
- **[LLM-based Rewrite for L1 Compression] conflicts with [Offline-first / Zero-telemetry Privacy]:** Running LLM calls for compression requires external API keys or local LLM runtimes, violating the offline-first and zero-telemetry guarantee.
- **[Mutating Tool Call Payloads/Responses] conflicts with [Byte-exact Validation Gate]:** Modifying actual tool payloads or responses risks breaking downstream parsing, violating the safety invariant of the validation gate.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] **Deterministic L1 Rule/Memory Compression** — Essential for demonstrating reproducible input token savings.
- [ ] **Byte-exact Validation Gate** — Essential to guarantee 0% substance loss and establish user trust.
- [ ] **MCP Shrink Proxy (Descriptions Only)** — Essential to demonstrate dynamic context compression across any MCP-capable IDE.
- [ ] **Claude Code Adapter (Tier A Hooks)** — Essential to prove per-turn style injection and output terseness.
- [ ] **Cursor Adapter (Tier B Rules + MDC)** — Essential to establish depth in the second priority IDE.
- [ ] **One-Command Installer with Auto-detect** — Essential for a frictionless developer onboarding experience.
- [ ] **Honest local stats CLI (`better-token stats`)** — Essential to prove net savings (input + output - overhead).

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] **Canonical Profile Compiler (L4)** — Triggered by the need to manage multiple IDE configurations from a single spec without manual duplication.
- [ ] **Switchable L1 Heuristic Aggression Modes** — Triggered by user requests for higher compression ratios or safer fallback levels.
- [ ] **Codex and Gemini CLI Adapters** — Triggered by expanding Tier A support to other hook-capable CLIs.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Windsurf, Cline, and Copilot Adapters** — Deferred to maintain focus on Claude Code and Cursor depth first.
- [ ] **Verbosity Score & On-demand Recompress Pass (L3)** — Deferred due to high complexity of post-response evaluation.
- [ ] **Cross-agent Memory / Shared Learnings** — Deferred until multi-agent workflows are more standardized.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Deterministic L1 Rule/Memory Compression | HIGH | MEDIUM | P1 |
| Byte-exact Validation Gate | HIGH | MEDIUM | P1 |
| MCP Shrink Proxy (Descriptions Only) | HIGH | MEDIUM | P1 |
| Claude Code Adapter (Tier A Hooks) | HIGH | HIGH | P1 |
| Cursor Adapter (Tier B Rules + MDC) | HIGH | MEDIUM | P1 |
| One-Command Installer with Auto-detect | HIGH | MEDIUM | P1 |
| Honest local stats CLI | MEDIUM | MEDIUM | P1 |
| Canonical Profile Compiler (L4) | HIGH | MEDIUM | P2 |
| Switchable L1 Heuristic Aggression Modes | MEDIUM | MEDIUM | P2 |
| Codex and Gemini CLI Adapters | MEDIUM | HIGH | P2 |
| Windsurf, Cline, and Copilot Adapters | MEDIUM | MEDIUM | P3 |
| Verbosity Score & On-demand Recompress | LOW | HIGH | P3 |
| Cross-agent Memory / Shared Learnings | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | JuliusBrussee/caveman | chopratejas/headroom | Our Approach (better-token) |
|---------|-----------------------|----------------------|--------------|
| **Primary Compression Focus** | Output style (L2 prompt) | Dynamic context (logs, JSON, RAG) | Deterministic input/rules (L1) + L2 style |
| **Validation Gate** | Basic `validate.py` for LLM rewrites | None (emphasizes CCR retrieval) | Hard byte-exact validation gate for all L1 compression |
| **L1 Compression Method** | LLM-based rewrite (`caveman-compress`) | Multi-compressor routing (AST, SmartCrusher, clustering) | Deterministic heuristics (no LLM rewrite, safe/balanced/aggressive) |
| **Style Drift Prevention** | Session-start prompt injection (drifts easily) | None (focuses on input/context layer) | Per-turn prompt injection (UserPromptSubmit hooks) |
| **Integration Modes** | Hooks (Claude Code), static rule files | Library, Proxy, Agent wrap, MCP server | Native adapters (Claude Code, Cursor) + MCP shrink proxy |
| **Measurement & Stats** | Local estimated stats | Local stats reporting | Honest stats (measured vs estimated, net savings, overhead) |
| **Privacy & Telemetry** | Offline-first, zero telemetry | Offline-first, zero telemetry | Offline-first, zero telemetry, MIT license |

## Sources

- **JuliusBrussee/caveman**: Analyzed codebase structure (`skills/caveman`, `src/hooks/caveman-activate.js`, `caveman-mode-tracker.js`, `validate.py`, `caveman-shrink` MCP server).
- **chopratejas/headroom**: Analyzed core features (v0.25.0, AST-aware compression, SmartCrusher, CCR mechanism, proxy/MCP integration, cross-agent memory).
- **Factory.ai / Tessl.io**: Context compression evaluation framework and structured summarization studies (Dec 2025).
- **Agno Docs**: Context compression overview (v2.2.14, managing running agent context).
- **Mem0.ai / The AI Forum**: Production agent context compression and compaction patterns.

---
*Feature research for: better-token*
*Researched: Friday, July 24, 2026*
