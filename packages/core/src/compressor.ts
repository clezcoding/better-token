import type { CompressionMode } from "./index.js";
import { readFile } from "node:fs/promises";
import { encode } from "bpe-lite";
import { validate } from "./validator.js";
import { detokenizeMarkdown, tokenizeMarkdown } from "./tokenizer.js";
import {
  atomicWriteFile,
  createSidecarIfMissing,
  hasSidecar,
  readSidecar,
} from "./backup.js";

export interface CompressFileResult {
  ok: boolean;
  noop?: boolean;
  reason?: "validator-failed";
  errors?: string[];
  before: number;
  after: number;
  delta: number;
}

function countTokens(text: string): number {
  return encode(text).length;
}

const BALANCED_FILLERS: RegExp[] = [
  /I would be happy to help you with/gi,
  /In order to/gi,
  /Please make sure to/gi,
  /As you can see/gi,
  /Note that/gi,
  /Basically/gi,
  /Actually/gi,
];

const PLACEHOLDER_REGEX = /__([A-Z_]+_\d+)__/;

function lineHasPlaceholder(line: string): boolean {
  return PLACEHOLDER_REGEX.test(line);
}

export function compressProse(prose: string, mode: CompressionMode): string {
  if (mode === "safe") {
    return prose;
  }

  const lines = prose.split("\n");
  const processed = lines.map((line) => {
    if (lineHasPlaceholder(line)) {
      return line;
    }

    let text = line;
    if (mode === "balanced" || mode === "aggressive") {
      for (const filler of BALANCED_FILLERS) {
        text = text.replace(filler, "");
      }
      text = text.replace(/[ \t]+/g, " ").trimEnd();
    }
    return text;
  });

  let result = processed.join("\n");
  result = result.replace(/\n{3,}/g, "\n\n");
  return result;
}

export function compressMarkdownWithValidation(
  content: string,
  mode: CompressionMode,
): { content: string; validation: ReturnType<typeof validate> } {
  const tokenized = tokenizeMarkdown(content);
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

export async function compressFile(
  path: string,
  options: { mode: CompressionMode; dryRun?: boolean },
): Promise<CompressFileResult> {
  const currentContent = await readFile(path, "utf-8");

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

  await createSidecarIfMissing(path);
  await atomicWriteFile(path, compressed);

  return {
    ok: true,
    noop: false,
    before,
    after,
    delta,
  };
}
