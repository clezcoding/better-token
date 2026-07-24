import {
  access,
  readFile,
  writeFile,
  unlink,
  rename,
  stat,
  realpath,
} from "node:fs/promises";
import { constants } from "node:fs";
import { basename, dirname, join } from "node:path";
import { randomBytes } from "node:crypto";

export class MissingSidecarError extends Error {
  constructor(path: string) {
    super(`No backup found for ${path}`);
    this.name = "MissingSidecarError";
  }
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function sidecarPathFor(path: string): string {
  return `${path}.original`;
}

async function resolveSafeParentDir(filePath: string): Promise<string> {
  const parent = dirname(filePath);
  return realpath(parent);
}

async function readFileWithCap(path: string): Promise<string> {
  const stats = await stat(path);
  if (stats.size > MAX_FILE_SIZE) {
    throw new Error(`File exceeds maximum size of ${MAX_FILE_SIZE} bytes`);
  }
  return readFile(path, "utf-8");
}

async function sidecarExists(path: string): Promise<boolean> {
  try {
    await access(sidecarPathFor(path), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function atomicWriteFile(targetPath: string, content: string): Promise<void> {
  const parent = await resolveSafeParentDir(targetPath);
  const tempName = `.${basename(targetPath)}.${randomBytes(8).toString("hex")}.tmp`;
  const tempPath = join(parent, tempName);

  try {
    await writeFile(tempPath, content, "utf-8");
    await rename(tempPath, targetPath);
  } catch (err) {
    try {
      await unlink(tempPath);
    } catch {
      // ignore cleanup failure
    }
    throw err;
  }
}

export async function createSidecarIfMissing(path: string): Promise<boolean> {
  if (await sidecarExists(path)) {
    return false;
  }

  await resolveSafeParentDir(path);
  const content = await readFileWithCap(path);
  await writeFile(sidecarPathFor(path), content, "utf-8");
  return true;
}

export async function readSidecar(path: string): Promise<string> {
  const sidecar = sidecarPathFor(path);
  try {
    await access(sidecar, constants.F_OK);
  } catch {
    throw new MissingSidecarError(path);
  }

  await resolveSafeParentDir(path);
  return readFileWithCap(sidecar);
}

export async function restoreFromSidecar(path: string): Promise<void> {
  const content = await readSidecar(path);
  await atomicWriteFile(path, content);
  await unlink(sidecarPathFor(path));
}

export async function hasSidecar(path: string): Promise<boolean> {
  return sidecarExists(path);
}
