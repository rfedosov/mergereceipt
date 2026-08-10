"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCORE_WEIGHTS = void 0;
exports.scoreEvidence = scoreEvidence;
exports.SCORE_WEIGHTS = {
    failedRequired: 40,
    skippedRequired: 25,
    failedOptional: 15,
    missingTestChange: 15,
    sensitiveChange: 5,
    noCommandChecks: 20,
    genericWarning: 5
};
function scoreEvidence(evidence) {
    const deductions = evidence.flatMap(deductionForEvidence);
    const totalDeduction = deductions.reduce((total, deduction) => total + deduction.points, 0);
    const score = Math.max(0, 100 - totalDeduction);
    const requiredFailure = evidence.some((item) => item.required && (item.status === "failed" || item.status === "skipped"));
    const reviewSignal = evidence.some((item) => item.status === "failed" || item.status === "warning");
    const verdict = requiredFailure
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
function deductionForEvidence(item) {
    if (item.status === "failed" && item.required) {
        return [deduction(item, exports.SCORE_WEIGHTS.failedRequired, "Required check failed")];
    }
    if (item.status === "skipped" && item.required) {
        return [
            deduction(item, exports.SCORE_WEIGHTS.skippedRequired, "Required check was skipped")
        ];
    }
    if (item.status === "failed") {
        return [deduction(item, exports.SCORE_WEIGHTS.failedOptional, "Optional check failed")];
    }
    if (item.status !== "warning") {
        return [];
    }
    if (item.id === "analysis.tests_changed") {
        return [
            deduction(item, exports.SCORE_WEIGHTS.missingTestChange, "Source changed without a matching test-file change")
        ];
    }
    if (item.id === "analysis.sensitive_files") {
        return [
            deduction(item, exports.SCORE_WEIGHTS.sensitiveChange, "Sensitive files require focused review")
        ];
    }
    if (item.id === "checks.none") {
        return [
            deduction(item, exports.SCORE_WEIGHTS.noCommandChecks, "No command checks configured")
        ];
    }
    return [deduction(item, exports.SCORE_WEIGHTS.genericWarning, "Review warning")];
}
function deduction(item, points, reason) {
    return { evidenceId: item.id, points, reason };
}
