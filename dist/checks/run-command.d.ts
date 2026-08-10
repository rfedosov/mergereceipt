import type { CommandCheckConfig } from "../config/schema";
import type { Evidence } from "../types";
export interface CommandExecutionResult {
    readonly exitCode: number | null;
    readonly signal: NodeJS.Signals | null;
    readonly durationMs: number;
    readonly timedOut: boolean;
    readonly stdout: string;
    readonly stderr: string;
    readonly stdoutTruncated: boolean;
    readonly stderrTruncated: boolean;
    readonly spawnError?: string;
}
export interface RunCommandOptions {
    readonly cwd: string;
    readonly env?: NodeJS.ProcessEnv;
    readonly maxOutputBytes?: number;
}
export declare function runCommand(command: string, timeoutMs: number, options: RunCommandOptions): Promise<CommandExecutionResult>;
export declare function collectCommandEvidence(name: string, check: CommandCheckConfig, options: RunCommandOptions): Promise<Evidence>;
export declare function summarizeOutput(output: string): string;
export declare function sanitizeTerminalText(value: string): string;
