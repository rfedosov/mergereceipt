import type { MergeReceiptConfig } from "../config/schema";
import type { Evidence } from "../types";
export interface FileAnalysisResult {
    readonly testSignal: Evidence;
    readonly sensitiveFiles: Evidence;
}
export declare function analyzeChangedFiles(files: readonly string[], analysis: MergeReceiptConfig["analysis"]): FileAnalysisResult;
