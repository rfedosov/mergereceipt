import type { Evidence, VerificationReport } from "../types";
export interface VerificationOptions {
    readonly cwd: string;
    readonly configPath?: string;
    readonly base?: string;
    readonly env?: NodeJS.ProcessEnv;
    readonly now?: () => Date;
    readonly onEvidence?: (evidence: Evidence) => void;
}
export declare function runVerification(options: VerificationOptions): Promise<VerificationReport>;
