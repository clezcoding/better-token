import type { ValidationResult } from "./index.js";

export function validate(_original: string, _compressed: string): ValidationResult {
  return { ok: true, errors: [], warnings: [] };
}
