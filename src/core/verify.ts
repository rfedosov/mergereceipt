import { analyzeChangedFiles } from "../analysis/files";
import { collectCommandEvidence } from "../checks/run-command";
import { loadConfig } from "../config/load";
import { REPORT_SCHEMA_VERSION, TOOL_NAME, VERSION } from "../constants";
import { collectChangedFiles } from "../git/changed-files";
import { scoreEvidence } from "../scoring/score";
import type { Evidence, VerificationReport } from "../types";

export interface VerificationOptions {
  readonly cwd: string;
  readonly configPath?: string;
  readonly base?: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly now?: () => Date;
  readonly onEvidence?: (evidence: Evidence) => void;
}

export async function runVerification(
  options: VerificationOptions
): Promise<VerificationReport> {
  const loaded = await loadConfig(options.cwd, options.configPath);
  const repository = await collectChangedFiles({
    cwd: loaded.directory,
    includeUncommitted: loaded.config.git.includeUncommitted,
    ...(options.base !== undefined
      ? { base: options.base }
      : loaded.config.git.base !== undefined
        ? { base: loaded.config.git.base }
        : {}),
    ...(options.env === undefined ? {} : { env: options.env })
  });
  const evidence: Evidence[] = [];

  for (const [name, check] of Object.entries(loaded.config.checks)) {
    const item = await collectCommandEvidence(name, check, {
      cwd: loaded.directory,
      ...(options.env === undefined ? {} : { env: options.env })
    });
    evidence.push(item);
    options.onEvidence?.(item);
  }

  if (Object.keys(loaded.config.checks).length === 0) {
    const noChecks: Evidence = {
      id: "checks.none",
      name: "Command checks",
      category: "command",
      status: "warning",
      description: "No command checks are configured.",
      required: false,
      deterministic: true
    };
    evidence.push(noChecks);
    options.onEvidence?.(noChecks);
  }

  const repositoryEvidence: Evidence = {
    id: "repository.changed_files",
    name: "Changed files analyzed",
    category: "repository",
    status: "passed",
    description: `${String(repository.files.length)} changed file(s) found relative to ${repository.base}.`,
    required: true,
    deterministic: true,
    data: {
      base: repository.base,
      head: repository.head,
      changedFiles: repository.files
    }
  };
  evidence.push(repositoryEvidence);
  options.onEvidence?.(repositoryEvidence);

  const analysis = analyzeChangedFiles(
    repository.files,
    loaded.config.analysis
  );
  evidence.push(analysis.testSignal, analysis.sensitiveFiles);
  options.onEvidence?.(analysis.testSignal);
  options.onEvidence?.(analysis.sensitiveFiles);

  const scored = scoreEvidence(evidence);
  const generatedAt = (options.now ?? (() => new Date()))().toISOString();

  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    tool: {
      name: TOOL_NAME,
      version: VERSION
    },
    generatedAt,
    repository: {
      base: repository.base,
      head: repository.head,
      changedFiles: repository.files
    },
    evidence,
    score: scored.score,
    scoreBreakdown: scored.breakdown,
    verdict: scored.verdict
  };
}
