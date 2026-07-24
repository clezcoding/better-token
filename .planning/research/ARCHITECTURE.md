# Architecture Research

**Domain:** Cross-IDE LLM Token-Savings Framework
**Researched:** July 24, 2026
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│             L4: Configuration & Adapter Compiler            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │             better-token.profile.yaml                 │  │
│  └──────────────────────────┬────────────────────────────┘  │
│                             │ (compiles to)                 │
│                             ▼                               │
├─────────────────────────────────────────────────────────────┤
│             L2: Output Style & Platform Adapters            │
│  ┌────────────────────────┐   ┌──────────────────────────┐  │
│  │      claude-code       │   │          cursor          │  │
│  │  (Hooks: SessionStart, │   │    (Always-apply rule:   │  │
│  │   UserPromptSubmit,    │   │     better-token.mdc)    │  │
│  │   Stop)                │   │                          │  │
│  └──────────┬─────────────┘   └────────────┬─────────────┘  │
│             │                              │                │
├─────────────┼──────────────────────────────┼────────────────┤
│             │  L1: Context/Input Compression Engine         │
│             │  ┌────────────────────────────────────────┐  │
│             │  │            Markdown Tokenizer          │  │
│             │  ├────────────────────────────────────────┤  │
│             │  │            Heuristic Compressor        │  │
│             │  │          (safe/balanced/aggressive)    │  │
│             │  ├────────────────────────────────────────┤  │
│             │  │         Byte-Exact Validation Gate     │  │
│             │  └───────────────────▲────────────────────┘  │
│             │                      │                        │
│             │                      │ (uses)                 │
│             │                      │                        │
│             │         ┌────────────┴─────────────┐          │
│             └────────►│   better-token-shrink    │          │
│                       │       (MCP Proxy)        │          │
│                       └────────────┬─────────────┘          │
│                                    │ (stdio)                │
│                                    ▼                        │
├─────────────────────────────────────────────────────────────┤
│             L3: Verification & Measurement                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  better-token stats                   │  │
│  │         (Verbosity Score, Tokenizer, SQLite DB)       │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `packages/core` | Markdown parsing, heuristic compression (`safe`/`balanced`/`aggressive`), and byte-exact validation. | Pure TypeScript tokenizer and regex-based heuristic replacement engine. Fully offline with zero external dependencies. |
| `packages/shrink-mcp` | Universal Tier C MCP proxy. Intercepts JSON-RPC messages on stdio to compress tool/prompt/resource descriptions. | Node.js stdio stream parser. Spawns upstream server as subprocess and intercepts `tools/list`, `prompts/list`, and `resources/list` responses. |
| `packages/compiler` | Compiles canonical YAML profile into target-specific formats (Claude Code hooks, Cursor MDC, Codex TOML). | YAML parser and template engine. Generates JSON settings, markdown rules, and config files. |
| `packages/stats` | Measures exact/estimated token counts, calculates verbosity scores, and logs session metrics. | SQLite-backed database or local JSON store. Uses `cl100k-base` BPE tokenizer for local estimation. |
| `adapters/claude-code` | Claude Code integration using native lifecycle hooks. | Shell-based hooks configured in `.claude/settings.json` responding to `SessionStart`, `UserPromptSubmit`, and `Stop`. |
| `adapters/cursor` | Cursor integration using always-apply rules. | `.cursor/rules/better-token.mdc` file with frontmatter `alwaysApply: true` and glob matching. |
| `bin/install` | One-command auto-detecting installer and uninstaller. | Node.js CLI script that scans system paths for IDE settings, registers hooks/rules, and backs up original files. |

## Recommended Project Structure

