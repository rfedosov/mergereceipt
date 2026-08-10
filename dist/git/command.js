"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runGit = runGit;
exports.requireGit = requireGit;
const node_child_process_1 = require("node:child_process");
const errors_1 = require("../errors");
const MAX_GIT_OUTPUT_BYTES = 16 * 1024 * 1024;
const GIT_COMMAND_TIMEOUT_MS = 2 * 60 * 1_000;
async function runGit(args, cwd) {
    return await new Promise((resolve, reject) => {
        const child = (0, node_child_process_1.spawn)("git", [...args], {
            cwd,
            env: {
                ...process.env,
                GIT_TERMINAL_PROMPT: "0",
                GCM_INTERACTIVE: "Never"
            },
            shell: false,
            windowsHide: true,
            stdio: ["ignore", "pipe", "pipe"]
        });
        const stdoutChunks = [];
        const stderrChunks = [];
        let stdoutBytes = 0;
        let stderrBytes = 0;
        let timedOut = false;
        const timeout = setTimeout(() => {
            timedOut = true;
            child.kill("SIGKILL");
        }, GIT_COMMAND_TIMEOUT_MS);
        timeout.unref();
        child.stdout.on("data", (chunk) => {
            stdoutBytes += chunk.length;
            if (stdoutBytes > MAX_GIT_OUTPUT_BYTES) {
                child.kill("SIGKILL");
                return;
            }
            stdoutChunks.push(chunk);
        });
        child.stderr.on("data", (chunk) => {
            stderrBytes += chunk.length;
            if (stderrBytes <= MAX_GIT_OUTPUT_BYTES) {
                stderrChunks.push(chunk);
            }
        });
        child.on("error", (error) => {
            clearTimeout(timeout);
            reject(new errors_1.MergeReceiptError("Unable to execute git.", { cause: error }));
        });
        child.on("close", (exitCode) => {
            clearTimeout(timeout);
            if (timedOut) {
                reject(new errors_1.MergeReceiptError(`Git command timed out after ${String(GIT_COMMAND_TIMEOUT_MS)} ms.`));
                return;
            }
            if (stdoutBytes > MAX_GIT_OUTPUT_BYTES) {
                reject(new errors_1.MergeReceiptError("Git output exceeded the 16 MiB safety limit."));
                return;
            }
            resolve({
                exitCode: exitCode ?? 1,
                stdout: Buffer.concat(stdoutChunks),
                stderr: Buffer.concat(stderrChunks).toString("utf8").trim()
            });
        });
    });
}
async function requireGit(args, cwd, description) {
    const result = await runGit(args, cwd);
    if (result.exitCode !== 0) {
        const detail = result.stderr.length > 0 ? `: ${result.stderr}` : "";
        throw new errors_1.MergeReceiptError(`${description}${detail}`);
    }
    return result;
}
