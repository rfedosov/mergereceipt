"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeChangedFiles = analyzeChangedFiles;
const picomatch_1 = __importDefault(require("picomatch"));
const errors_1 = require("../errors");
function analyzeChangedFiles(files, analysis) {
    const testMatcher = compileMatcher(analysis.testPatterns, "testPatterns");
    const sourceMatcher = compileMatcher(analysis.sourcePatterns, "sourcePatterns");
    const sensitiveMatcher = compileMatcher(analysis.sensitivePatterns, "sensitivePatterns");
    const testFiles = files.filter((file) => testMatcher(file));
    const sourceFiles = files.filter((file) => sourceMatcher(file) && !testMatcher(file));
    const sensitiveFiles = files.filter((file) => sensitiveMatcher(file));
    return {
        testSignal: createTestSignal(sourceFiles, testFiles, analysis.requireTestsForChangedCode),
        sensitiveFiles: createSensitiveSignal(sensitiveFiles)
    };
}
function createTestSignal(sourceFiles, testFiles, enabled) {
    const data = {
        sourceFiles,
        testFiles
    };
    if (!enabled) {
        return {
            id: "analysis.tests_changed",
            name: "Test change signal",
            category: "test_signal",
            status: "skipped",
            description: "The test-change heuristic is disabled by configuration.",
            required: false,
            deterministic: true,
            data
        };
    }
    if (sourceFiles.length === 0) {
        return {
            id: "analysis.tests_changed",
            name: "Test change signal",
            category: "test_signal",
            status: "skipped",
            description: "No files matching the configured source patterns changed.",
            required: false,
            deterministic: true,
            data
        };
    }
    if (testFiles.length > 0) {
        return {
            id: "analysis.tests_changed",
            name: "Test change signal",
            category: "test_signal",
            status: "passed",
            description: `${String(sourceFiles.length)} source file(s) and ${String(testFiles.length)} test file(s) changed.`,
            required: false,
            deterministic: true,
            data
        };
    }
    return {
        id: "analysis.tests_changed",
        name: "Test change signal",
        category: "test_signal",
        status: "warning",
        description: `${String(sourceFiles.length)} source file(s) changed, but no file matched ` +
            "the configured test patterns. This is a review signal, not proof that tests are missing.",
        required: false,
        deterministic: true,
        data
    };
}
function createSensitiveSignal(files) {
    if (files.length === 0) {
        return {
            id: "analysis.sensitive_files",
            name: "Sensitive file signal",
            category: "risk",
            status: "skipped",
            description: "No changed file matched a configured sensitive pattern.",
            required: false,
            deterministic: true,
            data: { files }
        };
    }
    return {
        id: "analysis.sensitive_files",
        name: "Sensitive file signal",
        category: "risk",
        status: "warning",
        description: `${String(files.length)} changed file(s) matched configured sensitive patterns. ` +
            "Focused human review is recommended.",
        required: false,
        deterministic: true,
        data: { files }
    };
}
function compileMatcher(patterns, fieldName) {
    try {
        return (0, picomatch_1.default)([...patterns], {
            dot: true,
            nocase: true,
            nonegate: true
        });
    }
    catch (error) {
        throw new errors_1.MergeReceiptError(`Invalid glob in analysis.${fieldName}`, {
            cause: error
        });
    }
}