```
better-token/
├── profile/
│   └── better-token.profile.yaml  # L4: Canonical profile specification
├── packages/
│   ├── core/                      # L1: Core compression engine & validator
│   │   ├── src/
│   │   │   ├── index.ts           # Public API exports
│   │   │   ├── tokenizer.ts       # Markdown parser & protected token extractor
│   │   │   ├── compressor.ts      # Heuristic rules (safe/balanced/aggressive)
│   │   │   └── validator.ts       # Byte-exact verification gate
│   │   └── tests/                 # Unit tests for compression invariants
│   ├── shrink-mcp/                # L1: MCP Proxy / Middleware (Tier C)
│   │   ├── src/
│   │   │   ├── index.ts           # stdio interceptor & JSON-RPC parser
│   │   │   └── proxy.ts           # Upstream spawner & description compressor
│   │   └── tests/                 # Integration tests with mock MCP servers
│   ├── compiler/                  # L4: Profile to adapter compiler
│   │   └── src/
│   │       ├── index.ts           # CLI compiler entry
│   │       └── generators/        # Target generators (Claude, Cursor, etc.)
│   └── stats/                     # L3: Verbosity scoring & token logging
│       └── src/
│           ├── index.ts           # Stats logger & SQLite schema
│           └── scorer.ts          # Heuristic verbosity scorer
├── adapters/
│   ├── claude-code/               # Tier A: Claude Code plugin & hooks
│   │   ├── session-start.ts       # SessionStart hook (context injection)
│   │   ├── prompt-submit.ts       # UserPromptSubmit hook (per-turn style)
│   │   └── stop.ts                # Stop hook (verbosity score & recompress)
│   └── cursor/                    # Tier B: Cursor configuration
│       └── better-token.mdc       # Always-apply MDC rule file
├── bin/
│   └── install.ts                 # One-command auto-detecting installer
├── package.json                   # Monorepo configuration (pnpm/npm workspaces)
└── README.md                      # Project documentation
```

### Structure Rationale

- **`packages/` Monorepo:** Separating concerns into distinct packages (`core`, `shrink-mcp`, `compiler`, `stats`) ensures that the core compression engine can be reused across different runtimes (CLI, MCP proxy, and hooks) without bundling unnecessary dependencies.
- **`adapters/` Separation:** Platform-specific adapters are kept outside the core packages to allow clean addition of new IDE targets (e.g., Codex, Gemini, Cline) without modifying the core compression algorithms.
- **`profile/` as Single Source of Truth:** Storing the canonical YAML specification in a central directory ensures that any changes to compression rules or style levels automatically propagate to all platform adapters during compilation.

## Architectural Patterns

### Pattern 1: Protected Token Markdown Tokenizer

**What:** A deterministic parser that scans markdown files, extracts syntax elements that must remain byte-for-byte identical (code blocks, inline code, URLs, file paths, headings), replaces them with unique placeholders (e.g., `__CODE_BLOCK_0__`), compresses the remaining prose, and re-hydrates the placeholders.

**When to use:** Essential for L1 rule/memory file compression to guarantee zero substance loss and prevent the heuristic engine from corrupting technical syntax.

**Trade-offs:** Fast, offline-capable, and highly reliable, but requires precise regex patterns to avoid false-positive matches in complex markdown.

**Example:**
```typescript
export interface TokenMap { [key: string]: string; }

export function tokenize(markdown: string): { text: string; tokens: TokenMap } {
  const tokens: TokenMap = {};
  let placeholderCounter = 0;

  // Protect fenced code blocks
  let text = markdown.replace(/```[\s\S]*?```/g, (match) => {
    const placeholder = `__CODE_BLOCK_${placeholderCounter++}__`;
    tokens[placeholder] = match;
    return placeholder;
  });

  // Protect inline code
  text = text.replace(/`[^`\n]+`/g, (match) => {
    const placeholder = `__INLINE_CODE_${placeholderCounter++}__`;
    tokens[placeholder] = match;
    return placeholder;
  });

  // Protect URLs
  text = text.replace(/https?:\/\/[^\s)]+/g, (match) => {
    const placeholder = `__URL_${placeholderCounter++}__`;
    tokens[placeholder] = match;
    return placeholder;
  });

  return { text, tokens };
}

export function detokenize(text: string, tokens: TokenMap): string {
  let result = text;
  for (const [placeholder, originalValue] of Object.entries(tokens)) {
    result = result.replace(placeholder, originalValue);
  }
  return result;
}
```

### Pattern 2: Subprocess stdio Interceptor (MCP Proxy)

**What:** A proxy server that intercepts stdio streams between an MCP client (the IDE) and an upstream MCP server. It parses JSON-RPC messages, forwards them to the upstream server, and selectively modifies the `description` fields in `tools/list`, `prompts/list`, and `resources/list` responses before returning them to the client.

**When to use:** Universal Tier C integration for any IDE supporting MCP (Cursor, Windsurf, Cline, Claude Code).

**Trade-offs:** Extremely powerful and client-agnostic, but adds a tiny latency overhead (~1-5ms) and must fall back to transparent pass-through on any JSON parsing or upstream process failure to avoid breaking the IDE.

**Example:**
```typescript
import { spawn } from 'child_process';
import readline from 'readline';

