# Pitfalls Research

**Domain:** Cross-IDE LLM Token-Savings Framework (Context Compression & Agent Adapters)
**Researched:** Friday, Jul 24, 2026
**Confidence:** MEDIUM

## Critical Pitfalls

### Pitfall 1: Semantic-Breaking Rule Compression

**What goes wrong:**
Rule compression deletes or mangles load-bearing syntax in Markdown rules/memory files. Inline code blocks, URLs, relative file paths, and heading hierarchies are stripped or corrupted. The agent loses the links to documentation, references to code helper methods, and misinterprets the structural constraints of the project.

**Why it happens:**
Developers treat rule files as unstructured prose and apply generic text-compactor libraries (like LLMLingua) or naive regexes that do not respect Markdown AST structure.

**How to avoid:**
Use an AST-aware Markdown compressor that treats formatting and technical references as immutable. Implement a byte-exact validator as a mandatory pre-write gate. This gate parses both original and compressed files, verifying that code blocks, inline code, URLs, paths, and headings remain 100% identical in sequence and character count.

**Warning signs:**
Agent attempts to execute mangled CLI commands, visits broken or corrupted URLs, or outputs "File not found" errors because relative path strings were condensed.

**Phase to address:**
Phase 1 (L1 Context Compression Engine)

---

### Pitfall 2: Governance Decay under Auto-Compaction

**What goes wrong:**
When an agent reaches its context window auto-compaction limit (e.g., Claude Code auto-compacts at ~83.5% capacity), it summarizes the conversation. This summarization systematically discards "soft", deployment-specific policies (like custom workflows, db limits, formatting rules) because general-purpose LMs treat them as low-salience boilerplate. The agent then silently violates these rules deep in a session.

**Why it happens:**
The harness relies on conversational context or mid-session user commands for safety and formatting rules, rather than pinning rules in a privileged, immutable region of the context.

**How to avoid:**
Implement "Constraint Pinning." Hard-code persistent instructions into structural files (`CLAUDE.md`, `.cursorrules`, `AGENTS.md`) that are re-read from disk on every turn. For mid-session rules, copy them into a persistent system-message buffer that is exempted from compaction and re-injected verbatim.

**Warning signs:**
Agent obeys constraints perfectly for the first 10-15 turns but starts ignoring database safety guidelines, formatting styles, or architectural boundaries deep in a long session.

**Phase to address:**
Phase 1 & 2 (L1 Engine & Adapter Integration)

---

### Pitfall 3: Stream-Consuming & Auth-Blocking MCP Proxy Middleware

**What goes wrong:**
Wrapping upstream MCP servers in proxy middleware causes JSON-RPC connection failures, HTTP POST 404s, or container crash-loops (liveness probe failures) in containerized environments like Kubernetes or Azure Container Apps.

**Why it happens:**
1. The middleware inspects or logs request bodies (such as `onUnhandledRequest` in `mcp-proxy` 6.x) and drains the Node `IncomingMessage` stream before the streaming MCP handlers can read it. Since streams can only be read once, the handlers receive an empty body and fail.
2. The proxy applies authentication (like API keys or headers) globally, including to `/health` or `/healthz` endpoints, causing orchestrator liveness checks to receive 401 or 503 errors and restart the container.
3. The proxy drops session-specific headers (like `Mcp-Session-Id`) on downstream transport.

**How to avoid:**
1. Clone or buffer request streams before inspecting them in proxy middleware, or ensure `onUnhandledRequest` executes after MCP stream handlers.
2. Position unauthenticated routes (`/health`, `/healthz`, `/ping`, `/livez`) early in the routing flow, bypassing auth middleware entirely. Keep health checks shallow (no upstream DB or API requests).
3. Explicitly forward and preserve session headers in downstream client calls.

**Warning signs:**
Downstream tools throw "Method not found" or "JSON-RPC error: invalid request" on POST requests; the container gets stuck in a boot loop and is terminated by orchestrators.

**Phase to address:**
Phase 2 (L1 MCP Shrink Proxy)

---

### Pitfall 4: Negative Net Savings from Adapter Prompt Inflation

**What goes wrong:**
The total token cost of running the savings framework exceeds the tokens saved, leading to a negative financial and latency return for the developer.

