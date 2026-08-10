"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findConfigPath = findConfigPath;
exports.loadConfig = loadConfig;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const yaml_1 = require("yaml");
const constants_1 = require("../constants");
const errors_1 = require("../errors");
const schema_1 = require("./schema");
const MAX_CONFIG_BYTES = 1024 * 1024;
async function findConfigPath(startDirectory, explicitPath) {
    if (explicitPath !== undefined) {
        return (0, node_path_1.isAbsolute)(explicitPath)
            ? explicitPath
            : (0, node_path_1.resolve)(startDirectory, explicitPath);
    }
    let current = (0, node_path_1.resolve)(startDirectory);
    const root = (0, node_path_1.parse)(current).root;
    for (;;) {
        const candidate = (0, node_path_1.join)(current, constants_1.CONFIG_FILENAME);
        try {
            await (0, promises_1.stat)(candidate);
            return candidate;
        }
        catch (error) {
            if (!isMissingFile(error)) {
                throw new errors_1.MergeReceiptError(`Cannot read ${candidate}`, { cause: error });
            }
        }
        if (current === root) {
            throw new errors_1.MergeReceiptError(`No ${constants_1.CONFIG_FILENAME} found. Run \`mergereceipt init\` first.`);
        }
        current = (0, node_path_1.dirname)(current);
    }
}
async function loadConfig(startDirectory, explicitPath) {
    const path = await findConfigPath(startDirectory, explicitPath);
    let metadata;
    try {
        metadata = await (0, promises_1.stat)(path);
    }
    catch (error) {
        throw new errors_1.MergeReceiptError(`Cannot read configuration at ${path}`, {
            cause: error
        });
    }
    if (metadata.size > MAX_CONFIG_BYTES) {
        throw new errors_1.MergeReceiptError(`Configuration at ${path} exceeds the 1 MiB safety limit.`);
    }
    let contents;
    try {
        contents = await (0, promises_1.readFile)(path, "utf8");
    }
    catch (error) {
        throw new errors_1.MergeReceiptError(`Cannot read configuration at ${path}`, {
            cause: error
        });
    }
    if (Buffer.byteLength(contents) > MAX_CONFIG_BYTES) {
        throw new errors_1.MergeReceiptError(`Configuration at ${path} exceeds the 1 MiB safety limit.`);
    }
    const document = (0, yaml_1.parseDocument)(contents, {
        merge: false,
        uniqueKeys: true
    });
    if (document.errors.length > 0) {
        const detail = document.errors.map((error) => error.message).join("; ");
        throw new errors_1.MergeReceiptError(`Invalid YAML in ${path}: ${detail}`);
    }
    let value;
    try {
        value = document.toJS({ maxAliasCount: 50 });
    }
    catch (error) {
        throw new errors_1.MergeReceiptError(`Unsafe or invalid YAML in ${path}`, {
            cause: error
        });
    }
    const parsed = schema_1.mergeReceiptConfigSchema.safeParse(value);
    if (!parsed.success) {
        const detail = parsed.error.issues
            .map((issue) => {
            const location = issue.path.length > 0 ? issue.path.join(".") : "root";
            return `${location}: ${issue.message}`;
        })
            .join("; ");
        throw new errors_1.MergeReceiptError(`Invalid MergeReceipt configuration: ${detail}`);
    }
    return {
        path,
        directory: (0, node_path_1.dirname)(path),
        config: parsed.data
    };
}
function isMissingFile(error) {
    return (error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT");
}
