#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Command } from "commander";
import { encode } from "bpe-lite";
import { z } from "zod";
import { compressMarkdown } from "./compressor.js";
import { validate } from "./validator.js";
import type { CompressionMode } from "./index.js";

const OptionsSchema = z.object({
  mode: z.enum(["safe", "balanced", "aggressive"]),
  dryRun: z.boolean(),
  diff: z.boolean(),
});

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

async function runCompress(
  filePath: string,
  options: z.infer<typeof OptionsSchema>,
): Promise<number> {
  const resolved = resolve(filePath);
  const original = await readFile(resolved, "utf-8");
  const compressed = compressMarkdown(original, options.mode);
  const validation = validate(original, compressed);

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

  if (!options.dryRun) {
    console.error("Write mode not implemented in walking skeleton — use --dry-run");
    return 1;
  }

  return 0;
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
  .action(async (path: string | undefined, rawOptions: Record<string, unknown>) => {
    if (!path) {
      console.error("Path required");
      process.exit(1);
    }

    const parsed = OptionsSchema.parse({
      mode: rawOptions.mode ?? "balanced",
      dryRun: rawOptions.dryRun === true,
      diff: rawOptions.diff === true,
    });

    const exitCode = await runCompress(path, parsed);
    process.exit(exitCode);
  });

cli.parse(process.argv);
