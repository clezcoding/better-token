import type { TokenMap } from "./index.js";

export function tokenizeMarkdown(content: string): { text: string; tokens: TokenMap } {
  return { text: content, tokens: {} };
}

export function detokenizeMarkdown(text: string, _tokens: TokenMap): string {
  return text;
}

export function extractProtectedRegions(content: string): TokenMap {
  const { tokens } = tokenizeMarkdown(content);
  return tokens;
}
