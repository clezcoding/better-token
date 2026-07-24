import type { CompressionMode } from "./index.js";
import { readdir, stat } from "node:fs/promises";
import { access, constants } from "node:fs";
import { promisify } from "node:util";
import { join, resolve } from "node:path";
import { encode } from "bpe-lite";
import { validate } from "./validator.js";
import { detokenizeMarkdown, tokenizeMarkdown } from "./tokenizer.js";
import {
  atomicWriteFile,
  createSidecarIfMissing,
  hasSidecar,
  readFileWithCap,
  readSidecar,
} from "./backup.js";

const accessAsync = promisify(access);

export interface CompressFileResult {
  ok: boolean;
  noop?: boolean;
  reason?: "validator-failed";
  errors?: string[];
  before: number;
  after: number;
  delta: number;
}

export const CANONICAL_BASENAMES = new Set([
  "CLAUDE.md",
  ".cursorrules",
  "AGENTS.md",
  "GEMINI.md",
  "CLAUDE.local.md",
  "AGENT.md",
]);

function countTokens(text: string): number {
  return encode(text).length;
}

const SAFE_FILLERS: RegExp[] = [
  /\bBasically,\s*/gi,
  /\bActually,\s*/gi,
  /\bSimply,\s*/gi,
];

const BALANCED_FILLERS: RegExp[] = [
  /I would be happy to help you with/gi,
  /In order to/gi,
  /Please make sure to/gi,
  /As you can see/gi,
  /Note that/gi,
  /Basically/gi,
  /Actually/gi,
];

// Nonce suffixes are lowercase hex; allow a-f so aggressive merge preserves tokens.
const PLACEHOLDER_REGEX = /__[A-Z][A-Za-f0-9]*(?:_[A-Za-f0-9]+)*__/;

function lineHasPlaceholder(line: string): boolean {
  return PLACEHOLDER_REGEX.test(line);
}

function applyFillers(text: string, fillers: RegExp[]): string {
  let result = text;
  for (const filler of fillers) {
    result = result.replace(filler, "");
  }
  return result;
}

function normalizeWhitespace(prose: string): string {
  const lines = prose.split("\n");
  const processed = lines.map((line) => {
    if (lineHasPlaceholder(line)) {
      return line;
    }
    return line.replace(/[ \t]+/g, " ").trim();
  });
  let result = processed.join("\n");
  result = result.replace(/\n{3,}/g, "\n\n");
  return result;
}

function processLinesPreservingPlaceholders(
  prose: string,
  transform: (line: string) => string,
): string {
  return prose
    .split("\n")
    .map((line) => (lineHasPlaceholder(line) ? line : transform(line)))
    .join("\n");
}

function compressSafe(prose: string): string {
  if (!prose) {
    return prose;
  }
  const withFillers = processLinesPreservingPlaceholders(prose, (line) =>
    applyFillers(line, SAFE_FILLERS),
  );
  return normalizeWhitespace(withFillers);
}

function compressBalanced(prose: string): string {
  if (!prose) {
    return prose;
  }
  const withFillers = processLinesPreservingPlaceholders(prose, (line) =>
    applyFillers(line, BALANCED_FILLERS),
  );
  return normalizeWhitespace(withFillers);
}

function compactAdjacentBullets(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";
    const bulletMatch = /^(\s*[-*+]\s+)(.+)$/.exec(line);

    if (!bulletMatch || lineHasPlaceholder(line)) {
      result.push(line);
      i += 1;
      continue;
    }

    const marker = bulletMatch[1];
    const texts = [bulletMatch[2]];
    let j = i + 1;

    while (j < lines.length) {
      const next = lines[j] ?? "";
      const nextMatch = /^(\s*[-*+]\s+)(.+)$/.exec(next);
      if (!nextMatch || nextMatch[1] !== marker || lineHasPlaceholder(next)) {
        break;
      }
      texts.push(nextMatch[2]);
      j += 1;
    }

    if (texts.length > 1) {
      result.push(`${marker}${texts.join("; ")}`);
      i = j;
    } else {
      result.push(line);
      i += 1;
    }
  }

  return result.join("\n");
}

