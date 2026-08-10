import { readFile, stat } from "node:fs/promises";

import { MergeReceiptError } from "../errors";
import { requireGit, runGit } from "./command";

const FULL_SHA_PATTERN = /^[0-9a-f]{40,64}$/iu;
const EMPTY_TREE = "EMPTY_TREE";

export interface ChangedFilesOptions {
  readonly cwd: string;
  readonly base?: string;
  readonly includeUncommitted?: boolean;
  readonly env?: NodeJS.ProcessEnv;
}

export interface ChangedFilesResult {
  readonly root: string;
  readonly base: string;
  readonly head: string;
  readonly files: readonly string[];
}

interface BaseRevision {
  readonly label: string;
  readonly sha: string;
}

export async function collectChangedFiles(
  options: ChangedFilesOptions
): Promise<ChangedFilesResult> {
  const rootResult = await requireGit(
    ["rev-parse", "--show-toplevel"],
    options.cwd,
    "MergeReceipt must run inside a git repository"
  );
  const root = removeTrailingLineEnding(rootResult.stdout.toString("utf8"));
  const head = await resolveRevision("HEAD", root);

  if (head === undefined) {
    const files =
      options.includeUncommitted === false
        ? []
        : await collectUnbornRepositoryFiles(root);
    return {
      root,
      base: EMPTY_TREE,
      head: "UNBORN",
      files: sortPaths(files)
    };
  }

  const base = await selectBaseRevision({ ...options, cwd: root }, head);
  const committedFiles =
    base.sha === head
      ? []
      : await diffFiles(await comparisonRevision(base.sha, head, root), head, root);
  const workingFiles =
    options.includeUncommitted === false
      ? []
      : await collectWorkingTreeFiles(root, head);

  return {
    root,
    base: base.label,
    head,
    files: sortPaths([...committedFiles, ...workingFiles])
  };
}

async function selectBaseRevision(
  options: ChangedFilesOptions,
  head: string
): Promise<BaseRevision> {
  if (options.base !== undefined) {
    validateRevisionInput(options.base);
    const explicit = await resolveRevision(options.base, options.cwd);
    if (explicit === undefined) {
      throw new MergeReceiptError(
        `Configured base revision '${options.base}' does not resolve to a commit.`
      );
    }
    return { label: options.base, sha: explicit };
  }

  const env = options.env ?? process.env;
  const eventBaseSha = await readGitHubBaseSha(env);
  if (eventBaseSha !== undefined) {
    const available = await ensureGitHubCommit(eventBaseSha, options.cwd, env);
    if (available) {
      return { label: eventBaseSha, sha: eventBaseSha };
    }
  }

  const githubBase = env["GITHUB_BASE_REF"];
  if (githubBase !== undefined && githubBase.length > 0) {
    validateRevisionInput(githubBase);
    await validateBranchName(githubBase, options.cwd);
    const references = [
      `refs/remotes/origin/${githubBase}`,
      `origin/${githubBase}`,
      githubBase
    ];
    for (const reference of references) {
      const sha = await resolveRevision(reference, options.cwd);
      if (sha !== undefined) {
        return { label: reference, sha };
      }
    }
    if (env["GITHUB_ACTIONS"] === "true") {
      await fetchGitHubBranch(githubBase, options.cwd);
      const fetchedReference = `refs/remotes/origin/${githubBase}`;
      const fetched = await resolveRevision(fetchedReference, options.cwd);
      if (fetched !== undefined) {
        return { label: fetchedReference, sha: fetched };
      }
    }
    if (isGitHubPullRequest(env)) {
      throw new MergeReceiptError(
        `Unable to resolve GitHub pull request base branch '${githubBase}'. ` +
          "Use actions/checkout with sufficient history or provide the base SHA."
      );
    }
  }

  const candidates = [
    "refs/remotes/origin/HEAD",
    "refs/remotes/origin/main",
    "refs/remotes/origin/master",
    "main",
    "master"
  ];
  for (const candidate of candidates) {
    const sha = await resolveRevision(candidate, options.cwd);
    if (sha !== undefined) {
      return { label: candidate, sha };
    }
  }

  if (isGitHubPullRequest(env)) {
    throw new MergeReceiptError(
      "Unable to resolve the GitHub pull request base commit. " +
        "Use actions/checkout with sufficient history and keep pull request metadata available."
    );
  }

  const parent = await resolveRevision("HEAD~1", options.cwd);
  if (parent !== undefined) {
    return { label: "HEAD~1", sha: parent };
  }
  return { label: head, sha: head };
}

async function comparisonRevision(
  base: string,
  head: string,
  cwd: string
): Promise<string> {
  const mergeBase = await runGit(["merge-base", base, head], cwd);
  if (mergeBase.exitCode !== 0) {
    return base;
  }
  const value = mergeBase.stdout.toString("utf8").trim();
  return FULL_SHA_PATTERN.test(value) ? value : base;
}

async function resolveRevision(
  revision: string,
  cwd: string
): Promise<string | undefined> {
  validateRevisionInput(revision);
  const result = await runGit(
    ["rev-parse", "--verify", `${revision}^{commit}`],
    cwd
  );
  if (result.exitCode !== 0) {
    return undefined;
  }
  const sha = result.stdout.toString("utf8").trim();
  return FULL_SHA_PATTERN.test(sha) ? sha : undefined;
}

