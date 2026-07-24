import { spawn } from "node:child_process";
import { readFile, writeFile, mkdtemp, rm, access, readdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { constants } from "node:fs";
import { describe, it, expect, vi } from "vitest";
import * as validatorModule from "../../src/validator.js";
import { compressMarkdown } from "../../src/compressor.js";
import { compressFile } from "../../src/compressor.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(__dirname, "../fixtures/sample-claude.md");
const cliPath = resolve(__dirname, "../../src/cli.ts");
const repoRoot = resolve(__dirname, "../../../..");

function runCli(args: string[]): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("npx", ["tsx", cliPath, ...args], {
      cwd: repoRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      resolvePromise({ code, stdout, stderr });
    });
  });
}

describe("CLI integration", () => {
  it("COMP-03: dry-run prints estimated stats without modifying fixture", async () => {
    const before = await readFile(fixturePath, "utf-8");
    const { code, stdout } = await runCli([
      "compress",
      fixturePath,
      "--dry-run",
    ]);

    expect(code).toBe(0);
    expect(stdout).toContain("estimated");
    expect(stdout).toContain("mode: balanced");
    expect(stdout).toContain("validator: pass");
    expect(stdout).toMatch(/estimated delta: -?\d+/);

    const after = await readFile(fixturePath, "utf-8");
    expect(after).toBe(before);
  });

  it("COMP-01: dry-run shows non-zero token delta after real compression", async () => {
    const { code, stdout } = await runCli([
      "compress",
      fixturePath,
      "--dry-run",
    ]);

    expect(code).toBe(0);
    expect(stdout).toMatch(/estimated delta: -[1-9]\d*/);
  });

  it("SAFE-01: validator failure on compressFile keeps original", async () => {
    const dir = await mkdtemp(join(tmpdir(), "better-token-test-"));
    const corruptPath = join(dir, "corrupt.md");
    const original = "# Title\n\nPlease make sure to read this.\n\n```ts\nconst a = 1;\n```";
    await writeFile(corruptPath, original, "utf-8");

    const spy = vi.spyOn(validatorModule, "validate").mockReturnValue({
      ok: false,
      errors: ["Code blocks not preserved exactly"],
      warnings: [],
    });

    try {
      const result = await compressFile(corruptPath, { mode: "balanced" });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("validator-failed");

      const after = await readFile(corruptPath, "utf-8");
      expect(after).toBe(original);

      await expect(access(`${corruptPath}.original`, constants.F_OK)).rejects.toThrow();
    } finally {
      spy.mockRestore();
    }

    await rm(dir, { recursive: true, force: true });
  });

  it("COMP-04: re-run on already-compressed file is no-op", async () => {
    const dir = await mkdtemp(join(tmpdir(), "better-token-test-"));
    const testPath = join(dir, "sample.md");
    const original = await readFile(fixturePath, "utf-8");
    await writeFile(testPath, original, "utf-8");

    const first = await runCli(["compress", testPath]);
    expect(first.code).toBe(0);

    const afterFirst = await readFile(testPath, "utf-8");
    const second = await runCli(["compress", testPath]);
    expect(second.code).toBe(0);
    expect(second.stdout).toContain("already compressed — no changes");

    const afterSecond = await readFile(testPath, "utf-8");
    expect(afterSecond).toBe(afterFirst);

    await rm(dir, { recursive: true, force: true });
  });

  it("COMP-05: compress creates sidecar; rollback restores", async () => {
    const dir = await mkdtemp(join(tmpdir(), "better-token-test-"));
    const testPath = join(dir, "sample.md");
    const original = await readFile(fixturePath, "utf-8");
    await writeFile(testPath, original, "utf-8");

    const compressResult = await runCli(["compress", testPath]);
    expect(compressResult.code).toBe(0);

    const sidecarPath = `${testPath}.original`;
    const sidecar = await readFile(sidecarPath, "utf-8");
    expect(sidecar).toBe(original);

    const compressed = await readFile(testPath, "utf-8");
    expect(compressed).not.toBe(original);

    const rollbackResult = await runCli(["rollback", testPath]);
    expect(rollbackResult.code).toBe(0);
    expect(rollbackResult.stdout).toContain(`restored from ${testPath}.original`);

    const restored = await readFile(testPath, "utf-8");
    expect(restored).toBe(original);
    await expect(access(sidecarPath, constants.F_OK)).rejects.toThrow();

    await rm(dir, { recursive: true, force: true });
  });

  it("COMP-05: rollback with no sidecar exits non-zero", async () => {
    const dir = await mkdtemp(join(tmpdir(), "better-token-test-"));
    const testPath = join(dir, "no-backup.md");
    await writeFile(testPath, "content", "utf-8");

    const result = await runCli(["rollback", testPath]);
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain(`no backup found for ${testPath}`);

    await rm(dir, { recursive: true, force: true });
  });

  it("COMP-05: rollback recovers deleted target from sidecar", async () => {
    const dir = await mkdtemp(join(tmpdir(), "better-token-test-"));
    const testPath = join(dir, "recover.md");
    const original = await readFile(fixturePath, "utf-8");
    await writeFile(testPath, original, "utf-8");

    await runCli(["compress", testPath]);
    await rm(testPath);

    const rollbackResult = await runCli(["rollback", testPath]);
    expect(rollbackResult.code).toBe(0);

    const restored = await readFile(testPath, "utf-8");
    expect(restored).toBe(original);

    await rm(dir, { recursive: true, force: true });
  });

  it("COMP-05: after rollback, compress creates fresh sidecar", async () => {
    const dir = await mkdtemp(join(tmpdir(), "better-token-test-"));
    const testPath = join(dir, "fresh-sidecar.md");
    const original = await readFile(fixturePath, "utf-8");
    await writeFile(testPath, original, "utf-8");

    await runCli(["compress", testPath]);
    await runCli(["rollback", testPath]);

    const recompress = await runCli(["compress", testPath]);
    expect(recompress.code).toBe(0);

    const sidecar = await readFile(`${testPath}.original`, "utf-8");
    expect(sidecar).toBe(original);

    await rm(dir, { recursive: true, force: true });
  });

  it("D-13: mode switch recompresses from sidecar original", async () => {
    const dir = await mkdtemp(join(tmpdir(), "better-token-test-"));
    const testPath = join(dir, "mode-switch.md");
    const original = await readFile(fixturePath, "utf-8");
    await writeFile(testPath, original, "utf-8");

    await runCli(["compress", testPath, "--mode", "balanced"]);
    await runCli(["compress", testPath, "--mode", "safe"]);

    const afterSafe = await readFile(testPath, "utf-8");
    const expectedFromOriginal = compressMarkdown(original, "safe");
    expect(afterSafe).toBe(expectedFromOriginal);

    const stackedWrong = compressMarkdown(
      compressMarkdown(original, "balanced"),
      "safe",
    );
    expect(afterSafe).not.toBe(stackedWrong);

    await rm(dir, { recursive: true, force: true });
  });

  it("D-15: --force is rejected as unknown option", async () => {
    const result = await runCli(["compress", fixturePath, "--force"]);
    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/unknown option|error/i);
  });

  it("D-06: dry-run does not create sidecar", async () => {
    const dir = await mkdtemp(join(tmpdir(), "better-token-test-"));
    const testPath = join(dir, "dry-run.md");
    const original = await readFile(fixturePath, "utf-8");
    await writeFile(testPath, original, "utf-8");

    await runCli(["compress", testPath, "--dry-run"]);
    await expect(access(`${testPath}.original`, constants.F_OK)).rejects.toThrow();

    await rm(dir, { recursive: true, force: true });
  });

  it("no in-file idempotency marker in compressed output", async () => {
    const dir = await mkdtemp(join(tmpdir(), "better-token-test-"));
    const testPath = join(dir, "no-marker.md");
    const original = await readFile(fixturePath, "utf-8");
    await writeFile(testPath, original, "utf-8");

    await runCli(["compress", testPath]);
    const compressed = await readFile(testPath, "utf-8");
    expect(compressed).not.toContain("<!-- compressed");

    await rm(dir, { recursive: true, force: true });
  });

  it("rollback rejects unknown options like --mode", async () => {
    const result = await runCli(["rollback", fixturePath, "--mode", "safe"]);
    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/unknown option|error/i);
  });

  it("atomic write: no temp files left on validator failure", async () => {
    const dir = await mkdtemp(join(tmpdir(), "better-token-test-"));
    const testPath = join(dir, "atomic-fail.md");
    const original = "# Fail\n\nPlease make sure to check.\n\n```js\nx=1\n```";
    await writeFile(testPath, original, "utf-8");

    await runCli(["compress", testPath]);

    const entries = await readdir(dir);
    const tempFiles = entries.filter((e) => e.includes(".tmp"));
    expect(tempFiles).toHaveLength(0);

    await rm(dir, { recursive: true, force: true });
  });

  it("COMP-02: safe mode dry-run prints mode and validator pass", async () => {
    const { code, stdout } = await runCli([
      "compress",
      fixturePath,
      "--dry-run",
      "--mode",
      "safe",
    ]);
    expect(code).toBe(0);
    expect(stdout).toContain("mode: safe");
    expect(stdout).toContain("validator: pass");
    expect(stdout).toMatch(/estimated delta: -?\d+/);
  });

  it("COMP-02: balanced mode dry-run prints mode and validator pass", async () => {
    const { code, stdout } = await runCli([
      "compress",
      fixturePath,
      "--dry-run",
      "--mode",
      "balanced",
    ]);
    expect(code).toBe(0);
    expect(stdout).toContain("mode: balanced");
    expect(stdout).toContain("validator: pass");
    expect(stdout).toMatch(/estimated delta: -?\d+/);
  });

  it("COMP-02: aggressive mode dry-run prints mode and validator pass", async () => {
    const { code, stdout } = await runCli([
      "compress",
      fixturePath,
      "--dry-run",
      "--mode",
      "aggressive",
    ]);
    expect(code).toBe(0);
    expect(stdout).toContain("mode: aggressive");
    expect(stdout).toContain("validator: pass");
    expect(stdout).toMatch(/estimated delta: -?\d+/);
  });

  it("COMP-02: modes are monotonically more aggressive on fixture", async () => {
    const parseDelta = (stdout: string) => {
      const match = stdout.match(/estimated delta: (-?\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    };

    const safe = await runCli(["compress", fixturePath, "--dry-run", "--mode", "safe"]);
    const balanced = await runCli([
      "compress",
      fixturePath,
      "--dry-run",
      "--mode",
      "balanced",
    ]);
    const aggressive = await runCli([
      "compress",
      fixturePath,
      "--dry-run",
      "--mode",
      "aggressive",
    ]);

    expect(safe.code).toBe(0);
    expect(balanced.code).toBe(0);
    expect(aggressive.code).toBe(0);

    const safeDelta = parseDelta(safe.stdout);
    const balancedDelta = parseDelta(balanced.stdout);
    const aggressiveDelta = parseDelta(aggressive.stdout);

    expect(aggressiveDelta).toBeLessThanOrEqual(balancedDelta);
    expect(balancedDelta).toBeLessThanOrEqual(safeDelta);
  });

  it("D-10 validate: passes after compress with sidecar", async () => {
    const dir = await mkdtemp(join(tmpdir(), "better-token-test-"));
    const testPath = join(dir, "validate-pass.md");
    const original = await readFile(fixturePath, "utf-8");
    await writeFile(testPath, original, "utf-8");

    const compressResult = await runCli(["compress", testPath]);
    expect(compressResult.code).toBe(0);

    const validateResult = await runCli(["validate", testPath]);
    expect(validateResult.code).toBe(0);
    expect(validateResult.stdout).toContain("validator: pass");

    await rm(dir, { recursive: true, force: true });
  });

  it("D-10 validate: fails on manually corrupted file with sidecar", async () => {
    const dir = await mkdtemp(join(tmpdir(), "better-token-test-"));
    const testPath = join(dir, "validate-fail.md");
    const original = await readFile(fixturePath, "utf-8");
    await writeFile(testPath, original, "utf-8");

    await runCli(["compress", testPath]);
    await writeFile(testPath, `${original}\n# corrupted heading change`, "utf-8");

    const validateResult = await runCli(["validate", testPath]);
    expect(validateResult.code).not.toBe(0);
    expect(validateResult.stdout).toContain("validator: fail");

    await rm(dir, { recursive: true, force: true });
  });

  it("D-10 validate: internal consistency pass without sidecar", async () => {
    const dir = await mkdtemp(join(tmpdir(), "better-token-test-"));
    const testPath = join(dir, "validate-internal.md");
    const original = await readFile(fixturePath, "utf-8");
    await writeFile(testPath, original, "utf-8");

    const validateResult = await runCli(["validate", testPath]);
    expect(validateResult.code).toBe(0);
    expect(validateResult.stdout).toContain(
      "no original sidecar to compare; nothing compared — self-check only (internal check passed)",
    );

    await rm(dir, { recursive: true, force: true });
  });

  it("D-18: non-TTY compress without path errors", async () => {
    const dir = await mkdtemp(join(tmpdir(), "better-token-test-"));
    await writeFile(join(dir, "CLAUDE.md"), "# Rules\n\nPlease make sure to read.", "utf-8");

    const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>(
      (resolvePromise, reject) => {
        const child = spawn("npx", ["tsx", cliPath, "compress"], {
          cwd: dir,
          env: process.env,
          stdio: ["ignore", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (chunk: Buffer) => {
          stdout += chunk.toString();
        });
        child.stderr.on("data", (chunk: Buffer) => {
          stderr += chunk.toString();
        });
        child.on("error", reject);
        child.on("close", (code) => resolvePromise({ code, stdout, stderr }));
      },
    );

    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain("no path given and not a TTY; pass a path or --yes");

    await rm(dir, { recursive: true, force: true });
  });

  it("D-18: non-TTY --yes compresses all detected canonicals", async () => {
    const dir = await mkdtemp(join(tmpdir(), "better-token-test-"));
    const claudePath = join(dir, "CLAUDE.md");
    const agentsPath = join(dir, "AGENTS.md");
    const original = "# Rules\n\nPlease make sure to read this carefully.";
    await writeFile(claudePath, original, "utf-8");
    await writeFile(agentsPath, original, "utf-8");

    const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>(
      (resolvePromise, reject) => {
        const child = spawn("npx", ["tsx", cliPath, "compress", "--yes"], {
          cwd: dir,
          env: process.env,
          stdio: ["ignore", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (chunk: Buffer) => {
          stdout += chunk.toString();
        });
        child.stderr.on("data", (chunk: Buffer) => {
          stderr += chunk.toString();
        });
        child.on("error", reject);
        child.on("close", (code) => resolvePromise({ code, stdout, stderr }));
      },
    );

    expect(result.code).toBe(0);
    expect(result.stdout.match(/validator: pass/g)?.length).toBeGreaterThanOrEqual(2);

    const compressedClaude = await readFile(claudePath, "utf-8");
    const compressedAgents = await readFile(agentsPath, "utf-8");
    expect(compressedClaude).not.toBe(original);
    expect(compressedAgents).not.toBe(original);

    await rm(dir, { recursive: true, force: true });
  });

  it("D-19: non-canonical markdown warns and proceeds", async () => {
    const dir = await mkdtemp(join(tmpdir(), "better-token-test-"));
    const testPath = join(dir, "notes.md");
    const original = "# Notes\n\nPlease make sure to keep this.";
    await writeFile(testPath, original, "utf-8");

    const result = await runCli(["compress", testPath, "--dry-run"]);
    expect(result.code).toBe(0);
    expect(result.stderr).toContain(`warning: ${testPath} is not a canonical rule file`);

    await rm(dir, { recursive: true, force: true });
  });

  it("D-19: png path is hard-rejected", async () => {
    const dir = await mkdtemp(join(tmpdir(), "better-token-test-"));
    const pngPath = join(dir, "image.png");
    await writeFile(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00]), "binary");

    const result = await runCli(["compress", pngPath, "--dry-run"]);
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain(`error: ${pngPath} is not a markdown file`);

    await rm(dir, { recursive: true, force: true });
  });

  it("D-17: interactive prompt compresses selected canonical on TTY", async () => {
    const dir = await mkdtemp(join(tmpdir(), "better-token-test-"));
    const claudePath = join(dir, "CLAUDE.md");
    const agentsPath = join(dir, "AGENTS.md");
    const original = "# Rules\n\nPlease make sure to read this carefully.";
    await writeFile(claudePath, original, "utf-8");
    await writeFile(agentsPath, original, "utf-8");

    const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>(
      (resolvePromise, reject) => {
        const child = spawn("npx", ["tsx", cliPath, "compress"], {
          cwd: dir,
          env: { ...process.env, BETTER_TOKEN_TEST_TTY: "1" },
          stdio: ["pipe", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (chunk: Buffer) => {
          stdout += chunk.toString();
        });
        child.stderr.on("data", (chunk: Buffer) => {
          stderr += chunk.toString();
        });
        child.on("error", reject);
        child.stdin.write("2\n");
        child.stdin.end();
        child.on("close", (code) => resolvePromise({ code, stdout, stderr }));
      },
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Detected canonical rule files");
    expect(result.stdout).toContain("validator: pass");

    const compressedClaude = await readFile(claudePath, "utf-8");
    const compressedAgents = await readFile(agentsPath, "utf-8");
    expect(compressedClaude).not.toBe(original);
    expect(compressedAgents).toBe(original);

    await rm(dir, { recursive: true, force: true });
  });

  it("D-19: directory path is hard-rejected", async () => {
    const dir = await mkdtemp(join(tmpdir(), "better-token-test-"));

    const result = await runCli(["compress", dir, "--dry-run"]);
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain(`error: ${dir} is not a markdown file`);

    await rm(dir, { recursive: true, force: true });
  });
});
