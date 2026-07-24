import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  tokenizeMarkdown,
  detokenizeMarkdown,
  splitFrontmatter,
  extractCodeBlocks,
} from "../../src/tokenizer.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(__dirname, "../fixtures/sample-claude.md");

describe("Markdown Tokenizer", () => {
  it("SAFE-02: round-trips fixture byte-for-byte including carve-outs", () => {
    const input = readFileSync(fixturePath, "utf-8");
    const { text, tokens } = tokenizeMarkdown(input);
    const restored = detokenizeMarkdown(text, tokens);
    expect(restored).toBe(input);
  });

  it("SAFE-02: preserves YAML frontmatter", () => {
    const input = "---\ntitle: test\n---\n\nBody text.";
    const { frontmatter, body } = splitFrontmatter(input);
    expect(frontmatter).toBe("---\ntitle: test\n---\n");
    expect(body).toBe("\nBody text.");

    const { text, tokens } = tokenizeMarkdown(input);
    expect(text).toMatch(/^__FRONTMATTER_0_[a-f0-9]{16}__/);
    const restored = detokenizeMarkdown(text, tokens);
    expect(restored).toBe(input);
  });

  it("SAFE-02: handles nested 4-backtick code block", () => {
    const nested = "````markdown\n```ts\nconst x = 1;\n```\n````";
    const blocks = extractCodeBlocks(nested);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toBe(nested);

    const { text, tokens } = tokenizeMarkdown(`Before\n\n${nested}\n\nAfter`);
    const restored = detokenizeMarkdown(text, tokens);
    expect(restored).toContain(nested);
  });
});
