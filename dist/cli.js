#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCli = runCli;
const commander_1 = require("commander");
const run_command_1 = require("./checks/run-command");
const init_1 = require("./config/init");
const constants_1 = require("./constants");
const verify_1 = require("./core/verify");
const errors_1 = require("./errors");
const exit_codes_1 = require("./exit-codes");
const json_1 = require("./reporters/json");
const terminal_1 = require("./reporters/terminal");
async function runCli(argv = process.argv) {
    let commandExitCode = constants_1.EXIT_CODES.PASS;
    const program = new commander_1.Command();
    program
        .name("mergereceipt")
        .description("Collect reproducible pull request verification signals before review or merge.")
        .version(constants_1.VERSION)
        .showHelpAfterError()
        .exitOverride()
        .configureOutput({
        writeOut: (value) => process.stdout.write(value),
        writeErr: (value) => process.stderr.write((0, run_command_1.sanitizeTerminalText)(value))
    });
    program
        .command("init")
        .description(`Create ${constants_1.CONFIG_FILENAME} from detected project scripts.`)
        .option("--force", "replace an existing configuration")
        .action(async (options) => {
        try {
            const result = await (0, init_1.initializeConfig)(process.cwd(), options);
            const checks = result.detectedChecks.length === 0
                ? "none"
                : result.detectedChecks.join(", ");
            process.stdout.write(`${constants_1.TOOL_DISPLAY_NAME} initialized ${result.path}\n` +
                `Project: ${result.projectType}\n` +
                `Detected checks: ${checks}\n`);
            if (result.detectedChecks.length === 0) {
                process.stdout.write(`Add at least one command under \`checks\` before relying on the report.\n`);
            }
        }
        catch (error) {
            commandExitCode = constants_1.EXIT_CODES.ERROR;
            process.stderr.write(`MergeReceipt error: ${(0, run_command_1.sanitizeTerminalText)((0, errors_1.errorMessage)(error))}\n`);
        }
    });
    program
        .command("verify")
        .description("Run configured checks and create an Evidence Report.")
        .option("--json", "print only the stable JSON report")
        .option("--fail-on-review", "exit with code 3 when the verdict is REVIEW_REQUIRED")
        .option("--config <path>", `use a specific ${constants_1.CONFIG_FILENAME}`)
        .option("--base <revision>", "compare changes with this git revision")
        .action(async (options) => {
        try {
            if (options.json !== true) {
                process.stdout.write(`${constants_1.TOOL_DISPLAY_NAME} v${constants_1.VERSION}\nCollecting evidence...\n\n`);
            }
            const report = await (0, verify_1.runVerification)({
                cwd: process.cwd(),
                ...(options.config === undefined ? {} : { configPath: options.config }),
                ...(options.base === undefined ? {} : { base: options.base })
            });
            process.stdout.write(options.json === true
                ? (0, json_1.renderJsonReport)(report)
                : (0, terminal_1.renderTerminalReport)(report, {
                    color: shouldUseColor(),
                    includeHeader: false
                }));
            commandExitCode = (0, exit_codes_1.exitCodeForVerdict)(report.verdict, {
                failOnReview: options.failOnReview === true
            });
        }
        catch (error) {
            commandExitCode = constants_1.EXIT_CODES.ERROR;
            process.stderr.write(`MergeReceipt error: ${(0, run_command_1.sanitizeTerminalText)((0, errors_1.errorMessage)(error))}\n`);
        }
    });
    try {
        await program.parseAsync([...argv], { from: "node" });
    }
    catch (error) {
        if (error instanceof commander_1.CommanderError) {
            if (error.code === "commander.helpDisplayed" ||
                error.code === "commander.version") {
                return constants_1.EXIT_CODES.PASS;
            }
            return constants_1.EXIT_CODES.ERROR;
        }
        process.stderr.write(`MergeReceipt error: ${(0, run_command_1.sanitizeTerminalText)((0, errors_1.errorMessage)(error))}\n`);
        return constants_1.EXIT_CODES.ERROR;
    }
    return commandExitCode;
}
function shouldUseColor() {
    return (process.stdout.isTTY === true &&
        process.env["NO_COLOR"] === undefined &&
        process.env["TERM"] !== "dumb");
}
if (require.main === module) {
    void runCli().then((exitCode) => {
        process.exitCode = exitCode;
    }, (error) => {
        process.stderr.write(`MergeReceipt error: ${(0, run_command_1.sanitizeTerminalText)((0, errors_1.errorMessage)(error))}\n`);
        process.exitCode = constants_1.EXIT_CODES.ERROR;
    });
}
