import type { ValidationResult } from "./index.js";
import { CARVEOUT_CATEGORIES, extractCarveoutStrings } from "./carveouts.js";
import {
  extractCodeBlocks,
  extractHeadings,
  extractInlineCodes,
  extractPaths,
  extractUrls,
  splitFrontmatter,
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

  const origInline = extractInlineCodes(origBody);
  const compInline = extractInlineCodes(compBody);
  if (JSON.stringify(origInline) !== JSON.stringify(compInline)) {
    errors.push(`Inline code mismatch: orig=${origInline.length}, comp=${compInline.length}`);
  }

  const origUrls = extractUrls(origBody);
  const compUrls = extractUrls(compBody);
  if (JSON.stringify(origUrls) !== JSON.stringify(compUrls)) {
    errors.push(`URL mismatch: lost=${origUrls.filter((u) => !compUrls.includes(u)).join(",")}`);
  }

  const origPaths = extractPaths(origBody);
  const compPaths = extractPaths(compBody);
  if (JSON.stringify(origPaths) !== JSON.stringify(compPaths)) {
    errors.push(`Path mismatch: lost=${origPaths.filter((p) => !compPaths.includes(p)).join(",")}`);
  }

  const origHeadings = extractHeadings(origBody);
  const compHeadings = extractHeadings(compBody);
  if (JSON.stringify(origHeadings) !== JSON.stringify(compHeadings)) {
    errors.push("Heading sequence or text changed");
  }

  const origCarveouts = extractCarveoutStrings(origBody);
  const compCarveouts = extractCarveoutStrings(compBody);
  for (const category of CARVEOUT_CATEGORIES) {
    if (JSON.stringify(origCarveouts[category]) !== JSON.stringify(compCarveouts[category])) {
      errors.push(
        `Carve-out mismatch (${category}): lost=${origCarveouts[category].filter((v) => !compCarveouts[category].includes(v)).join("|")}`,
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}
