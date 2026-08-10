import type { Evidence, ScoreBreakdown, Verdict } from "../types";
export declare const SCORE_WEIGHTS: {
    readonly failedRequired: 40;
    readonly skippedRequired: 25;
    readonly failedOptional: 15;
    readonly missingTestChange: 15;
    readonly sensitiveChange: 5;
    readonly noCommandChecks: 20;
    readonly genericWarning: 5;
};
export interface ScoringResult {
    readonly score: number;
    readonly breakdown: ScoreBreakdown;
    readonly verdict: Verdict;
}
export declare function scoreEvidence(evidence: readonly Evidence[]): ScoringResult;
