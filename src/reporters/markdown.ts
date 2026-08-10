import type { EvidenceStatus, VerificationReport } from "../types";

const STATUS_ICONS: Record<EvidenceStatus, string> = {
  passed: "✅",
  failed: "❌",
  warning: "⚠️",
  skipped: "➖"
};

export function renderMarkdownReport(report: VerificationReport): string {
  const lines = [
    `# MergeReceipt Evidence Report`,
    "",
    `**Evidence Score:** ${String(report.score)}/100  `,
    `**Verdict:** ${verdictIcon(report.verdict)} ${report.verdict}`,
    "",
    "| Evidence | Status | Required | Duration | Result |",
    "| --- | --- | --- | ---: | --- |"
  ];

  for (const item of report.evidence) {
    lines.push(
      `| ${escapeTable(item.name)} | ${STATUS_ICONS[item.status]} ${item.status} | ` +
        `${item.required ? "yes" : "no"} | ${duration(item.durationMs)} | ` +
        `${escapeTable(item.description)} |`
    );
  }

  if (report.scoreBreakdown.deductions.length > 0) {
    lines.push("", "## Score deductions", "");
    for (const deduction of report.scoreBreakdown.deductions) {
      lines.push(
        `- **−${String(deduction.points)}** ${escapeInline(deduction.reason)} ` +
          `(${escapeInline(deduction.evidenceId)})`
      );
    }
  }

  lines.push("", "## Changed files", "");
  if (report.repository.changedFiles.length === 0) {
    lines.push("No changed files detected.");
  } else {
    for (const file of report.repository.changedFiles.slice(0, 100)) {
      lines.push(`- <code>${escapeCode(file)}</code>`);
    }
    if (report.repository.changedFiles.length > 100) {
      lines.push(
        `- …and ${String(report.repository.changedFiles.length - 100)} more`
      );
    }
  }

  const details = report.evidence.filter(
    (item) => item.details !== undefined && item.details.length > 0
  );
  if (details.length > 0) {
    lines.push("", "## Command output summaries", "");
    for (const item of details) {
      lines.push(
        `<details><summary>${escapeHtml(item.name)}</summary>`,
        "",
        `<pre>${escapeHtml(item.details ?? "")}</pre>`,
        "",
        "</details>",
        ""
      );
    }
  }

  lines.push(
    "",
    "_Deterministic checks first. Semantic judgment second. Human decision last._",
    ""
  );
  return lines.join("\n");
}

function duration(value: number | undefined): string {
  if (value === undefined) return "—";
  return value < 1_000 ? `${String(value)} ms` : `${(value / 1_000).toFixed(1)} s`;
}

function verdictIcon(verdict: VerificationReport["verdict"]): string {
  if (verdict === "PASS") return "✅";
  if (verdict === "FAIL") return "❌";
  return "⚠️";
}

function escapeTable(value: string): string {
  return escapeHtml(escapeInline(value)).replaceAll("|", "\\|");
}

function escapeInline(value: string): string {
  return value.replace(/[\r\n]+/gu, " ").trim();
}

function escapeCode(value: string): string {
  return escapeHtml(value.replace(/[\r\n]/gu, "�"));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