**Why it happens:**
The framework injects a verbose, uncompressed style prompt (e.g., 1.5k tokens) on every single turn to prevent model style-drift, but the session is short or the user is only asking small questions, causing the injection cost to outweigh any output token savings.

**How to avoid:**
- Keep style rules extremely brief (<150 tokens) and compress rules before injection.
- Implement an "activation threshold": do not compress files or inject L2 style reminders when the total session context is small (e.g., <4k tokens) and the overhead is negative.
- Build L3 metrics that subtract adapter prompt overhead from gross savings, giving the developer honest net stats.

**Warning signs:**
Input token costs balloon on short tasks; the developer notices higher total costs or slower responses with the tool enabled.

**Phase to address:**
Phase 3 & 4 (L2 Adapter & L3 Measurement)

---

### Pitfall 5: Role Confusion & CoT Forgery via Per-Turn Style Injection

**What goes wrong:**
An attacker injects formatting instructions or rules into files, git logs, or database records that the agent reads. The agent mistakes these stylistic cues or plain-text declarations for its own system prompt or its own Chain-of-Thought (CoT), leading to representational hijacking and executing unauthorized actions.

**Why it happens:**
Models map system rules and user styles to overlapping latent features. They prioritze style and positioning over tag-based role boundaries when they conflict.

**How to avoid:**
- Apply strict "untrusted input boundaries."
- Escape, prefix, or wrap untrusted content (file reads, git diffs, tool responses) using strict semantic XML-like delimiters.
- Strip or rewrite CoT-like prefixes (such as `Thinking:`, `<thought>`, etc.) from inputs before they are delivered to the model.

**Warning signs:**
Agent starts outputting long paragraphs explaining its internal "thoughts" despite being in a terse mode, or executes a shell command found inside a third-party file.

**Phase to address:**
Phase 3 & 5 (L2 Adapter Security & L4 Compiler/Eval)

---

### Pitfall 6: Caveman-Style Style-Prompt Drift

**What goes wrong:**
The model starts out answering with short, terse fragments, but gradually drifts back to verbose, conversational explanations ("Sure, I can help with that...") as the conversation goes on.

**Why it happens:**
Models suffer from attention decay. As the context window grows, the original style prompt is buried in the middle of the window ("Lost in the Middle"). The model is trained on verbose data and naturally conforms to that style unless reminded.

**How to avoid:**
- Inject the L2 style rule *per-turn* at the very end of the user prompt (where platform hooks like `UserPromptSubmit` allow it), rather than relying on a single start-of-session system prompt.
- Place critical style reminders at the top and bottom of the context window.
- Grade responses using a real-time Verbosity Score; trigger a local prompt warning or opt-in re-compactor if verbosity exceeds limits.

**Warning signs:**
Conversational responses grow steadily longer after turn 5, returning to standard chat-agent politeness.

