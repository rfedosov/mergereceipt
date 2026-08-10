import type { VerificationReport } from "../types";
interface TerminalReporterOptions {
    readonly color?: boolean;
    readonly includeHeader?: boolean;
}
export declare function renderTerminalReport(report: VerificationReport, options?: TerminalReporterOptions): string;
export {};
