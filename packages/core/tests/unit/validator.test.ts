import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "../../src/validator.js";
import { compressMarkdown } from "../../src/compressor.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(__dirname, "../fixtures/sample-claude.md");

describe("Validator", () => {
  it("SAFE-01: passes on valid compression", () => {
    const original = readFileSync(fixturePath, "utf-8");
    const compressed = compressMarkdown(original, "balanced");
    const result = validate(original, compressed);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("SAFE-01: fails when code block is mutated", () => {
    const original = "```ts\nconst a = 1;\n```";
    const compressed = "```ts\nconst a = 2;\n```";
    const result = validate(original, compressed);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("Code blocks"))).toBe(true);
  });

  it("SAFE-01: fails when URL is mutated", () => {
    const original = "See https://example.com/docs for details.";
    const compressed = "See https://evil.com/docs for details.";
    const result = validate(original, compressed);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("URL"))).toBe(true);
  });

  it("SAFE-01: fails when path is mutated", () => {
    const original = "Edit ./src/index.ts carefully.";
    const compressed = "Edit ./src/other.ts carefully.";
    const result = validate(original, compressed);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("Path"))).toBe(true);
  });

  it("SAFE-01: fails when heading text is mutated", () => {
    const original = "# Project Rules\n\nBody.";
    const compressed = "# Changed Rules\n\nBody.";
    const result = validate(original, compressed);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("Heading"))).toBe(true);
  });

  it("SAFE-01: fails when carve-out line is mutated", () => {
    const original = "Error: something went wrong";
    const compressed = "Error: something else happened";
    const result = validate(original, compressed);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("Carve-out mismatch (error)"))).toBe(true);
  });

  it("SAFE-02: fails when numbered step is mutated", () => {
    const original = "1. First step\n2. Second step";
    const compressed = "1. First step\n2. Changed step";
    const result = validate(original, compressed);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("Carve-out mismatch (step)"))).toBe(true);
  });
});
