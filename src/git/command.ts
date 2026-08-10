import { spawn } from "node:child_process";

import { MergeReceiptError } from "../errors";

const MAX_GIT_OUTPUT_BYTES = 16 * 1024 * 1024;
const GIT_COMMAND_TIMEOUT_MS = 2 * 60 * 1_000;

export interface GitCommandResult {
  readonly exitCode: number;
  readonly stdout: Buffer;
  readonly stderr: string;
}

export async function runGit(
  args: readonly string[],
  cwd: string
): Promise<GitCommandResult> {
  return await new Promise<GitCommandResult>((resolve, reject) => {
    const child = spawn("git", [...args], {
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
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, GIT_COMMAND_TIMEOUT_MS);
    timeout.unref();

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > MAX_GIT_OUTPUT_BYTES) {
        child.kill("SIGKILL");
        return;
      }
      stdoutChunks.push(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderrBytes += chunk.length;
      if (stderrBytes <= MAX_GIT_OUTPUT_BYTES) {
        stderrChunks.push(chunk);
      }
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(new MergeReceiptError("Unable to execute git.", { cause: error }));
    });
    child.on("close", (exitCode) => {
      clearTimeout(timeout);
      if (timedOut) {
        reject(
          new MergeReceiptError(
            `Git command timed out after ${String(GIT_COMMAND_TIMEOUT_MS)} ms.`
          )
        );
        return;
      }
      if (stdoutBytes > MAX_GIT_OUTPUT_BYTES) {
        reject(new MergeReceiptError("Git output exceeded the 16 MiB safety limit."));
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

export async function requireGit(
  args: readonly string[],
  cwd: string,
  description: string
): Promise<GitCommandResult> {
  const result = await runGit(args, cwd);
  if (result.exitCode !== 0) {
    const detail = result.stderr.length > 0 ? `: ${result.stderr}` : "";
    throw new MergeReceiptError(`${description}${detail}`);
  }
  return result;
}
