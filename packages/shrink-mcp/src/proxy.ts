import { estimateTokenCount } from "@better-token/core";
import { spawn } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
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

function ignoreStreamError(err: NodeJS.ErrnoException): void {
  // Upstream closed while client still writing — expected; D-15 handles exit code.
  if (err.code === "EPIPE" || err.code === "ERR_STREAM_DESTROYED") {
    return;
  }
  process.stderr.write(`better-token proxy: stream error: ${err.message}\n`);
}

export function runProxy(config: ProxyConfig): Promise<number> {
  const upstream = spawn(config.upstreamCommand, config.upstreamArgs, {
    stdio: ["pipe", "pipe", "pipe"],
    env: process.env,
    shell: false,
  });

  const upstreamStdin = upstream.stdin!;
  upstreamStdin.on("error", ignoreStreamError);
  process.stdin.on("error", ignoreStreamError);
  process.stdin.pipe(upstreamStdin);
  upstream.stderr?.pipe(process.stderr);

  const reader = new NdjsonReadBuffer();
  const decoder = new StringDecoder("utf8");
  upstream.stdout!.on("data", (chunk: Buffer) => {
    for (const line of reader.push(decoder.write(chunk))) {
      handleUpstreamLine(line, config);
    }
  });

  const onSignal = (signal: NodeJS.Signals) => {
    try {
      upstream.kill(signal);
    } catch {
      // child may already be gone
    }
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);

  return new Promise((resolvePromise) => {
    let settled = false;
    let exitCode = 0;
    let exitSignal: NodeJS.Signals | null = null;

    const settle = (code: number) => {
      if (settled) {
        return;
      }
      settled = true;
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);
      resolvePromise(code);
    };

    // Capture exit code early; wait for `close` so stdio drains before flush/exit.
    upstream.on("exit", (code, signal) => {
      exitSignal = signal;
      exitCode = code ?? (signal ? 1 : 0);
    });

    upstream.on("close", () => {
      const decodedTail = decoder.end();
      if (decodedTail) {
        for (const line of reader.push(decodedTail)) {
          handleUpstreamLine(line, config);
        }
      }

      const remainder = reader.flush();
      if (remainder !== undefined) {
        handleUpstreamLine(remainder, config);
      }

      if (exitSignal) {
        process.stderr.write(
          `better-token proxy: upstream killed by ${exitSignal}\n`,
        );
        settle(1);
        return;
      }

      if (exitCode !== 0) {
        process.stderr.write(
          `better-token proxy: upstream exited with code ${exitCode}\n`,
        );
      }

      settle(exitCode);
    });

    upstream.on("error", (err) => {
      process.stderr.write(`better-token proxy: upstream error: ${err.message}\n`);
      settle(1);
    });
  });
}
