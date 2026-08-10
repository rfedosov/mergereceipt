import { afterEach, describe, expect, it, vi } from "vitest";
import { readFile, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { runAction } from "../../src/github/action";
import {
  commitAll,
  createGitRepository,
  writeRepositoryFile
} from "../helpers/repository";
import { cleanupTempDirectories, createTempDirectory } from "../helpers/temp";

const originalExitCode = process.exitCode;

afterEach(async () => {
  vi.unstubAllEnvs();
  process.exitCode = originalExitCode;
  await cleanupTempDirectories();
});

describe("GitHub Action entrypoint", () => {
  it("writes the Evidence Report and declared outputs", async () => {
    const repository = await createGitRepository();
    await writeRepositoryFile(repository, "README.md", "base\n");
    await writeRepositoryFile(
      repository,
      ".mergereceipt.yml",
      "version: 1\nchecks:\n  smoke: node --version\n"
    );
    commitAll(repository, "base");
    const summary = join(repository, "summary.md");
    const output = join(repository, "output.txt");
    await writeFile(summary, "", "utf8");
    await writeFile(output, "", "utf8");
    vi.stubEnv("GITHUB_WORKSPACE", repository);
    vi.stubEnv("GITHUB_STEP_SUMMARY", summary);
    vi.stubEnv("GITHUB_OUTPUT", output);
    vi.stubEnv("INPUT_CONFIG", ".mergereceipt.yml");

    await runAction();

    expect(await readFile(summary, "utf8")).toContain(
      "# MergeReceipt Evidence Report"
    );
    expect(await readFile(output, "utf8")).toContain("verdict=PASS");
    expect(process.exitCode).toBe(0);
  });

  it("rejects a working-directory symlink that escapes the workspace", async () => {
    const repository = await createGitRepository();
    const outside = await createTempDirectory();
    const summary = join(repository, "summary.md");
    await writeFile(summary, "", "utf8");
    await symlink(
      outside,
      join(repository, "escape"),
      process.platform === "win32" ? "junction" : "dir"
    );
    vi.stubEnv("GITHUB_WORKSPACE", repository);
    vi.stubEnv("GITHUB_STEP_SUMMARY", summary);
    vi.stubEnv("INPUT_WORKING-DIRECTORY", "escape");

    await runAction();

    expect(await readFile(summary, "utf8")).toContain(
      "working\\-directory must stay inside GITHUB\\_WORKSPACE"
    );
    expect(process.exitCode).toBe(2);
  });

  it("refuses pull_request_target before executing repository code", async () => {
    const repository = await createGitRepository();
    const summary = join(repository, "summary.md");
    await writeFile(summary, "", "utf8");
    vi.stubEnv("GITHUB_WORKSPACE", repository);
    vi.stubEnv("GITHUB_STEP_SUMMARY", summary);
    vi.stubEnv("GITHUB_EVENT_NAME", "pull_request_target");

    await runAction();

    expect(await readFile(summary, "utf8")).toContain(
      "MergeReceipt refuses to run on pull\\_request\\_target"
    );
    expect(process.exitCode).toBe(2);
  });

  it("rejects a config symlink that escapes the workspace", async () => {
    const repository = await createGitRepository();
    const outside = await createTempDirectory();
    const summary = join(repository, "summary.md");
    await writeFile(summary, "", "utf8");
    await writeFile(
      join(outside, ".mergereceipt.yml"),
      "version: 1\nchecks: {}\n",
      "utf8"
    );
    await symlink(
      outside,
      join(repository, "external-config"),
      process.platform === "win32" ? "junction" : "dir"
    );
    vi.stubEnv("GITHUB_WORKSPACE", repository);
    vi.stubEnv("GITHUB_STEP_SUMMARY", summary);
    vi.stubEnv("INPUT_CONFIG", "external-config/.mergereceipt.yml");

    await runAction();

    expect(await readFile(summary, "utf8")).toContain(
      "config must stay inside GITHUB\\_WORKSPACE"
    );
    expect(process.exitCode).toBe(2);
  });

  it("checks the default config real path before reading it", async () => {
    const repository = await createGitRepository();
    const outside = await createTempDirectory();
    const summary = join(repository, "summary.md");
    await writeFile(summary, "", "utf8");
    await symlink(
      outside,
      join(repository, ".mergereceipt.yml"),
      process.platform === "win32" ? "junction" : "dir"
    );
    vi.stubEnv("GITHUB_WORKSPACE", repository);
    vi.stubEnv("GITHUB_STEP_SUMMARY", summary);

    await runAction();

    expect(await readFile(summary, "utf8")).toContain(
      "config must stay inside GITHUB\\_WORKSPACE"
    );
    expect(process.exitCode).toBe(2);
  });
});
