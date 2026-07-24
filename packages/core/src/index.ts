export type CompressionMode = "safe" | "balanced" | "aggressive";

export interface TokenMap {
  [key: string]: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export { tokenizeMarkdown, detokenizeMarkdown, extractProtectedRegions } from "./tokenizer.js";
export { compressMarkdown, compressProse } from "./compressor.js";
export { validate } from "./validator.js";
