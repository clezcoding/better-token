# Phase 02: MCP Shrink Proxy - Pattern Map

**Mapped:** 2026-07-25
**Files analyzed:** 16
**Analogs found:** 14 / 16

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/shrink-mcp/package.json` | config | request-response | `packages/core/package.json` | exact |
| `packages/shrink-mcp/tsconfig.json` | config | transform | `packages/core/tsconfig.json` | exact |
| `packages/shrink-mcp/vitest.config.ts` | config | batch | `packages/core/vitest.config.ts` | exact |
| `packages/shrink-mcp/src/index.ts` | utility | request-response | `packages/core/src/index.ts` | exact |
| `packages/shrink-mcp/src/config.ts` | utility | transform | `packages/core/src/cli.ts` (zod schemas) | role-match |
| `packages/shrink-mcp/src/framing.ts` | utility | streaming | `02-RESEARCH.md` Pattern 1 (no codebase analog) | research-only |
| `packages/shrink-mcp/src/shrink.ts` | service | transform | `packages/core/src/compressor.ts` | exact |
| `packages/shrink-mcp/src/proxy.ts` | service | streaming | `packages/core/tests/integration/cli.test.ts` (spawn) + `02-RESEARCH.md` Pattern 3 | partial |
| `packages/core/src/cli.ts` | controller | request-response | `packages/core/src/cli.ts` (self — extend) | exact |
| `package.json` (root) | config | request-response | `package.json` (self — extend workspaces) | exact |
| `tsconfig.json` (root) | config | transform | `tsconfig.json` (self — add reference) | exact |
| `packages/shrink-mcp/tests/unit/framing.test.ts` | test | batch | `packages/core/tests/unit/compressor.test.ts` | role-match |
| `packages/shrink-mcp/tests/unit/shrink.test.ts` | test | batch | `packages/core/tests/unit/compressor.test.ts` | exact |
| `packages/shrink-mcp/tests/unit/config.test.ts` | test | batch | `packages/core/tests/integration/cli.test.ts` | role-match |
| `packages/shrink-mcp/tests/integration/proxy.test.ts` | test | streaming | `packages/core/tests/integration/cli.test.ts` | exact |
| `packages/shrink-mcp/tests/fixtures/mock-upstream.ts` | test | streaming | `02-RESEARCH.md` mock-upstream example | research-only |

## Pattern Assignments

### `packages/shrink-mcp/package.json` (config, request-response)

**Analog:** `packages/core/package.json`

**Workspace package scaffold** (lines 1-27):

```1:27:packages/core/package.json
{
  "name": "@better-token/core",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "better-token": "./dist/cli.js"
  },
  "scripts": {
    "build": "esbuild src/cli.ts src/index.ts --bundle --platform=node --format=esm --outdir=dist --packages=external",
    "test": "vitest run",
    "dev": "tsx src/cli.ts"
  },
  "dependencies": {
    "bpe-lite": "^0.5.2",
    "commander": "^15.0.0",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "esbuild": "^0.25.0",
    "tsx": "^4.0.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

**Adapt for shrink-mcp:** `name: "@better-token/shrink-mcp"`, no `bin`, `main/types` → `./dist/index.js`, `dependencies` → `{ "@better-token/core": "workspace:*" }` only (bpe-lite/zod via core), `build` → `esbuild src/index.ts --bundle --platform=node --format=esm --outdir=dist --packages=external`.

---

### `packages/shrink-mcp/tsconfig.json` (config, transform)

**Analog:** `packages/core/tsconfig.json`

```1:11:packages/core/tsconfig.json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

Copy verbatim; add `paths` only if needed for tests importing `@better-token/core`.

---

### `packages/shrink-mcp/vitest.config.ts` (config, batch)

**Analog:** `packages/core/vitest.config.ts`

```1:8:packages/core/vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

Copy verbatim.

---

### `packages/shrink-mcp/src/index.ts` (utility, request-response)

**Analog:** `packages/core/src/index.ts`

**Public re-export pattern** (lines 1-31):

```1:31:packages/core/src/index.ts
export type CompressionMode = "safe" | "balanced" | "aggressive";

export interface TokenMap {
  [key: string]: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export { tokenizeMarkdown, detokenizeMarkdown, extractProtectedRegions } from "./tokenizer.js";
export {
  CANONICAL_BASENAMES,
  compressMarkdown,
  compressProse,
  compressMarkdownWithValidation,
  compressFile,
  detectCanonicalFiles,
  type CompressFileResult,
} from "./compressor.js";
export { validate } from "./validator.js";
export { extractCarveOuts, CARVEOUT_CATEGORIES } from "./carveouts.js";
export {
  sidecarPathFor,
  createSidecarIfMissing,
  readSidecar,
  restoreFromSidecar,
  MissingSidecarError,
} from "./backup.js";
```

**Adapt:** Export `runProxy`, `parseProxyConfig`, `ProxyConfig` from `./proxy.js` and `./config.js`; re-export `CompressionMode` from `@better-token/core` if needed by consumers.

---

### `packages/shrink-mcp/src/config.ts` (utility, transform)

**Analog:** `packages/core/src/cli.ts` (zod + env parsing)

**Zod schema + safeParse exit pattern** (lines 18-23, 369-381):

```18:23:packages/core/src/cli.ts
const OptionsSchema = z.object({
  mode: z.enum(["safe", "balanced", "aggressive"]),
  dryRun: z.boolean(),
  diff: z.boolean(),
  yes: z.boolean(),
});
```

```369:381:packages/core/src/cli.ts
  .action(async (path: string | undefined, rawOptions: Record<string, unknown>) => {
    const parsedResult = OptionsSchema.safeParse({
      mode: rawOptions.mode ?? "balanced",
      dryRun: rawOptions.dryRun === true,
      diff: rawOptions.diff === true,
      yes: rawOptions.yes === true,
    });
    if (!parsedResult.success) {
      console.error(parsedResult.error.issues[0]?.message ?? "invalid options");
      process.exit(1);
      return;
    }
    const parsed = parsedResult.data;
```

**Mode default pattern** (line 361):

```361:361:packages/core/src/cli.ts
  .option("-m, --mode <safe|balanced|aggressive>", "Compression mode", "balanced")
```

**Adapt for config.ts:**
- `ProxyConfig` interface: `{ upstreamCommand, upstreamArgs, mode, shrinkFields: Set<string>, debug }`
- `parseProxyConfig({ cliMode?, debug?, upstreamCmd, upstreamArgs })` merges env + CLI; **CLI `--mode` wins over `BETTER_TOKEN_MODE`**
- `BETTER_TOKEN_DEBUG=1` or `debug: true` from CLI
- `parseShrinkFields(raw)` — invalid → `process.stderr.write(...)` + default set (D-12); do not `process.exit`

---

### `packages/shrink-mcp/src/framing.ts` (utility, streaming)

**Analog:** `02-RESEARCH.md` Pattern 1 (no codebase analog — greenfield NDJSON)

**Core pattern from research** (implement locally, ~80 lines):

```typescript
// Pattern from 02-RESEARCH.md — no existing codebase file
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

**Constraints:** Single consumer on upstream stdout; optional `maxLineLength` cap (4MB per research security section).

---

### `packages/shrink-mcp/src/shrink.ts` (service, transform)

**Analog:** `packages/core/src/compressor.ts`

**compressMarkdownWithValidation — per-field fallback** (lines 242-267):

```242:267:packages/core/src/compressor.ts
export function compressMarkdownWithValidation(
  content: string,
  mode: CompressionMode,
): { content: string; validation: ReturnType<typeof validate> } {
  const tokenized = tokenizeMarkdown(content);
  const roundTrip = detokenizeMarkdown(tokenized.text, tokenized.tokens);
  if (roundTrip !== content) {
    return {
      content,
      validation: {
        ok: false,
        errors: ["Tokenize/detokenize identity check failed"],
        warnings: [],
      },
    };
  }

  const compressedTokenized = compressProse(tokenized.text, mode);
  const candidate = detokenizeMarkdown(compressedTokenized, tokenized.tokens);
  const validation = validate(content, candidate);

  return {
    content: validation.ok ? candidate : content,
    validation,
  };
}
```

**Validator-failure unit test pattern** (from `compressor.test.ts`, lines 116-129):

```116:129:packages/core/tests/unit/compressor.test.ts
  it("SAFE-01: safe mode returns original when validator fails", () => {
    const input = readFileSync(fixturePath, "utf-8");
    const spy = vi.spyOn(validatorModule, "validate").mockReturnValue({
      ok: false,
      errors: ["Heading sequence or text changed"],
      warnings: [],
    });
    try {
      const { content, validation } = compressMarkdownWithValidation(input, "safe");
      expect(validation.ok).toBe(false);
      expect(content).toBe(input);
    } finally {
      spy.mockRestore();
    }
  });
```

**Adapt:** `compressDescription(text, mode)` wraps `compressMarkdownWithValidation`; on `!validation.ok` return original text (D-07). `shrinkListResponse(msg, fields, mode)` mutates only `description` on `tools`/`prompts`/`resources` arrays when field allowlist matches. Skip descriptions `< MIN_LENGTH` (research: 48) or missing/null.

**Token stats for debug** — copy `countTokens` from cli.ts (lines 37-39):

```37:39:packages/core/src/cli.ts
function countTokens(text: string): number {
  return encode(text).length;
}
```

**Debug stats line format** — copy `formatStatsLine` (lines 41-62):

```41:62:packages/core/src/cli.ts
function formatStatsLine(params: {
  before: number;
  after: number;
  mode: CompressionMode;
  validation: { ok: boolean };
}): string {
  const delta = params.after - params.before;
  const pct =
    params.before === 0
      ? "0.0"
      : ((delta / params.before) * 100).toFixed(1);
  const validatorLabel = params.validation.ok ? "pass" : "fail";

  return [
    `estimated before: ${params.before}`,
    `estimated after: ${params.after}`,
    `estimated delta: ${delta}`,
    `estimated pct: ${pct}%`,
    `mode: ${params.mode}`,
    `validator: ${validatorLabel}`,
  ].join(" | ");
}
```

Emit debug lines to **stderr only** (D-14).

---

### `packages/shrink-mcp/src/proxy.ts` (service, streaming)

**Analog:** `packages/core/tests/integration/cli.test.ts` (spawn) + `02-RESEARCH.md` Pattern 3

**Subprocess spawn helper** (lines 17-39):

```17:39:packages/core/tests/integration/cli.test.ts
function runCli(args: string[]): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("npx", ["tsx", cliPath, ...args], {
      cwd: repoRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      resolvePromise({ code, stdout, stderr });
    });
  });
}
```

**Adapt for proxy.ts:**
- `spawn(config.upstreamCommand, config.upstreamArgs, { stdio: ["pipe","pipe","pipe"], env: process.env })` (D-02)
- `process.stdin.pipe(upstream.stdin!)` — **never parse client stdin** (MCP-02)
- `upstream.stderr?.pipe(process.stderr)`
- Single `upstream.stdout.on("data", ...)` → `NdjsonReadBuffer.push` → `handleUpstreamLine`
- Parse error: pass-through raw line + stderr once (D-13)
- JSON-RPC batch array: pass-through unchanged (v1)
- `upstream.on("exit", ...)` → `process.exit(code ?? 0)` (D-15); signal → stderr + exit 1

---

### `packages/core/src/cli.ts` (controller, request-response) — MODIFY

**Analog:** `packages/core/src/cli.ts` (self — extend existing Commander setup)

**CLI bootstrap** (lines 351-356, 358-430):

```351:356:packages/core/src/cli.ts
const cli = new Command();