**Phase to address:**
Phase 3 & 4 (L2 Style & L3 Measurement)

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Naive regex compression instead of Markdown AST | Rapid MVP implementation, no external dependencies. | Corrupts code syntax, mangles links, fails byte-validation on rule files. | **Never.** AST safety is the core product value proposition. |
| Simulated/estimated stats instead of real provider usage logs | Simple client-side implementation; works across all IDEs. | Hides negative net savings and adapter overhead, creating false metrics. | Only in early Alpha, clearly marked as "estimated." |
| Session-start prompt injection instead of per-turn injection | Highly compatible; doesn't require deep hooks or plugin frameworks. | 100% style drift by turn 5; fails to enforce terseness over long horizons. | Only for Tier B/C IDEs where per-turn hooks do not exist. |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Claude Code Hooks | Binding rules and style reminders to `SessionStart` only. | Causes style drift during compaction. Use `UserPromptSubmit` to re-inject rules on every turn. |
| Cursor .mdc rules | Compressing `.mdc` rule files directly using regex without parsing frontmatter. | Mangled frontmatter breaks Cursor's matching compiler. Parse frontmatter YAML separately, compress only the markdown body. |
| FastMCP / mcp-proxy | Applying global auth checks on the entire HTTP server middleware. | Excludes health checks. Place `/health`, `/healthz`, and `/ping` routes before the auth middleware. |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Compacting context on every turn | High local CPU usage, laggy prompt submit, increased tool response times. | Trigger compaction only when context exceeds 60% of the active window or every 5 turns. | > 10 turns in a single session. |
| AST-parsing large source files on write | Developer UI lags and freezes when saving code files. | Run L1 compression asynchronously in a background worker, and keep a size cap of 50KB on rule files. | Rule files > 100KB or complex code repos. |
| SSE Connection Leakage | System memory exhaustion as CLI agent spawns stale proxy sessions. | Implement strict heartbeat/keep-alive pings and automatically terminate idle proxy connections after 5 minutes. | High-concurrency or multi-agent environments. |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Compressing Error Messages or Stack Traces | Loss of diagnostic exactness; agent hallucinating error codes or wrong line numbers during debug. | Exclude all error strings, terminal output, and logs from compression. Keep them verbatim. |
| Allowing Injections in Rules Compiler | Attacker writes a malicious rules file that overrides adapter prompts or hijacks the agent. | Verify files against a strict JSON schema; forbid executable code/scripts in profile configuration. |
| Disabling the Byte-Exact Validator | Mangled instructions cause agent to perform destructive shell commands. | Keep validator on as an un-bypassable hard gate; auto-rollback to original file on validation fail. |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Silent compression failure fallback | User doesn't know why savings dropped to 0% after a file change. | Provide non-intrusive logging (e.g., `[better-token] balance mode failed validation, keeping original`). |
| Auto-Recompression of code blocks | Model rewrites functional code blocks into terse format, introducing bugs. | Exclude all code blocks completely. Never touch markdown triple-backtick segments. |
| Opaque Stats Dashboard | User doesn't trust the savings figures, leading to uninstallation. | Separate gross from net, show exact input vs output bytes and estimated cost delta. |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **L1 Rule Compressor:** Often missing frontmatter parsing — verify YAML headers in `.mdc` are unmodified.
- [ ] **MCP Shrink Proxy:** Often missing JSON-RPC stream preservation — verify POST requests work with large schemas without dropping `Mcp-Session-Id`.
- [ ] **L2 Style Prompt:** Often missing language preservation — verify that a French query still gets a French (albeit terse) response, not English.
- [ ] **L3 Stats Logger:** Often missing adapter overhead — verify that the size of injected style prompts is subtracted from the net savings.

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Syntax error in compressed rule file | LOW | Detect validation fail, restore backup from `.original.md`, and log warning. |
| Agent stuck in infinite verbosity-retry loop | HIGH | Impose a maximum of 1 re-compression pass per turn; auto-disable L2 style reminders if model ignores them. |
| MCP Proxy crash-loop | LOW | Drop proxy to direct downstream pipe (Pass-through fallback). |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Semantic-Breaking Rule Compression | Phase 1: L1 Context Compression Engine | Run AST structural test suite; verify 100% path/code preservation. |
| Governance Decay under Compaction | Phase 1: L1 Engine & Adapter Integration | Manual `/compact` mid-session testing; check if rules are preserved. |
| Auth-Blocking / Stream-Consuming Proxy | Phase 2: L1 MCP Proxy | Run automated K8s probes and streaming POST requests test suite. |
| Prompt Inflation Negative Net | Phase 4: L3 Measurement & Verification | Verify stats subtraction logic with small queries (<200 tokens). |
| Role Confusion & CoT Forgery | Phase 5: L4 Compiler & Automated Eval | Penetration test using prompt injection payloads (e.g. CoT Forgery). |

## Sources

- **Governance Decay in Long-Horizon LLM Agents** (arXiv:2606.22528) — Documented how context compaction erases soft, deployment-specific constraints 8.3x faster than hard safety norms.
- **Context Codec / Commitment-level Framework** (arXiv:2605.17304) — Highlighted importance of tracking "semantic commitments" versus lossy summaries.
- **Prompt Injection as Role Confusion** (arXiv:2603.12277) — Showed that LLMs map style and roles onto the same features, making them vulnerable to "CoT Forgery."
- **mcp-proxy Issue #61** (GitHub) — Regression in `mcp-proxy` 6.x where `onUnhandledRequest` consumed the stream body before MCP stream handlers could read it.
- **ninjaone-mcp Commit 5e75825** (GitHub) — Fixed shallow unauthenticated `/health` probes to prevent gateway crash-loops in Azure Container Apps.
- **JuliusBrussee/caveman** (GitHub) — Inspiration and reference implementation of `caveman-compress` and `caveman-shrink`.

---
*Pitfalls research for: better-token*
*Researched: Friday, Jul 24, 2026*
