import type { CompressionMode, ValidationResult } from "./index.js";
import { compressProse } from "./compressor.js";
import { detokenizeMarkdown, splitFrontmatter, tokenizeMarkdown } from "./tokenizer.js";
import {
  extractCodeBlocks,
  extractHeadings,
  extractInlineCodes,
  extractPaths,
  extractUrls,
} from "./tokenizer.js";

export function validate(original: string, compressed: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const origParts = splitFrontmatter(original);
  const compParts = splitFrontmatter(compressed);

  if (origParts.frontmatter !== compParts.frontmatter) {
    errors.push("Frontmatter not preserved exactly");
  }

  const origBody = origParts.body;
  const compBody = compParts.body;

  const origCode = extractCodeBlocks(origBody);
  const compCode = extractCodeBlocks(compBody);
  if (JSON.stringify(origCode) !== JSON.stringify(compCode)) {
    errors.push("Code blocks not preserved exactly");
  }

  const origInline = extractInlineCodes(origBody).sort();
  const compInline = extractInlineCodes(compBody).sort();
  if (JSON.stringify(origInline) !== JSON.stringify(compInline)) {
    errors.push(`Inline code mismatch: orig=${origInline.length}, comp=${compInline.length}`);
  }

  const origUrls = extractUrls(origBody).sort();
  const compUrls = extractUrls(compBody).sort();
  if (JSON.stringify(origUrls) !== JSON.stringify(compUrls)) {
    errors.push(`URL mismatch: lost=${origUrls.filter((u) => !compUrls.includes(u)).join(",")}`);
  }

  const origPaths = extractPaths(origBody).sort();
  const compPaths = extractPaths(compBody).sort();
  if (JSON.stringify(origPaths) !== JSON.stringify(compPaths)) {
    errors.push(`Path mismatch: lost=${origPaths.filter((p) => !compPaths.includes(p)).join(",")}`);
  }

  const origHeadings = extractHeadings(origBody);
  const compHeadings = extractHeadings(compBody);
  if (JSON.stringify(origHeadings) !== JSON.stringify(compHeadings)) {
    errors.push("Heading sequence or text changed");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}
