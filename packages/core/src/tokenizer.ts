import { randomBytes } from "node:crypto";
import type { TokenMap } from "./index.js";
import { extractCarveOuts } from "./carveouts.js";

const FRONTMATTER_REGEX = /^(---\r?\n[\s\S]*?\r?\n---\r?\n)([\s\S]*)$/;
const FENCE_OPEN_REGEX = /^(\s{0,3})(`{3,}|~{3,})(.*)$/;
const URL_REGEX = /https?:\/\/[^\s)]+/g;
const INLINE_CODE_REGEX = /`[^`\n]+`/g;
// Segment + separator form avoids polynomial backtracking on '/' and '-'
// (CodeQL js/polynomial-redos: old [\w\-/\\.]+ overlapped separators).
const PATH_REGEX =
  /(?:\.\/|\.\.\/|\/|[A-Za-z]:\\)[\w.-]+(?:[\/\\][\w.-]+)*\b|[\w.-]+(?:[\/\\][\w.-]+)+/g;

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
  return [...text.matchAll(PATH_REGEX)].map((m) => m[0]);
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
  bodyText = protectMatches(bodyText, PATH_REGEX, "PATH", tokens, counter, nonce);
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
