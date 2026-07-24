import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { compressMarkdown, compressProse } from "../../src/compressor.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(__dirname, "../fixtures/sample-claude.md");

describe("Compressor", () => {
  it("COMP-01: compressMarkdown is deterministic", () => {
    const input = readFileSync(fixturePath, "utf-8");
    const first = compressMarkdown(input, "balanced");
    const second = compressMarkdown(input, "balanced");
    expect(first).toBe(second);
  });

  it("COMP-02: balanced mode shortens filler phrases", () => {
    const input = "Please make sure to read this. Basically, it matters.";
    const output = compressProse(input, "balanced");
    expect(output).not.toContain("Please make sure to");
    expect(output).not.toContain("Basically");
    expect(output.length).toBeLessThan(input.length);
  });

  it("SAFE-03: German content is not translated", () => {
    const german =
      "Bitte beachten Sie, dass diese Regel wichtig ist.\n\nGrundsätzlich gilt: keine Übersetzung.";
    const output = compressMarkdown(german, "balanced");
    expect(output).toContain("Bitte beachten");
    expect(output).toContain("Grundsätzlich");
    expect(output).not.toMatch(/\bPlease\b/);
  });

  it("SAFE-02: carve-out lines survive balanced compression", () => {
    const input = readFileSync(fixturePath, "utf-8");
    const output = compressMarkdown(input, "balanced");
    expect(output).toContain("Error: something went wrong");
    expect(output).toContain('git commit -m "feat(core): add compression engine"');
    expect(output).toContain("WARNING: never expose API keys");
    expect(output).toContain("confirm");
    expect(output).toMatch(/1\. First step/);
    expect(output).toMatch(/2\. Second step/);
    expect(output).toMatch(/3\. Third step/);
  });

  it("COMP-02 placeholder: aggressive must not invent abbreviations (Plan 03)", () => {
    const input = "configuration management database";
    const output = compressProse(input, "aggressive");
    const inputTokens = new Set(input.split(/\s+/));
    for (const token of output.split(/\s+/)) {
      if (token.length <= 2) continue;
      expect(inputTokens.has(token.replace(/[.,]/g, "")) || input.includes(token)).toBe(true);
    }
  });
});
