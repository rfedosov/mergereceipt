export { analyzeChangedFiles } from "./analysis/files";
export { runCommand } from "./checks/run-command";
export { initializeConfig } from "./config/init";
export { loadConfig } from "./config/load";
export type { MergeReceiptConfig, CommandCheckConfig } from "./config/schema";
export { runVerification } from "./core/verify";
export { exitCodeForVerdict } from "./exit-codes";
export { collectChangedFiles } from "./git/changed-files";
export type {
  SemanticEvidenceProvider,
  SemanticVerificationInput
} from "./providers/types";
export { renderJsonReport } from "./reporters/json";
export { renderMarkdownReport } from "./reporters/markdown";
export { renderTerminalReport } from "./reporters/terminal";
export { SCORE_WEIGHTS, scoreEvidence } from "./scoring/score";
export type {
  Evidence,
  EvidenceCategory,
  EvidenceStatus,
  VerificationReport,
  Verdict
} from "./types";
