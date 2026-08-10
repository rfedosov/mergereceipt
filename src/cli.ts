#!/usr/bin/env node

import { Command, CommanderError } from "commander";

import { sanitizeTerminalText } from "./checks/run-command";
import { initializeConfig } from "./config/init";
import {
  CONFIG_FILENAME,
  EXIT_CODES,
  TOOL_DISPLAY_NAME,
  VERSION,
  type ExitCode
} from "./constants";
import { runVerification } from "./core/verify";
import { errorMessage } from "./errors";
import { exitCodeForVerdict } from "./exit-codes";
import { renderJsonReport } from "./reporters/json";
import { renderTerminalReport } from "./reporters/terminal";

interface VerifyCliOptions {
  readonly json?: boolean;
  readonly failOnReview?: boolean;
  readonly config?: string;
  readonly base?: string;
}

interface InitCliOptions {
  readonly force?: boolean;
}

export async function runCli(argv: readonly string[] = process.argv): Promise<ExitCode> {
  let commandExitCode: ExitCode = EXIT_CODES.PASS;
  const program = new Command();

  program
    .name("mergereceipt")
    .description(
      "Collect reproducible pull request verification signals before review or merge."
    )
    .version(VERSION)
    .showHelpAfterError()
    .exitOverride()
    .configureOutput({
      writeOut: (value) => process.stdout.write(value),
      writeErr: (value) => process.stderr.write(sanitizeTerminalText(value))
    });

  program
    .command("init")
    .description(`Create ${CONFIG_FILENAME} from detected project scripts.`)
    .option("--force", "replace an existing configuration")
    .action(async (options: InitCliOptions) => {
      try {
        const result = await initializeConfig(process.cwd(), options);
        const checks =
          result.detectedChecks.length === 0
            ? "none"
            : result.detectedChecks.join(", ");
        process.stdout.write(
          `${TOOL_DISPLAY_NAME} initialized ${result.path}\n` +
            `Project: ${result.projectType}\n` +
            `Detected checks: ${checks}\n`
        );
        if (result.detectedChecks.length === 0) {
          process.stdout.write(
            `Add at least one command under \`checks\` before relying on the report.\n`
          );
        }
      } catch (error) {
        commandExitCode = EXIT_CODES.ERROR;
        process.stderr.write(
          `MergeReceipt error: ${sanitizeTerminalText(errorMessage(error))}\n`
        );
      }
    });

  program
    .command("verify")
    .description("Run configured checks and create an Evidence Report.")
    .option("--json", "print only the stable JSON report")
    .option(
      "--fail-on-review",
      "exit with code 3 when the verdict is REVIEW_REQUIRED"
    )
    .option("--config <path>", `use a specific ${CONFIG_FILENAME}`)
    .option("--base <revision>", "compare changes with this git revision")
    .action(async (options: VerifyCliOptions) => {
      try {
        if (options.json !== true) {
          process.stdout.write(
            `${TOOL_DISPLAY_NAME} v${VERSION}\nCollecting evidence...\n\n`
          );
        }
        const report = await runVerification({
          cwd: process.cwd(),
          ...(options.config === undefined ? {} : { configPath: options.config }),
          ...(options.base === undefined ? {} : { base: options.base })
        });
        process.stdout.write(
          options.json === true
            ? renderJsonReport(report)
            : renderTerminalReport(report, {
                color: shouldUseColor(),
                includeHeader: false
              })
        );
        commandExitCode = exitCodeForVerdict(report.verdict, {
          failOnReview: options.failOnReview === true
        });
      } catch (error) {
        commandExitCode = EXIT_CODES.ERROR;
        process.stderr.write(
          `MergeReceipt error: ${sanitizeTerminalText(errorMessage(error))}\n`
        );
      }
    });

  try {
    await program.parseAsync([...argv], { from: "node" });
  } catch (error) {
    if (error instanceof CommanderError) {
      if (
        error.code === "commander.helpDisplayed" ||
        error.code === "commander.version"
      ) {
        return EXIT_CODES.PASS;
      }
      return EXIT_CODES.ERROR;
    }
    process.stderr.write(
      `MergeReceipt error: ${sanitizeTerminalText(errorMessage(error))}\n`
    );
    return EXIT_CODES.ERROR;
  }

  return commandExitCode;
}

function shouldUseColor(): boolean {
  return (
    process.stdout.isTTY === true &&
    process.env["NO_COLOR"] === undefined &&
    process.env["TERM"] !== "dumb"
  );
}

if (require.main === module) {
  void runCli().then(
    (exitCode) => {
      process.exitCode = exitCode;
    },
    (error: unknown) => {
      process.stderr.write(
        `MergeReceipt error: ${sanitizeTerminalText(errorMessage(error))}\n`
      );
      process.exitCode = EXIT_CODES.ERROR;
    }
  );
}
