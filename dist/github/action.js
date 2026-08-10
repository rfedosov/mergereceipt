"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAction = runAction;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const run_command_1 = require("../checks/run-command");
const constants_1 = require("../constants");
const verify_1 = require("../core/verify");
const errors_1 = require("../errors");
const exit_codes_1 = require("../exit-codes");
const markdown_1 = require("../reporters/markdown");
const terminal_1 = require("../reporters/terminal");
async function runAction() {
    const workspace = process.env["GITHUB_WORKSPACE"] ?? process.cwd();
    const workingDirectoryInput = getInput("WORKING-DIRECTORY");
    const configPath = getInput("CONFIG");
    const base = getInput("BASE");
    try {
        if (process.env["GITHUB_EVENT_NAME"] === "pull_request_target") {
            throw new Error("MergeReceipt refuses to run on pull_request_target. Use pull_request without secrets.");
        }
        if ((workingDirectoryInput !== undefined && (0, node_path_1.isAbsolute)(workingDirectoryInput)) ||
            (configPath !== undefined && (0, node_path_1.isAbsolute)(configPath))) {
            throw new Error("Action path inputs must be relative to GITHUB_WORKSPACE.");
        }
        const requestedCwd = (0, node_path_1.resolve)(workspace, workingDirectoryInput ?? ".");
        const workspaceRoot = await (0, promises_1.realpath)(workspace);
        const cwd = await (0, promises_1.realpath)(requestedCwd);
        assertInsideWorkspace(workspaceRoot, cwd, "working-directory");
        const safeConfigPath = await (0, promises_1.realpath)((0, node_path_1.resolve)(cwd, configPath ?? ".mergereceipt.yml"));
        assertInsideWorkspace(workspaceRoot, safeConfigPath, "config");
        const failOnReview = getBooleanInput("FAIL-ON-REVIEW", false);
        const report = await (0, verify_1.runVerification)({
            cwd,
            configPath: safeConfigPath,
            ...(base === undefined ? {} : { base })
        });
        process.stdout.write((0, terminal_1.renderTerminalReport)(report, { color: false }));
        await writeSummary((0, markdown_1.renderMarkdownReport)(report));
        await writeOutput("score", String(report.score));
        await writeOutput("verdict", report.verdict);
        process.exitCode = (0, exit_codes_1.exitCodeForVerdict)(report.verdict, { failOnReview });
    }
    catch (error) {
        const message = (0, errors_1.errorMessage)(error);
        process.stderr.write(`MergeReceipt error: ${(0, run_command_1.sanitizeTerminalText)(message)}\n`);
        try {
            await writeSummary(`# MergeReceipt Evidence Report\n\n❌ Runtime error: ${escapeMarkdown(message)}\n`);
        }
        catch (summaryError) {
            process.stderr.write("MergeReceipt could not write the job summary: " +
                `${(0, run_command_1.sanitizeTerminalText)((0, errors_1.errorMessage)(summaryError))}\n`);
        }
        process.exitCode = constants_1.EXIT_CODES.ERROR;
    }
}
function getInput(name) {
    const value = process.env[`INPUT_${name}`]?.trim();
    return value === undefined || value.length === 0 ? undefined : value;
}
function getBooleanInput(name, defaultValue) {
    const value = getInput(name);
    if (value === undefined)
        return defaultValue;
    if (value.toLowerCase() === "true")
        return true;
    if (value.toLowerCase() === "false")
        return false;
    throw new Error(`Input ${name.toLowerCase()} must be true or false.`);
}
async function writeSummary(contents) {
    const path = process.env["GITHUB_STEP_SUMMARY"];
    if (path !== undefined && path.length > 0) {
        await (0, promises_1.appendFile)(path, contents, "utf8");
    }
}
async function writeOutput(name, value) {
    const path = process.env["GITHUB_OUTPUT"];
    if (path !== undefined && path.length > 0) {
        await (0, promises_1.appendFile)(path, `${name}=${value}\n`, "utf8");
    }
}
function escapeMarkdown(value) {
    return value
        .replace(/[\r\n]+/gu, " ")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;")
        .replace(/[\\`*_{}[\]()#+.!-]/gu, "\\$&");
}
function assertInsideWorkspace(workspace, target, inputName) {
    const relativePath = (0, node_path_1.relative)(workspace, target);
    if (relativePath === ".." ||
        relativePath.startsWith(`..${node_path_1.sep}`) ||
        (0, node_path_1.isAbsolute)(relativePath)) {
        throw new Error(`${inputName} must stay inside GITHUB_WORKSPACE`);
    }
}
