"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXIT_CODES = exports.MAX_SUMMARY_CHARACTERS = exports.MAX_CAPTURED_OUTPUT_BYTES = exports.MAX_COMMAND_TIMEOUT_MS = exports.DEFAULT_COMMAND_TIMEOUT_MS = exports.REPORT_SCHEMA_VERSION = exports.CONFIG_FILENAME = exports.VERSION = exports.TOOL_DISPLAY_NAME = exports.TOOL_NAME = void 0;
exports.TOOL_NAME = "mergereceipt";
exports.TOOL_DISPLAY_NAME = "MergeReceipt";
exports.VERSION = "0.1.0";
exports.CONFIG_FILENAME = ".mergereceipt.yml";
exports.REPORT_SCHEMA_VERSION = 1;
exports.DEFAULT_COMMAND_TIMEOUT_MS = 10 * 60 * 1_000;
exports.MAX_COMMAND_TIMEOUT_MS = 60 * 60 * 1_000;
exports.MAX_CAPTURED_OUTPUT_BYTES = 1024 * 1024;
exports.MAX_SUMMARY_CHARACTERS = 4_000;
exports.EXIT_CODES = {
    PASS: 0,
    FAIL: 1,
    ERROR: 2,
    REVIEW_REQUIRED: 3
};
