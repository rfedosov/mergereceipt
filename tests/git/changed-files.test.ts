import { afterEach, describe, expect, it } from "vitest";
import { pathToFileURL } from "node:url";

import { collectChangedFiles } from "../../src/git/changed-files";
import {
  commitAll,
  createGitRepository,
  runGit,
  writeRepositoryFile
} from "../helpers/repository";
import {
  cleanupTempDirectories,
  createTempDirectory
} from "../helpers/temp";

afterEach(cleanupTempDirectories);

describe("changed-file discovery", () => {
  it("compares a feature branch with an explicit base", async () => {
    const repository = await createGitRepository();
    await writeRepositoryFile(repository, "src/original.ts", "export const n = 1;\n");
    commitAll(repository, "base");
    runGit(repository, ["switch", "--create", "feature"]);
    await writeRepositoryFile(repository, "src/original.ts", "export const n = 2;\n");
    await writeRepositoryFile(repository, "src/new.ts", "export const value = true;\n");
    commitAll(repository, "feature");

    const changed = await collectChangedFiles({ cwd: repository, base: "main" });

    expect(changed.base).toBe("main");
    expect(changed.files).toEqual(["src/new.ts", "src/original.ts"]);
  });

  it("uses the exact base SHA from a normal GitHub pull request event", async () => {
    const repository = await createGitRepository();
    await writeRepositoryFile(repository, "README.md", "base\n");
    const baseSha = commitAll(repository, "base");
    runGit(repository, ["switch", "--create", "feature"]);
    await writeRepositoryFile(repository, "src/normal.ts", "export const pr = true;\n");
    commitAll(repository, "normal PR feature");
    const eventPath = `${repository}/event.json`;
    await writeRepositoryFile(
      repository,
      "event.json",
      JSON.stringify({ pull_request: { base: { sha: baseSha } } })
    );

    const changed = await collectChangedFiles({
      cwd: repository,
      includeUncommitted: false,
      env: {
        ...process.env,
        GITHUB_ACTIONS: "true",
        GITHUB_EVENT_NAME: "pull_request",
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_BASE_REF: "main"
      }
    });

    expect(changed.base).toBe(baseSha);
    expect(changed.files).toEqual(["src/normal.ts"]);
  });

  it("includes staged, unstaged, untracked, and unusual file names safely", async () => {
    const repository = await createGitRepository();
    await writeRepositoryFile(repository, "README.md", "base\n");
    commitAll(repository, "base");
    await writeRepositoryFile(repository, "README.md", "changed\n");
    await writeRepositoryFile(repository, "-option.ts", "export {};\n");
    const unusualPath =
      process.platform === "win32"
        ? "src/path with spaces.ts"
        : "src/line\nbreak.ts";
    await writeRepositoryFile(repository, unusualPath, "export {};\n");

    const changed = await collectChangedFiles({ cwd: repository, base: "main" });

    expect(changed.files).toContain("-option.ts");
    expect(changed.files).toContain("README.md");
    expect(changed.files).toContain(unusualPath);
  });

  it("supports an unborn repository", async () => {
    const repository = await createGitRepository();
    await writeRepositoryFile(repository, "src/first.ts", "export {};\n");

    const changed = await collectChangedFiles({ cwd: repository });

    expect(changed.base).toBe("EMPTY_TREE");
    expect(changed.head).toBe("UNBORN");
    expect(changed.files).toEqual(["src/first.ts"]);
  });

  it("rejects revision values that could be interpreted as git options", async () => {
    const repository = await createGitRepository();
    await writeRepositoryFile(repository, "README.md", "base\n");
    commitAll(repository, "base");

    await expect(
      collectChangedFiles({ cwd: repository, base: "--output=/tmp/problem" })
    ).rejects.toThrow(/Unsafe git base revision/u);
  });

  it("rejects an explicit base that does not resolve", async () => {
    const repository = await createGitRepository();
    await writeRepositoryFile(repository, "README.md", "base\n");
    commitAll(repository, "base");

    await expect(
      collectChangedFiles({ cwd: repository, base: "missing-base" })
    ).rejects.toThrow(/does not resolve to a commit/u);
  });

  it("rejects an invalid GitHub base branch before constructing a refspec", async () => {
    const repository = await createGitRepository();
    await writeRepositoryFile(repository, "README.md", "base\n");
    commitAll(repository, "base");

    await expect(
      collectChangedFiles({
        cwd: repository,
        env: {
          ...process.env,
          GITHUB_ACTIONS: "true",
          GITHUB_BASE_REF: "bad:branch"
        }
      })
    ).rejects.toThrow(/Invalid GITHUB_BASE_REF/u);
  });

  it("resolves a fork PR base in a shallow detached checkout", async () => {
    const fixture = await createPullRequestCheckout();
    const eventPath = `${fixture.runner}/event.json`;
    await writeRepositoryFile(
      fixture.runner,
      "event.json",
      JSON.stringify({
        pull_request: {
          base: { sha: fixture.baseSha },
          head: {
            repo: { fork: true, full_name: "external-contributor/mergereceipt" }
          }
        }
      })
    );

    expect(runGit(fixture.runner, ["rev-parse", "--is-shallow-repository"])).toBe(
      "true"
    );
    expect(() => runGit(fixture.runner, ["symbolic-ref", "-q", "HEAD"])).toThrow();

    const changed = await collectChangedFiles({
      cwd: fixture.runner,
      includeUncommitted: false,
      env: {
        ...process.env,
        GITHUB_ACTIONS: "true",
        GITHUB_EVENT_NAME: "pull_request",
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_BASE_REF: "main"
      }
    });

    expect(changed.base).toBe(fixture.baseSha);
    expect(changed.files).toEqual(["src/auth/session.ts"]);
  });

  it("fetches the named base branch when PR metadata has no base SHA", async () => {
    const fixture = await createPullRequestCheckout();
    const eventPath = `${fixture.runner}/event.json`;
    await writeRepositoryFile(
      fixture.runner,
      "event.json",
      JSON.stringify({ pull_request: { base: {}, head: { repo: { fork: true } } } })
    );

    const changed = await collectChangedFiles({
      cwd: fixture.runner,
      includeUncommitted: false,
      env: {
        ...process.env,
        GITHUB_ACTIONS: "true",
        GITHUB_EVENT_NAME: "pull_request",
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_BASE_REF: "main"
      }
    });

    expect(changed.base).toBe("refs/remotes/origin/main");
    expect(changed.files).toEqual(["src/auth/session.ts"]);
  });

  it("fails closed when a GitHub PR base is unavailable", async () => {
    const repository = await createGitRepository();
    await writeRepositoryFile(repository, "README.md", "base\n");
    commitAll(repository, "base");
    runGit(repository, ["checkout", "--detach", "HEAD"]);

    await expect(
      collectChangedFiles({
        cwd: repository,
        includeUncommitted: false,
        env: {
          ...process.env,
          GITHUB_ACTIONS: "true",
          GITHUB_EVENT_NAME: "pull_request",
          GITHUB_BASE_REF: "unavailable-base"
        }
      })
    ).rejects.toThrow(/Unable to resolve GitHub pull request base branch/u);
  });

  it("uses the previous commit in a local repository without an upstream", async () => {
    const repository = await createGitRepository();
    await writeRepositoryFile(repository, "README.md", "base\n");
    commitAll(repository, "base");
    runGit(repository, ["switch", "--create", "work"]);
    runGit(repository, ["branch", "--delete", "--force", "main"]);
    await writeRepositoryFile(repository, "src/local.ts", "export const local = true;\n");
    commitAll(repository, "local change");

    const changed = await collectChangedFiles({
      cwd: repository,
      includeUncommitted: false,
      env: { ...process.env, GITHUB_ACTIONS: "false" }
    });

    expect(changed.base).toBe("HEAD~1");
    expect(changed.files).toEqual(["src/local.ts"]);
  });
});