cli
  .name("better-token")
  .description("Deterministic markdown compression with byte-exact validation")
  .version("0.1.0");
```

**Subcommand registration pattern** (lines 358-430):

```358:430:packages/core/src/cli.ts
cli
  .command("compress [path]")
  .description("Compress rule/memory markdown files")
  .option("-m, --mode <safe|balanced|aggressive>", "Compression mode", "balanced")
  .option("--dry-run", "Show estimated token savings without writing", false)
  .option(
    "--diff",
    "Show line-alignment preview of changes (not a unified/LCS diff)",
    false,
  )
  .option("-y, --yes", "Compress all detected canonical files without prompting", false)
  .action(async (path: string | undefined, rawOptions: Record<string, unknown>) => {
    const parsedResult = OptionsSchema.safeParse({
      mode: rawOptions.mode ?? "balanced",
      dryRun: rawOptions.dryRun === true,
      diff: rawOptions.diff === true,
      yes: rawOptions.yes === true,
    });
    if (!parsedResult.success) {
      console.error(parsedResult.error.issues[0]?.message ?? "invalid options");
      process.exit(1);
      return;
    }
    const parsed = parsedResult.data;
    // ... handler ...
    process.exit(exitCode);
  });
```

**Add before `cli.parse(process.argv)`:**

```typescript
import { runProxy, parseProxyConfig } from "@better-token/shrink-mcp";

