# Phase 01: L1 Compression Engine & Validator - Pattern Map

**Mapped:** 2026-07-24
**Files analyzed:** 13
**Analogs found:** 4 / 13 (Greenfield project, using python prior-art from agent skills and proposed research stack)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `package.json` | config | request-response | None (Greenfield) | n/a |
| `tsconfig.json` | config | transform | None (Greenfield) | n/a |
| `packages/core/package.json` | config | request-response | None (Greenfield) | n/a |
| `packages/core/tsconfig.json` | config | transform | None (Greenfield) | n/a |
| `packages/core/src/index.ts` | utility | request-response | None (Greenfield) | n/a |
| `packages/core/src/cli.ts` | controller | request-response | `.agents/skills/caveman-compress/scripts/cli.py` | partial (python tool) |
| `packages/core/src/tokenizer.ts` | service | transform | `.agents/skills/caveman-compress/scripts/compress.py` | partial (python tool) |
| `packages/core/src/compressor.ts` | service | transform | `.agents/skills/caveman-compress/scripts/compress.py` | partial (python tool) |
| `packages/core/src/validator.ts` | service | request-response | `.agents/skills/caveman-compress/scripts/validate.py` | high (porting logic) |
| `packages/core/tests/unit/tokenizer.test.ts` | test | batch | None (Greenfield) | n/a |
| `packages/core/tests/unit/compressor.test.ts` | test | batch | None (Greenfield) | n/a |
| `packages/core/tests/unit/validator.test.ts` | test | batch | None (Greenfield) | n/a |
| `packages/core/tests/integration/cli.test.ts` | test | batch | None (Greenfield) | n/a |

## Pattern Assignments

### `packages/core/src/tokenizer.ts` (service, transform)

**Analog:** `.agents/skills/caveman-compress/scripts/compress.py` (prior-art regex and frontmatter splitting) and `.planning/phases/01-l1-compression-engine-validator/01-RESEARCH.md` (proposed TS tokenizer pattern)

**Original Python Frontmatter and Regex Pattern:**

```17:25:.agents/skills/caveman-compress/scripts/compress.py
OUTER_FENCE_REGEX = re.compile(
    r"\A\s*(`{3,}|~{3,})[^\n]*\n(.*)\n\1\s*\Z", re.DOTALL
)

# YAML frontmatter: starts at file start with --- on its own line, ends with --- on its own line.
# Captures the entire block (including delimiters and trailing newline) and the body after.
FRONTMATTER_REGEX = re.compile(
    r"\A(---\r?\n.*?\r?\n---\r?\n)(.*)", re.DOTALL
)
```

**Original Python Split Frontmatter Pattern:**

```28:40:.agents/skills/caveman-compress/scripts/compress.py
def split_frontmatter(text: str):
    """Split YAML frontmatter from body. Returns (frontmatter, body).

    Memory files (and many other markdown docs) start with a YAML frontmatter
    block delimited by `---` lines. The compression LLM has a habit of stripping
    or rewriting these despite preserve-structure rules in the prompt — so we
    surgically remove the frontmatter before compression and prepend it back
    verbatim to the output. Files without frontmatter pass through unchanged.
    """
    m = FRONTMATTER_REGEX.match(text)
    if m:
        return m.group(1), m.group(2)
    return "", text
```

**Proposed TypeScript Tokenizer Pattern:**

```223:267:.planning/phases/01-l1-compression-engine-validator/01-RESEARCH.md
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

---

### `packages/core/src/compressor.ts` (service, transform)

**Analog:** `.planning/phases/01-l1-compression-engine-validator/01-RESEARCH.md` (filler rules) and `.agents/skills/caveman-compress/scripts/compress.py` (idempotency check flow)

**Original Python Core Flow for Idempotency:**

```288:294:.agents/skills/caveman-compress/scripts/compress.py
    # Compare the BODY (not the whole file) — frontmatter is preserved verbatim
    # and would never change, so identity must be judged on the compressible part.
    if compressed_body.strip() == body.strip():
        print("❌ Compression aborted: output is identical to input.")
        print("   Likely causes: Claude refused, returned the prompt verbatim, or the file is")
        print("   already in caveman form. Original file is untouched (no backup created).")
        return False
```

**Proposed Heuristic Compression Rules (Balanced Mode):**

