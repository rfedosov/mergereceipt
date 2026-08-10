import { appendFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

import { sanitizeTerminalText } from "../checks/run-command";
import { EXIT_CODES } from "../constants";
import { runVerification } from "../core/verify";
import { errorMessage } from "../errors";
import { exitCodeForVerdict } from "../exit-codes";
import { renderMarkdownReport } from "../reporters/markdown";
import { renderTerminalReport } from "../reporters/terminal";

export async function runAction(): Promise<void> {
  const workspace = process.env["GITHUB_WORKSPACE"] ?? process.cwd();
  const workingDirectoryInput = getInput("WORKING-DIRECTORY");
  const configPath = getInput("CONFIG");
  const base = getInput("BASE");

  try {
    if (process.env["GITHUB_EVENT_NAME"] === "pull_request_target") {
      throw new Error(
        "MergeReceipt refuses to run on pull_request_target. Use pull_request without secrets."
      );
    }
    if (
      (workingDirectoryInput !== undefined && isAbsolute(workingDirectoryInput)) ||
      (configPath !== undefined && isAbsolute(configPath))
    ) {
      throw new Error("Action path inputs must be relative to GITHUB_WORKSPACE.");
    }
    const requestedCwd = resolve(workspace, workingDirectoryInput ?? ".");
    const workspaceRoot = await realpath(workspace);
    const cwd = await realpath(requestedCwd);
    assertInsideWorkspace(workspaceRoot, cwd, "working-directory");
    const safeConfigPath = await realpath(
      resolve(cwd, configPath ?? ".mergereceipt.yml")
    );
    assertInsideWorkspace(workspaceRoot, safeConfigPath, "config");
    const failOnReview = getBooleanInput("FAIL-ON-REVIEW", false);
    const report = await runVerification({
      cwd,
      configPath: safeConfigPath,
      ...(base === undefined ? {} : { base })
    });
    process.stdout.write(renderTerminalReport(report, { color: false }));
    await writeSummary(renderMarkdownReport(report));
    await writeOutput("score", String(report.score));
    await writeOutput("verdict", report.verdict);
    process.exitCode = exitCodeForVerdict(report.verdict, { failOnReview });
  } catch (error) {
    const message = errorMessage(error);
    process.stderr.write(
      `MergeReceipt error: ${sanitizeTerminalText(message)}\n`
    );
    try {
      await writeSummary(
        `# MergeReceipt Evidence Report\n\n❌ Runtime error: ${escapeMarkdown(message)}\n`
      );
    } catch (summaryError) {
      process.stderr.write(
        "MergeReceipt could not write the job summary: " +
          `${sanitizeTerminalText(errorMessage(summaryError))}\n`
      );
    }
    process.exitCode = EXIT_CODES.ERROR;
  }
}

function getInput(name: string): string | undefined {
  const value = process.env[`INPUT_${name}`]?.trim();
  return value === undefined || value.length === 0 ? undefined : value;
}

function getBooleanInput(name: string, defaultValue: boolean): boolean {
  const value = getInput(name);
  if (value === undefined) return defaultValue;
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;
  throw new Error(`Input ${name.toLowerCase()} must be true or false.`);
}

async function writeSummary(contents: string): Promise<void> {
  const path = process.env["GITHUB_STEP_SUMMARY"];
  if (path !== undefined && path.length > 0) {
    await appendFile(path, contents, "utf8");
  }
}

async function writeOutput(name: string, value: string): Promise<void> {
  const path = process.env["GITHUB_OUTPUT"];
  if (path !== undefined && path.length > 0) {
    await appendFile(path, `${name}=${value}\n`, "utf8");
  }
}

function escapeMarkdown(value: string): string {
  return value
    .replace(/[\r\n]+/gu, " ")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replace(/[\\`*_{}[\]()#+.!-]/gu, "\\$&");
}

function assertInsideWorkspace(
  workspace: string,
  target: string,
  inputName: string
): void {
  const relativePath = relative(workspace, target);
  if (
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  ) {
    throw new Error(`${inputName} must stay inside GITHUB_WORKSPACE`);
  }
}