export function startMcpProxy(upstreamCommand: string, upstreamArgs: string[]) {
  const upstream = spawn(upstreamCommand, upstreamArgs);

  // Pipe client stdin to upstream stdin
  process.stdin.pipe(upstream.stdin);

  // Intercept upstream stdout
  const rl = readline.createInterface({ input: upstream.stdout });
  rl.on('line', (line) => {
    try {
      const message = JSON.parse(line);
      if (message.result && (message.result.tools || message.result.prompts || message.result.resources)) {
        // Intercept and compress description fields
        const compressedMessage = compressMcpDescriptions(message);
        process.stdout.write(JSON.stringify(compressedMessage) + '\n');
      } else {
        // Transparent pass-through
        process.stdout.write(line + '\n');
      }
    } catch (err) {
      // Fallback to pass-through on parse error to prevent data loss
      process.stdout.write(line + '\n');
    }
  });

  upstream.on('exit', (code) => process.exit(code || 0));
}
```

### Pattern 3: Per-Turn Hook Injection

**What:** A hook executed on `UserPromptSubmit` that outputs the terse style rules on stdout. Claude Code automatically appends the stdout of `UserPromptSubmit` hooks to the user's prompt as context, forcing the model to see the style rules on *every single turn*.

**When to use:** Tier A platforms (Claude Code, Codex, Gemini CLI) to eliminate model drift over long conversations.

**Trade-offs:** Costs ~100-200 input tokens per turn, but prevents output verbosity drift which would cost much more.

## Data Flow

### Request Flow

```
[User Action: Submit Prompt]
            ↓
[Claude Code: UserPromptSubmit Hook] → (injects style rule as context via stdout)
            ↓
[Claude Code: Agentic Loop]
            ↓
[Claude Code: Tool Call (MCP)]
            ↓
[better-token-shrink (MCP Proxy)] → (intercepts tools/list, compresses descriptions)
            ↓
[Upstream MCP Server]
            ↓
[Claude Code: Receives response]
            ↓
[Claude Code: Stop Hook] → (receives last_assistant_message)
            ↓
[better-token scorer] → (calculates Verbosity Score)
            ↓
[better-token stats] → (logs token counts to SQLite DB)
            ↓
[Response Displayed to User]
```

### State Management

```
[better-token.profile.yaml]
            ↓ (compile)
[adapters/claude-code/prompt-submit] ──► [Claude Code Runtime]
            ↓ (executes hook)