```307:333:.planning/phases/01-l1-compression-engine-validator/01-RESEARCH.md
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

---

### `packages/core/src/validator.ts` (service, request-response)

**Analog:** `.agents/skills/caveman-compress/scripts/validate.py` (compares original vs compressed segments)

**Original RegEx Extractor Patterns (Python):**

```6:13:.agents/skills/caveman-compress/scripts/validate.py
URL_REGEX = re.compile(r"https?://[^\s)]+")
FENCE_OPEN_REGEX = re.compile(r"^(\s{0,3})(`{3,}|~{3,})(.*)$")
HEADING_REGEX = re.compile(r"^(#{1,6})\s+(.*)", re.MULTILINE)
BULLET_REGEX = re.compile(r"^\s*[-*+]\s+", re.MULTILINE)

# crude but effective path detection
# Requires either a path prefix (./ ../ / or drive letter) or a slash/backslash within the match
PATH_REGEX = re.compile(r"(?:\./|\.\./|/|[A-Za-z]:\\)[\w\-/\\\.]+|[\w\-\.]+[/\\][\w\-/\\\.]+")
```

**Original Heading and Code Block Extraction Logic (Python):**

```37:82:.agents/skills/caveman-compress/scripts/validate.py
def extract_headings(text):
    return [(level, title.strip()) for level, title in HEADING_REGEX.findall(text)]


def extract_code_blocks(text):
    """Line-based fenced code block extractor.

    Handles ``` and ~~~ fences with variable length (CommonMark: closing
    fence must use same char and be at least as long as opening). Supports
    nested fences (e.g. an outer 4-backtick block wrapping inner 3-backtick
    content).
    """
    blocks = []
    lines = text.split("\n")
    i = 0
    n = len(lines)
    while i < n:
        m = FENCE_OPEN_REGEX.match(lines[i])
        if not m:
            i += 1
            continue
        fence_char = m.group(2)[0]
        fence_len = len(m.group(2))
        open_line = lines[i]
        block_lines = [open_line]
        i += 1
        closed = False
        while i < n:
            close_m = FENCE_OPEN_REGEX.match(lines[i])
            if (
                close_m
                and close_m.group(2)[0] == fence_char
                and len(close_m.group(2)) >= fence_len
                and close_m.group(3).strip() == ""
            ):
                block_lines.append(lines[i])
                closed = True
                i += 1
                break
            block_lines.append(lines[i])
            i += 1
        if closed:
            blocks.append("\n".join(block_lines))
        # Unclosed fences are silently skipped — they indicate malformed markdown
        # and including them would cause false-positive validation failures.
    return blocks
```

**Original Comparison & Assertions Logic (Python):**

```106:168:.agents/skills/caveman-compress/scripts/validate.py
def validate_headings(orig, comp, result):
    h1 = extract_headings(orig)
    h2 = extract_headings(comp)

    if len(h1) != len(h2):
        result.add_error(f"Heading count mismatch: {len(h1)} vs {len(h2)}")

    if h1 != h2:
        result.add_warning("Heading text/order changed")


def validate_code_blocks(orig, comp, result):
    c1 = extract_code_blocks(orig)
    c2 = extract_code_blocks(comp)

    if c1 != c2:
        result.add_error("Code blocks not preserved exactly")


def validate_urls(orig, comp, result):
    u1 = extract_urls(orig)
    u2 = extract_urls(comp)

    if u1 != u2:
        result.add_error(f"URL mismatch: lost={u1 - u2}, added={u2 - u1}")


def validate_paths(orig, comp, result):
    p1 = extract_paths(orig)
    p2 = extract_paths(comp)

    if p1 != p2:
        result.add_warning(f"Path mismatch: lost={p1 - p2}, added={p2 - p1}")


def validate_bullets(orig, comp, result):
    b1 = count_bullets(orig)
    b2 = count_bullets(comp)

    if b1 == 0:
        return

    diff = abs(b1 - b2) / b1

    if diff > 0.15:
        result.add_warning(f"Bullet count changed too much: {b1} -> {b2}")


def validate_inline_codes(orig, comp, result):
    c1 = Counter(extract_inline_codes(orig))
    c2 = Counter(extract_inline_codes(comp))

    if c1 != c2:
        lost = set(c1.keys()) - set(c2.keys())
        added = set(c2.keys()) - set(c1.keys())
        for code, count in c1.items():
            if code in c2 and c2[code] < count:
                lost.add(f"{code} (lost {count - c2[code]} of {count} occurrences)")
        if lost:
            result.add_error(f"Inline code lost: {lost}")
        if added:
            result.add_warning(f"Inline code added: {added}")
```

---

### `packages/core/src/cli.ts` (controller, request-response)

**Analog:** `.agents/skills/caveman-compress/scripts/cli.py` (prior-art CLI entry point)

**Proposed TypeScript Commander CLI Pattern:**

```typescript
import { Command } from 'commander';
import { z } from 'zod';
import { compressFile, rollbackFile, validateFile } from './index';