function isNonMergeableBlock(block: string): boolean {
  const trimmed = block.trim();
  if (!trimmed) {
    return true;
  }
  if (block.includes("__CARVEOUT_")) {
    return true;
  }
  if (block.split("\n").some((line) => lineHasPlaceholder(line))) {
    return true;
  }
  const firstLine = trimmed.split("\n")[0] ?? "";
  if (/^#{1,6}\s/.test(firstLine)) {
    return true;
  }
  if (/^[-*+]\s/.test(firstLine)) {
    return true;
  }
  if (/^\d+\.\s/.test(firstLine)) {
    return true;
  }
  return false;
}

function mergeConsecutiveParagraphs(text: string): string {
  const blocks = text.split(/\n\n/);
  const output: string[] = [];
  let buffer: string[] = [];

  const flushBuffer = () => {
    if (buffer.length === 0) {
      return;
    }
    output.push(buffer.join(" "));
    buffer = [];
  };

  for (const block of blocks) {
    if (!block.trim()) {
      flushBuffer();
      output.push("");
      continue;
    }

    if (isNonMergeableBlock(block)) {
      flushBuffer();
      output.push(block);
      continue;
    }

    buffer.push(
      block
        .split("\n")
        .filter((line) => line.trim())
        .join(" "),
    );
  }

  flushBuffer();
  return output.join("\n\n");
}

function compressAggressive(prose: string): string {
  if (!prose) {
    return prose;
  }
  let result = compressBalanced(prose);
  result = compactAdjacentBullets(result);
  result = mergeConsecutiveParagraphs(result);
  return result;
}

export function compressProse(prose: string, mode: CompressionMode): string {
  switch (mode) {
    case "safe":
      return compressSafe(prose);
    case "balanced":
      return compressBalanced(prose);
    case "aggressive":
      return compressAggressive(prose);
    default:
      return compressBalanced(prose);
  }
}

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

export function compressMarkdown(content: string, mode: CompressionMode): string {
  return compressMarkdownWithValidation(content, mode).content;
}

export async function detectCanonicalFiles(cwd: string): Promise<string[]> {
  const absCwd = resolve(cwd);
  const found: string[] = [];

  for (const name of CANONICAL_BASENAMES) {
    const filePath = join(absCwd, name);
    try {
      await accessAsync(filePath, constants.F_OK);
      const fileStat = await stat(filePath);
      if (fileStat.isFile()) {
        found.push(resolve(filePath));
      }
    } catch {
      // not found
    }
  }

  const rulesDir = join(absCwd, ".cursor", "rules");
  try {
    const entries = await readdir(rulesDir);
    for (const entry of entries) {
      if (!entry.endsWith(".mdc")) {
        continue;
      }
      const filePath = join(rulesDir, entry);
      const fileStat = await stat(filePath);
      if (fileStat.isFile()) {
        found.push(resolve(filePath));
      }
    }
  } catch {
    // rules dir missing
  }

  return found.sort();
}

export async function compressFile(
  path: string,
  options: { mode: CompressionMode; dryRun?: boolean },
): Promise<CompressFileResult> {
  const currentContent = await readFileWithCap(path);

  const original = (await hasSidecar(path))
    ? await readSidecar(path)
    : currentContent;

  const { content: compressed, validation } = compressMarkdownWithValidation(
    original,
    options.mode,
  );

  const before = countTokens(original);
  const after = countTokens(compressed);
  const delta = after - before;

  if (!validation.ok) {
    return {
      ok: false,
      reason: "validator-failed",
      errors: validation.errors,
      before,
      after,
      delta,
    };
  }

  if (compressed === currentContent) {
    return {
      ok: true,
      noop: true,
      before: countTokens(currentContent),
      after: countTokens(currentContent),
      delta: 0,
    };
  }

  if (options.dryRun) {
    return {
      ok: true,
      noop: false,
      before,
      after,
      delta,
    };
  }

  await createSidecarIfMissing(path, original);
  await atomicWriteFile(path, compressed);

  return {
    ok: true,
    noop: false,
    before,
    after,
    delta,
  };
}