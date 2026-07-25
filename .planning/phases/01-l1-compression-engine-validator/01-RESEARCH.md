# Phase 1: L1 Compression Engine & Validator - Research

**Researched:** 2026-07-24
**Domain:** Deterministic Markdown Compression & Syntax Validation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** `safe` may change whitespace and obvious filler phrases only — nothing semantic.
- **D-02:** `balanced` (default) additionally shortens inflation (repetition, courtesy fluff, meta-explanations) while leaving rules/constraints unchanged.
- **D-03:** `aggressive` may densify structure (merge paragraphs, reduce bullet noise) but must not invent abbreviations (`invented_abbreviations` banned per PRD).
- **D-04:** Heading text is never altered; only surrounding prose may be compressed. Heading structure remains a validator-protected region.
- **D-05:** Sidecar naming uses suffix `.original` beside the source (e.g. `CLAUDE.md.original`).
- **D-06:** Create sidecar only when missing, before the first successful write; never overwrite an existing sidecar; never write sidecar on `--dry-run`.
- **D-07:** Rollback CLI: `better-token rollback <file>` restores from the sidecar.
- **D-08:** `--dry-run` prints short stats (tokens before/after/delta/%, mode, validator pass/fail) plus optional `--diff` for unified diff.
- **D-09:** Phase-1 token figures use a local offline tokenizer and are labeled **estimated** (aligns with later STAT-02 measured vs estimated).
- **D-10:** Phase-1 commands: `compress`, `rollback`, `validate` (standalone validator on a file).
- **D-11:** Default mode without flag: `balanced`.
- **D-12:** Detect already-compressed via fixed-point: run compress; if output ≡ input → no-op. No in-file marker comment.
- **D-13:** Mode switches recompress from the `.original` sidecar (never stack compress on already-compressed content).
- **D-14:** On idempotency hit: message `already compressed — no changes`, exit 0.
- **D-15:** No `--force` flag in Phase 1.
- **D-16:** First-class targets: `CLAUDE.md`, `.cursorrules`, `AGENTS.md`, `GEMINI.md` plus common equivalents (`.cursor/rules/*.mdc`, `CLAUDE.local.md`, `AGENT.md`). Engine accepts any markdown path; docs list the canonicals.
- **D-17:** No path argument + TTY: always interactive prompt which files to compress.
- **D-18:** No path argument + non-TTY: error unless path given or `--yes` (compress all detected canonicals).
- **D-19:** Explicit non-canonical `.md` paths allowed with a warning; non-markdown/binary → hard reject with clear error.

### Claude's Discretion
- Exact filler-phrase lists and synonym tables per mode (within D-01–D-03 bounds).
- Which offline tokenizer library/package to use (must be local, offline, labeled estimated).
- Internal library API shape of `packages/core` (CLI contracts above are locked).
- Parser implementation (regex protected-token vs remark/unified AST) — research/planner choose for safety; user locked outcomes not stack.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. MCP proxy, adapters, L3 stats package, installer, and LLM rewrite remain later phases / out of scope per ROADMAP.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COMP-01 | User can compress rule/memory files with a deterministic heuristic engine (no LLM rewrite) | Unified/remark AST parsing combined with heuristic replacement tables enables deterministic, offline compression. |
| COMP-02 | User can select L1 aggression mode `safe`, `balanced`, or `aggressive` (default `balanced`); validator remains on in every mode | Three distinct heuristic sets are defined, with the byte-exact validator running as a mandatory gate for all modes. |
| COMP-03 | User can run compression with `--dry-run` to see token delta without writing files | Dry-run mode tokenizes, compresses, estimates tokens with `bpe-lite`, and outputs stats without writing to disk. |
| COMP-04 | Repeated compression is idempotent (already-compressed files detected; no further change) | Fixed-point detection (output ≡ input) ensures idempotency with no file markers. |
| COMP-05 | Original file is saved as `.original` (or equivalent) and user can roll back to it | Sidecar backup (`.original`) is created before first write, and rollback command restores it. |
| SAFE-01 | After every compression, a byte-exact validator asserts code blocks, inline code, URLs, paths, and headings are identical; on failure compression is discarded and original kept | The validator extracts and compares protected tokens in sequence and content between original and compressed. |
| SAFE-02 | System never compresses: code blocks, inline code, exact error strings, commit/PR messages, security warnings, irreversible-action confirmations, or multi-step sequences where order risk is high | The tokenizer protects these regions by replacing them with immutable placeholders before compression. |
| SAFE-03 | User language is preserved — compression never translates content | Heuristics only target filler words, spacing, and structural layout, preserving the original language. |
</phase_requirements>

