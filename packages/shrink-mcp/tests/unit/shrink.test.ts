import { describe, it, expect, vi } from "vitest";
import * as coreModule from "@better-token/core";
import {
  MIN_DESCRIPTION_LENGTH,
  compressDescription,
  shrinkListResponse,
} from "../../src/shrink.js";

const LONG_DESCRIPTION =
  "I would be happy to help you with this tool for debugging purposes and general assistance in your workflow.";

describe("compressDescription", () => {
  it("MCP-01: compresses descriptions at or above MIN_DESCRIPTION_LENGTH", () => {
    expect(LONG_DESCRIPTION.length).toBeGreaterThanOrEqual(MIN_DESCRIPTION_LENGTH);
    const { text, changed } = compressDescription(LONG_DESCRIPTION, "balanced");
    expect(text.length).toBeLessThan(LONG_DESCRIPTION.length);
    expect(changed).toBe(true);
  });

  it("skips descriptions shorter than MIN_DESCRIPTION_LENGTH", () => {
    const short = "a".repeat(MIN_DESCRIPTION_LENGTH - 1);
    const { text, changed } = compressDescription(short, "balanced");
    expect(text).toBe(short);
    expect(changed).toBe(false);
  });

  it("attempts compression at exactly MIN_DESCRIPTION_LENGTH", () => {
    const exact = "a".repeat(MIN_DESCRIPTION_LENGTH);
    expect(exact.length).toBe(MIN_DESCRIPTION_LENGTH);
    const { text } = compressDescription(exact, "balanced");
    expect(text.length).toBeLessThanOrEqual(exact.length);
  });
});

describe("shrinkListResponse", () => {
  const fields = new Set([
    "tools.description",
    "prompts.description",
    "resources.description",
  ]);

  it("MCP-01: shrinks list item descriptions while preserving other fields", () => {
    const message = {
      jsonrpc: "2.0",
      id: 1,
      result: {
        tools: [
          {
            name: "echo",
            description: LONG_DESCRIPTION,
            inputSchema: { type: "object" },
          },
        ],
      },
    };

    const shrunk = shrinkListResponse(message, fields, "balanced");
    const tool = (shrunk.result as { tools: Array<Record<string, unknown>> }).tools[0]!;

    expect(tool.name).toBe("echo");
    expect(tool.inputSchema).toEqual({ type: "object" });
    expect(tool.description).not.toBe(LONG_DESCRIPTION);
    expect(String(tool.description).length).toBeLessThan(LONG_DESCRIPTION.length);
  });

  it("D-07: keeps original description when validator fails", () => {
    const message = {
      jsonrpc: "2.0",
      id: 2,
      result: {
        tools: [
          {
            name: "echo",
            description: LONG_DESCRIPTION,
            inputSchema: { type: "object" },
          },
          {
            name: "other",
            description: LONG_DESCRIPTION,
            inputSchema: { type: "object" },
          },
        ],
      },
    };

    const spy = vi
      .spyOn(coreModule, "compressMarkdownWithValidation")
      .mockImplementation((content: string) => ({
        content,
        validation: {
          ok: false,
          errors: ["forced failure"],
          warnings: [],
        },
      }));

    try {
      const shrunk = shrinkListResponse(message, fields, "balanced");
      const tools = (shrunk.result as { tools: Array<Record<string, unknown>> }).tools;
      expect(tools[0]!.description).toBe(LONG_DESCRIPTION);
      expect(tools[1]!.description).toBe(LONG_DESCRIPTION);
      expect(tools).toHaveLength(2);
    } finally {
      spy.mockRestore();
    }
  });

  it("leaves absent, null, and empty descriptions unchanged", () => {
    const message = {
      jsonrpc: "2.0",
      id: 3,
      result: {
        tools: [
          { name: "no-desc" },
          { name: "null-desc", description: null },
          { name: "empty-desc", description: "" },
        ],
      },
    };

    const shrunk = shrinkListResponse(message, fields, "balanced");
    const tools = (shrunk.result as { tools: Array<Record<string, unknown>> }).tools;

    expect("description" in tools[0]!).toBe(false);
    expect(tools[1]!.description).toBeNull();
    expect(tools[2]!.description).toBe("");
  });
});
