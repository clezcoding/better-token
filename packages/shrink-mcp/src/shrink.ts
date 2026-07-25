import {
  compressMarkdownWithValidation,
  type CompressionMode,
} from "@better-token/core";

export const MIN_DESCRIPTION_LENGTH = 48;

export function compressDescription(
  text: string,
  mode: CompressionMode,
): { text: string; changed: boolean } {
  if (text.length < MIN_DESCRIPTION_LENGTH) {
    return { text, changed: false };
  }

  const { content, validation } = compressMarkdownWithValidation(text, mode);
  if (!validation.ok) {
    return { text, changed: false };
  }

  return { text: content, changed: content !== text };
}

const LIST_KEYS = ["tools", "prompts", "resources"] as const;

function shrinkItemDescriptions(
  items: unknown[],
  mode: CompressionMode,
): void {
  for (const item of items) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const record = item as Record<string, unknown>;
    if (!("description" in record)) {
      continue;
    }
    const description = record.description;
    if (typeof description !== "string") {
      continue;
    }
    const { text } = compressDescription(description, mode);
    record.description = text;
  }
}

export function shrinkListResponse(
  message: Record<string, unknown>,
  fields: Set<string>,
  mode: CompressionMode,
): Record<string, unknown> {
  const result = message.result;
  if (typeof result !== "object" || result === null) {
    return message;
  }

  const resultRecord = result as Record<string, unknown>;

  for (const key of LIST_KEYS) {
    const fieldId = `${key}.description`;
    if (!fields.has(fieldId)) {
      continue;
    }
    const items = resultRecord[key];
    if (!Array.isArray(items)) {
      continue;
    }
    shrinkItemDescriptions(items, mode);
  }

  return message;
}

export function isShrinkableListResponse(
  message: Record<string, unknown>,
  fields: Set<string>,
): boolean {
  const result = message.result;
  if (typeof result !== "object" || result === null) {
    return false;
  }

  const resultRecord = result as Record<string, unknown>;
  for (const key of LIST_KEYS) {
    const fieldId = `${key}.description`;
    if (!fields.has(fieldId)) {
      continue;
    }
    if (Array.isArray(resultRecord[key])) {
      return true;
    }
  }

  return false;
}
