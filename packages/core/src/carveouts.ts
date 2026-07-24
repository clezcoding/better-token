import type { TokenMap } from "./index.js";

export const CARVEOUT_CATEGORIES = [
  "error",
  "commit",
  "security",
  "irreversible",
  "step",
] as const;

export type CarveoutCategory = (typeof CARVEOUT_CATEGORIES)[number];

const ERROR_LINE_REGEX =
  /^\s*(Error|TypeError|ReferenceError|SyntaxError|RangeError|RuntimeError|Warning|FatalError|Exception|panic):\s.*$/gim;
const ERROR_BACKTICK_REGEX = /`(?:Error|TypeError|ReferenceError|SyntaxError|RangeError|RuntimeError|Warning|FatalError|Exception|panic):[^`]+`/g;
const GIT_COMMIT_REGEX = /git commit -m ["'][^"']+["']/g;
const CONVENTIONAL_COMMIT_REGEX =
  /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?:\s.*$/gim;
const SECURITY_LINE_REGEX =
  /^\s*(SECURITY|WARNING|DO NOT|NEVER|ALWAYS|CRITICAL|DANGER|CAUTION)\b.*$/gim;
const IRREVERSIBLE_REGEX =
  /\bconfirm\b|\birreversible\b|\bdestructive\b|--force|\brm -rf\b|\bDROP TABLE\b|\bDELETE FROM\b|git push --force|git reset --hard/gim;
const ORDERED_LIST_REGEX = /^\s*\d+\.\s.*$/gim;

const CATEGORY_PATTERNS: Array<{
  category: CarveoutCategory;
  regex: RegExp;
}> = [
  { category: "error", regex: ERROR_LINE_REGEX },
  { category: "error", regex: ERROR_BACKTICK_REGEX },
  { category: "commit", regex: GIT_COMMIT_REGEX },
  { category: "commit", regex: CONVENTIONAL_COMMIT_REGEX },
  { category: "security", regex: SECURITY_LINE_REGEX },
  { category: "irreversible", regex: IRREVERSIBLE_REGEX },
  { category: "step", regex: ORDERED_LIST_REGEX },
];

function carveoutPlaceholder(
  category: CarveoutCategory,
  index: number,
  nonce?: string,
): string {
  const base = `__CARVEOUT_${category.toUpperCase()}_${index}`;
  return nonce ? `${base}_${nonce}__` : `${base}__`;
}

function protectSectionBody(
  text: string,
  headingRegex: RegExp,
  category: CarveoutCategory,
  tokens: TokenMap,
  counters: Record<CarveoutCategory, number>,
  nonce?: string,
): string {
  const lines = text.split("\n");
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (headingRegex.test(line)) {
      output.push(line);
      i += 1;
      while (i < lines.length && !/^(#{1,6})\s/.test(lines[i] ?? "")) {
        const bodyLine = lines[i] ?? "";
        // Skip lines already protected — re-wrapping breaks single-pass detokenize.
        if (
          /^__CARVEOUT_[A-Z0-9_]+__$/.test(bodyLine) ||
          /^__[A-Z][A-Za-f0-9]*(?:_[A-Za-f0-9]+)*__$/.test(bodyLine)
        ) {
          output.push(bodyLine);
          i += 1;
          continue;
        }
        const placeholder = carveoutPlaceholder(category, counters[category], nonce);
        counters[category] += 1;
        tokens[placeholder] = bodyLine;
        output.push(placeholder);
        i += 1;
      }
      continue;
    }
    output.push(line);
    i += 1;
  }

  return output.join("\n");
}

function protectRegexMatches(
  text: string,
  regex: RegExp,
  category: CarveoutCategory,
  tokens: TokenMap,
  counters: Record<CarveoutCategory, number>,
  nonce?: string,
): string {
  return text.replace(regex, (match) => {
    const placeholder = carveoutPlaceholder(category, counters[category], nonce);
    counters[category] += 1;
    tokens[placeholder] = match;
    return placeholder;
  });
}

export function extractCarveOuts(
  body: string,
  nonce?: string,
): { text: string; tokens: TokenMap } {
  const tokens: TokenMap = {};
  const counters: Record<CarveoutCategory, number> = {
    error: 0,
    commit: 0,
    security: 0,
    irreversible: 0,
    step: 0,
  };

  let text = body;

  // Section bodies first so line/regex carve-outs do not nest inside them.
  text = protectSectionBody(
    text,
    /^##\s+(Security|Security Warning|Warnung)\s*$/i,
    "security",
    tokens,
    counters,
    nonce,
  );
  text = protectSectionBody(
    text,
    /^##\s+(Pull Request|PR)\s*$/i,
    "commit",
    tokens,
    counters,
    nonce,
  );

  for (const { category, regex } of CATEGORY_PATTERNS) {
    regex.lastIndex = 0;
    text = protectRegexMatches(text, regex, category, tokens, counters, nonce);
  }

  return { text, tokens };
}

export function extractCarveoutStrings(body: string): Record<CarveoutCategory, string[]> {
  const { tokens } = extractCarveOuts(body);
  const grouped: Record<CarveoutCategory, string[]> = {
    error: [],
    commit: [],
    security: [],
    irreversible: [],
    step: [],
  };

  for (const [placeholder, value] of Object.entries(tokens)) {
    for (const category of CARVEOUT_CATEGORIES) {
      if (placeholder.startsWith(`__CARVEOUT_${category.toUpperCase()}_`)) {
        grouped[category].push(value);
      }
    }
  }

  return grouped;
}
