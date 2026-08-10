"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectChangedFiles = collectChangedFiles;
const promises_1 = require("node:fs/promises");
const errors_1 = require("../errors");
const command_1 = require("./command");
const FULL_SHA_PATTERN = /^[0-9a-f]{40,64}$/iu;
const EMPTY_TREE = "EMPTY_TREE";
async function collectChangedFiles(options) {
    const rootResult = await (0, command_1.requireGit)(["rev-parse", "--show-toplevel"], options.cwd, "MergeReceipt must run inside a git repository");
    const root = removeTrailingLineEnding(rootResult.stdout.toString("utf8"));
    const head = await resolveRevision("HEAD", root);
    if (head === undefined) {
        const files = options.includeUncommitted === false
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
    const committedFiles = base.sha === head
        ? []
        : await diffFiles(await comparisonRevision(base.sha, head, root), head, root);
    const workingFiles = options.includeUncommitted === false
        ? []
        : await collectWorkingTreeFiles(root, head);
    return {
        root,
        base: base.label,
        head,
        files: sortPaths([...committedFiles, ...workingFiles])
    };
}
async function selectBaseRevision(options, head) {
    if (options.base !== undefined) {
        validateRevisionInput(options.base);
        const explicit = await resolveRevision(options.base, options.cwd);
        if (explicit === undefined) {
            throw new errors_1.MergeReceiptError(`Configured base revision '${options.base}' does not resolve to a commit.`);
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
            throw new errors_1.MergeReceiptError(`Unable to resolve GitHub pull request base branch '${githubBase}'. ` +
                "Use actions/checkout with sufficient history or provide the base SHA.");
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
        throw new errors_1.MergeReceiptError("Unable to resolve the GitHub pull request base commit. " +
            "Use actions/checkout with sufficient history and keep pull request metadata available.");
    }
    const parent = await resolveRevision("HEAD~1", options.cwd);
    if (parent !== undefined) {
        return { label: "HEAD~1", sha: parent };
    }
    return { label: head, sha: head };
}
async function comparisonRevision(base, head, cwd) {
    const mergeBase = await (0, command_1.runGit)(["merge-base", base, head], cwd);
    if (mergeBase.exitCode !== 0) {
        return base;
    }
    const value = mergeBase.stdout.toString("utf8").trim();
    return FULL_SHA_PATTERN.test(value) ? value : base;
}
async function resolveRevision(revision, cwd) {
    validateRevisionInput(revision);
    const result = await (0, command_1.runGit)(["rev-parse", "--verify", `${revision}^{commit}`], cwd);
    if (result.exitCode !== 0) {
        return undefined;
    }
    const sha = result.stdout.toString("utf8").trim();
    return FULL_SHA_PATTERN.test(sha) ? sha : undefined;
}
function validateRevisionInput(revision) {
    if (revision.length === 0 ||
        revision.length > 500 ||
        revision.startsWith("-") ||
        hasUnsafeRevisionCharacters(revision)) {
        throw new errors_1.MergeReceiptError("Unsafe git base revision.");
    }
}
async function diffFiles(base, head, cwd) {
    const result = await (0, command_1.requireGit)([
        "diff",
        "--name-only",
        "-z",
        "--diff-filter=ACMRDT",
        "-M",
        base,
        head,
        "--"
    ], cwd, "Unable to inspect committed changes");
    return parseNullSeparatedPaths(result.stdout);
}
async function collectWorkingTreeFiles(cwd, head) {
    const tracked = await (0, command_1.requireGit)([
        "diff",
        "--name-only",
        "-z",
        "--diff-filter=ACMRDT",
        "-M",
        head,
        "--"
    ], cwd, "Unable to inspect working tree changes");
    const untracked = await (0, command_1.requireGit)(["ls-files", "--others", "--exclude-standard", "-z"], cwd, "Unable to inspect untracked files");
    return [
        ...parseNullSeparatedPaths(tracked.stdout),
        ...parseNullSeparatedPaths(untracked.stdout)
    ];
}
async function collectUnbornRepositoryFiles(cwd) {
    const result = await (0, command_1.requireGit)(["ls-files", "--cached", "--others", "--exclude-standard", "-z"], cwd, "Unable to inspect files in an unborn repository");
    return parseNullSeparatedPaths(result.stdout);
}
function parseNullSeparatedPaths(output) {
    return output
        .toString("utf8")
        .split("\0")
        .filter((path) => path.length > 0)
        .map((path) => path.replaceAll("\\", "/"));
}
function sortPaths(paths) {
    return [...new Set(paths)].sort((left, right) => {
        if (left < right)
            return -1;
        if (left > right)
            return 1;
        return 0;
    });
}
async function readGitHubBaseSha(env) {
    const eventPath = env["GITHUB_EVENT_PATH"];
    if (eventPath === undefined || eventPath.length === 0) {
        return undefined;
    }
    try {
        const metadata = await (0, promises_1.stat)(eventPath);
        if (!metadata.isFile() || metadata.size > 1024 * 1024) {
            return undefined;
        }
        const contents = await (0, promises_1.readFile)(eventPath, "utf8");
        if (Buffer.byteLength(contents) > 1024 * 1024) {
            return undefined;
        }
        const event = JSON.parse(contents);
        const sha = nestedString(event, ["pull_request", "base", "sha"]);
        return sha !== undefined && FULL_SHA_PATTERN.test(sha) ? sha : undefined;
    }
    catch {
        return undefined;
    }
}
function isGitHubPullRequest(env) {
    return (env["GITHUB_ACTIONS"] === "true" &&
        (env["GITHUB_EVENT_NAME"] === "pull_request" ||
            env["GITHUB_EVENT_NAME"] === "pull_request_target" ||
            (env["GITHUB_BASE_REF"]?.length ?? 0) > 0));
}
async function ensureGitHubCommit(sha, cwd, env) {
    if ((await resolveRevision(sha, cwd)) !== undefined) {
        return true;
    }
    if (env["GITHUB_ACTIONS"] !== "true") {
        return false;
    }
    const fetch = await (0, command_1.runGit)(["fetch", "--no-tags", "--depth=1", "origin", sha], cwd);
    return fetch.exitCode === 0 && (await resolveRevision(sha, cwd)) !== undefined;
}
async function fetchGitHubBranch(branch, cwd) {
    const source = `refs/heads/${branch}`;
    const destination = `refs/remotes/origin/${branch}`;
    await (0, command_1.runGit)(["fetch", "--no-tags", "--depth=1", "origin", `+${source}:${destination}`], cwd);
}
async function validateBranchName(branch, cwd) {
    if (branch.includes("@{")) {
        throw new errors_1.MergeReceiptError("Invalid GITHUB_BASE_REF branch name.");
    }
    const result = await (0, command_1.runGit)(["check-ref-format", "--branch", branch], cwd);
    if (result.exitCode !== 0) {
        throw new errors_1.MergeReceiptError("Invalid GITHUB_BASE_REF branch name.");
    }
}
function nestedString(value, path) {
    let current = value;
    for (const part of path) {
        if (typeof current !== "object" || current === null || Array.isArray(current)) {
            return undefined;
        }
        current = Reflect.get(current, part);
    }
    return typeof current === "string" ? current : undefined;
}
function hasUnsafeRevisionCharacters(revision) {
    for (const character of revision) {
        const codePoint = character.codePointAt(0) ?? 0;
        if (codePoint <= 31 || codePoint === 127) {
            return true;
        }
    }
    return false;
}
function removeTrailingLineEnding(value) {
    if (value.endsWith("\r\n"))
        return value.slice(0, -2);
    if (value.endsWith("\n"))
        return value.slice(0, -1);
    return value;
}