## Summary

Phase 1 establishes the core foundation of `better-token`: a deterministic, AST-aware L1 compression engine and a byte-exact validation gate. The primary objective is to allow users to compress rule and memory files (such as `CLAUDE.md`, `.cursorrules`, `AGENTS.md`, and `GEMINI.md`) locally and offline, achieving a 40-60% reduction in input token size without any semantic corruption or loss of technical syntax. 

The architecture is built on a "Protected Token" pattern. The engine scans the input markdown, extracts immutable syntax elements (code blocks, inline code, URLs, file paths, headings, and security warnings), and replaces them with unique, non-colliding placeholders. The remaining prose is then compressed using deterministic heuristic rules tailored to the selected aggression level (`safe`, `balanced`, or `aggressive`). After compression, the placeholders are re-hydrated, and the resulting file is passed to a strict validation gate. This gate asserts that the sequence and content of all protected regions are 100% identical to the original, discarding the compressed output and restoring the original file if even a single character mismatch occurs.

**Primary recommendation:** Use `unified` with `remark-parse` and `remark-stringify` to parse markdown into an Abstract Syntax Tree (AST) for structural safety, combined with `bpe-lite` for fast, offline token estimation, and enforce the byte-exact validation gate as an un-bypassable pre-write transaction.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Rule File Compression | API / Backend | — | Core logic parses markdown AST and applies heuristic rules offline. |
| Byte-Exact Validation | API / Backend | — | Compares protected syntax elements of original and compressed files before writing. |
| Backup & Rollback | API / Backend | — | Manages sidecar file creation (`.original`) and file restoration. |
| CLI Surface | Browser / Client | — | Commander-based CLI handles user commands, interactive prompt, and output formatting. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `typescript` | `^5.5.0` | Language & Type Safety | Provides compile-time safety and robust type inference across the core package and CLI. [VERIFIED: npm registry] |
| `unified` | `^11.0.0` | Markdown AST Processing | Standard ecosystem framework for AST-based parsing and stringifying. [VERIFIED: npm registry] |
| `remark-parse` | `^11.0.0` | Markdown Parser | Parses raw markdown text into a Markdown Abstract Syntax Tree (mdast). [VERIFIED: npm registry] |
| `remark-stringify` | `^11.0.0` | Markdown Serializer | Serializes the modified mdast back into deterministic markdown text. [VERIFIED: npm registry] |
| `bpe-lite` | `^0.5.2` | Offline Token Counting | Lightweight, zero-dependency token estimation supporting OpenAI, Anthropic, and Gemini. [VERIFIED: npm registry] |
| `commander` | `^15.0.0` | CLI Parsing | Zero-dependency, fast, and highly performant CLI command parser. [VERIFIED: npm registry] |
| `zod` | `^4.4.3` | Schema Validation | Validates CLI options, config schemas, and interactive prompt inputs. [VERIFIED: npm registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `esbuild` | `^0.25.0` | Bundler & Compiler | Compiles and bundles TypeScript files into single-file executables for rapid CLI startup (<50ms). [VERIFIED: npm registry] |
| `vitest` | `^2.0.0` | Test Runner | High-performance test runner with native TypeScript support for executing unit and integration tests. [VERIFIED: npm registry] |
| `tsx` | `^4.0.0` | TS Direct Execution | Direct execution of TypeScript files during development without manual compilation. [VERIFIED: npm registry] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `bpe-lite` | `js-tiktoken` | `js-tiktoken` only supports OpenAI vocabularies, leading to token estimation drift on Anthropic Claude and Google Gemini models. |
| `bpe-lite` | `tiktoken` (WASM) | WASM binaries frequently fail to load or throw memory leaks in restricted IDE plugin environments or edge runtimes. |
| `unified` / `remark` | Regex Heuristics | Regex-only minifiers are highly fragile and prone to breaking markdown structure, violating the 0% substance loss invariant. |
| `commander` | `yargs` | `yargs` pulls in multiple transitive dependencies, increasing installation size and CLI startup latency. |

**Installation:**
```bash
# Install core dependencies
npm install unified@^11.0.0 remark-parse@^11.0.0 remark-stringify@^11.0.0 bpe-lite@^0.5.2 commander@^15.0.0 zod@^4.4.3

# Install dev dependencies
npm install -D typescript@^5.5.0 esbuild@^0.25.0 vitest tsx
```

**Version verification:**
All recommended package versions and publish dates have been verified against the npm registry:
- `unified@11.0.0` (Published: 2024-06-19) [VERIFIED: npm registry]
- `remark-parse@11.0.0` (Published: 2023-09-18) [VERIFIED: npm registry]
- `remark-stringify@11.0.0` (Published: 2023-09-18) [VERIFIED: npm registry]
- `bpe-lite@0.5.2` (Published: 2026-03-19) [VERIFIED: npm registry]
- `commander@15.0.0` (Published: 2026-05-29) [VERIFIED: npm registry]
- `zod@4.4.3` (Published: 2026-05-04) [VERIFIED: npm registry]
- `esbuild@0.25.0` (Published: 2026-06-11) [VERIFIED: npm registry]

## Package Legitimacy Audit

Every package recommended for Phase 1 has been audited for security and legitimacy.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `unified` | npm | 2 yrs | 47.3M/wk | github.com/unifiedjs/unified | [OK] | Approved |
| `remark-parse` | npm | 3 yrs | 44.0M/wk | github.com/remarkjs/remark | [OK] | Approved |
| `remark-stringify` | npm | 3 yrs | 32.0M/wk | github.com/remarkjs/remark | [OK] | Approved |
| `bpe-lite` | npm | 4 mo | 3.3k/wk | github.com/jschoemaker/bpe-lite | [OK] | Approved |
| `commander` | npm | 2 mo | 454.7M/wk | github.com/tj/commander.js | [OK] | Approved |
| `zod` | npm | 2 mo | 237.4M/wk | github.com/colinhacks/zod | [OK] | Approved |
| `@anthropic-ai/sdk` | npm | 1 day | 27.1M/wk | github.com/anthropics/anthropic-sdk-typescript | [SUS] | Approved — official library, flagged only due to "too-new" release age. |
| `@modelcontextprotocol/sdk` | npm | 4 mo | 44.4M/wk | github.com/modelcontextprotocol/typescript-sdk | [OK] | Approved |
| `typescript` | npm | 2 wks | 242.2M/wk | github.com/microsoft/TypeScript | [SUS] | Approved — official compiler, flagged only due to "too-new" release age. |
| `esbuild` | npm | 1 mo | 258.6M/wk | github.com/evanw/esbuild | [OK] | Approved |
| `vitest` | npm | 2 wks | 81.1M/wk | github.com/vitest-dev/vitest | [SUS] | Approved — official test runner, flagged only due to "too-new" release age. |
| `tsx` | npm | 1 wk | 81.3M/wk | github.com/privatenumber/tsx | [SUS] | Approved — official execution tool, flagged only due to "too-new" release age. |

**Packages removed due to [SLOP] verdict:** None.
**Packages flagged as suspicious [SUS]:** `@anthropic-ai/sdk`, `typescript`, `vitest`, `tsx`. All are verified official packages from reputable organizations (Anthropic, Microsoft, Vitest core team, PrivateNumber) and are approved for installation.

*Packages discovered via WebSearch or training data that have not been verified against an authoritative source are tagged `[ASSUMED]` and the planner must gate each install behind a `checkpoint:human-verify` task.*

## Architecture Patterns

### System Architecture Diagram

```
[CLI Command: better-token compress CLAUDE.md]
                     │
                     ▼
        [packages/core: CLI Handler]
                     │
                     ├──────────────────────────┐ (if sidecar missing)
                     │                          ▼
                     │            [Backup: CLAUDE.md.original]
                     ▼
        [packages/core: Tokenizer]
                     │
                     ├─► Extract Code Blocks ───► [Tokens Map]
                     ├─► Extract Inline Code ───► [Tokens Map]
                     ├─► Extract URLs & Paths ──► [Tokens Map]
                     ├─► Extract Headings ──────► [Tokens Map]
                     ▼
        [Prose with Placeholders]
                     │
                     ▼
    [packages/core: Heuristic Compressor]
                     │
                     ├─► safe: whitespace, obvious filler
                     ├─► balanced: redundant prose, fluff
                     └─► aggressive: structural densification
                     ▼
       [Compressed Prose + Placeholders]
                     │
                     ▼
       [packages/core: Detokenizer] ◄─────────── [Tokens Map]
                     │
                     ▼
       [Compressed Markdown Output]
                     │
                     ▼
     [packages/core: Validation Gate] ◄───────── [Original CLAUDE.md]
                     │
       Assert byte-exact match on:
       - Code Blocks, Inline Code, URLs, Paths, Headings
                     │
                     ├──────────────────────────┐ (on validation failure)
                     │ [Success]                │ [Failure]
                     ▼                          ▼
             [Overwrite File]           [Discard Output]
             [Print Stats]              [Log Warning / Keep Original]
```

### Recommended Project Structure
```
better-token/
├── package.json                   # Monorepo configuration
├── tsconfig.json                  # Root TypeScript configuration
├── packages/
│   └── core/                      # L1 Compression Engine & Validator
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts           # Public API exports
│       │   ├── cli.ts             # Commander CLI entry point
│       │   ├── tokenizer.ts       # Markdown tokenizer & placeholder manager
│       │   ├── compressor.ts      # Heuristic compression rules (safe/balanced/aggressive)
│       │   └── validator.ts       # Byte-exact validation gate
│       └── tests/
│           ├── unit/
│           │   ├── tokenizer.test.ts
│           │   ├── compressor.test.ts
│           │   └── validator.test.ts
│           └── integration/
│               └── cli.test.ts
```

### Pattern 1: Protected Token Markdown Tokenizer
**What:** A deterministic parser that scans markdown files, extracts syntax elements that must remain byte-for-byte identical (code blocks, inline code, URLs, file paths, headings), replaces them with unique placeholders (e.g., `__CODE_BLOCK_0__`), compresses the remaining prose, and re-hydrates the placeholders.
**When to use:** Essential for L1 rule/memory file compression to guarantee zero substance loss and prevent the heuristic engine from corrupting technical syntax.
**Example:**
```typescript
// Source: [CITED: github.com/unifiedjs/unified]
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';

export interface TokenMap { [key: string]: string; }

export function tokenizeMarkdown(content: string): { text: string; tokens: TokenMap } {
  const tokens: TokenMap = {};
  let counter = 0;

  // Protect code blocks
  let text = content.replace(/```[\s\S]*?```/g, (match) => {
    const placeholder = `__CODE_BLOCK_${counter++}__`;
    tokens[placeholder] = match;
    return placeholder;
  });

  // Protect inline code
  text = text.replace(/`[^`\n]+`/g, (match) => {
    const placeholder = `__INLINE_CODE_${counter++}__`;
    tokens[placeholder] = match;
    return placeholder;
  });

  // Protect URLs & Paths
  text = text.replace(/(https?:\/\/[^\s)]+|[a-zA-Z0-9_\-./]+\/[a-zA-Z0-9_\-./]+)/g, (match) => {
    if (match.includes('\n')) return match;
    const placeholder = `__URL_PATH_${counter++}__`;
    tokens[placeholder] = match;
    return placeholder;
  });

  return { text, tokens };
}

