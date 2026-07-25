import { estimateTokenCount } from "@better-token/core";
import { spawn } from "node:child_process";
import type { ProxyConfig } from "./config.js";
import { NdjsonReadBuffer, writeNdjsonLine } from "./framing.js";
import { isShrinkableListResponse, shrinkListResponse } from "./shrink.js";

const PARSE_PASS_THROUGH_MSG =
  "better-token proxy: pass-through: parse error\n";

function emitShrinkStats(
  beforeJson: string,
  afterJson: string,
  config: ProxyConfig,
): void {
  if (!config.debug || beforeJson === afterJson) {
    return;
  }

  const before = estimateTokenCount(beforeJson);
  const after = estimateTokenCount(afterJson);
  process.stderr.write(
    `better-token proxy: shrink estimated before: ${before} estimated after: ${after}\n`,
  );
}

function handleUpstreamLine(line: string, config: ProxyConfig): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    process.stderr.write(PARSE_PASS_THROUGH_MSG);
    writeNdjsonLine(process.stdout, line);
    return;
  }

  if (Array.isArray(parsed)) {
    writeNdjsonLine(process.stdout, line);
    return;
  }

  if (
    typeof parsed === "object" &&
    parsed !== null &&
    isShrinkableListResponse(parsed as Record<string, unknown>, config.shrinkFields)
  ) {
    const beforeJson = JSON.stringify(parsed);
    const shrunk = shrinkListResponse(
      parsed as Record<string, unknown>,
      config.shrinkFields,
      config.mode,
    );
    const afterJson = JSON.stringify(shrunk);
    emitShrinkStats(beforeJson, afterJson, config);
    writeNdjsonLine(process.stdout, afterJson);
    return;
  }

  writeNdjsonLine(process.stdout, line);
}

export function runProxy(config: ProxyConfig): Promise<number> {
  const upstream = spawn(config.upstreamCommand, config.upstreamArgs, {
    stdio: ["pipe", "pipe", "pipe"],
    env: process.env,
    shell: false,
  });

  process.stdin.pipe(upstream.stdin!);
  upstream.stderr?.pipe(process.stderr);

  const reader = new NdjsonReadBuffer();
  upstream.stdout!.on("data", (chunk: Buffer) => {
    for (const line of reader.push(chunk.toString("utf8"))) {
      handleUpstreamLine(line, config);
    }
  });

  return new Promise((resolvePromise) => {
    upstream.on("exit", (code, signal) => {
      const remainder = reader.flush();
      if (remainder !== undefined) {
        handleUpstreamLine(remainder, config);
      }

      if (signal) {
        process.stderr.write(
          `better-token proxy: upstream killed by ${signal}\n`,
        );
        resolvePromise(1);
        return;
      }

      const exitCode = code ?? 0;
      if (exitCode !== 0) {
        process.stderr.write(
          `better-token proxy: upstream exited with code ${exitCode}\n`,
        );
      }

      resolvePromise(exitCode);
    });

    upstream.on("error", (err) => {
      process.stderr.write(`better-token proxy: upstream error: ${err.message}\n`);
      resolvePromise(1);
    });
  });
}
