import { spawn } from "node:child_process";
import type { ProxyConfig } from "./config.js";
import { NdjsonReadBuffer, writeNdjsonLine } from "./framing.js";
import { isShrinkableListResponse, shrinkListResponse } from "./shrink.js";

function handleUpstreamLine(line: string, config: ProxyConfig): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    if (config.debug) {
      process.stderr.write("better-token proxy: pass-through parse error on upstream line\n");
    }
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
    const shrunk = shrinkListResponse(
      parsed as Record<string, unknown>,
      config.shrinkFields,
      config.mode,
    );
    writeNdjsonLine(process.stdout, JSON.stringify(shrunk));
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

      resolvePromise(code ?? 0);
    });

    upstream.on("error", (err) => {
      process.stderr.write(`better-token proxy: upstream error: ${err.message}\n`);
      resolvePromise(1);
    });
  });
}