const cli = new Command();

cli
  .name('better-token')
  .description('IDE-übergreifendes Framework zum zuverlässigen Einsparen von LLM-Tokens')
  .version('1.0.0');

cli
  .command('compress [path]')
  .description('Komprimiert Regeldateien/Memory-Dateien deterministisch')
  .option('-m, --mode <safe|balanced|aggressive>', 'Heuristik-Stufe für die Kompression', 'balanced')
  .option('--dry-run', 'Zeigt Token-Einsparungen an, ohne die Datei zu schreiben', false)
  .option('--diff', 'Zeigt ein unified diff der Änderungen an', false)
  .option('--yes', 'Bestätigt das Komprimieren aller kanonischen Dateien automatisch im Non-TTY Modus', false)
  .action(async (path, options) => {
    // Schema-Validierung über Zod
    const configSchema = z.object({
      mode: z.enum(['safe', 'balanced', 'aggressive']),
      dryRun: z.boolean(),
      diff: z.boolean(),
      yes: z.boolean(),
    });
    
    const parsedOptions = configSchema.parse(options);
    // CLI Logik ausführen...
  });

cli
  .command('rollback <path>')
  .description('Stellt die Originaldatei aus dem .original-Backup wieder her')
  .action(async (path) => {
    await rollbackFile(path);
  });

cli
  .command('validate <path>')
  .description('Führt einen eigenständigen Byte-Validator auf einer Datei aus')
  .action(async (path) => {
    const isValid = await validateFile(path);
    process.exit(isValid ? 0 : 1);
  });

cli.parse(process.argv);
```

---

### `packages/core/tests/` (test, batch)

**Analog:** None (Greenfield)

**Proposed Vitest Test Pattern for Unit Testing:**

```typescript
import { describe, it, expect } from 'vitest';
import { tokenizeMarkdown, detokenizeMarkdown } from '../../src/tokenizer';

describe('Markdown Tokenizer (SAFE-02)', () => {
  it('sollte Code-Blöcke schützen und unberührt lassen', () => {
    const input = 'Ein Text mit ```ts\nconst a = 1;\n``` block.';
    const { text, tokens } = tokenizeMarkdown(input);
    
    expect(text).toContain('__CODE_BLOCK_0__');
    const restored = detokenizeMarkdown(text, tokens);
    expect(restored).toBe(input);
  });
});
```

---

## Shared Patterns

### YAML / JSON-Like Schema-Validierung
**Source:** Zod (`packages/core/src/cli.ts`)
**Apply to:** CLI-Argumente, Heuristik-Optionen, Profile-Konfigurationen
```typescript
import { z } from 'zod';

export const OptionsSchema = z.object({
  mode: z.enum(['safe', 'balanced', 'aggressive']),
  dryRun: z.boolean().default(false),
  diff: z.boolean().default(false),
  yes: z.boolean().default(false),
});
```

### Ein- und Auslesen von Dateien (Markdown File I/O)
**Source:** Native Node.js `fs` (`packages/core/src/tokenizer.ts`, `packages/core/src/cli.ts`)
**Apply to:** Alle Datei-Lese/Schreibvorgänge
```typescript
import * as fs from 'fs/promises';

export async function readMarkdown(path: string): Promise<string> {
  return await fs.readFile(path, 'utf-8');
}

export async function writeMarkdown(path: string, content: string): Promise<void> {
  await fs.writeFile(path, content, 'utf-8');
}
```

## No Analog Found

Da das Projekt fast komplett leer ist (Greenfield), weisen die folgenden Dateien keine nahen Analoge im Projekt auf. Sie werden stattdessen nach den vorgeschlagenen Best-Practices der gewählten Bibliotheken entworfen:

| Datei | Rolle | Data Flow | Grund / Ansatz |
|------|------|-----------|----------------|
| `package.json` | config | request-response | Root NPM Monorepo Konfiguration mit workspaces |
| `tsconfig.json` | config | transform | Root TypeScript Konfiguration |
| `packages/core/package.json` | config | request-response | NPM-Paket für die L1-Engine |
| `packages/core/tsconfig.json` | config | transform | TS-Compiler-Optionen für die L1-Engine |
| `packages/core/src/index.ts` | utility | request-response | Barrel-Export für die öffentliche API |

## Metadata

**Analog search scope:** Workspace root, `.agents/skills/caveman-compress/scripts/`
**Files scanned:** 10
**Pattern extraction date:** 2026-07-24
