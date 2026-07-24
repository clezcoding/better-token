#!/usr/bin/env node
import { lstat, open, realpath, stat } from "node:fs/promises";
import { createInterface } from "node:readline";
import { dirname, resolve, basename } from "node:path";
import { Command } from "commander";
import { encode } from "bpe-lite";
import { z } from "zod";
import {
  compressFile,
  compressMarkdownWithValidation,
  detectCanonicalFiles,
} from "./compressor.js";
import { MissingSidecarError, readFileWithCap, restoreFromSidecar } from "./backup.js";
import { validate } from "./validator.js";
import type { CompressionMode } from "./index.js";

const OptionsSchema = z.object({
  mode: z.enum(["safe", "balanced", "aggressive"]),
  dryRun: z.boolean(),
  diff: z.boolean(),
  yes: z.boolean(),
});

const PathSchema = z.string().min(1);

const CANONICAL_BASENAMES = new Set([
  "CLAUDE.md",
  ".cursorrules",
  "AGENTS.md",
  "GEMINI.md",
  "CLAUDE.local.md",
  "AGENT.md",
]);

function isInteractiveTTY(): boolean {
  if (process.stdin.isTTY === true) {
    return true;
  }
  const testHook = process.env.BETTER_TOKEN_TEST_TTY === "1";
  const inTest =
    process.env.VITEST !== undefined || process.env.NODE_ENV === "test";
  return testHook && inTest;
}

function countTokens(text: string): number {
  return encode(text).length;
}

function formatStatsLine(params: {
  before: number;
  after: number;
  mode: CompressionMode;
  validation: { ok: boolean };
}): string {
  const delta = params.after - params.before;
  const pct =
    params.before === 0
      ? "0.0"
      : ((delta / params.before) * 100).toFixed(1);
  const validatorLabel = params.validation.ok ? "pass" : "fail";

  return [
    `estimated before: ${params.before}`,
    `estimated after: ${params.after}`,
    `estimated delta: ${delta}`,
    `estimated pct: ${pct}%`,
    `mode: ${params.mode}`,
    `validator: ${validatorLabel}`,
  ].join(" | ");
}

function unifiedDiff(original: string, compressed: string): string {
  const origLines = original.split("\n");
  const compLines = compressed.split("\n");
  const lines: string[] = ["--- original", "+++ compressed"];

  const max = Math.max(origLines.length, compLines.length);
  for (let i = 0; i < max; i++) {
    const a = origLines[i];
    const b = compLines[i];
    if (a === b) {
      if (a !== undefined) lines.push(` ${a}`);
    } else {
      if (a !== undefined) lines.push(`-${a}`);
      if (b !== undefined) lines.push(`+${b}`);
    }
  }

  return lines.join("\n");
}

function isCanonicalPath(resolvedPath: string): boolean {
  const base = basename(resolvedPath);
  if (CANONICAL_BASENAMES.has(base)) {
    return true;
  }
  return resolvedPath.includes(".cursor/rules/") && base.endsWith(".mdc");
}

async function hardenPath(resolvedPath: string): Promise<void> {
  const parent = dirname(resolvedPath);
  await realpath(parent);
  const fileStat = await lstat(resolvedPath);
  if (fileStat.isSymbolicLink()) {
    throw new Error(`Refusing to operate on symlink: ${resolvedPath}`);
  }
}

async function containsNulBytes(resolvedPath: string): Promise<boolean> {
  const handle = await open(resolvedPath, "r");
  try {
    const buffer = Buffer.alloc(8192);
    const { bytesRead } = await handle.read(buffer, 0, 8192, 0);
    return buffer.subarray(0, bytesRead).includes(0);
  } finally {
    await handle.close();
  }
}

async function validateMarkdownInputPath(
  filePath: string,
): Promise<{ ok: true; resolved: string; warn?: string } | { ok: false; message: string }> {
  const resolved = resolve(filePath);
  PathSchema.parse(resolved);

  let fileStat;
  try {
    await hardenPath(resolved);
    fileStat = await stat(resolved);
  } catch {
    return { ok: false, message: `error: ${resolved} is not a markdown file` };
  }

  if (!fileStat.isFile()) {
    return { ok: false, message: `error: ${resolved} is not a markdown file` };
  }

  if (await containsNulBytes(resolved)) {
    return { ok: false, message: `error: ${resolved} is not a markdown file` };
  }

  const lower = resolved.toLowerCase();
  if (!lower.endsWith(".md") && !lower.endsWith(".mdc")) {
    return { ok: false, message: `error: ${resolved} is not a markdown file` };
  }

  if (!isCanonicalPath(resolved)) {
    return {
      ok: true,
      resolved,
      warn: `warning: ${resolved} is not a canonical rule file`,
    };
  }

  return { ok: true, resolved };
}

