export declare const TOOL_NAME: "mergereceipt";
export declare const TOOL_DISPLAY_NAME: "MergeReceipt";
export declare const VERSION: "0.1.0";
export declare const CONFIG_FILENAME: ".mergereceipt.yml";
export declare const REPORT_SCHEMA_VERSION: 1;
export declare const DEFAULT_COMMAND_TIMEOUT_MS: number;
export declare const MAX_COMMAND_TIMEOUT_MS: number;
export declare const MAX_CAPTURED_OUTPUT_BYTES: number;
export declare const MAX_SUMMARY_CHARACTERS = 4000;
export declare const EXIT_CODES: {
    readonly PASS: 0;
    readonly FAIL: 1;
    readonly ERROR: 2;
    readonly REVIEW_REQUIRED: 3;
};
export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];