cli
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

**Note:** Use `process.stderr.write` for proxy errors (not `console.error` on stdout path). Add `@better-token/shrink-mcp` to core `package.json` dependencies and esbuild externals.

---

### `package.json` (root) — MODIFY

**Analog:** `package.json` (self)

```1:12:package.json
{
  "name": "better-token",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "npm run build --workspace=@better-token/core",
    "test": "npm run test --workspace=@better-token/core",
    "dev": "npm run dev --workspace=@better-token/core"
  }
}
```

**Adapt:** Extend `build`/`test` to include `@better-token/shrink-mcp` (e.g. run both workspaces or use root `npm test` across workspaces).

---

### `tsconfig.json` (root) — MODIFY

**Analog:** `tsconfig.json` (self)

```1:15:tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "target": "ES2022",
    "paths": {
      "@better-token/core": ["./packages/core/src"]
    }
  },
  "references": [
    { "path": "./packages/core" }
  ]
}
```

**Adapt:** Add `{ "path": "./packages/shrink-mcp" }` to `references`; optional path `"@better-token/shrink-mcp": ["./packages/shrink-mcp/src"]`.

---

### `packages/shrink-mcp/tests/unit/shrink.test.ts` (test, batch)

**Analog:** `packages/core/tests/unit/compressor.test.ts`