async function runCompress(
  filePath: string,
  options: z.infer<typeof OptionsSchema>,
): Promise<number> {
  const pathCheck = await validateMarkdownInputPath(filePath);
  if (!pathCheck.ok) {
    console.error(pathCheck.message);
    return 1;
  }

  if (pathCheck.warn) {
    console.error(pathCheck.warn);
  }

  const resolved = pathCheck.resolved;

  if (options.dryRun) {
    const original = await readFileWithCap(resolved);
    const { content: compressed, validation } = compressMarkdownWithValidation(
      original,
      options.mode,
    );

    const before = countTokens(original);
    const after = countTokens(compressed);

    console.log(
      formatStatsLine({
        before,
        after,
        mode: options.mode,
        validation,
      }),
    );

    if (options.diff) {
      console.log(unifiedDiff(original, compressed));
    }

    if (!validation.ok) {
      for (const error of validation.errors) {
        console.error(error);
      }
      return 1;
    }

    return 0;
  }

  const result = await compressFile(resolved, {
    mode: options.mode,
    dryRun: false,
  });

  console.log(
    formatStatsLine({
      before: result.before,
      after: result.after,
      mode: options.mode,
      validation: { ok: result.ok && result.reason !== "validator-failed" },
    }),
  );

  if (!result.ok) {
    if (result.errors) {
      for (const error of result.errors) {
        console.error(error);
      }
    }
    return 1;
  }

  if (result.noop) {
    console.log("already compressed — no changes");
    return 0;
  }

  return 0;
}

async function runValidate(filePath: string): Promise<number> {
  const pathCheck = await validateMarkdownInputPath(filePath);
  if (!pathCheck.ok) {
    console.error(pathCheck.message);
    return 1;
  }

  const resolved = pathCheck.resolved;
  const current = await readFileWithCap(resolved);
  const sidecarPath = `${resolved}.original`;

  let original = current;
  let hasSidecar = false;

  try {
    await stat(sidecarPath);
    original = await readFileWithCap(sidecarPath);
    hasSidecar = true;
  } catch {
    hasSidecar = false;
  }

  const validation = validate(original, current);

  if (validation.ok) {
    if (hasSidecar) {
      console.log("validator: pass");
    } else {
      console.log("no original to compare; internal check passed");
    }
    return 0;
  }

  console.log("validator: fail");
  for (const error of validation.errors) {
    console.error(error);
  }
  return 1;
}

async function promptCanonicalSelection(paths: string[]): Promise<string[] | null> {
  console.log("Detected canonical rule files:");
  paths.forEach((p, index) => {
    console.log(`  ${index + 1}. ${p}`);
  });
  console.log(`  a. all`);
  console.log(`  c. cancel`);

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise<string>((resolveAnswer) => {
    rl.question("Select files (numbers comma-separated, a=all, c=cancel): ", resolveAnswer);
  });
  rl.close();

  const trimmed = answer.trim().toLowerCase();
  if (trimmed === "c" || trimmed === "cancel") {
    return null;
  }
  if (trimmed === "a" || trimmed === "all") {
    return paths;
  }

  const indices = trimmed
    .split(/[,\s]+/)
    .map((part) => parseInt(part, 10) - 1)
    .filter((index) => index >= 0 && index < paths.length);

  if (indices.length === 0) {
    return null;
  }

  return [...new Set(indices.map((index) => paths[index]!))];
}

async function runRollback(filePath: string): Promise<number> {
  const resolved = resolve(filePath);

  try {
    await restoreFromSidecar(resolved);
    console.log(`restored from ${resolved}.original`);
    return 0;
  } catch (err) {
    if (err instanceof MissingSidecarError) {
      console.error(`no backup found for ${resolved}`);
      return 1;
    }
    throw err;
  }
}

const cli = new Command();

cli
  .name("better-token")
  .description("Deterministic markdown compression with byte-exact validation")
  .version("0.1.0");

cli
  .command("compress [path]")
  .description("Compress rule/memory markdown files")
  .option("-m, --mode <safe|balanced|aggressive>", "Compression mode", "balanced")
  .option("--dry-run", "Show estimated token savings without writing", false)
  .option("--diff", "Show unified diff of changes", false)
  .option("-y, --yes", "Compress all detected canonical files without prompting", false)
  .action(async (path: string | undefined, rawOptions: Record<string, unknown>) => {
    const parsed = OptionsSchema.parse({
      mode: rawOptions.mode ?? "balanced",
      dryRun: rawOptions.dryRun === true,
      diff: rawOptions.diff === true,
      yes: rawOptions.yes === true,
    });

    if (path) {
      const exitCode = await runCompress(path, parsed);
      process.exit(exitCode);
      return;
    }

    const canonicals = await detectCanonicalFiles(process.cwd());

    if (canonicals.length === 0) {
      console.error("no canonical rule files detected in current directory");
      process.exit(1);
      return;
    }

    if (!isInteractiveTTY()) {
      if (!parsed.yes) {
        console.error("no path given and not a TTY; pass a path or --yes");
        process.exit(1);
        return;
      }

      let exitCode = 0;
      for (const canonicalPath of canonicals) {
        const code = await runCompress(canonicalPath, parsed);
        if (code !== 0) {
          exitCode = code;
        }
      }
      process.exit(exitCode);
      return;
    }

    const selected = await promptCanonicalSelection(canonicals);
    if (!selected || selected.length === 0) {
      console.log("cancelled");
      process.exit(0);
      return;
    }

    let exitCode = 0;
    for (const selectedPath of selected) {
      const code = await runCompress(selectedPath, parsed);
      if (code !== 0) {
        exitCode = code;
      }
    }
    process.exit(exitCode);
  });

cli
  .command("validate <path>")
  .description("Run byte-exact validator on a markdown file")
  .action(async (path: string) => {
    const parsed = PathSchema.parse(path);
    const exitCode = await runValidate(parsed);
    process.exit(exitCode);
  });

cli
  .command("rollback <path>")
  .description("Restore file from .original sidecar backup")
  .action(async (path: string) => {
    const parsed = PathSchema.parse(path);
    const exitCode = await runRollback(parsed);
    process.exit(exitCode);
  });

cli.parse(process.argv);
