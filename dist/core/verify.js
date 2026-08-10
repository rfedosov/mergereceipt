"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runVerification = runVerification;
const files_1 = require("../analysis/files");
const run_command_1 = require("../checks/run-command");
const load_1 = require("../config/load");
const constants_1 = require("../constants");
const changed_files_1 = require("../git/changed-files");
const score_1 = require("../scoring/score");
async function runVerification(options) {
    const loaded = await (0, load_1.loadConfig)(options.cwd, options.configPath);
    const repository = await (0, changed_files_1.collectChangedFiles)({
        cwd: loaded.directory,
        includeUncommitted: loaded.config.git.includeUncommitted,
        ...(options.base !== undefined
            ? { base: options.base }
            : loaded.config.git.base !== undefined
                ? { base: loaded.config.git.base }
                : {}),
        ...(options.env === undefined ? {} : { env: options.env })
    });
    const evidence = [];
    for (const [name, check] of Object.entries(loaded.config.checks)) {
        const item = await (0, run_command_1.collectCommandEvidence)(name, check, {
            cwd: loaded.directory,
            ...(options.env === undefined ? {} : { env: options.env })
        });
        evidence.push(item);
        options.onEvidence?.(item);
    }
    if (Object.keys(loaded.config.checks).length === 0) {
        const noChecks = {
            id: "checks.none",
            name: "Command checks",
            category: "command",
            status: "warning",
            description: "No command checks are configured.",
            required: false,
            deterministic: true
        };
        evidence.push(noChecks);
        options.onEvidence?.(noChecks);
    }
    const repositoryEvidence = {
        id: "repository.changed_files",
        name: "Changed files analyzed",
        category: "repository",
        status: "passed",
        description: `${String(repository.files.length)} changed file(s) found relative to ${repository.base}.`,
        required: true,
        deterministic: true,
        data: {
            base: repository.base,
            head: repository.head,
            changedFiles: repository.files
        }
    };
    evidence.push(repositoryEvidence);
    options.onEvidence?.(repositoryEvidence);
    const analysis = (0, files_1.analyzeChangedFiles)(repository.files, loaded.config.analysis);
    evidence.push(analysis.testSignal, analysis.sensitiveFiles);
    options.onEvidence?.(analysis.testSignal);
    options.onEvidence?.(analysis.sensitiveFiles);
    const scored = (0, score_1.scoreEvidence)(evidence);
    const generatedAt = (options.now ?? (() => new Date()))().toISOString();
    return {
        schemaVersion: constants_1.REPORT_SCHEMA_VERSION,
        tool: {
            name: constants_1.TOOL_NAME,
            version: constants_1.VERSION
        },
        generatedAt,
        repository: {
            base: repository.base,
            head: repository.head,
            changedFiles: repository.files
        },
        evidence,
        score: scored.score,
        scoreBreakdown: scored.breakdown,
        verdict: scored.verdict
    };
}
