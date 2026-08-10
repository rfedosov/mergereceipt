export const TOOL_NAME = "mergereceipt" as const;
export const TOOL_DISPLAY_NAME = "MergeReceipt" as const;
export const VERSION = "0.1.0" as const;
export const CONFIG_FILENAME = ".mergereceipt.yml" as const;
export const REPORT_SCHEMA_VERSION = 1 as const;

export const DEFAULT_COMMAND_TIMEOUT_MS = 10 * 60 * 1_000;
export const MAX_COMMAND_TIMEOUT_MS = 60 * 60 * 1_000;
export const MAX_CAPTURED_OUTPUT_BYTES = 1024 * 1024;
export const MAX_SUMMARY_CHARACTERS = 4_000;

export const EXIT_CODES = {
  PASS: 0,
  FAIL: 1,
  ERROR: 2,
  REVIEW_REQUIRED: 3
} as const;

export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];
