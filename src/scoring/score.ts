import type {
  Evidence,
  ScoreBreakdown,
  ScoreDeduction,
  Verdict
} from "../types";

export const SCORE_WEIGHTS = {
  failedRequired: 40,
  skippedRequired: 25,
  failedOptional: 15,
  missingTestChange: 15,
  sensitiveChange: 5,
  noCommandChecks: 20,
  genericWarning: 5
} as const;

export interface ScoringResult {
  readonly score: number;
  readonly breakdown: ScoreBreakdown;
  readonly verdict: Verdict;
}

export function scoreEvidence(evidence: readonly Evidence[]): ScoringResult {
  const deductions = evidence.flatMap(deductionForEvidence);
  const totalDeduction = deductions.reduce(
    (total, deduction) => total + deduction.points,
    0
  );
  const score = Math.max(0, 100 - totalDeduction);
  const requiredFailure = evidence.some(
    (item) =>
      item.required && (item.status === "failed" || item.status === "skipped")
  );
  const reviewSignal = evidence.some(
    (item) => item.status === "failed" || item.status === "warning"
  );
  const verdict: Verdict = requiredFailure
    ? "FAIL"
    : reviewSignal
      ? "REVIEW_REQUIRED"
      : "PASS";

  return {
    score,
    breakdown: {
      initial: 100,
      deductions,
      final: score
    },
    verdict
  };
}

function deductionForEvidence(item: Evidence): readonly ScoreDeduction[] {
  if (item.status === "failed" && item.required) {
    return [deduction(item, SCORE_WEIGHTS.failedRequired, "Required check failed")];
  }
  if (item.status === "skipped" && item.required) {
    return [
      deduction(item, SCORE_WEIGHTS.skippedRequired, "Required check was skipped")
    ];
  }
  if (item.status === "failed") {
    return [deduction(item, SCORE_WEIGHTS.failedOptional, "Optional check failed")];
  }
  if (item.status !== "warning") {
    return [];
  }

  if (item.id === "analysis.tests_changed") {
    return [
      deduction(
        item,
        SCORE_WEIGHTS.missingTestChange,
        "Source changed without a matching test-file change"
      )
    ];
  }
  if (item.id === "analysis.sensitive_files") {
    return [
      deduction(
        item,
        SCORE_WEIGHTS.sensitiveChange,
        "Sensitive files require focused review"
      )
    ];
  }
  if (item.id === "checks.none") {
    return [
      deduction(item, SCORE_WEIGHTS.noCommandChecks, "No command checks configured")
    ];
  }
  return [deduction(item, SCORE_WEIGHTS.genericWarning, "Review warning")];
}

function deduction(
  item: Evidence,
  points: number,
  reason: string
): ScoreDeduction {
  return { evidenceId: item.id, points, reason };
}
