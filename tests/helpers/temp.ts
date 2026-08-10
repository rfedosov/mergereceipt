import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

const directories = new Set<string>();

export async function createTempDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "mergereceipt-test-"));
  directories.add(directory);
  return directory;
}

export async function cleanupTempDirectories(): Promise<void> {
  const pending = [...directories];
  directories.clear();
  await Promise.all(
    pending.map(async (directory) => {
      if (!basename(directory).startsWith("mergereceipt-test-")) {
        throw new Error(`Refusing to remove unexpected test path: ${directory}`);
      }
      await rm(directory, { recursive: true, force: true });
    })
  );
}
