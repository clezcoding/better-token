import {
  access,
  lstat,
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

async function assertNotSymlink(filePath: string): Promise<void> {
  let stats;
  try {
    stats = await lstat(filePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw err;
  }
  if (stats.isSymbolicLink()) {
    throw new Error(`Refusing to operate on symlink: ${filePath}`);
  }
}

async function resolveSafeParentDir(filePath: string): Promise<string> {
  const parent = dirname(filePath);
  return realpath(parent);
}

export async function readFileWithCap(path: string): Promise<string> {
  await assertNotSymlink(path);
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
  await assertNotSymlink(targetPath);
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

export async function createSidecarIfMissing(
  path: string,
  content?: string,
): Promise<boolean> {
  const sidecar = sidecarPathFor(path);
  await assertNotSymlink(path);
  await assertNotSymlink(sidecar);
  const bytes = content ?? (await readFileWithCap(path));
  try {
    await resolveSafeParentDir(path);
    await writeFile(sidecar, bytes, { encoding: "utf-8", flag: "wx" });
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EEXIST") {
      return false;
    }
    throw err;
  }
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
