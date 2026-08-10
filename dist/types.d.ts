export type EvidenceStatus = "passed" | "failed" | "warning" | "skipped";
export type EvidenceCategory = "command" | "repository" | "test_signal" | "risk" | "semantic";
export type Verdict = "PASS" | "REVIEW_REQUIRED" | "FAIL";
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | readonly JsonValue[] | {
    readonly [key: string]: JsonValue;
};
export interface Evidence {
    readonly id: string;
    readonly name: string;
    readonly category: EvidenceCategory;
    readonly status: EvidenceStatus;
    readonly description: string;
    readonly required: boolean;
    readonly deterministic: boolean;
    readonly details?: string;
    readonly durationMs?: number;
    readonly data?: Readonly<Record<string, JsonValue>>;
}
export interface ScoreDeduction {
    readonly evidenceId: string;
    readonly points: number;
    readonly reason: string;
}
export interface ScoreBreakdown {
    readonly initial: 100;
    readonly deductions: readonly ScoreDeduction[];
    readonly final: number;
}
export interface RepositoryEvidence {
    readonly base: string;
    readonly head: string;
    readonly changedFiles: readonly string[];
}
export interface VerificationReport {
    readonly schemaVersion: 1;
    readonly tool: {
        readonly name: "mergereceipt";
        readonly version: string;
    };
    readonly generatedAt: string;
    readonly repository: RepositoryEvidence;
    readonly evidence: readonly Evidence[];
    readonly score: number;
    readonly scoreBreakdown: ScoreBreakdown;
    readonly verdict: Verdict;
}
