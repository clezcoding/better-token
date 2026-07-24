import type { CompressionMode } from "./index.js";
import { validate } from "./validator.js";
import { detokenizeMarkdown, tokenizeMarkdown } from "./tokenizer.js";

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