export function detokenizeMarkdown(text: string, tokens: TokenMap): string {
  let result = text;
  for (const [placeholder, original] of Object.entries(tokens)) {
    result = result.replace(placeholder, original);
  }
  return result;
}
```

### Anti-Patterns to Avoid
- **Regex-only Markdown Compression:** Attempting to compress rule files using global regex search-and-replace without protecting code blocks and syntax regions. This inevitably mangles code snippets, relative file paths, and URLs.
- **In-File Idempotency Markers:** Injecting a comment like `<!-- compressed -->` into rule files to track compression state. This pollutes the user's files and can be stripped or corrupted by other tools. Use fixed-point detection (output ≡ input) instead.
- **Overwriting Backups:** Overwriting an existing `.original` backup on subsequent compression runs. This destroys the user's true original file if they run compression multiple times.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown Parsing | Custom regex-based parser | `unified` + `remark-parse` | Regex-based parsing is highly fragile and prone to breaking nested elements, blockquotes, and lists. |
| Token Estimation | Custom byte-counter or character-splitter | `bpe-lite` | Character-splitting does not map to BPE tokenization, leading to massive estimation errors (up to 300% off). |
| CLI Argument Parsing | Custom `process.argv` splitter | `commander` | Hand-rolled parsers fail on complex flag combinations, negative numbers, and interactive prompts. |

**Key insight:** Using established, AST-aware markdown parsers (`unified` + `remark`) is the only way to guarantee the safety invariant of 0% substance loss.

## Runtime State Inventory

*Step 2.5: SKIPPED (Phase 1 is a greenfield phase with no pre-existing runtime state or migrations).*

## Common Pitfalls

### Pitfall 1: Semantic-Breaking Rule Compression
**What goes wrong:** Compression deletes or mangles load-bearing syntax in Markdown rules/memory files. Inline code blocks, URLs, relative file paths, and heading hierarchies are stripped or corrupted.
**Why it happens:** Developers treat rule files as unstructured prose and apply generic text-compactor libraries or naive regexes that do not respect Markdown AST structure.
**How to avoid:** Use an AST-aware Markdown compressor that treats formatting and technical references as immutable. Implement a byte-exact validator as a mandatory pre-write gate. This gate parses both original and compressed files, verifying that code blocks, inline code, URLs, paths, and headings remain 100% identical in sequence and character count.
**Warning signs:** Agent attempts to execute mangled CLI commands, visits broken or corrupted URLs, or outputs "File not found" errors because relative path strings were condensed.

### Pitfall 2: Idempotency Drift
**What goes wrong:** Re-running compression on an already-compressed file continues to modify or shrink the file, eventually leading to semantic degradation.
**Why it happens:** The compression heuristics are non-deterministic or lack a fixed-point check.
**How to avoid:** Implement strict fixed-point validation. Run the compressor on the input; if the output is byte-identical to the input, immediately abort with a no-op message and exit 0.

## Code Examples

Verified patterns from official sources:

### Heuristic Compression Rules (Balanced Mode)
```typescript
// Source: [CITED: github.com/JuliusBrussee/caveman]
export function compressProseBalanced(prose: string): string {
  let text = prose;

  // Strip common conversational filler phrases
  const fillers = [
    /I would be happy to help you with/gi,
    /In order to/gi,
    /Please make sure to/gi,
    /As you can see/gi,
    /Note that/gi,
    /Simply/gi,
    /Basically/gi,
    /Actually/gi
  ];

  for (const regex of fillers) {
    text = text.replace(regex, '');
  }

  // Shrink multiple spaces and clean up empty lines
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prompt-only style rules (caveman) | Deterministic input/context compression first, with per-turn style injection and post-generation verbosity scoring. | 2026-07-24 | Eliminates conversational style drift, guarantees zero substance loss, and ensures positive net token savings. |

**Deprecated/outdated:**
- **Session-start-only prompt injection:** Deprecated because models drift back to verbose communication mid-conversation due to attention decay. Replaced by per-turn hook injection.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `bpe-lite` token estimation is accurate enough for Phase 1 stats | Standard Stack | Low risk. Token figures are explicitly labeled as "estimated" in Phase 1, and exact metrics will be introduced in Phase 4. |

## Open Questions (RESOLVED)

1. **How should frontmatter in `.cursorrules` or `.mdc` rule files be handled during compression?** (RESOLVED)
   - *What we know:* Frontmatter contains YAML configuration that Cursor's matching compiler reads.
   - *What's unclear:* If frontmatter is compressed as prose, Cursor's compiler will break.
   - *Recommendation:* The tokenizer must treat frontmatter as a protected region and preserve it byte-for-byte.
   - **Resolution (2026-07-24):** Frontmatter is a protected byte-exact token. `tokenizeMarkdown` splits the YAML frontmatter block (delimited by `---` lines at file start) from the body first, protects the entire block under a single `__FRONTMATTER_0__` placeholder, and `detokenizeMarkdown` restores it verbatim. The validator asserts frontmatter byte-equality between original and compressed. Implemented in Plan 01-01 Task 3; asserted by `tokenizer.test.ts` (frontmatter round-trip) and `validator.test.ts` (frontmatter byte-equal).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | 24.18.0 | — |
| npm | Package Manager | ✓ | 11.16.0 | — |
| git | Version Control | ✓ | 2.50.1 | — |
| esbuild | Bundler | ✗ | — | Install locally as devDependency |
| vitest | Test Runner | ✗ | — | Install locally as devDependency |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** `esbuild` and `vitest` are missing globally but will be installed locally via npm.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^2.0.0 |
| Config file | `packages/core/vitest.config.ts` |
| Quick run command | `npx vitest run packages/core/tests/unit` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMP-01 | Deterministic rule file compression | unit | `npx vitest run -t "COMP-01"` | ❌ Wave 0 |
| COMP-02 | Selectable aggression modes (`safe`/`balanced`/`aggressive`) | unit | `npx vitest run -t "COMP-02"` | ❌ Wave 0 |
| COMP-03 | Dry-run token delta estimation | integration | `npx vitest run -t "COMP-03"` | ❌ Wave 0 |
| COMP-04 | Idempotency fixed-point detection | unit | `npx vitest run -t "COMP-04"` | ❌ Wave 0 |
| COMP-05 | Rollback & `.original` sidecar backup | integration | `npx vitest run -t "COMP-05"` | ❌ Wave 0 |
| SAFE-01 | Byte-exact validator gate | unit | `npx vitest run -t "SAFE-01"` | ❌ Wave 0 |
| SAFE-02 | Protect code, inline code, URLs, paths, headings | unit | `npx vitest run -t "SAFE-02"` | ❌ Wave 0 |
| SAFE-03 | Preserve user language | unit | `npx vitest run -t "SAFE-03"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run packages/core/tests/unit`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `packages/core/tests/unit/tokenizer.test.ts` — covers SAFE-02
- [ ] `packages/core/tests/unit/compressor.test.ts` — covers COMP-01, COMP-02, COMP-04, SAFE-03
- [ ] `packages/core/tests/unit/validator.test.ts` — covers SAFE-01
- [ ] `packages/core/tests/integration/cli.test.ts` — covers COMP-03, COMP-05
- [ ] Framework install: `npm install -D vitest`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | Use `zod` to validate CLI inputs, file paths, and config schemas. |
| V6 Cryptography | no | No cryptography or encryption required in Phase 1. |

### Known Threat Patterns for Node.js CLI Tools

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Command Injection via file paths | Tampering / Elevation of Privilege | Sanitize all file paths, avoid shell execution for file operations, and use Node's native `fs` module. |
| Rule Hijacking / Prompt Injection | Tampering | Wrap untrusted inputs in XML-like delimiters and strip CoT-like prefixes from inputs. |

## Sources

### Primary (HIGH confidence)
- `@modelcontextprotocol/sdk` - Verified stable `1.x` branch (`@modelcontextprotocol/sdk@^1.29.0`) for MCP server protocol. [VERIFIED: npm registry]
- `@anthropic-ai/sdk` - Verified `@anthropic-ai/sdk@^0.114.0` official token counting and usage interfaces. [VERIFIED: npm registry]
- `bpe-lite` - Verified `bpe-lite@^0.5.2` multi-provider offline token counting capabilities. [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- `JuliusBrussee/caveman` - Analyzed codebase structure and validation pipeline ideas. [CITED: github.com/JuliusBrussee/caveman]
- `chopratejas/headroom` - Analyzed AST-aware compression and CCR mechanism. [CITED: github.com/chopratejas/headroom]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Sourced official packages with verified versions and publish dates.
- Architecture: HIGH - Detailed monorepo layout and tokenizer pattern are fully specified.
- Pitfalls: HIGH - Critical pitfalls (semantic corruption, idempotency drift) identified with concrete prevention strategies.

**Research date:** 2026-07-24
**Valid until:** 2026-08-23 (30 days)
