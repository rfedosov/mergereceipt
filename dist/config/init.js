"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeConfig = initializeConfig;
exports.detectChecks = detectChecks;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const yaml_1 = require("yaml");
const constants_1 = require("../constants");
const errors_1 = require("../errors");
const defaults_1 = require("./defaults");
const MAX_PACKAGE_JSON_BYTES = 1024 * 1024;
async function initializeConfig(directory, options = {}) {
    const targetDirectory = (0, node_path_1.resolve)(directory);
    const targetPath = (0, node_path_1.join)(targetDirectory, constants_1.CONFIG_FILENAME);
    const existing = await safeLstat(targetPath);
    if (existing?.isSymbolicLink() === true) {
        throw new errors_1.MergeReceiptError(`Refusing to write ${constants_1.CONFIG_FILENAME} through a symbolic link.`);
    }
    if (existing !== undefined && options.force !== true) {
        throw new errors_1.MergeReceiptError(`${constants_1.CONFIG_FILENAME} already exists. Re-run with --force to replace it.`);
    }
    const packagePath = (0, node_path_1.join)(targetDirectory, "package.json");
    const packageJson = await readPackageJson(packagePath);
    const packageManager = await detectPackageManager(targetDirectory);
    const checks = packageJson === undefined
        ? {}
        : detectChecks(packageJson, packageManager ?? "npm");
    const config = {
        version: 1,
        checks,
        analysis: {
            requireTestsForChangedCode: true,
            testPatterns: [...defaults_1.DEFAULT_TEST_PATTERNS],
            sourcePatterns: [...defaults_1.DEFAULT_SOURCE_PATTERNS],
            sensitivePatterns: [...defaults_1.DEFAULT_SENSITIVE_PATTERNS]
        },
        git: {
            includeUncommitted: true
        }
    };
    const header = "# MergeReceipt: reproducible verification signals before review or merge.\n" +
        "# Commands in this file execute with your user permissions.\n";
    await (0, promises_1.writeFile)(targetPath, header + (0, yaml_1.stringify)(config, { lineWidth: 0 }), {
        encoding: "utf8",
        flag: options.force === true ? "w" : "wx",
        mode: 0o644
    });
    const result = {
        path: targetPath,
        projectType: packageJson === undefined ? "unknown" : "node",
        detectedChecks: Object.keys(checks)
    };
    return packageManager === undefined ? result : { ...result, packageManager };
}
function detectChecks(packageJson, packageManager) {
    const scripts = packageJson.scripts ?? {};
    const candidates = [
        ["tests", ["test"]],
        ["lint", ["lint"]],
        ["typecheck", ["typecheck", "type-check", "types"]],
        ["build", ["build"]]
    ];
    const checks = {};
    for (const [checkName, scriptNames] of candidates) {
        const scriptName = scriptNames.find((name) => {
            const command = scripts[name];
            return (typeof command === "string" &&
                command.trim().length > 0 &&
                !/no test specified/i.test(command));
        });
        if (scriptName === undefined) {
            continue;
        }
        checks[checkName] = {
            command: packageScriptCommand(packageManager, scriptName),
            required: true,
            timeoutMs: constants_1.DEFAULT_COMMAND_TIMEOUT_MS
        };
    }
    return checks;
}
function packageScriptCommand(packageManager, scriptName) {
    if (packageManager === "npm" && scriptName === "test") {
        return "npm test";
    }
    if ((packageManager === "pnpm" || packageManager === "yarn") &&
        scriptName === "test") {
        return `${packageManager} test`;
    }
    return `${packageManager} run ${scriptName}`;
}
async function readPackageJson(path) {
    let metadata;
    try {
        metadata = await (0, promises_1.stat)(path);
    }
    catch (error) {
        if (isMissingFile(error)) {
            return undefined;
        }
        throw new errors_1.MergeReceiptError(`Cannot read ${path}`, { cause: error });
    }
    if (metadata.size > MAX_PACKAGE_JSON_BYTES) {
        throw new errors_1.MergeReceiptError(`package.json at ${path} exceeds 1 MiB.`);
    }
    let contents;
    try {
        contents = await (0, promises_1.readFile)(path, "utf8");
    }
    catch (error) {
        throw new errors_1.MergeReceiptError(`Cannot read ${path}`, { cause: error });
    }
    try {
        const parsed = JSON.parse(contents);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
            throw new Error("package.json root must be an object");
        }
        const scriptsValue = "scripts" in parsed ? parsed.scripts : undefined;
        if (!isUnknownRecord(scriptsValue)) {
            return {};
        }
        return { scripts: scriptsValue };
    }
    catch (error) {
        throw new errors_1.MergeReceiptError(`Invalid package.json at ${path}`, { cause: error });
    }
}
async function detectPackageManager(directory) {
    const lockfiles = [
        ["pnpm-lock.yaml", "pnpm"],
        ["yarn.lock", "yarn"],
        ["bun.lock", "bun"],
        ["bun.lockb", "bun"],
        ["package-lock.json", "npm"]
    ];
    for (const [filename, packageManager] of lockfiles) {
        if ((await safeLstat((0, node_path_1.join)(directory, filename))) !== undefined) {
            return packageManager;
        }
    }
    return (await safeLstat((0, node_path_1.join)(directory, "package.json"))) === undefined
        ? undefined
        : "npm";
}
async function safeLstat(path) {
    try {
        return await (0, promises_1.lstat)(path);
    }
    catch (error) {
        if (isMissingFile(error)) {
            return undefined;
        }
        throw error;
    }
}
function isMissingFile(error) {
    return (error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT");
}
function isUnknownRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
