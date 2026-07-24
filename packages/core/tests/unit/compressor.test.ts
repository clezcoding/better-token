import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  compressMarkdown,
  compressMarkdownWithValidation,
  compressProse,
} from "../../src/compressor.js";
import { extractHeadings, splitFrontmatter } from "../../src/tokenizer.js";
import * as validatorModule from "../../src/validator.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(__dirname, "../fixtures/sample-claude.md");

function outputTokensSubsetOfInput(input: string, output: string): void {
  const stripProtected = (text: string) =>
    text.replace(/__[A-Z_]+_\d+__/g, " ").replace(/`[^`\n]+`/g, " ");
  const inputTokens = new Set(
    stripProtected(input)
      .split(/\s+/)
      .map((t) => t.replace(/[.,;:!?()[\]{}"']/g, ""))
      .filter((t) => t.length > 2),
  );
  for (const token of stripProtected(output).split(/\s+/)) {
    const cleaned = token.replace(/[.,;:!?()[\]{}"']/g, "");
    if (cleaned.length <= 2) continue;
    expect(inputTokens.has(cleaned)).toBe(true);
  }
}

function headingsEqual(input: string, output: string): void {
  const origBody = splitFrontmatter(input).body;
  const compBody = splitFrontmatter(output).body;
  expect(extractHeadings(compBody)).toEqual(extractHeadings(origBody));
}

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

  it("COMP-02: safe mode only trims whitespace and tiny fillers", () => {
    const input = "Basically, Actually, Simply, keep semantic rules intact.";
    const output = compressProse(input, "safe");
    expect(output).not.toContain("Basically,");
    expect(output).not.toContain("Actually,");
    expect(output).toContain("keep semantic rules intact");
  });

  it("COMP-02: all three modes are deterministic on fixture", () => {
    const input = readFileSync(fixturePath, "utf-8");
    for (const mode of ["safe", "balanced", "aggressive"] as const) {
      const first = compressMarkdown(input, mode);
      const second = compressMarkdown(input, mode);
      expect(first).toBe(second);
    }
  });

  it("COMP-02: validator runs for safe, balanced, aggressive", () => {
    const input = readFileSync(fixturePath, "utf-8");
    for (const mode of ["safe", "balanced", "aggressive"] as const) {
      const { validation } = compressMarkdownWithValidation(input, mode);
      expect(validation.ok).toBe(true);
    }
  });

  it("COMP-02: heading text unchanged in all modes", () => {
    const input = readFileSync(fixturePath, "utf-8");
    for (const mode of ["safe", "balanced", "aggressive"] as const) {
      const output = compressMarkdown(input, mode);
      headingsEqual(input, output);
    }
  });

  it("COMP-02: aggressive does not invent new tokens", () => {
    const input = readFileSync(fixturePath, "utf-8");
    const output = compressMarkdown(input, "aggressive");
    outputTokensSubsetOfInput(input, output);
  });

  it("COMP-02: aggressive compacts adjacent bullets without new abbreviations", () => {
    const input = "- first item\n- second item\n\nParagraph one.\n\nParagraph two.";
    const output = compressProse(input, "aggressive");
    expect(output).toContain("- first item; second item");
    outputTokensSubsetOfInput(input, output);
  });

  it("COMP-02: empty input stays empty in all modes", () => {
    for (const mode of ["safe", "balanced", "aggressive"] as const) {
      expect(compressMarkdown("", mode)).toBe("");
    }
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

  it("SAFE-01: safe mode returns original when validator fails", () => {
    const input = readFileSync(fixturePath, "utf-8");
    const spy = vi.spyOn(validatorModule, "validate").mockReturnValue({
      ok: false,
      errors: ["Heading sequence or text changed"],
      warnings: [],
    });
    try {
      const { content, validation } = compressMarkdownWithValidation(input, "safe");
      expect(validation.ok).toBe(false);
      expect(content).toBe(input);
    } finally {
      spy.mockRestore();
    }
  });

  it("SAFE-01: balanced mode returns original when validator fails", () => {
    const input = readFileSync(fixturePath, "utf-8");
    const spy = vi.spyOn(validatorModule, "validate").mockReturnValue({
      ok: false,
      errors: ["Code blocks not preserved exactly"],
      warnings: [],
    });
    try {
      const { content, validation } = compressMarkdownWithValidation(input, "balanced");
      expect(validation.ok).toBe(false);
      expect(content).toBe(input);
    } finally {
      spy.mockRestore();
    }
  });

  it("SAFE-01: aggressive mode returns original when validator fails", () => {
    const input = readFileSync(fixturePath, "utf-8");
    const spy = vi.spyOn(validatorModule, "validate").mockReturnValue({
      ok: false,
      errors: ["Carve-out mismatch"],
      warnings: [],
    });
    try {
      const { content, validation } = compressMarkdownWithValidation(input, "aggressive");
      expect(validation.ok).toBe(false);
      expect(content).toBe(input);
    } finally {
      spy.mockRestore();
    }
  });

  it("SAFE-03: German content is not translated in balanced mode", () => {
    const german =
      "Bitte beachten Sie, dass diese Regel wichtig ist.\n\nGrundsätzlich gilt: keine Übersetzung.";
    const output = compressMarkdown(german, "balanced");
    expect(output).toContain("Bitte beachten");
    expect(output).toContain("Grundsätzlich");
    expect(output).not.toMatch(/\bPlease\b/);
  });

  it("SAFE-03: German content is not translated in safe mode", () => {
    const german =
      "Bitte beachten Sie, dass diese Regel wichtig ist.\n\nGrundsätzlich gilt: keine Übersetzung.";
    const output = compressMarkdown(german, "safe");
    expect(output).toContain("Bitte beachten");
    expect(output).toContain("Grundsätzlich");
  });

  it("SAFE-03: German content is not translated in aggressive mode", () => {
    const german =
      "Bitte beachten Sie, dass diese Regel wichtig ist.\n\nGrundsätzlich gilt: keine Übersetzung.";
    const output = compressMarkdown(german, "aggressive");
    expect(output).toContain("Bitte beachten");
    expect(output).toContain("Grundsätzlich");
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
});
