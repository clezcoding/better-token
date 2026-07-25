import type { CompressionMode } from "@better-token/core";

const DEFAULT_SHRINK_FIELDS = new Set([
  "tools.description",
  "prompts.description",
  "resources.description",
]);

const VALID_MODES = new Set<CompressionMode>([
  "safe",
  "balanced",
  "aggressive",
]);

export interface ProxyConfig {
  upstreamCommand: string;
  upstreamArgs: string[];
  mode: CompressionMode;
  shrinkFields: Set<string>;
  debug: boolean;
}

function resolveMode(cliMode?: string): CompressionMode {
  if (cliMode && VALID_MODES.has(cliMode as CompressionMode)) {
    return cliMode as CompressionMode;
  }

  const envMode = process.env.BETTER_TOKEN_MODE;
  if (envMode && VALID_MODES.has(envMode as CompressionMode)) {
    return envMode as CompressionMode;
  }

  return "balanced";
}

function resolveDebug(cliDebug?: boolean): boolean {
  if (cliDebug === true) {
    return true;
  }
  return process.env.BETTER_TOKEN_DEBUG === "1";
}

export function parseProxyConfig(input: {
  cliMode?: string;
  debug?: boolean;
  upstreamCmd: string;
  upstreamArgs: string[];
}): ProxyConfig {
  return {
    upstreamCommand: input.upstreamCmd,
    upstreamArgs: input.upstreamArgs,
    mode: resolveMode(input.cliMode),
    shrinkFields: new Set(DEFAULT_SHRINK_FIELDS),
    debug: resolveDebug(input.debug),
  };
}