**Imports + describe structure** (lines 1-11, 38-44):

```1:11:packages/core/tests/unit/compressor.test.ts
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  compressMarkdown,
  compressMarkdownWithValidation,
  compressProse,
} from "../../src/compressor.js";
import { extractHeadings, splitFrontmatter } from "../../src/tokenizer.js";
import * as validatorModule from "../../src/validator.js";
```

```38:44:packages/core/tests/unit/compressor.test.ts
describe("Compressor", () => {
  it("COMP-01: compressMarkdown is deterministic", () => {
    const input = readFileSync(fixturePath, "utf-8");
    const first = compressMarkdown(input, "balanced");
    const second = compressMarkdown(input, "balanced");
    expect(first).toBe(second);
  });
```

**Adapt:** Test IDs map to MCP-01, MCP-04, D-07 per RESEARCH.md validation table. Use `vi.spyOn` on core validator for D-07 per-field fallback. Fixture: inline JSON-RPC list response objects, not markdown files.

---

### `packages/shrink-mcp/tests/unit/framing.test.ts` (test, batch)

**Analog:** `packages/core/tests/unit/compressor.test.ts` (structure only)

Test `NdjsonReadBuffer`: partial chunks across `\n`, empty lines skipped, `flush()` remainder, multi-line accumulation. No subprocess.

---

### `packages/shrink-mcp/tests/unit/config.test.ts` (test, batch)

**Analog:** `packages/core/tests/integration/cli.test.ts` (env + exit behavior)

Test `parseShrinkFields`: defaults (D-09), invalid env warns + defaults (D-12), CLI mode precedence over env. Use `vi.stubEnv` or pass explicit env objects to pure functions (prefer pure `parseProxyConfig` inputs over global `process.env` mutation).

---

### `packages/shrink-mcp/tests/integration/proxy.test.ts` (test, streaming)

**Analog:** `packages/core/tests/integration/cli.test.ts`

**Full integration spawn pattern** (lines 1-15, 17-39):

```1:15:packages/core/tests/integration/cli.test.ts
import { spawn } from "node:child_process";
import { readFile, writeFile, mkdtemp, rm, access, readdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { constants } from "node:fs";
import { describe, it, expect, vi } from "vitest";
import * as validatorModule from "../../src/validator.js";
import { compressMarkdown } from "../../src/compressor.js";
import { compressFile } from "../../src/compressor.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(__dirname, "../fixtures/sample-claude.md");
const cliPath = resolve(__dirname, "../../src/cli.ts");
const repoRoot = resolve(__dirname, "../../../..");
```

