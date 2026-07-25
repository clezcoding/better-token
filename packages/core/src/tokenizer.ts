import { randomBytes } from "node:crypto";
import type { TokenMap } from "./index.js";
import { extractCarveOuts } from "./carveouts.js";

const FRONTMATTER_REGEX = /^(---\r?\n[\s\S]*?\r?\n---\r?\n)([\s\S]*)$/;
const FENCE_OPEN_REGEX = /^(\s{0,3})(`{3,}|~{3,})(.*)$/;
const URL_REGEX = /https?:\/\/[^\s)]+/g;
const INLINE_CODE_REGEX = /`[^`\n]+`/g;

/** Linear ATX heading parse — avoids \s+/(.*) space backtracking (CodeQL #3/#6). */
function matchHeadingLine(line: string): [hashes: string, title: string] | null {
  let i = 0;
  while (i < line.length && i < 6 && line[i] === "#") {
    i += 1;
  }
  if (i === 0) {
    return null;
  }
  if (i >= line.length || (line[i] !== " " && line[i] !== "\t")) {
    return null;
  }
  const hashes = line.slice(0, i);
  while (i < line.length && (line[i] === " " || line[i] === "\t")) {
    i += 1;
  }
  return [hashes, line.slice(i)];
}

function isPathSegmentChar(c: string): boolean {
  return (
    (c >= "a" && c <= "z") ||
    (c >= "A" && c <= "Z") ||
    (c >= "0" && c <= "9") ||
    c === "_" ||
    c === "." ||
    c === "-"
  );
}

function isPathSeparator(c: string): boolean {
  return c === "/" || c === "\\";
}

function isWordChar(c: string): boolean {
  return (
    (c >= "a" && c <= "z") ||
    (c >= "A" && c <= "Z") ||
    (c >= "0" && c <= "9") ||
    c === "_"
  );
}

/**
 * Linear path match at index — no regex (CodeQL #4/#5 ReDoS on path patterns).
 * Mirrors prior semantics: prefixed paths (./ ../ / X:\) or relative with ≥1 separator.
 */
function matchPathAt(text: string, start: number): number {
  let i = start;
  let prefixed = false;

  if (text.startsWith("./", i)) {
    i += 2;
    prefixed = true;
  } else if (text.startsWith("../", i)) {
    i += 3;
    prefixed = true;
  } else if (text[i] === "/") {
    i += 1;
    prefixed = true;
  } else if (
    i + 2 < text.length &&
    ((text[i]! >= "A" && text[i]! <= "Z") || (text[i]! >= "a" && text[i]! <= "z")) &&
    text[i + 1] === ":" &&
    text[i + 2] === "\\"
  ) {
    i += 3;
    prefixed = true;
  }

  if (prefixed) {
    if (i >= text.length || !isPathSegmentChar(text[i]!)) {
      return -1;
    }
    while (i < text.length && isPathSegmentChar(text[i]!)) {
      i += 1;
    }
    while (
      i < text.length &&
      isPathSeparator(text[i]!) &&
      i + 1 < text.length &&
      isPathSegmentChar(text[i + 1]!)
    ) {
      i += 1;
      while (i < text.length && isPathSegmentChar(text[i]!)) {
        i += 1;
      }
    }
    // Former \b: reject if next char continues a word token.
    if (i < text.length && isWordChar(text[i]!)) {
      return -1;
    }
    return i;
  }

  // Relative: segment (sep segment)+
  if (!isPathSegmentChar(text[i]!)) {
    return -1;
  }
  let j = i;
  while (j < text.length && isPathSegmentChar(text[j]!)) {
    j += 1;
  }
  let sepCount = 0;
  while (
    j < text.length &&
    isPathSeparator(text[j]!) &&
    j + 1 < text.length &&
    isPathSegmentChar(text[j + 1]!)
  ) {
    sepCount += 1;
    j += 1;
    while (j < text.length && isPathSegmentChar(text[j]!)) {
      j += 1;
    }
  }
  return sepCount > 0 ? j : -1;
}

function findPathSpans(text: string): Array<{ start: number; end: number }> {
  const spans: Array<{ start: number; end: number }> = [];
  let i = 0;
  while (i < text.length) {
    const end = matchPathAt(text, i);
    if (end > i) {
      spans.push({ start: i, end });
      i = end;
    } else {
      i += 1;
    }
  }
  return spans;
}

function makeNonce(): string {
  return randomBytes(8).toString("hex");
}

function makePlaceholder(prefix: string, index: number, nonce: string): string {
  return `__${prefix}_${index}_${nonce}__`;
}

export function splitFrontmatter(content: string): { frontmatter: string; body: string } {
  const match = FRONTMATTER_REGEX.exec(content);
  if (match) {
    return { frontmatter: match[1], body: match[2] };
  }
  return { frontmatter: "", body: content };
}

export function extractCodeBlocks(text: string): string[] {
  const blocks: string[] = [];
  const lines = text.split("\n");
  let i = 0;

  while (i < lines.length) {
    const openMatch = FENCE_OPEN_REGEX.exec(lines[i] ?? "");
    if (!openMatch) {
      i += 1;
      continue;
    }

    const fenceChar = openMatch[2][0];
    const fenceLen = openMatch[2].length;
    const blockLines = [lines[i] ?? ""];
    i += 1;

    while (i < lines.length) {
      const closeMatch = FENCE_OPEN_REGEX.exec(lines[i] ?? "");
      if (
        closeMatch &&
        closeMatch[2][0] === fenceChar &&
        closeMatch[2].length >= fenceLen &&
        closeMatch[3].trim() === ""
      ) {
        blockLines.push(lines[i] ?? "");
        i += 1;
        break;
      }
      blockLines.push(lines[i] ?? "");
      i += 1;
    }

    // Fail closed: unclosed fences are protected through EOF.
    blocks.push(blockLines.join("\n"));
  }

  return blocks;
}

export function extractHeadings(text: string): Array<[string, string]> {
  const headings: Array<[string, string]> = [];
  for (const line of text.split("\n")) {
    const match = matchHeadingLine(line);
    if (match) {
      headings.push(match);
    }
  }
  return headings;
}

export function extractUrls(text: string): string[] {
  return [...text.matchAll(URL_REGEX)].map((m) => m[0]);
}

export function extractPaths(text: string): string[] {
  return findPathSpans(text).map(({ start, end }) => text.slice(start, end));
}

export function extractInlineCodes(text: string): string[] {
  // Strip full fenced regions (not just fence marker lines) so backticks
  // inside code blocks are not counted as inline code.
  const blocks = extractCodeBlocks(text);
  let withoutFences = "";
  let cursor = 0;
  for (const block of blocks) {
    const idx = text.indexOf(block, cursor);
    if (idx === -1) {
      continue;
    }
    withoutFences += text.slice(cursor, idx);
    cursor = idx + block.length;
  }
  withoutFences += text.slice(cursor);
  return [...withoutFences.matchAll(INLINE_CODE_REGEX)].map((m) => m[0]);
}

function protectMatches(
  text: string,
  regex: RegExp,
  prefix: string,
  tokens: TokenMap,
  counter: { value: number },
  nonce: string,
): string {
  return text.replace(regex, (match) => {
    const placeholder = makePlaceholder(prefix, counter.value, nonce);
    counter.value += 1;
    tokens[placeholder] = match;
    return placeholder;
  });
}

function protectPaths(
  text: string,
  tokens: TokenMap,
  counter: { value: number },
  nonce: string,
): string {
  const spans = findPathSpans(text);
  if (spans.length === 0) {
    return text;
  }
  let result = "";
  let cursor = 0;
  for (const { start, end } of spans) {
    result += text.slice(cursor, start);
    const match = text.slice(start, end);
    const placeholder = makePlaceholder("PATH", counter.value, nonce);
    counter.value += 1;
    tokens[placeholder] = match;
    result += placeholder;
    cursor = end;
  }
  result += text.slice(cursor);
  return result;
}

function protectCodeBlocks(
  text: string,
  tokens: TokenMap,
  counter: { value: number },
  nonce: string,
): string {
  const blocks = extractCodeBlocks(text);
  if (blocks.length === 0) {
    return text;
  }

  // Walk by offset so identical fence contents each get their own placeholder.
  let result = "";
  let cursor = 0;
  for (const block of blocks) {
    const idx = text.indexOf(block, cursor);
    if (idx === -1) {
      continue;
    }
    result += text.slice(cursor, idx);
    const placeholder = makePlaceholder("CODE_BLOCK", counter.value, nonce);
    counter.value += 1;
    tokens[placeholder] = block;
    result += placeholder;
    cursor = idx + block.length;
  }
  result += text.slice(cursor);
  return result;
}

function protectHeadings(
  text: string,
  tokens: TokenMap,
  counter: { value: number },
  nonce: string,
): string {
  return text
    .split("\n")
    .map((line) => {
      const match = matchHeadingLine(line);
      if (!match) return line;
      const placeholder = makePlaceholder("HEADING", counter.value, nonce);
      counter.value += 1;
      tokens[placeholder] = match[1];
      return `${match[0]} ${placeholder}`;
    })
    .join("\n");
}

export function tokenizeMarkdown(content: string): { text: string; tokens: TokenMap } {
  const tokens: TokenMap = {};
  const counter = { value: 0 };
  const nonce = makeNonce();
  const { frontmatter, body } = splitFrontmatter(content);

  let bodyText = body;
  bodyText = protectCodeBlocks(bodyText, tokens, counter, nonce);
  bodyText = protectMatches(bodyText, INLINE_CODE_REGEX, "INLINE_CODE", tokens, counter, nonce);
  bodyText = protectMatches(bodyText, URL_REGEX, "URL", tokens, counter, nonce);
  bodyText = protectPaths(bodyText, tokens, counter, nonce);
  bodyText = protectHeadings(bodyText, tokens, counter, nonce);

  const carved = extractCarveOuts(bodyText, nonce);
  bodyText = carved.text;
  Object.assign(tokens, carved.tokens);

  let text = bodyText;
  if (frontmatter) {
    const placeholder = makePlaceholder("FRONTMATTER", counter.value, nonce);
    counter.value += 1;
    tokens[placeholder] = frontmatter;
    text = placeholder + text;
  }

  return { text, tokens };
}

export function detokenizeMarkdown(text: string, tokens: TokenMap): string {
  const placeholders = Object.keys(tokens);
  if (placeholders.length === 0) {
    return text;
  }

  // Longest-first exact match avoids partial key collisions between placeholders.
  const escaped = placeholders
    .sort((a, b) => b.length - a.length)
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(escaped.join("|"), "g");
  return text.replace(re, (match) => tokens[match] ?? match);
}

export function extractProtectedRegions(content: string): TokenMap {
  return tokenizeMarkdown(content).tokens;
}
