import type { CompressionMode } from "./index.js";
import { validate } from "./validator.js";

export function compressProse(prose: string, _mode: CompressionMode): string {
  return prose;
}

export function compressMarkdown(content: string, mode: CompressionMode): string {
  const compressed = content;
  const result = validate(content, compressed);
  if (!result.ok) {
    return content;
  }
  return compressed;
}
