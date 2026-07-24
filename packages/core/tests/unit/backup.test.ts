import { mkdtemp, writeFile, readFile, stat, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  sidecarPathFor,
  createSidecarIfMissing,
  readSidecar,
  restoreFromSidecar,
  MissingSidecarError,
} from "../../src/backup.js";

describe("backup", () => {
  let dir: string;
  let filePath: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "backup-test-"));
    filePath = join(dir, "test.md");
    await writeFile(filePath, "original content", "utf-8");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("sidecarPathFor returns path.original suffix", () => {
    expect(sidecarPathFor("/foo/bar.md")).toBe("/foo/bar.md.original");
  });

  it("createSidecarIfMissing creates sidecar on first call", async () => {
    const created = await createSidecarIfMissing(filePath);
    expect(created).toBe(true);
    const sidecar = await readFile(sidecarPathFor(filePath), "utf-8");
    expect(sidecar).toBe("original content");
  });

  it("createSidecarIfMissing does not overwrite existing sidecar", async () => {
    await createSidecarIfMissing(filePath);
    const sidecarPath = sidecarPathFor(filePath);
    const firstStat = await stat(sidecarPath);
    await writeFile(filePath, "modified content", "utf-8");
    const created = await createSidecarIfMissing(filePath);
    expect(created).toBe(false);
    const secondStat = await stat(sidecarPath);
    expect(secondStat.mtimeMs).toBe(firstStat.mtimeMs);
    const sidecar = await readFile(sidecarPath, "utf-8");
    expect(sidecar).toBe("original content");
  });

  it("readSidecar throws MissingSidecarError when absent", async () => {
    await expect(readSidecar(filePath)).rejects.toThrow(MissingSidecarError);
  });

  it("restoreFromSidecar writes original back and unlinks sidecar", async () => {
    await createSidecarIfMissing(filePath);
    await writeFile(filePath, "compressed content", "utf-8");
    await restoreFromSidecar(filePath);
    const content = await readFile(filePath, "utf-8");
    expect(content).toBe("original content");
    await expect(readSidecar(filePath)).rejects.toThrow(MissingSidecarError);
  });
});
