import { encode } from "bpe-lite";

export type CompressionMode = "safe" | "balanced" | "aggressive";

/** BPE-lite token estimate for shrink diagnostics (D-14). */
export function estimateTokenCount(text: string): number {
  return encode(text).length;
}

export interface TokenMap {
  [key: string]: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export { tokenizeMarkdown, detokenizeMarkdown, extractProtectedRegions } from "./tokenizer.js";
export {
  CANONICAL_BASENAMES,
  compressMarkdown,
  compressProse,
  compressMarkdownWithValidation,
  compressFile,
  detectCanonicalFiles,
  type CompressFileResult,
} from "./compressor.js";
export { validate } from "./validator.js";
export { extractCarveOuts, CARVEOUT_CATEGORIES } from "./carveouts.js";
export {
  sidecarPathFor,
  createSidecarIfMissing,
  readSidecar,
  restoreFromSidecar,
  MissingSidecarError,
} from "./backup.js";