interface PullRequestCheckout {
  readonly runner: string;
  readonly baseSha: string;
}

async function createPullRequestCheckout(): Promise<PullRequestCheckout> {
  const baseRepository = await createGitRepository();
  await writeRepositoryFile(baseRepository, "README.md", "base\n");
  const baseSha = commitAll(baseRepository, "base");

  const origin = await createTempDirectory();
  runGit(origin, ["init", "--bare", "--initial-branch=main"]);
  const originUrl = pathToFileURL(origin).href;
  runGit(baseRepository, ["remote", "add", "origin", originUrl]);
  runGit(baseRepository, ["push", "--set-upstream", "origin", "main"]);

  const contributor = await createTempDirectory();
  runGit(contributor, ["clone", originUrl, "."]);
  runGit(contributor, ["config", "user.email", "mergereceipt-tests@localhost"]);
  runGit(contributor, ["config", "user.name", "MergeReceipt Fork Fixture"]);
  runGit(contributor, ["switch", "--create", "feature"]);
  await writeRepositoryFile(
    contributor,
    "src/auth/session.ts",
    "export const authenticated = true;\n"
  );
  commitAll(contributor, "fork feature");
  runGit(contributor, ["push", "origin", "feature"]);

  runGit(baseRepository, ["fetch", "origin", "feature"]);
  runGit(baseRepository, ["merge", "--no-ff", "--no-edit", "origin/feature"]);
  runGit(baseRepository, ["push", "origin", "HEAD:refs/pull/1/merge"]);

  const runner = await createTempDirectory();
  runGit(runner, ["init", "--initial-branch=runner"]);
  runGit(runner, ["remote", "add", "origin", originUrl]);
  runGit(runner, ["fetch", "--depth=1", "origin", "refs/pull/1/merge"]);
  runGit(runner, ["checkout", "--detach", "FETCH_HEAD"]);

  return { runner, baseSha };
}
