import { spawn, type ChildProcess } from "node:child_process";

import {
  MAX_CAPTURED_OUTPUT_BYTES,
  MAX_SUMMARY_CHARACTERS
} from "../constants";
import type { CommandCheckConfig } from "../config/schema";
import type { Evidence } from "../types";

export interface CommandExecutionResult {
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly durationMs: number;
  readonly timedOut: boolean;
  readonly stdout: string;
  readonly stderr: string;
  readonly stdoutTruncated: boolean;
  readonly stderrTruncated: boolean;
  readonly spawnError?: string;
}

export interface RunCommandOptions {
  readonly cwd: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly maxOutputBytes?: number;
}

export async function runCommand(
  command: string,
  timeoutMs: number,
  options: RunCommandOptions
): Promise<CommandExecutionResult> {
  const startedAt = process.hrtime.bigint();
  const maxOutputBytes =
    options.maxOutputBytes ?? MAX_CAPTURED_OUTPUT_BYTES;
  const stdout = new BoundedTailBuffer(maxOutputBytes);
  const stderr = new BoundedTailBuffer(maxOutputBytes);

  return await new Promise<CommandExecutionResult>((resolve) => {
    let timedOut = false;
    let spawnError: string | undefined;
    let forceKillTimer: NodeJS.Timeout | undefined;

    const child = spawn(command, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      shell: true,
      windowsHide: true,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"]
    });

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout.append(chunk);
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr.append(chunk);
    });
    child.on("error", (error) => {
      spawnError = error.message;
    });

    const timeout = setTimeout(() => {
      timedOut = true;
      terminateProcessTree(child, "SIGTERM");
      forceKillTimer = setTimeout(() => {
        terminateProcessTree(child, "SIGKILL");
      }, 2_000);
      forceKillTimer.unref();
    }, timeoutMs);
    timeout.unref();

    child.on("close", (exitCode, signal) => {
      clearTimeout(timeout);
      if (forceKillTimer !== undefined) {
        clearTimeout(forceKillTimer);
      }
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const result: CommandExecutionResult = {
        exitCode,
        signal,
        durationMs: Math.round(durationMs),
        timedOut,
        stdout: stdout.toString(),
        stderr: stderr.toString(),
        stdoutTruncated: stdout.truncated,
        stderrTruncated: stderr.truncated
      };
      resolve(spawnError === undefined ? result : { ...result, spawnError });
    });
  });
}

export async function collectCommandEvidence(
  name: string,
  check: CommandCheckConfig,
  options: RunCommandOptions
): Promise<Evidence> {
  const result = await runCommand(check.command, check.timeoutMs, options);
  const passed =
    result.exitCode === 0 && !result.timedOut && result.spawnError === undefined;
  const stdoutSummary = summarizeOutput(result.stdout);
  const stderrSummary = summarizeOutput(result.stderr);
  const details = formatOutputDetails(stdoutSummary, stderrSummary);
  const description = passed
    ? "Command exited successfully."
    : commandFailureDescription(result, check.timeoutMs);

  const evidence: Evidence = {
    id: `check.${name}`,
    name: displayCheckName(name),
    category: "command",
    status: passed ? "passed" : "failed",
    description,
    required: check.required,
    deterministic: true,
    durationMs: result.durationMs,
    data: {
      command: check.command,
      exitCode: result.exitCode,
      signal: result.signal,
      timedOut: result.timedOut,
      stdoutSummary,
      stderrSummary,
      stdoutTruncated: result.stdoutTruncated,
      stderrTruncated: result.stderrTruncated
    }
  };
  return details.length === 0 ? evidence : { ...evidence, details };
}

export function summarizeOutput(output: string): string {
  const normalized = sanitizeTerminalText(output)
    .replace(/\r\n?/g, "\n")
    .trim();
  if (normalized.length <= MAX_SUMMARY_CHARACTERS) {
    return normalized;
  }
  return `… ${normalized.slice(-MAX_SUMMARY_CHARACTERS)}`;
}

export function sanitizeTerminalText(value: string): string {
  const escapeCharacter = String.fromCharCode(27);
  const ansiPattern = new RegExp(
    `${escapeCharacter}\\[[0-?]*[ -/]*[@-~]`,
    "g"
  );
  const withoutAnsi = value.replace(ansiPattern, "");
  let safe = "";
  for (const character of withoutAnsi) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (
      character === "\n" ||
      character === "\t" ||
      (codePoint >= 32 &&
        codePoint !== 127 &&
        (codePoint < 128 || codePoint > 159))
    ) {
      safe += character;
    }
  }
  return safe;
}

function terminateProcessTree(
  child: ChildProcess,
  signal: NodeJS.Signals
): void {
  if (child.pid === undefined) {
    return;
  }
  try {
    if (process.platform !== "win32") {
      process.kill(-child.pid, signal);
    } else {
      const killer = spawn(
        "taskkill",
        ["/pid", String(child.pid), "/T", "/F"],
        { windowsHide: true, stdio: "ignore" }
      );
      killer.unref();
    }
  } catch {
    // The process may have exited between the timeout and the signal.
  }
}

function commandFailureDescription(
  result: CommandExecutionResult,
  timeoutMs: number
): string {
  if (result.timedOut) {
    return `Command timed out after ${timeoutMs} ms.`;
  }
  if (result.spawnError !== undefined) {
    return `Command could not start: ${result.spawnError}`;
  }
  if (result.signal !== null) {
    return `Command terminated by ${result.signal}.`;
  }
  return `Command exited with code ${String(result.exitCode)}.`;
}

function formatOutputDetails(stdout: string, stderr: string): string {
  const sections: string[] = [];
  if (stdout.length > 0) {
    sections.push(`stdout:\n${stdout}`);
  }
  if (stderr.length > 0) {
    sections.push(`stderr:\n${stderr}`);
  }
  return sections.join("\n\n");
}

function displayCheckName(name: string): string {
  if (name === "typecheck") {
    return "Typecheck";
  }
  return name
    .split(/[-_]/u)
    .filter((part) => part.length > 0)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

class BoundedTailBuffer {
  private buffer: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  public truncated = false;

  public constructor(private readonly maximumBytes: number) {}

  public append(value: Buffer | string): void {
    const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
    if (chunk.length >= this.maximumBytes) {
      this.buffer = chunk.subarray(chunk.length - this.maximumBytes);
      this.truncated = true;
      return;
    }

    const excess = this.buffer.length + chunk.length - this.maximumBytes;
    if (excess > 0) {
      this.buffer = this.buffer.subarray(excess);
      this.truncated = true;
    }
    this.buffer = Buffer.concat([this.buffer, chunk]);
  }

  public toString(): string {
    return this.buffer.toString("utf8");
  }
}
