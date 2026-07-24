import type { TokenMap } from "./index.js";
import { extractCarveOuts } from "./carveouts.js";

const FRONTMATTER_REGEX = /^(---\r?\n[\s\S]*?\r?\n---\r?\n)([\s\S]*)$/;
const FENCE_OPEN_REGEX = /^(\s{0,3})(`{3,}|~{3,})(.*)$/;
const HEADING_REGEX = /^(#{1,6})\s+(.*)$/;
const URL_REGEX = /https?:\/\/[^\s)]+/g;
const INLINE_CODE_REGEX = /`[^`\n]+`/g;
const PATH_REGEX =
  /(?:\.\/|\.\.\/|\/|[A-Za-z]:\\)[\w\-/\\.]+\b|[\w\-.]+[/\\][\w\-/\\.]+/g;

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
    let closed = false;

    while (i < lines.length) {
      const closeMatch = FENCE_OPEN_REGEX.exec(lines[i] ?? "");
      if (
        closeMatch &&
        closeMatch[2][0] === fenceChar &&
        closeMatch[2].length >= fenceLen &&
        closeMatch[3].trim() === ""
      ) {
        blockLines.push(lines[i] ?? "");
        closed = true;
        i += 1;
        break;
      }
      blockLines.push(lines[i] ?? "");
      i += 1;
    }

    if (closed) {
      blocks.push(blockLines.join("\n"));
    }
  }

  return blocks;
}

export function extractHeadings(text: string): Array<[string, string]> {
  const headings: Array<[string, string]> = [];
  for (const line of text.split("\n")) {
    const match = HEADING_REGEX.exec(line);
    if (match) {
      headings.push([match[1], match[2]]);
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
  const withoutFences = text
    .split("\n")
    .filter((line) => !FENCE_OPEN_REGEX.test(line))
    .join("\n");
  return [...withoutFences.matchAll(INLINE_CODE_REGEX)].map((m) => m[0]);
}

function protectMatches(
  text: string,
  regex: RegExp,
  prefix: string,
  tokens: TokenMap,
  counter: { value: number },
): string {
  return text.replace(regex, (match) => {
    const placeholder = `__${prefix}_${counter.value}__`;
    counter.value += 1;
    tokens[placeholder] = match;
    return placeholder;
  });
}

function protectCodeBlocks(text: string, tokens: TokenMap, counter: { value: number }): string {
  const blocks = extractCodeBlocks(text);
  let result = text;
  for (const block of blocks) {
    const placeholder = `__CODE_BLOCK_${counter.value}__`;
    counter.value += 1;
    tokens[placeholder] = block;
    result = result.replace(block, placeholder);
  }
  return result;
}

function protectHeadings(text: string, tokens: TokenMap, counter: { value: number }): string {
  return text
    .split("\n")
    .map((line) => {
      const match = HEADING_REGEX.exec(line);
      if (!match) return line;
      const placeholder = `__HEADING_${counter.value}__`;
      counter.value += 1;
      tokens[placeholder] = match[2];
      return `${match[1]} ${placeholder}`;
    })
    .join("\n");
}

export function tokenizeMarkdown(content: string): { text: string; tokens: TokenMap } {
  const tokens: TokenMap = {};
  const counter = { value: 0 };
  const { frontmatter, body } = splitFrontmatter(content);

  let bodyText = body;
  bodyText = protectCodeBlocks(bodyText, tokens, counter);
  bodyText = protectMatches(bodyText, INLINE_CODE_REGEX, "INLINE_CODE", tokens, counter);
  bodyText = protectMatches(bodyText, URL_REGEX, "URL", tokens, counter);
  bodyText = protectMatches(bodyText, PATH_REGEX, "PATH", tokens, counter);
  bodyText = protectHeadings(bodyText, tokens, counter);

  const carved = extractCarveOuts(bodyText);
  bodyText = carved.text;
  Object.assign(tokens, carved.tokens);

  let text = bodyText;
  if (frontmatter) {
    const placeholder = `__FRONTMATTER_${counter.value}__`;
    counter.value += 1;
    tokens[placeholder] = frontmatter;
    text = placeholder + text;
  }

  return { text, tokens };
}

export function detokenizeMarkdown(text: string, tokens: TokenMap): string {
  let result = text;
  for (const [placeholder, original] of Object.entries(tokens)) {
    result = result.split(placeholder).join(original);
  }
  return result;
}

export function extractProtectedRegions(content: string): TokenMap {
  return tokenizeMarkdown(content).tokens;
}
