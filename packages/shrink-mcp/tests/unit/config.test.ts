import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseProxyConfig, parseShrinkFields } from "../../src/config.js";

const DEFAULT_FIELDS = [
  "tools.description",
  "prompts.description",
  "resources.description",
] as const;

const INVALID_FIELDS_WARNING =
  "better-token proxy: invalid BETTER_TOKEN_SHRINK_FIELDS; using defaults";

function captureStderr(): { writes: string[]; restore: () => void } {
  const writes: string[] = [];
  const spy = vi
    .spyOn(process.stderr, "write")
    .mockImplementation((chunk: string | Uint8Array) => {
      writes.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
      return true;
    });
  return {
    writes,
    restore: () => spy.mockRestore(),
  };
}

describe("parseShrinkFields", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("MCP-04: tools.description only yields single-field allowlist", () => {
    const fields = parseShrinkFields("tools.description");
    expect(fields.size).toBe(1);
    expect(fields.has("tools.description")).toBe(true);
    expect(fields.has("prompts.description")).toBe(false);
    expect(fields.has("resources.description")).toBe(false);
  });

  it("D-12: mixed valid+invalid falls back to full D-09 defaults via parseShrinkFields", () => {
    const { writes, restore } = captureStderr();
    try {
      const fields = parseShrinkFields("tools.description,garbage");
      expect(fields).toEqual(new Set(DEFAULT_FIELDS));
      expect(writes.join("")).toContain(INVALID_FIELDS_WARNING);
    } finally {
      restore();
    }
  });
});

describe("parseProxyConfig", () => {
  const baseInput = {
    upstreamCmd: "mock-server",
    upstreamArgs: [] as string[],
  };

  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("MCP-04: BETTER_TOKEN_SHRINK_FIELDS=tools.description yields single-field set", () => {
    vi.stubEnv("BETTER_TOKEN_SHRINK_FIELDS", "tools.description");
    const config = parseProxyConfig(baseInput);
    expect(config.shrinkFields.size).toBe(1);
    expect(config.shrinkFields.has("tools.description")).toBe(true);
    expect(config.shrinkFields.has("prompts.description")).toBe(false);
    expect(config.shrinkFields.has("resources.description")).toBe(false);
  });

  it("D-12: unknown token warns once and returns full D-09 defaults", () => {
    vi.stubEnv("BETTER_TOKEN_SHRINK_FIELDS", "tools.name");
    const { writes, restore } = captureStderr();
    try {
      const config = parseProxyConfig(baseInput);
      expect(config.shrinkFields).toEqual(new Set(DEFAULT_FIELDS));
      expect(writes.join("")).toContain(INVALID_FIELDS_WARNING);
      expect(writes.filter((w) => w.includes(INVALID_FIELDS_WARNING)).length).toBe(1);
    } finally {
      restore();
    }
  });

  it("D-12: pure garbage warns once and returns full D-09 defaults", () => {
    vi.stubEnv("BETTER_TOKEN_SHRINK_FIELDS", "not-a-valid-field");
    const { writes, restore } = captureStderr();
    try {
      const config = parseProxyConfig(baseInput);
      expect(config.shrinkFields).toEqual(new Set(DEFAULT_FIELDS));
      expect(writes.join("")).toContain(INVALID_FIELDS_WARNING);
    } finally {
      restore();
    }
  });

  it("D-12: mixed valid+invalid falls back to full D-09 defaults (not valid-only subset)", () => {
    vi.stubEnv("BETTER_TOKEN_SHRINK_FIELDS", "tools.description,garbage");
    const { writes, restore } = captureStderr();
    try {
      const config = parseProxyConfig(baseInput);
      expect(config.shrinkFields).toEqual(new Set(DEFAULT_FIELDS));
      expect(config.shrinkFields.size).toBe(3);
      expect(writes.join("")).toContain(INVALID_FIELDS_WARNING);
      expect(writes.filter((w) => w.includes(INVALID_FIELDS_WARNING)).length).toBe(1);
    } finally {
      restore();
    }
  });

  it("D-12: empty string warns and returns full D-09 defaults", () => {
    vi.stubEnv("BETTER_TOKEN_SHRINK_FIELDS", "");
    const { writes, restore } = captureStderr();
    try {
      const config = parseProxyConfig(baseInput);
      expect(config.shrinkFields).toEqual(new Set(DEFAULT_FIELDS));
      expect(writes.join("")).toContain(INVALID_FIELDS_WARNING);
    } finally {
      restore();
    }
  });

  it("D-12: whitespace-only warns and returns full D-09 defaults", () => {
    vi.stubEnv("BETTER_TOKEN_SHRINK_FIELDS", "   ");
    const { writes, restore } = captureStderr();
    try {
      const config = parseProxyConfig(baseInput);
      expect(config.shrinkFields).toEqual(new Set(DEFAULT_FIELDS));
      expect(writes.join("")).toContain(INVALID_FIELDS_WARNING);
    } finally {
      restore();
    }
  });

  it("D-06/A3: CLI --mode aggressive overrides BETTER_TOKEN_MODE=safe", () => {
    vi.stubEnv("BETTER_TOKEN_MODE", "safe");
    const config = parseProxyConfig({ ...baseInput, cliMode: "aggressive" });
    expect(config.mode).toBe("aggressive");
  });

  it("D-06: BETTER_TOKEN_MODE=safe when cliMode omitted", () => {
    vi.stubEnv("BETTER_TOKEN_MODE", "safe");
    const config = parseProxyConfig(baseInput);
    expect(config.mode).toBe("safe");
  });

  it("default: balanced mode and all three shrink fields when env unset", () => {
    const config = parseProxyConfig(baseInput);
    expect(config.mode).toBe("balanced");
    expect(config.shrinkFields).toEqual(new Set(DEFAULT_FIELDS));
  });
});