[SQLite DB / local JSON store] ◄──────── [adapters/claude-code/stop]
```

### Key Data Flows

1. **Rule File Compression (Offline):**
   - The user runs `better-token compress <path>`.
   - `packages/core` tokenizes the file, protecting code blocks, inline code, URLs, paths, and headings.
   - The heuristic engine compresses the remaining prose according to the selected aggression level.
   - The detokenizer restores the protected elements.
   - The validator extracts all protected elements from both original and compressed files, asserting byte-for-byte identity and identical ordering.
   - On success, the file is overwritten, and the original is backed up as `<file>.original.md`. On failure, the compression is aborted, and an error is shown.

2. **Per-Turn Style Enforcement & Feedback Loop:**
   - On every turn, the `UserPromptSubmit` hook injects the terse style rules.
   - At the end of the turn, the `Stop` hook receives `last_assistant_message`.
   - The `scorer` calculates a Verbosity Score based on sentence length, article density, and conversational padding.
   - If the score exceeds the threshold, the `Stop` hook returns `decision: "block"` or `hookSpecificOutput.additionalContext` containing a warning (e.g., "Your response is too verbose. Please recompress it using the terse rules."), forcing Claude to rewrite the response in the terse style.

3. **Honest Stats Collection:**
   - The `UserPromptSubmit` hook measures the input prompt token size.
   - The `Stop` hook measures the final response token size.
   - The MCP proxy logs tool description token savings.
   - All metrics are written to a local SQLite database, allowing `better-token stats` to report separate input savings, output savings, framework overhead, and net savings.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Fully local, offline-first architecture. SQLite database stored in `~/.better-token/stats.db` handles all logging with zero network overhead. |
| 1k-100k users | Distribution via npm package and GitHub releases. Installer must handle diverse user environments (macOS, Linux, WSL, Git Bash) and safely backup/restore configurations. |
| 100k+ users | (v2 outlook) Optional cloud-sync for team dashboards. The local SQLite database can be synced to a central server via an opt-in CLI command, keeping the core offline-first and private by default. |

### Scaling Priorities

1. **First bottleneck: Installer robustness.** Scanning and editing settings files across 30+ potential agents can fail due to permission issues or unexpected JSON structures.
   - *Mitigation:* Hardened file-writing with atomic writes, symlink safety, size-capped configs, and comprehensive try-catch blocks with automatic rollback.
2. **Second bottleneck: MCP proxy latency.** Chaining multiple MCP proxies can introduce stdio pipe latency.
   - *Mitigation:* Keep the proxy extremely lightweight, using fast regex-based compression in Node.js with zero network calls.

## Anti-Patterns

### Anti-Pattern 1: Prompt-Only Output Style Enforcement

**What people do:** Relying solely on a system prompt (like caveman's original implementation) to enforce terse output style.
**Why it's wrong:** Models naturally drift back to verbose communication mid-conversation, especially during complex tasks or when competing with IDE-specific system prompts.
**Do this instead:** Reinject the style rules on *every single turn* using `UserPromptSubmit` hooks, and enforce compliance using a post-generation `Stop` hook that measures verbosity and triggers a recompression pass if the model drifts.

### Anti-Pattern 2: LLM-Based Input Compression in v1

**What people do:** Calling an LLM API to compress rule/memory files.
**Why it's wrong:** Introduces API costs, network latency, offline-incompatibility, and the risk of semantic hallucination or loss of critical technical details.
**Do this instead:** Use deterministic, heuristic-based compression rules combined with a byte-exact validation gate that guarantees zero substance loss.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Claude Code | Native lifecycle hooks (`SessionStart`, `UserPromptSubmit`, `Stop`) registered in `~/.claude/settings.json` or `.claude/settings.json`. | Highly interactive; allows per-turn injection and blocking decisions. |
| Cursor | Always-apply MDC rule file configured in `.cursor/rules/better-token.mdc`. | Static injection; relies on Cursor's rule loading engine. |
| Upstream MCP Servers | stdio-based JSON-RPC proxy wrapping. | Must fall back to transparent pass-through on any failure. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `adapters/claude-code` ↔ `packages/stats` | Direct CLI execution or local module import. | Hooks call `better-token stats log` to record metrics. |
| `packages/shrink-mcp` ↔ `packages/core` | Direct module import. | Proxy uses the core tokenizer and heuristic compressor to trim descriptions. |
| `packages/compiler` ◄── `profile/` | File read. | Compiler reads the canonical YAML profile to generate adapters. |

## Suggested Build Order

To ensure a highly stable and testable implementation, components should be built in the following order:

1. **Phase 1: Core L1 Compression Engine & Validator (`packages/core`)**
   - Implement the markdown tokenizer (protected token pattern).
   - Implement heuristic compression rules for `safe`, `balanced`, and `aggressive` modes.
   - Implement the byte-exact validator.
   - *Why first:* This is the foundation of the entire framework. All other components depend on deterministic, validated compression.

2. **Phase 2: MCP Shrink Proxy (`packages/shrink-mcp`)**
   - Implement the stdio JSON-RPC proxy.
   - Integrate with `packages/core` to compress tool/prompt/resource descriptions.
   - *Why second:* Provides immediate, universal Tier C token savings across all IDEs with MCP support.

3. **Phase 3: Claude Code & Cursor Adapters (`adapters/claude-code`, `adapters/cursor`)**
   - Implement Claude Code hooks (`SessionStart`, `UserPromptSubmit`, `Stop`) for per-turn style injection.
   - Implement the Cursor always-apply MDC rule.
   - *Why third:* Establishes deep Tier A and Tier B integrations, enabling output style enforcement.

4. **Phase 4: Stats & Measurement (`packages/stats`)**
   - Implement the local SQLite database schema.
   - Implement the heuristic verbosity scorer.
   - Integrate with Claude Code `Stop` hook and MCP proxy to log actual vs estimated usage.
   - *Why fourth:* Enables honest, data-driven reporting of net token savings.

5. **Phase 5: Compiler & Installer (`packages/compiler`, `bin/install`)**
   - Implement the L4 YAML profile compiler.
   - Implement the auto-detecting one-command installer.
   - *Why last:* Ties all components together into a polished, user-friendly product.

---
*Architecture research for: better-token*
*Researched: July 24, 2026*
