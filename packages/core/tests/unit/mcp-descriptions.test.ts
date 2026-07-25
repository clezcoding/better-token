import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { compressMarkdownWithValidation } from "../../src/compressor.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(
  __dirname,
  "../fixtures/filesystem-tools-descriptions.json",
);

interface ToolDescription {
  name: string;
  description: string;
}

function loadFilesystemCorpus(): ToolDescription[] {
  return JSON.parse(readFileSync(fixturePath, "utf-8")) as ToolDescription[];
}

export function sumDescriptionChars(descriptions: string[]): number {
  return descriptions.reduce((sum, d) => sum + d.length, 0);
}

describe("G-02-2: filesystem MCP description corpus", () => {
  it("balanced mode shrinks corpus ≥8% with ≥8 tools changed and all validation ok", () => {
    const corpus = loadFilesystemCorpus();
    expect(corpus).toHaveLength(14);

    const beforeChars = sumDescriptionChars(
      corpus.map((t) => t.description),
    );
    expect(beforeChars).toBeGreaterThanOrEqual(4000);

    let afterChars = 0;
    let toolsChanged = 0;

    for (const tool of corpus) {
      const { content, validation } = compressMarkdownWithValidation(
        tool.description,
        "balanced",
      );
      expect(validation.ok).toBe(true);
      afterChars += content.length;
      if (content !== tool.description) {
        toolsChanged += 1;
      }
    }

    const savingsPct = ((beforeChars - afterChars) / beforeChars) * 100;
    expect(afterChars).toBeLessThan(beforeChars);
    expect(savingsPct).toBeGreaterThanOrEqual(8);
    expect(toolsChanged).toBeGreaterThanOrEqual(8);
  });
});
