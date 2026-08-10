import { describe, expect, it } from "vitest";

import { scoreEvidence } from "../../src/scoring/score";
import type { Evidence } from "../../src/types";

describe("evidence scoring", () => {
  it("returns PASS and 100 for clean evidence", () => {
    const result = scoreEvidence([evidence("check.tests", "passed", true)]);

    expect(result.score).toBe(100);
    expect(result.verdict).toBe("PASS");
    expect(result.breakdown.deductions).toEqual([]);
  });

  it("makes a required failure decisive and lists its deduction", () => {
    const result = scoreEvidence([
      evidence("check.tests", "failed", true),
      evidence("check.lint", "passed", true)
    ]);

    expect(result.score).toBe(60);
    expect(result.verdict).toBe("FAIL");
    expect(result.breakdown.deductions[0]).toMatchObject({
      evidenceId: "check.tests",
      points: 40
    });
  });

  it("keeps warnings advisory while making review required", () => {
    const result = scoreEvidence([
      evidence("analysis.tests_changed", "warning", false),
      evidence("analysis.sensitive_files", "warning", false)
    ]);

    expect(result.score).toBe(80);
    expect(result.verdict).toBe("REVIEW_REQUIRED");
    expect(result.breakdown.deductions.map((item) => item.points)).toEqual([15, 5]);
  });

  it("never produces a negative score", () => {
    const failures = Array.from({ length: 4 }, (_, index) =>
      evidence(`check.${String(index)}`, "failed", true)
    );

    expect(scoreEvidence(failures).score).toBe(0);
  });
});

function evidence(
  id: string,
  status: Evidence["status"],
  required: boolean
): Evidence {
  return {
    id,
    name: id,
    category: "command",
    status,
    description: id,
    required,
    deterministic: true
  };
}
