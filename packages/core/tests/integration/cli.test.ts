import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

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
    expect(stdout).toMatch(/estimated delta: 0/);

    const after = await readFile(fixturePath, "utf-8");
    expect(after).toBe(before);
  });
});
