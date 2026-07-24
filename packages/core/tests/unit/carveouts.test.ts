import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractCarveOuts,
  CARVEOUT_CATEGORIES,
} from "../../src/carveouts.js";
import { detokenizeMarkdown } from "../../src/tokenizer.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(__dirname, "../fixtures/sample-claude.md");

describe("Carve-outs", () => {
  it.each(CARVEOUT_CATEGORIES)("extracts %s category with placeholder shape", (category) => {
    const samples: Record<(typeof CARVEOUT_CATEGORIES)[number], string> = {
      error: "Error: disk full",
      commit: 'git commit -m "feat: add tests"',
      security: "CRITICAL: do not commit secrets",
      irreversible: "Type confirm before git push --force",
      step: "1. Run the migration",
    };

    const { text, tokens } = extractCarveOuts(samples[category]);
    const placeholders = Object.keys(tokens).filter((key) =>
      key.startsWith(`__CARVEOUT_${category.toUpperCase()}_`),
    );

    expect(placeholders.length).toBeGreaterThan(0);
    expect(text).not.toContain(samples[category]);
    for (const placeholder of placeholders) {
      const restored = detokenizeMarkdown(text, tokens);
      expect(restored).toContain(tokens[placeholder] ?? "");
    }
  });

  it("extracts all five categories from multi-category fixture", () => {
    const input = readFileSync(fixturePath, "utf-8");
    const body = input.replace(/^---[\s\S]*?---\r?\n/, "");
    const { tokens } = extractCarveOuts(body);

    for (const category of CARVEOUT_CATEGORIES) {
      const matches = Object.keys(tokens).filter((key) =>
        key.startsWith(`__CARVEOUT_${category.toUpperCase()}_`),
      );
      expect(matches.length).toBeGreaterThan(0);
    }
  });
});