**Adapt:**
- Spawn `npx tsx packages/core/src/cli.ts proxy -- npx tsx packages/shrink-mcp/tests/fixtures/mock-upstream.ts`
- Or spawn shrink-mcp `runProxy` directly with mock upstream child
- MCP-02: capture raw `tools/call` request bytes through proxy; compare byte-identical
- MCP-03: feed invalid JSON line; expect pass-through on stdout + stderr warning
- D-15: mock upstream exits non-zero; proxy exits same code

---

### `packages/shrink-mcp/tests/fixtures/mock-upstream.ts` (test, streaming)

**Analog:** `02-RESEARCH.md` mock-upstream example (no codebase analog)

**Pattern from research** (stdio readline MCP server):

```typescript
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
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { content: [{ type: "text", text: line }] } }) + "\n");
  }
});
```

Use long filler description (matches `BALANCED_FILLERS` in compressor.ts line 49) to assert shrink effect.

---

## Shared Patterns

### Zod validation + stderr errors
**Source:** `packages/core/src/cli.ts`
**Apply to:** `config.ts`, `cli.ts` proxy action

```369:379:packages/core/src/cli.ts
    const parsedResult = OptionsSchema.safeParse({
      mode: rawOptions.mode ?? "balanced",
      dryRun: rawOptions.dryRun === true,
      diff: rawOptions.diff === true,
      yes: rawOptions.yes === true,
    });
    if (!parsedResult.success) {
      console.error(parsedResult.error.issues[0]?.message ?? "invalid options");
      process.exit(1);
      return;
    }
```

### CompressionMode + default balanced
**Source:** `packages/core/src/index.ts`, `packages/core/src/cli.ts`
**Apply to:** `config.ts`, `shrink.ts`

```1:1:packages/core/src/index.ts
export type CompressionMode = "safe" | "balanced" | "aggressive";
```

Default mode: `"balanced"` everywhere unless overridden.

### Validator hard gate with original fallback
**Source:** `packages/core/src/compressor.ts`
**Apply to:** `shrink.ts` (`compressDescription`)

```263:266:packages/core/src/compressor.ts
  return {
    content: validation.ok ? candidate : content,
    validation,
  };
```

Per description field — never fail entire list response (D-07).

### Subprocess integration testing
**Source:** `packages/core/tests/integration/cli.test.ts`
**Apply to:** `proxy.test.ts`, mock-upstream fixture

- `spawn("npx", ["tsx", scriptPath, ...args], { cwd: repoRoot, env, stdio })`
- Accumulate stdout/stderr in `data` handlers
- `child.on("close", (code) => ...)`
- Temp dirs via `mkdtemp` + `rm` in `finally`

### ESM import conventions
**Source:** all `packages/core/src/*.ts`
**Apply to:** all shrink-mcp sources

- `"type": "module"` in package.json
- Relative imports use `.js` extension: `from "./config.js"`
- `node:` prefix for built-ins: `import { spawn } from "node:child_process"`

### Stderr vs stdout separation
**Source:** Phase 2 CONTEXT D-13, D-14 + MCP spec
**Apply to:** `proxy.ts`, `config.ts`, `shrink.ts` debug

- **stdout:** MCP JSON-RPC traffic only
- **stderr:** parse warnings, debug shrink stats, upstream crash messages, invalid env warnings
- Never `console.log` in proxy loop

### Monorepo workspace wiring
**Source:** `package.json`, `packages/core/package.json`
**Apply to:** shrink-mcp package + core dependency

- `workspaces: ["packages/*"]` picks up new package automatically
- shrink-mcp: `"@better-token/core": "workspace:*"`
- core: `"@better-token/shrink-mcp": "workspace:*"` for CLI import
- esbuild `--packages=external` keeps workspace deps external at runtime

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `packages/shrink-mcp/src/framing.ts` | utility | streaming | No NDJSON/streaming utilities in codebase; use RESEARCH.md Pattern 1 |
| `packages/shrink-mcp/tests/fixtures/mock-upstream.ts` | test | streaming | No stdio MCP server fixtures exist; use RESEARCH.md example |

## Metadata

**Analog search scope:** `packages/core/**`, `package.json`, `tsconfig.json`, `.planning/phases/02-mcp-shrink-proxy/02-RESEARCH.md`, `.planning/phases/01-l1-compression-engine-validator/01-PATTERNS.md`
**Files scanned:** ~25
**Pattern extraction date:** 2026-07-25
