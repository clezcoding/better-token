import type { CompressionMode } from "@better-token/core";

export interface ProxyConfig {
  upstreamCommand: string;
  upstreamArgs: string[];
  mode: CompressionMode;
  shrinkFields: Set<string>;
  debug: boolean;
}

export function parseProxyConfig(_input: {
  cliMode?: string;
  debug?: boolean;
  upstreamCmd: string;
  upstreamArgs: string[];
}): ProxyConfig {
  throw new Error("not implemented");
}
