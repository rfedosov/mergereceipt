import { describe, expect, it } from "vitest";

import { renderJsonReport } from "../../src/reporters/json";
import { renderMarkdownReport } from "../../src/reporters/markdown";
import { renderTerminalReport } from "../../src/reporters/terminal";
import type { VerificationReport } from "../../src/types";

const report: VerificationReport = {
  schemaVersion: 1,
  tool: { name: "mergereceipt", version: "0.1.0" },
  generatedAt: "2026-08-09T12:00:00.000Z",
  repository: {
    base: "main",
    head: "abc123",
    changedFiles: [
      "src/auth|session.ts",
      "src/<unsafe>.ts",
      "src/`break`\nline.ts"
    ]
  },
  evidence: [
    {
      id: "check.tests",
      name: "Tests",
      category: "command",
      status: "passed",
      description: "147 passed",
      required: true,
      deterministic: true,
      durationMs: 2400
    },
    {
      id: "analysis.tests_changed",
      name: "Test change signal",
      category: "test_signal",
      status: "warning",
      description: "Review | needed",
      details: "<script>alert(1)</script>",
      required: false,
      deterministic: true
    }
  ],
  score: 85,
  scoreBreakdown: {
    initial: 100,
    deductions: [
      {
        evidenceId: "analysis.tests_changed",
        points: 15,
        reason: "Source changed without a test-file change"
      }
    ],
    final: 85
  },
  verdict: "REVIEW_REQUIRED"
};

describe("report generation", () => {
  it("renders a readable terminal report with transparent deductions", () => {
    const output = renderTerminalReport(report, { color: false });

    expect(output).toContain("MergeReceipt v0.1.0");
    expect(output).toContain("✓ Tests");
    expect(output).toContain("-15 Source changed");
    expect(output).toContain("Verdict: REVIEW_REQUIRED");
    expect(output).not.toContain("\u001B[");
  });

  it("renders stable parseable JSON", () => {
    const output = renderJsonReport(report);
    const parsed: unknown = JSON.parse(output);

    expect(parsed).toEqual(report);
    expect(output.endsWith("\n")).toBe(true);
  });

  it("escapes markdown tables, HTML details, and changed file names", () => {
    const output = renderMarkdownReport(report);

    expect(output).toContain("Review \\| needed");
    expect(output).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(output).not.toContain("<script>");
    expect(output).toContain("src/auth|session.ts");
    expect(output).toContain("<code>src/`break`�line.ts</code>");
    expect(output).not.toContain("<code>src/<unsafe>.ts</code>");
  });
});