function validateRevisionInput(revision: string): void {
  if (
    revision.length === 0 ||
    revision.length > 500 ||
    revision.startsWith("-") ||
    hasUnsafeRevisionCharacters(revision)
  ) {
    throw new MergeReceiptError("Unsafe git base revision.");
  }
}

async function diffFiles(
  base: string,
  head: string,
  cwd: string
): Promise<readonly string[]> {
  const result = await requireGit(
    [
      "diff",
      "--name-only",
      "-z",
      "--diff-filter=ACMRDT",
      "-M",
      base,
      head,
      "--"
    ],
    cwd,
    "Unable to inspect committed changes"
  );
  return parseNullSeparatedPaths(result.stdout);
}

async function collectWorkingTreeFiles(
  cwd: string,
  head: string
): Promise<readonly string[]> {
  const tracked = await requireGit(
    [
      "diff",
      "--name-only",
      "-z",
      "--diff-filter=ACMRDT",
      "-M",
      head,
      "--"
    ],
    cwd,
    "Unable to inspect working tree changes"
  );
  const untracked = await requireGit(
    ["ls-files", "--others", "--exclude-standard", "-z"],
    cwd,
    "Unable to inspect untracked files"
  );
  return [
    ...parseNullSeparatedPaths(tracked.stdout),
    ...parseNullSeparatedPaths(untracked.stdout)
  ];
}

async function collectUnbornRepositoryFiles(
  cwd: string
): Promise<readonly string[]> {
  const result = await requireGit(
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    cwd,
    "Unable to inspect files in an unborn repository"
  );
  return parseNullSeparatedPaths(result.stdout);
}

function parseNullSeparatedPaths(output: Buffer): readonly string[] {
  return output
    .toString("utf8")
    .split("\0")
    .filter((path) => path.length > 0)
    .map((path) => path.replaceAll("\\", "/"));
}

function sortPaths(paths: readonly string[]): readonly string[] {
  return [...new Set(paths)].sort((left, right) => {
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
  });
}

async function readGitHubBaseSha(
  env: NodeJS.ProcessEnv
): Promise<string | undefined> {
  const eventPath = env["GITHUB_EVENT_PATH"];
  if (eventPath === undefined || eventPath.length === 0) {
    return undefined;
  }
  try {
    const metadata = await stat(eventPath);
    if (!metadata.isFile() || metadata.size > 1024 * 1024) {
      return undefined;
    }
    const contents = await readFile(eventPath, "utf8");
    if (Buffer.byteLength(contents) > 1024 * 1024) {
      return undefined;
    }
    const event: unknown = JSON.parse(contents);
    const sha = nestedString(event, ["pull_request", "base", "sha"]);
    return sha !== undefined && FULL_SHA_PATTERN.test(sha) ? sha : undefined;
  } catch {
    return undefined;
  }
}

function isGitHubPullRequest(env: NodeJS.ProcessEnv): boolean {
  return (
    env["GITHUB_ACTIONS"] === "true" &&
    (env["GITHUB_EVENT_NAME"] === "pull_request" ||
      env["GITHUB_EVENT_NAME"] === "pull_request_target" ||
      (env["GITHUB_BASE_REF"]?.length ?? 0) > 0)
  );
}

async function ensureGitHubCommit(
  sha: string,
  cwd: string,
  env: NodeJS.ProcessEnv
): Promise<boolean> {
  if ((await resolveRevision(sha, cwd)) !== undefined) {
    return true;
  }
  if (env["GITHUB_ACTIONS"] !== "true") {
    return false;
  }
  const fetch = await runGit(["fetch", "--no-tags", "--depth=1", "origin", sha], cwd);
  return fetch.exitCode === 0 && (await resolveRevision(sha, cwd)) !== undefined;
}

async function fetchGitHubBranch(branch: string, cwd: string): Promise<void> {
  const source = `refs/heads/${branch}`;
  const destination = `refs/remotes/origin/${branch}`;
  await runGit(
    ["fetch", "--no-tags", "--depth=1", "origin", `+${source}:${destination}`],
    cwd
  );
}

async function validateBranchName(branch: string, cwd: string): Promise<void> {
  if (branch.includes("@{")) {
    throw new MergeReceiptError("Invalid GITHUB_BASE_REF branch name.");
  }
  const result = await runGit(["check-ref-format", "--branch", branch], cwd);
  if (result.exitCode !== 0) {
    throw new MergeReceiptError("Invalid GITHUB_BASE_REF branch name.");
  }
}

function nestedString(
  value: unknown,
  path: readonly string[]
): string | undefined {
  let current = value;
  for (const part of path) {
    if (typeof current !== "object" || current === null || Array.isArray(current)) {
      return undefined;
    }
    current = Reflect.get(current, part);
  }
  return typeof current === "string" ? current : undefined;
}

function hasUnsafeRevisionCharacters(revision: string): boolean {
  for (const character of revision) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 31 || codePoint === 127) {
      return true;
    }
  }
  return false;
}

function removeTrailingLineEnding(value: string): string {
  if (value.endsWith("\r\n")) return value.slice(0, -2);
  if (value.endsWith("\n")) return value.slice(0, -1);
  return value;
}
