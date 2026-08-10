import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { createTempDirectory } from "./temp";

export async function createGitRepository(): Promise<string> {
  const directory = await createTempDirectory();
  runGit(directory, ["init", "--initial-branch=main"]);
  runGit(directory, ["config", "user.email", "mergereceipt-tests@localhost"]);
  runGit(directory, ["config", "user.name", "MergeReceipt Test"]);
  return directory;
}

export async function writeRepositoryFile(
  repository: string,
  path: string,
  contents: string
): Promise<void> {
  const absolutePath = join(repository, path);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, contents, "utf8");
}

export function commitAll(repository: string, message = "fixture"): string {
  runGit(repository, ["add", "--all"]);
  runGit(repository, ["commit", "--message", message]);
  return runGit(repository, ["rev-parse", "HEAD"]);
}

export function runGit(repository: string, args: readonly string[]): string {
  return execFileSync("git", [...args], {
    cwd: repository,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}
