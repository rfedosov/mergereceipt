import type { VerificationReport } from "../types";

export function renderJsonReport(
  report: VerificationReport,
  options: { readonly pretty?: boolean } = {}
): string {
  return `${JSON.stringify(report, null, options.pretty === false ? 0 : 2)}\n`;
}
