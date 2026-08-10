import { afterEach, describe, expect, it } from "vitest";
import {
  collectCommandEvidence,
  runCommand,
  sanitizeTerminalText
} from "../../src/checks/run-command";
import { cleanupTempDirectories, createTempDirectory } from "../helpers/temp";

afterEach(cleanupTempDirectories);

describe("command execution", () => {
  it("captures exit code, duration, stdout, and stderr", async () => {
    const directory = await createTempDirectory();

    const result = await runCommand(successCommand(), 5_000, { cwd: directory });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("147 passed\n");
    expect(result.stderr).toBe("note\n");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.timedOut).toBe(false);
  });

  it("creates structured failed evidence without throwing", async () => {
    const directory = await createTempDirectory();

    const evidence = await collectCommandEvidence(
      "build",
      { command: failureCommand(), required: true, timeoutMs: 5_000 },
      { cwd: directory }
    );

    expect(evidence.status).toBe("failed");
    expect(evidence.description).toContain("code 7");
    expect(evidence.details).toContain("build failed");
    expect(evidence.data?.["exitCode"]).toBe(7);
  });

  it("times out and terminates a long-running process", async () => {
    const directory = await createTempDirectory();

    const result = await runCommand(timeoutCommand(), 150, { cwd: directory });

    expect(result.timedOut).toBe(true);
    expect(result.durationMs).toBeLessThan(3_000);
  });

  it("retains a bounded tail and strips terminal control sequences", async () => {
    const directory = await createTempDirectory();

    const result = await runCommand(largeOutputCommand(), 5_000, {
      cwd: directory,
      maxOutputBytes: 100
    });

    expect(result.stdout).toHaveLength(100);
    expect(result.stdout.endsWith("TAIL")).toBe(true);
    expect(result.stdoutTruncated).toBe(true);
    expect(sanitizeTerminalText("safe\u001B[31mred\u001B[0m\u0007\u009B")).toBe(
      "safered"
    );
  });
});

function successCommand(): string {
  return `"${process.execPath}" -e "process.stdout.write('147 passed\\n'); process.stderr.write('note\\n')"`;
}

function failureCommand(): string {
  return process.platform === "win32"
    ? "echo build failed 1>&2 & exit /b 7"
    : "printf 'build failed\\n' >&2; exit 7";
}

function timeoutCommand(): string {
  return process.platform === "win32"
    ? "ping 127.0.0.1 -n 30 > nul"
    : "while :; do :; done";
}

function largeOutputCommand(): string {
  if (process.platform === "win32") {
    return `"${process.execPath}" -e "process.stdout.write('x'.repeat(5000) + 'TAIL')"`;
  }
  return `printf '${"x".repeat(5_000)}TAIL'`;
}
