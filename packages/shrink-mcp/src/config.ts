import type { CompressionMode } from "@better-token/core";

export const DEFAULT_SHRINK_FIELDS =
  "tools.description,prompts.description,resources.description";

const ALLOWED_SHRINK_FIELDS = new Set([
  "tools.description",
  "prompts.description",
  "resources.description",
]);

const VALID_MODES = new Set<CompressionMode>([
  "safe",
  "balanced",
  "aggressive",
]);

const INVALID_FIELDS_WARNING =
  "better-token proxy: invalid BETTER_TOKEN_SHRINK_FIELDS; using defaults\n";

const INVALID_MODE_WARNING =
  "better-token proxy: invalid compression mode; using balanced\n";

export interface ProxyConfig {
  upstreamCommand: string;
  upstreamArgs: string[];
  mode: CompressionMode;
  shrinkFields: Set<string>;
  debug: boolean;
}

function defaultShrinkFields(): Set<string> {
  return new Set(ALLOWED_SHRINK_FIELDS);
}

export function parseShrinkFields(raw: string | undefined): Set<string> {
  if (raw === undefined) {
    return defaultShrinkFields();
  }

  if (!raw.trim()) {
    process.stderr.write(INVALID_FIELDS_WARNING);
    return defaultShrinkFields();
  }

  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const hasUnknown = parts.some((p) => !ALLOWED_SHRINK_FIELDS.has(p));
  const selected = new Set(parts.filter((p) => ALLOWED_SHRINK_FIELDS.has(p)));

  if (hasUnknown || selected.size === 0) {
    process.stderr.write(INVALID_FIELDS_WARNING);
    return defaultShrinkFields();
  }

  return selected;
}

function resolveMode(cliMode?: string): CompressionMode {
  if (cliMode !== undefined) {
    if (VALID_MODES.has(cliMode as CompressionMode)) {
      return cliMode as CompressionMode;
    }
    process.stderr.write(INVALID_MODE_WARNING);
    return "balanced";
  }

  const envMode = process.env.BETTER_TOKEN_MODE;
  if (envMode !== undefined) {
    if (VALID_MODES.has(envMode as CompressionMode)) {
      return envMode as CompressionMode;
    }
    process.stderr.write(INVALID_MODE_WARNING);
    return "balanced";
  }

  return "balanced";
}

function resolveDebug(cliDebug?: boolean): boolean {
  if (cliDebug === true) {
    return true;
  }

  const envDebug = process.env.BETTER_TOKEN_DEBUG;
  if (envDebug === undefined) {
    return false;
  }

  const normalized = envDebug.trim().toLowerCase();
  return normalized === "1" || normalized === "true";
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
    shrinkFields: parseShrinkFields(process.env.BETTER_TOKEN_SHRINK_FIELDS),
    debug: resolveDebug(input.debug),
  };
}
