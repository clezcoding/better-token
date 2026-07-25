# Phase 2: MCP Shrink Proxy - Research

**Researched:** 2026-07-25
**Domain:** MCP stdio JSON-RPC transparent proxy + L1 description compression
**Confidence:** HIGH

## Summary

Phase 2 delivers a **transparent stdio MCP proxy** (`better-token proxy -- <upstream-cmd …>`) that sits between an IDE (downstream client) and one upstream MCP server. The proxy **never parses client→upstream traffic** — all requests (including `tools/call`) are relayed as raw bytes. On the upstream→client path, each newline-delimited JSON-RPC message is parsed; only **successful list responses** (`tools/list`, `prompts/list`, `resources/list`) have configured `description` fields compressed via `@better-token/core`. Everything else, including parse failures, passes through unchanged (MCP-03, D-13).

MCP stdio framing is **newline-delimited JSON-RPC** (UTF-8, no embedded newlines in messages) [CITED: modelcontextprotocol.io/specification/2025-03-26/basic/transports#stdio]. The proxy must implement a **single-consumer ReadBuffer** on upstream stdout — never attach multiple readers or pre-drain the stream (Pitfall 3 from `.planning/research/PITFALLS.md`). Client stdin is **one-way piped** to upstream stdin without interception.

**Do not use `@modelcontextprotocol/sdk` Client/Server for the proxy loop.** Full SDK transport re-parses and re-serializes every message, breaking MCP-02 byte-identical pass-through for `tools/call` and non-list responses. Hand-roll NDJSON framing (~80 lines) aligned with the spec; reuse Phase 1 `compressMarkdownWithValidation` for description text.

**Primary recommendation:** New package `packages/shrink-mcp` with raw NDJSON relay + selective list-response shrink; register `proxy` subcommand on existing `better-token` bin in `@better-token/core`; integration tests via mock stdio upstream subprocess (same pattern as Phase 1 `cli.test.ts`).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| CLI entry (`better-token proxy`) | API / Backend (CLI) | — | Commander subcommand on existing bin; spawns proxy loop |
| Upstream child process spawn | API / Backend | OS subprocess | `child_process.spawn` with inherited env (D-02) |
| Client→upstream request relay | API / Backend | — | Raw byte pipe; no parsing (MCP-02) |
| Upstream→client response relay | API / Backend | — | NDJSON parse + selective mutate or pass-through |
| Description compression | API / Backend | `@better-token/core` | L1 engine + validator; offline, deterministic |
| Field/mode configuration | API / Backend | — | `BETTER_TOKEN_*` env + `--mode`/`--debug` flags |
| Debug diagnostics | API / Backend | stderr only | Never pollute stdout MCP stream (D-13, D-14) |
| IDE MCP client | Browser / Client (IDE host) | — | Downstream; connects via stdio to proxy process |

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Proxy-Start / CLI-Einstieg
- **D-01:** CLI surface is `better-token proxy -- <upstream-cmd …>` — one subcommand on the existing `better-token` bin; upstream runs as a child process after `--`.
- **D-02:** Upstream args are everything after `--`; upstream inherits the proxy process environment (standard `mcp.json` `command`/`args` pattern).
- **D-03:** Strictly one upstream MCP server per proxy process. Multiple servers = multiple `better-token proxy -- …` entries in `mcp.json`. No multi-upstream hub in v1.
- **D-04:** Package split: `proxy` subcommand registered on `@better-token/core`'s existing bin; proxy transport/JSON-RPC logic lives in `packages/shrink-mcp`.

#### Description-Compress-Mode
- **D-05:** MCP `description` compression reuses L1 modes `safe` / `balanced` / `aggressive` from `@better-token/core`; default `balanced` (same as Phase 1 D-11).
- **D-06:** Mode is set via env `BETTER_TOKEN_MODE=safe|balanced|aggressive` and optionally CLI `--mode` on the `proxy` subcommand.
- **D-07:** Each description goes through the core compressor **and** byte-exact validator. On validation failure, keep the **original description** for that field; do not discard the rest of the list response.
- **D-08:** Descriptions below a minimum length threshold are left unchanged (threshold exact value = research/planner discretion). Missing/`null` descriptions are never invented.

#### Env-Feld-Konfiguration
- **D-09:** Default: compress `description` on **tools**, **prompts**, and **resources** list responses (all three on).
- **D-10:** Field selection via allowlist env `BETTER_TOKEN_SHRINK_FIELDS` with entries like `tools.description,prompts.description,resources.description`.
- **D-11:** All proxy-related env vars use the `BETTER_TOKEN_*` prefix (consistent with `BETTER_TOKEN_MODE`).
- **D-12:** Invalid or unknown field config → one stderr warning + fall back to safe defaults (D-09). Proxy still starts.

#### Proxy-Feedback bei Fehlern/Debug
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

### Deferred Ideas (OUT OF SCOPE)
- **Multi-upstream hub** — one process multiplexing many MCP servers. Out of Phase 2 scope; revisit if Phase 5 installer/config duplication becomes painful.
- **Persistent/aggregated shrink stats UI** — Phase 4 (STAT-*). Phase 2 only allows optional debug stderr lines.
- **Auto-install of proxy entries into IDE configs** — Phase 5 (INST-*).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MCP-01 | User can run `better-token` MCP shrink proxy that wraps an upstream MCP server and compresses `description` fields in `tools/list`, `prompts/list`, and `resources/list` | `proxy` CLI + `shrink-mcp` NDJSON relay; `shrinkListResponse()` maps `tools`/`prompts`/`resources` arrays; `compressMarkdownWithValidation` per description |
| MCP-02 | Proxy leaves request payloads and `tools/call` responses untouched | Client→upstream raw pipe; upstream→client pass-through unless message is a shrinkable list **response** |
| MCP-03 | On parse errors, proxy falls back to pass-through (no data loss) | `ReadBuffer` yields raw line bytes; catch JSON.parse → `stdout.write(originalLine + '\n')` + stderr once |
| MCP-04 | User can configure which fields are compressed via environment variables | `BETTER_TOKEN_SHRINK_FIELDS` allowlist parser + `BETTER_TOKEN_MODE`; invalid config warns and defaults (D-12) |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js `child_process` | built-in (≥20.11) | Spawn upstream MCP server, stdio pipes | MCP stdio = subprocess pattern [CITED: modelcontextprotocol.io/specification/2025-03-26/basic/transports#stdio] |
| Node.js `stream` / `readline` | built-in | NDJSON framing, line buffering | Matches MCP newline-delimited messages; single consumer on upstream stdout |
| `@better-token/core` | workspace `0.1.0` | `compressMarkdownWithValidation`, `validate`, `CompressionMode` | Phase 1 shipped engine + validator; D-05/D-07 require reuse |
| `bpe-lite` | `^0.5.2` (via core) | Token estimates for debug lines (D-14) | Already in core; same tokenizer as L1 |
| `zod` | `^4.4.3` (via core) | Env/CLI config parsing | Established in Phase 1 `cli.ts` |
| `commander` | `^15.0.0` (via core) | `proxy` subcommand registration | Phase 1 CLI pattern |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | `^2.0.0` | Unit + integration tests | Same as Phase 1 |
| `tsx` | `^4.0.0` | Run CLI/tests without build | Integration subprocess tests |
| `esbuild` | `^0.25.0` | Bundle shrink-mcp + wire into CLI | Monorepo build parity with core |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled NDJSON relay | `@modelcontextprotocol/sdk` Client+Server | SDK re-serializes all messages → breaks MCP-02 byte-identical pass-through; adds ~45M/wk dep weight for wrong abstraction |
| Hand-rolled NDJSON relay | SDK `ReadBuffer` only (import framing utils) | Possible but SDK v1/v2 import paths split (`@modelcontextprotocol/sdk` vs `@modelcontextprotocol/server`); ~80 lines local is simpler and zero runtime deps |
| `compressProse` | `compressMarkdownWithValidation` | Descriptions may contain markdown/code; validator gate required by D-07 |

**Installation:**

```bash
# New workspace package — no new production npm deps beyond workspace link
npm install --workspace=@better-token/shrink-mcp
# shrink-mcp depends on @better-token/core (workspace:*)
```

**Version verification:**

```bash
# No new external production packages required for shrink-mcp runtime
node --version   # v24.18.0 verified in environment
npm --version    # 11.16.0 verified
```

## Package Legitimacy Audit

> Phase 2 adds **no new external production dependencies**. Proxy uses Node built-ins + workspace `@better-token/core`. `@modelcontextprotocol/sdk` was evaluated and **intentionally excluded** from runtime (see Alternatives).

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@modelcontextprotocol/sdk` | npm | ~1 yr | ~45M/wk | github.com/modelcontextprotocol/typescript-sdk | OK | **Not used** — wrong abstraction for transparent proxy |
| `@better-token/core` | workspace | — | — | local | OK | Approved (workspace) |
| `zod` | npm | — | — | — | OK | Approved (transitive via core) |
| `bpe-lite` | npm | — | — | — | OK | Approved (transitive via core) |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────┐    stdio (NDJSON)     ┌──────────────────┐    stdio (NDJSON)     ┌─────────────────┐
│  IDE / MCP  │ ◄──────────────────► │  better-token    │ ◄──────────────────► │  Upstream MCP   │
│   Client    │   stdin / stdout     │  proxy process   │  child stdin/stdout  │  Server (child) │
└─────────────┘                      └────────┬─────────┘                      └─────────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
            client stdin ──pipe──► upstream.stdin          upstream.stderr ──pipe──► proxy stderr
                    │                         │                         │
                    │              upstream.stdout ──► ReadBuffer       │
                    │                         │                         │
                    │              ┌──────────▼──────────┐                │
                    │              │  JSON.parse line? │                │
                    │              └──────────┬──────────┘                │
                    │           fail │      │ success                   │
                    │                │      │                             │
                    │         pass-through  │ is list response?           │
                    │         (raw bytes)   │                             │
                    │                       ├── no ──► pass-through       │
                    │                       └── yes ──► shrink descriptions │
                    │                                 (core compressor)   │
                    │                                       │             │
                    │                                       ▼             │
                    │                              stdout (NDJSON line)   │
                    └─────────────────────────────────────────────────────┘

stderr (proxy only): parse-error warnings, debug shrink stats, upstream crash — NEVER stdout
```

### Recommended Project Structure

```
packages/
├── core/
│   └── src/
│       └── cli.ts              # add `proxy` subcommand → imports shrink-mcp
└── shrink-mcp/
    ├── package.json            # name: @better-token/shrink-mcp, dep: @better-token/core
    ├── tsconfig.json
    ├── vitest.config.ts
    ├── src/
    │   ├── index.ts            # public API: runProxy, ProxyConfig
    │   ├── config.ts           # env/CLI → ProxyConfig (zod)
    │   ├── framing.ts          # ReadBuffer, writeMessage (NDJSON)
    │   ├── shrink.ts           # shrinkListResponse, compressDescription
    │   └── proxy.ts            # spawn upstream, bidirectional loop
    └── tests/
        ├── unit/
        │   ├── framing.test.ts
        │   ├── shrink.test.ts
        │   └── config.test.ts
        ├── integration/
        │   └── proxy.test.ts   # mock upstream subprocess
        └── fixtures/
            └── mock-upstream.ts  # minimal stdio MCP server for tests
```

### Pattern 1: Raw NDJSON Framing (MCP stdio)

**What:** Buffer incoming bytes until `\n`, emit one message per line. Write responses as `JSON.stringify(msg) + '\n'`.

**When to use:** All upstream stdout consumption. Never use `readline` + separate raw readers on same stream.

**Example:**

```typescript
// Source: https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#stdio
// Source: https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/advanced/custom-transports.md

export class NdjsonReadBuffer {
  private buffer = "";

  push(chunk: string): string[] {
    this.buffer += chunk;
    const lines: string[] = [];
    let idx: number;
    while ((idx = this.buffer.indexOf("\n")) !== -1) {
      const line = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + 1);
      if (line.length > 0) lines.push(line);
    }
    return lines;
  }

  flush(): string | undefined {
    if (this.buffer.length === 0) return undefined;
    const rest = this.buffer;
    this.buffer = "";
    return rest;
  }
}

export function writeNdjsonLine(stdout: NodeJS.WriteStream, line: string): void {
  stdout.write(line.endsWith("\n") ? line : `${line}\n`);
}
```

### Pattern 2: Selective List-Response Shrink

**What:** Parse JSON-RPC **response** only. If `result.tools`, `result.prompts`, or `result.resources` present and field is in allowlist, compress each item's `description` string in place.

**When to use:** Upstream→client path after successful parse. Skip requests, notifications, errors, `tools/call` results.

**Example:**

```typescript
// Source: packages/core/src/compressor.ts (Phase 1)
import { compressMarkdownWithValidation, type CompressionMode } from "@better-token/core";
import { encode } from "bpe-lite";

const MIN_DESCRIPTION_LENGTH = 48; // research recommendation for D-08

export function compressDescription(
  text: string,
  mode: CompressionMode,
): { text: string; changed: boolean } {
  if (!text || text.length < MIN_DESCRIPTION_LENGTH) {
    return { text, changed: false };
  }
  const { content, validation } = compressMarkdownWithValidation(text, mode);
  return { text: validation.ok ? content : text, changed: validation.ok && content !== text };
}

export function shrinkListResponse(
  message: Record<string, unknown>,
  fields: Set<string>,
  mode: CompressionMode,
): Record<string, unknown> {
  const result = message.result as Record<string, unknown> | undefined;
  if (!result || typeof result !== "object") return message;

  const mappings: Array<[string, string]> = [
    ["tools", "tools.description"],
    ["prompts", "prompts.description"],
    ["resources", "resources.description"],
  ];

  for (const [key, fieldId] of mappings) {
    if (!fields.has(fieldId)) continue;
    const items = result[key];
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (item && typeof item === "object" && typeof (item as { description?: unknown }).description === "string") {
        const desc = (item as { description: string }).description;
        const { text } = compressDescription(desc, mode);
        (item as { description: string }).description = text;
      }
    }
  }
  return message;
}
```

### Pattern 3: Transparent Proxy Loop

**What:** Spawn upstream; pipe client stdin→upstream stdin; buffer upstream stdout line-by-line.

**When to use:** `runProxy(config)` entry point.

**Example:**

```typescript
// Source: .planning/research/ARCHITECTURE.md Pattern 2 (adapted for byte-safe pass-through)
import { spawn } from "node:child_process";

export async function runProxy(config: ProxyConfig): Promise<number> {
  const upstream = spawn(config.upstreamCommand, config.upstreamArgs, {
    stdio: ["pipe", "pipe", "pipe"],
    env: process.env,
  });

  process.stdin.pipe(upstream.stdin!);
  upstream.stderr?.pipe(process.stderr);

  const reader = new NdjsonReadBuffer();
  upstream.stdout!.on("data", (chunk: Buffer) => {
    for (const line of reader.push(chunk.toString("utf8"))) {
      handleUpstreamLine(line, config);
    }
  });

  upstream.on("exit", (code, signal) => {
    if (signal) {
      process.stderr.write(`better-token proxy: upstream killed by ${signal}\n`);
      process.exit(1);
    }
    process.exit(code ?? 0); // D-15
  });

  return new Promise(() => {}); // runs until exit
}

function handleUpstreamLine(rawLine: string, config: ProxyConfig): void {
  try {
    const msg = JSON.parse(rawLine) as Record<string, unknown>;
    if (msg.result && shouldShrink(msg, config.shrinkFields)) {
      const shrunk = shrinkListResponse(msg, config.shrinkFields, config.mode);
      writeNdjsonLine(process.stdout, JSON.stringify(shrunk));
      if (config.debug) logShrinkStats(rawLine, JSON.stringify(shrunk));
      return;
    }
  } catch {
    if (config.debug) process.stderr.write("better-token proxy: pass-through: parse error\n");
  }
  writeNdjsonLine(process.stdout, rawLine);
}
```

### Anti-Patterns to Avoid

- **Full MCP SDK Client/Server proxy:** Re-serializes every message; breaks byte-identical `tools/call` pass-through (MCP-02).
- **`process.stdin.pipe` + also reading stdin:** Double-consumption / stream drain (Pitfall 3).
- **Parsing client→upstream requests:** Unnecessary; risks mutating `tools/call` payloads.
- **Shrinking `inputSchema` / `name` / `uri`:** Out of scope; only `description` on list items (PROJECT.md constraint).
- **Debug logs on stdout:** Violates MCP spec — stdout is MCP-only (D-13).
- **JSON-RPC batch mutation without tests:** Spec allows batch arrays [CITED: modelcontextprotocol.io/specification/2025-03-26/basic/transports#stdio]; v1 recommendation: **pass-through batches unchanged** unless integration tests prove safe parsing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| L1 description compression | Custom text shrinker | `@better-token/core` `compressMarkdownWithValidation` | D-05/D-07; validator gate already tested (65 tests) |
| Token counting for debug | Custom BPE | `bpe-lite` via core | Consistent estimates with L1 CLI |
| CLI parsing | argv hacks | `commander` subcommand + `zod` | Phase 1 pattern |
| MCP list item schemas | Full schema registry | Targeted checks: `result.tools[]`, `result.prompts[]`, `result.resources[]` | Only `description` mutates; avoid over-coupling to SDK versions |
| NDJSON framing | Content-Length HTTP framing | Newline-delimited per MCP stdio spec | HTTP/SSE transports out of scope for Phase 2 |

**Key insight:** The proxy is a **byte relay with a narrow JSON surgical window** on three list response shapes — not an MCP server implementation.

## Common Pitfalls

### Pitfall 1: Stream-Draining on Upstream stdout

**What goes wrong:** Multiple listeners or eager `read()` drains stdout before line handler runs; IDE sees partial/corrupt MCP stream.

**Why it happens:** Copy-pasting HTTP proxy patterns; using SDK Server+Client simultaneously; logging by tapping stdout.

**How to avoid:** Exactly **one** `data` handler on `upstream.stdout`; accumulate in `NdjsonReadBuffer`; never `upstream.stdout.pipe(process.stdout)` concurrently with parsing.

**Warning signs:** Random `parse error` pass-throughs; IDE hangs after `initialize`; `tools/call` timeouts.

### Pitfall 2: Accidental Request Mutation

**What goes wrong:** Proxy parses and re-stringifies client requests, changing key order/whitespace; `tools/call` arguments corrupted.

**Why it happens:** Symmetric parse/modify/emit loop on both directions.

**How to avoid:** **Never parse stdin.** Use `process.stdin.pipe(upstream.stdin)` only.

**Warning signs:** Tool calls fail only through proxy; direct upstream works.

### Pitfall 3: JSON-RPC Batch Handling

**What goes wrong:** Batch array on one line fails shrink logic or throws.

**Why it happens:** MCP allows JSON-RPC batch messages on one line [CITED: modelcontextprotocol.io/specification/2025-03-26/basic/transports#stdio].

**How to avoid:** If `JSON.parse` yields an **array**, pass through raw line unchanged (v1). Add batch-aware shrink in v1.1 only with explicit tests.

**Warning signs:** Pass-through stderr spam with specific upstream servers.

### Pitfall 4: Validator Failure Drops Entire List

**What goes wrong:** One bad description causes entire `tools/list` response to fail or empty.

**Why it happens:** Treating validator failure as message-level error.

**How to avoid:** Per-field fallback to original description (D-07); never throw from `shrinkListResponse`.

**Warning signs:** IDE shows zero tools after proxy.

### Pitfall 5: stdout Pollution

**What goes wrong:** Debug `console.log` or compression stats on stdout break IDE JSON-RPC parser.

**How to avoid:** All human diagnostics to **stderr** only (D-13, D-14, MCP spec).

**Warning signs:** IDE reports MCP protocol errors immediately on connect.

## Code Examples

### CLI `proxy` Subcommand Registration

```typescript
// Source: packages/core/src/cli.ts pattern (Phase 1)
import { runProxy, parseProxyConfig } from "@better-token/shrink-mcp";

program
  .command("proxy")
  .description("Stdio MCP shrink proxy in front of an upstream server")
  .option("--mode <mode>", "Compression mode: safe|balanced|aggressive")
  .option("--debug", "Emit shrink diagnostics to stderr")
  .allowUnknownOption()
  .allowExcessArguments()
  .action(async (opts, command) => {
    const rawArgs = command.args;
    const dd = rawArgs.indexOf("--");
    if (dd === -1 || dd === rawArgs.length - 1) {
      process.stderr.write("better-token proxy: usage: better-token proxy -- <upstream> [args...]\n");
      process.exit(1);
    }
    const upstreamCmd = rawArgs[dd + 1];
    const upstreamArgs = rawArgs.slice(dd + 2);
    const config = parseProxyConfig({ cliMode: opts.mode, debug: opts.debug, upstreamCmd, upstreamArgs });
    await runProxy(config);
  });
```

### Config Parsing (Env + CLI precedence)

```typescript
// Recommended: CLI --mode wins over BETTER_TOKEN_MODE (Claude's discretion)
import { z } from "zod";

const DEFAULT_SHRINK_FIELDS = "tools.description,prompts.description,resources.description";

export function parseShrinkFields(raw: string | undefined): Set<string> {
  // D-12 literally: any unknown token OR empty selection → warn once + full D-09 defaults
  if (!raw?.trim()) return new Set(["tools.description", "prompts.description", "resources.description"]);
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const allowed = new Set(["tools.description", "prompts.description", "resources.description"]);
  const hasUnknown = parts.some((p) => !allowed.has(p));
  const selected = new Set(parts.filter((p) => allowed.has(p)));
  if (hasUnknown || selected.size === 0) {
    process.stderr.write("better-token proxy: invalid BETTER_TOKEN_SHRINK_FIELDS; using defaults\n");
    return new Set(allowed);
  }
  return selected;
}
```

### Mock Upstream for Integration Tests

```typescript
// Source: packages/core/tests/integration/cli.test.ts spawn pattern
// Minimal stdio server: read lines, respond to initialize + tools/list
import { createInterface } from "node:readline";

const TOOL_LIST = {
  jsonrpc: "2.0",
  id: 2,
  result: {
    tools: [{
      name: "echo",
      description: "I would be happy to help you echo text back to the caller for debugging purposes.",
      inputSchema: { type: "object", properties: { text: { type: "string" } } },
    }],
  },
};

const rl = createInterface({ input: process.stdin });
rl.on("line", (line) => {
  const msg = JSON.parse(line);
  if (msg.method === "initialize") {
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { protocolVersion: "2024-11-05", capabilities: {}, serverInfo: { name: "mock", version: "0" } } }) + "\n");
  } else if (msg.method === "tools/list") {
    process.stdout.write(JSON.stringify({ ...TOOL_LIST, id: msg.id }) + "\n");
  } else if (msg.method === "tools/call") {
    // Echo exact params back inside result — tests compare raw bytes
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { content: [{ type: "text", text: line }] } }) + "\n");
  }
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HTTP+SSE MCP transport | stdio + Streamable HTTP | 2024–2025 spec revisions | Phase 2 targets **stdio only** (Cursor/Claude local MCP) |
| caveman-shrink JS middleware | better-token deterministic L1 + validator | Phase 2 | No LLM; per-field validator fallback |
| Monolithic MCP server | Transparent subprocess proxy | Phase 2 D-03 | One upstream per process |

**Deprecated/outdated:**
- Using `@modelcontextprotocol/sdk` v2 alpha split packages for v1 MVP — stay on hand-rolled stdio until proxy proven [CITED: typescript-sdk migration docs].

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Minimum description length **48** chars is safe default for D-08 | shrink.ts | Over-shrinking short labels or under-shrinking very short noise |
| A2 | JSON-RPC **batch** messages should pass-through unchanged in v1 | Anti-Patterns | Some upstreams may send batches; miss shrink opportunity but stay safe |
| A3 | CLI `--mode` overrides `BETTER_TOKEN_MODE` when both set | Config | User confusion if opposite precedence chosen |
| A4 | `compressMarkdownWithValidation` is correct for MCP descriptions (may contain markdown) | Standard Stack | Plain-text-only descriptions might over-process; validator still guards |
| A5 | No runtime `@modelcontextprotocol/sdk` dependency | Standard Stack | Faster implementation but team must maintain NDJSON framing |

## Open Questions (RESOLVED)

1. **JSON-RPC batch shrink support in v1?**
   - What we know: MCP spec allows batch arrays on one line.
   - What's unclear: How common among real upstream servers (GitHub MCP, filesystem, etc.).
   - Recommendation: Pass-through batches in v1; add fixture test documenting behavior.
   - **RESOLVED:** JSON-RPC batch arrays pass through unchanged (A2) — no shrink attempt when `JSON.parse` yields an Array; document with fixture/integration assertion in 02-03.

2. **Paginated `tools/list` (`nextCursor`)?**
   - What we know: SDK schemas include pagination [CITED: typescript-sdk ListToolsResultSchema].
   - What's unclear: Whether shrink must preserve cursor fields untouched (yes — only descriptions mutate).
   - Recommendation: Shrink only `description` on each page's items; pass `nextCursor` unchanged.
   - **RESOLVED:** `nextCursor` (and other non-description pagination fields) remain untouched; shrink only item `description` strings on each page.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | shrink-mcp runtime | ✓ | v24.18.0 | Requires ≥20.11 (PROJECT.md) |
| npm workspaces | monorepo build | ✓ | 11.16.0 | — |
| vitest/tsx | tests | ✓ | via core devDeps | — |
| Upstream MCP server | integration tests | ✓ (mock) | mock subprocess | Inline `fixtures/mock-upstream.ts` |
| `@modelcontextprotocol/sdk` | — | not required | 1.29.0 on npm | Hand-rolled NDJSON |

**Missing dependencies with no fallback:** none

**Missing dependencies with fallback:** none

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest `^2.0.0` |
| Config file | `packages/shrink-mcp/vitest.config.ts` (new; mirror core) |
| Quick run command | `npm test --workspace=@better-token/shrink-mcp` |
| Full suite command | `npm test` (root workspaces) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MCP-01 | List responses have compressed `description` | integration | `npm test --workspace=@better-token/shrink-mcp -- -t "MCP-01"` | ❌ Wave 0 |
| MCP-02 | `tools/call` req/resp byte-identical | integration | `npm test --workspace=@better-token/shrink-mcp -- -t "MCP-02"` | ❌ Wave 0 |
| MCP-03 | Invalid JSON line pass-through | unit | `npm test --workspace=@better-token/shrink-mcp -- -t "MCP-03"` | ❌ Wave 0 |
| MCP-04 | `BETTER_TOKEN_SHRINK_FIELDS` toggles fields | unit | `npm test --workspace=@better-token/shrink-mcp -- -t "MCP-04"` | ❌ Wave 0 |
| D-07 | Validator fail keeps original description | unit | `npm test --workspace=@better-token/shrink-mcp -- -t "D-07"` | ❌ Wave 0 |
| D-12 | Invalid env warns + defaults | unit | `npm test --workspace=@better-token/shrink-mcp -- -t "D-12"` | ❌ Wave 0 |
| D-15 | Upstream non-zero exit propagates | integration | `npm test --workspace=@better-token/shrink-mcp -- -t "D-15"` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test --workspace=@better-token/shrink-mcp`
- **Per wave merge:** `npm test` (all workspaces)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `packages/shrink-mcp/package.json` — workspace package scaffold
- [ ] `packages/shrink-mcp/vitest.config.ts` — test runner config
- [ ] `packages/shrink-mcp/tests/fixtures/mock-upstream.ts` — stdio mock MCP server
- [ ] `packages/shrink-mcp/tests/unit/framing.test.ts` — NDJSON buffer edge cases
- [ ] `packages/shrink-mcp/tests/unit/shrink.test.ts` — MCP-01, D-07, MCP-04
- [ ] `packages/shrink-mcp/tests/integration/proxy.test.ts` — MCP-01, MCP-02, MCP-03, D-15
- [ ] Root `package.json` — add `build`/`test` workspace for shrink-mcp
- [ ] `packages/core/src/cli.ts` — `proxy` subcommand wire-up

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Stdio local process; no auth layer in v1 |
| V3 Session Management | no | MCP session handled by IDE↔upstream; proxy transparent |
| V4 Access Control | no | Single-user local proxy |
| V5 Input Validation | yes | `zod` for env/CLI config; JSON.parse in try/catch; pass-through on failure |
| V6 Cryptography | no | No secrets in Phase 2 |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious upstream JSON bombs | Denial of Service | Optional `maxBufferSize` on ReadBuffer (SDK uses this pattern); cap line length (e.g. 4MB) |
| Log injection via stderr | Tampering | Prefix stderr lines; never eval parsed JSON |
| Proxy stdout pollution | Tampering | stderr-only diagnostics; MCP spec compliance |
| Env var injection via `mcp.json` | Elevation | Document trusted config paths; Phase 5 installer hardens (out of scope) |

## Project Constraints (from .cursor/rules/)

| Rule | Impact on Phase 2 |
|------|-------------------|
| `caveman-activate.mdc` — caveman response style for agent chat | No code impact; English docs for CLI stderr messages |
| `graphify.mdc` — run `graphify update` after code edits | Executor runs after implementation |
| `wigolo.mdc` — prefer wigolo for web ops | Research used wigolo + Context7 |
| `context7.mdc` — library docs via ctx7 | MCP spec/SDK docs fetched via Context7 |

## Sources

### Primary (HIGH confidence)
- `/modelcontextprotocol/typescript-sdk` — stdio transport, ListTools schema, ReadBuffer/serializeMessage references
- `https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#stdio` — newline-delimited JSON-RPC, stderr logging rules

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` — subprocess stdio interceptor pattern
- `.planning/research/PITFALLS.md` — stream-draining pitfall (Pitfall 3)
- `packages/core/src/compressor.ts` — `compressMarkdownWithValidation` API (Phase 1 shipped)
- `packages/core/tests/integration/cli.test.ts` — subprocess spawn test pattern

### Tertiary (LOW confidence)
- `.planning/research/SUMMARY.md` — recommended `@modelcontextprotocol/sdk` for MCP proxy (superseded for runtime by byte-pass-through analysis)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Phase 1 core reuse verified; MCP stdio framing cited from spec; no new prod deps
- Architecture: HIGH — clear directional split (raw pipe vs selective shrink); pitfall 3 mitigations specified
- Pitfalls: HIGH — stream-draining and request mutation risks documented with detection signs

**Research date:** 2026-07-25
**Valid until:** 2026-08-24 (30 days — MCP stdio stable; SDK v2 may evolve)
