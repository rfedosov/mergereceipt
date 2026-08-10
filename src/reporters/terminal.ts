import { sanitizeTerminalText } from "../checks/run-command";
import { TOOL_DISPLAY_NAME } from "../constants";
import type { EvidenceStatus, VerificationReport } from "../types";

interface TerminalReporterOptions {
  readonly color?: boolean;
  readonly includeHeader?: boolean;
}

const SYMBOLS: Record<EvidenceStatus, string> = {
  passed: "✓",
  failed: "✗",
  warning: "⚠",
  skipped: "•"
};

export function renderTerminalReport(
  report: VerificationReport,
  options: TerminalReporterOptions = {}
): string {
  const color = options.color ?? false;
  const lines =
    options.includeHeader === false
      ? []
      : [`${TOOL_DISPLAY_NAME} v${report.tool.version}`, ""];
  const longestName = report.evidence.reduce(
    (length, item) => Math.max(length, item.name.length),
    0
  );

  for (const item of report.evidence) {
    const symbol = colorize(SYMBOLS[item.status], item.status, color);
    const name = sanitizeTerminalText(item.name).padEnd(longestName);
    const duration =
      item.durationMs === undefined ? "" : `  ${formatDuration(item.durationMs)}`;
    lines.push(`${symbol} ${name}${duration}`);
    if (item.status === "failed" || item.status === "warning") {
      lines.push(`  ${sanitizeTerminalText(item.description)}`);
    }
    if (item.status === "failed" && item.details !== undefined) {
      const safeDetails = sanitizeTerminalText(item.details).slice(-2_000);
      for (const line of safeDetails.split("\n")) {
        lines.push(`    ${line}`);
      }
    }
  }

  if (report.scoreBreakdown.deductions.length > 0) {
    lines.push("", "Deductions:");
    for (const deduction of report.scoreBreakdown.deductions) {
      lines.push(
        `  -${String(deduction.points)} ${sanitizeTerminalText(deduction.reason)} ` +
          `(${sanitizeTerminalText(deduction.evidenceId)})`
      );
    }
  }

  lines.push(
    "",
    `Evidence Score: ${String(report.score)}/100`,
    `Verdict: ${colorize(report.verdict, verdictStatus(report.verdict), color)}`
  );
  return `${lines.join("\n")}\n`;
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1_000) {
    return `${String(durationMs)}ms`;
  }
  return `${(durationMs / 1_000).toFixed(1)}s`;
}

function verdictStatus(
  verdict: VerificationReport["verdict"]
): EvidenceStatus {
  if (verdict === "PASS") return "passed";
  if (verdict === "FAIL") return "failed";
  return "warning";
}

function colorize(
  value: string,
  status: EvidenceStatus,
  enabled: boolean
): string {
  if (!enabled) return value;
  const code =
    status === "passed"
      ? 32
      : status === "failed"
        ? 31
        : status === "warning"
          ? 33
          : 90;
  return `\u001B[${String(code)}m${value}\u001B[0m`;
}
